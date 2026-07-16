'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Calendar } from '@heroui/react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { I18nProvider } from '@react-aria/i18n'
import { parseDate } from '@internationalized/date'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { useSession } from '@/hooks/useSession'
import { notifyDataChanged } from '@/lib/dataSignal'
import type { ChoirEvent } from '@/lib/types'
import { AddEventModal } from '@/components/AddEventModal'
import { EventCard } from '@/components/EventCard'
import { PageHeader } from '@/components/PageHeader'
import { IconEmpty } from '@/components/IconEmpty'

function todayStr() {
  return new Date().toLocaleDateString('sv-SE')
}

/** «3 июня» */
function formatDayMonth(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long',
  })
}

/** «Среда» с заглавной буквы */
function formatWeekday(d: string) {
  const s = new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', { weekday: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** «5 июн.» — для кнопок навигации */
function formatNeighborDate(base: string, delta: number) {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function formatShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function DayPage() {
  const { session, loading: sessionLoading } = useSession()
  const [date, setDate] = useState(todayStr)
  const [calOpen, setCalOpen] = useState(false)
  const [events, setEvents] = useState<ChoirEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ChoirEvent | null>(null)
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<ChoirEvent | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Точки на календаре
  const [calEventDates, setCalEventDates] = useState<Set<string>>(new Set())
  const calWrapRef = useRef<HTMLDivElement>(null)
  const applyingRef = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/events?date=${date}`)
    if (res.ok) setEvents(await res.json())
    setLoading(false)
  }, [date])

  useEffect(() => { loadEvents() }, [loadEvents])

  function changeDate(delta: number) {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setDate(d.toLocaleDateString('sv-SE'))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleCalendarChange(val: any) {
    if (!val) return
    const str = `${val.year}-${String(val.month).padStart(2, '0')}-${String(val.day).padStart(2, '0')}`
    setDate(str)
    setCalOpen(false)
  }

  function notify() {
    notifyDataChanged()
  }

  async function confirmDelete() {
    if (!deleteConfirmEvent) return
    setDeleting(true)
    await fetch(`/api/events/${deleteConfirmEvent._id}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteConfirmEvent(null)
    loadEvents()
    notify()
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setEvents((prev) => {
      const oldIdx = prev.findIndex((ev) => ev._id === active.id)
      const newIdx = prev.findIndex((ev) => ev._id === over.id)
      const next = arrayMove(prev, oldIdx, newIdx)
      fetch('/api/events/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: next.map((ev) => ev._id) }),
      }).then(() => notify())
      return next
    })
  }

  function openEdit(ev: ChoirEvent) {
    setEditingEvent(ev)
    setModalOpen(true)
  }

  function openNew() {
    setEditingEvent(null)
    setModalOpen(true)
  }

  // ── Точки на календаре ───────────────────────────────────────────────
  const calDisplayMonthRef = useRef('')

  function fetchCalEvents(ym: string) {
    fetch(`/api/events?month=${ym}`)
      .then(r => r.ok ? r.json() : [])
      .then((evs: ChoirEvent[]) => setCalEventDates(new Set(evs.map((e: ChoirEvent) => e.date))))
  }

  /** «Июнь 2026» или «июня 2026» → «2026-06» */
  function parseCalTitle(text: string): string | null {
    const MONTHS: [string, number][] = [
      ['январ', 1], ['феврал', 2], ['март', 3], ['апрел', 4],
      ['ма', 5], ['июн', 6], ['июл', 7], ['август', 8],
      ['сентябр', 9], ['октябр', 10], ['ноябр', 11], ['декабр', 12],
    ]
    const lower = text.toLowerCase()
    let m = 0
    for (const [w, n] of MONTHS) { if (lower.includes(w)) { m = n; break } }
    const yr = lower.match(/\d{4}/)
    if (!m || !yr) return null
    return `${yr[0]}-${String(m).padStart(2, '0')}`
  }

  // Открылся календарь → грузим события текущего месяца
  useEffect(() => {
    if (!calOpen) return
    const ym = date.slice(0, 7)
    calDisplayMonthRef.current = ym
    fetchCalEvents(ym)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calOpen])

  // Расставить точки + следить за навигацией
  useEffect(() => {
    if (!calOpen || !calWrapRef.current) return

    const applyDots = () => {
      if (applyingRef.current || !calWrapRef.current) return
      applyingRef.current = true
      calWrapRef.current.querySelectorAll('.cal-dot').forEach(d => d.remove())

      const ym = calDisplayMonthRef.current
      if (ym && calEventDates.size > 0) {
        // HeroUI Calendar: <td data-slot="cell"><span data-outside-month? ...>{formattedDate}</span></td>
        const cellButtons = calWrapRef.current.querySelectorAll<HTMLElement>('td[data-slot="cell"] > span')

        cellButtons.forEach(span => {
          // Пропускаем дни соседних месяцев
          if (span.hasAttribute('data-outside-month')) return

          const day = parseInt(span.textContent?.trim() || '0')
          if (!day || day > 31) return
          const ds = `${ym}-${String(day).padStart(2, '0')}`
          if (!calEventDates.has(ds)) return

          const dot = document.createElement('span')
          dot.className = 'cal-dot'
          dot.setAttribute('aria-hidden', 'true')
          dot.style.cssText =
            'display:block;position:absolute;top:2px;left:50%;transform:translateX(-50%);' +
            'width:4px;height:4px;border-radius:50%;background:#9b7653;pointer-events:none;'
          span.style.position = 'relative'
          span.appendChild(dot)
        })
      }
      applyingRef.current = false
    }

    const timer = setTimeout(applyDots, 200)

    const observer = new MutationObserver((mutations) => {
      // Пропустить мутации от наших же точек
      const ours = mutations.every(m =>
        [...m.addedNodes, ...m.removedNodes].every(n => {
          if (n.nodeType !== Node.ELEMENT_NODE) return true  // текстовые узлы игнорируем
          return (n as Element).className === 'cal-dot'
        })
      )
      if (ours) return

      // Попробовать определить новый месяц из заголовка
      const titleEl =
        calWrapRef.current?.querySelector('[data-slot="title"]') ??
        calWrapRef.current?.querySelector('h2') ??
        calWrapRef.current?.querySelector('[data-slot="header"] button') as HTMLElement | null
      const parsed = parseCalTitle((titleEl as HTMLElement | null)?.textContent || '')

      if (parsed && parsed !== calDisplayMonthRef.current) {
        calDisplayMonthRef.current = parsed
        fetchCalEvents(parsed) // state обновится → эффект перезапустится
      } else {
        setTimeout(applyDots, 80)
      }
    })

    observer.observe(calWrapRef.current, { childList: true, subtree: true })
    return () => { clearTimeout(timer); observer.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calOpen, calEventDates])
  // ─────────────────────────────────────────────────────────────────────

  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-page">
        <LoadingSpinner size="lg" color="#9b7653" />
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendarValue = parseDate(date) as any

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title={formatDayMonth(date)}
        subtitle={formatWeekday(date)}
        displayName={session ? (session.displayName || '') : undefined}
        choirType={session?.choirType}
        titleCenter
        left={
          <button
            onClick={openNew}
            className="w-9 h-9 rounded-full text-white flex items-center justify-center shadow-sm transition-opacity active:opacity-70"
            style={{ background: 'linear-gradient(135deg, #bd9673, #7d5e42)' }}
            title="Добавить выход"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M7.26279 3.25871C7.38317 2.12953 8.33887 1.25 9.5 1.25H14.5C15.6611 1.25 16.6168 2.12953 16.7372 3.25871C17.5004 3.27425 18.1602 3.31372 18.7236 3.41721C19.4816 3.55644 20.1267 3.82168 20.6517 4.34661C21.2536 4.94853 21.5125 5.7064 21.6335 6.60651C21.75 7.47348 21.75 8.5758 21.75 9.94339V16.0531C21.75 17.4207 21.75 18.523 21.6335 19.39C21.5125 20.2901 21.2536 21.048 20.6517 21.6499C20.0497 22.2518 19.2919 22.5107 18.3918 22.6317C17.5248 22.7483 16.4225 22.7483 15.0549 22.7483H8.94513C7.57754 22.7483 6.47522 22.7483 5.60825 22.6317C4.70814 22.5107 3.95027 22.2518 3.34835 21.6499C2.74643 21.048 2.48754 20.2901 2.36652 19.39C2.24996 18.523 2.24998 17.4207 2.25 16.0531V9.94339C2.24998 8.5758 2.24996 7.47348 2.36652 6.60651C2.48754 5.7064 2.74643 4.94853 3.34835 4.34661C3.87328 3.82168 4.51835 3.55644 5.27635 3.41721C5.83977 3.31372 6.49963 3.27425 7.26279 3.25871ZM7.26476 4.75913C6.54668 4.77447 5.99332 4.81061 5.54735 4.89253C4.98054 4.99664 4.65246 5.16382 4.40901 5.40727C4.13225 5.68403 3.9518 6.07261 3.85315 6.80638C3.75159 7.56173 3.75 8.56285 3.75 9.99826V15.9983C3.75 17.4337 3.75159 18.4348 3.85315 19.1901C3.9518 19.9239 4.13225 20.3125 4.40901 20.5893C4.68577 20.866 5.07435 21.0465 5.80812 21.1451C6.56347 21.2467 7.56458 21.2483 9 21.2483H15C16.4354 21.2483 17.4365 21.2467 18.1919 21.1451C18.9257 21.0465 19.3142 20.866 19.591 20.5893C19.8678 20.3125 20.0482 19.9239 20.1469 19.1901C20.2484 18.4348 20.25 17.4337 20.25 15.9983V9.99826C20.25 8.56285 20.2484 7.56173 20.1469 6.80638C20.0482 6.07261 19.8678 5.68403 19.591 5.40727C19.3475 5.16382 19.0195 4.99664 18.4527 4.89253C18.0067 4.81061 17.4533 4.77447 16.7352 4.75913C16.6067 5.87972 15.655 6.75 14.5 6.75H9.5C8.345 6.75 7.39326 5.87972 7.26476 4.75913ZM9.5 2.75C9.08579 2.75 8.75 3.08579 8.75 3.5V4.5C8.75 4.91421 9.08579 5.25 9.5 5.25H14.5C14.9142 5.25 15.25 4.91421 15.25 4.5V3.5C15.25 3.08579 14.9142 2.75 14.5 2.75H9.5ZM12 9.25C12.4142 9.25 12.75 9.58579 12.75 10L12.75 12.25H15C15.4142 12.25 15.75 12.5858 15.75 13C15.75 13.4142 15.4142 13.75 15 13.75H12.75V16C12.75 16.4142 12.4142 16.75 12 16.75C11.5858 16.75 11.25 16.4142 11.25 16V13.75H9C8.58579 13.75 8.25 13.4142 8.25 13C8.25 12.5858 8.58579 12.25 9 12.25H11.25L11.25 10C11.25 9.58579 11.5858 9.25 12 9.25Z" fill="currentColor"/>
            </svg>
          </button>
        }
      />

      {/* Date navigation */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => changeDate(-1)}
            className="flex-1 py-2 rounded-xl border border-warm-200 bg-white text-warm-700 text-sm font-medium active:bg-warm-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ transform: 'scaleX(-1)' }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M13.9697 6.46967C14.2626 6.17678 14.7374 6.17678 15.0303 6.46967L20.0303 11.4697C20.3232 11.7626 20.3232 12.2374 20.0303 12.5303L15.0303 17.5303C14.7374 17.8232 14.2626 17.8232 13.9697 17.5303C13.6768 17.2374 13.6768 16.7626 13.9697 16.4697L17.6893 12.75L9.5 12.75C8.78668 12.75 7.70002 12.9702 6.81323 13.6087C5.96468 14.2196 5.25 15.2444 5.25 17C5.25 17.4142 4.91421 17.75 4.5 17.75C4.08579 17.75 3.75 17.4142 3.75 17C3.75 14.7556 4.70198 13.2804 5.93677 12.3913C7.13332 11.5298 8.54665 11.25 9.5 11.25L17.6893 11.25L13.9697 7.53033C13.6768 7.23744 13.6768 6.76256 13.9697 6.46967Z" fill="currentColor"/>
            </svg>
            {formatNeighborDate(date, -1)}
          </button>
          <button
            onClick={() => setDate(todayStr())}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)', color: 'white' }}
          >
            Сегодня
          </button>
          <button
            onClick={() => changeDate(1)}
            className="flex-1 py-2 rounded-xl border border-warm-200 bg-white text-warm-700 text-sm font-medium active:bg-warm-50 transition-colors flex items-center justify-center gap-1.5"
          >
            {formatNeighborDate(date, 1)}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M13.9697 6.46967C14.2626 6.17678 14.7374 6.17678 15.0303 6.46967L20.0303 11.4697C20.3232 11.7626 20.3232 12.2374 20.0303 12.5303L15.0303 17.5303C14.7374 17.8232 14.2626 17.8232 13.9697 17.5303C13.6768 17.2374 13.6768 16.7626 13.9697 16.4697L17.6893 12.75L9.5 12.75C8.78668 12.75 7.70002 12.9702 6.81323 13.6087C5.96468 14.2196 5.25 15.2444 5.25 17C5.25 17.4142 4.91421 17.75 4.5 17.75C4.08579 17.75 3.75 17.4142 3.75 17C3.75 14.7556 4.70198 13.2804 5.93677 12.3913C7.13332 11.5298 8.54665 11.25 9.5 11.25L17.6893 11.25L13.9697 7.53033C13.6768 7.23744 13.6768 6.76256 13.9697 6.46967Z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        {/* Date button trigger */}
        <button
          onClick={() => setCalOpen((v) => !v)}
          className="w-full flex items-center justify-between bg-white border border-warm-200 rounded-xl px-4 h-11 text-sm text-warm-800 font-medium active:bg-warm-50 transition-colors"
        >
          <span>{formatShort(date)}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 14C17.5523 14 18 13.5523 18 13C18 12.4477 17.5523 12 17 12C16.4477 12 16 12.4477 16 13C16 13.5523 16.4477 14 17 14Z" fill="#9b7653"/>
            <path d="M17 18C17.5523 18 18 17.5523 18 17C18 16.4477 17.5523 16 17 16C16.4477 16 16 16.4477 16 17C16 17.5523 16.4477 18 17 18Z" fill="#9b7653"/>
            <path d="M13 13C13 13.5523 12.5523 14 12 14C11.4477 14 11 13.5523 11 13C11 12.4477 11.4477 12 12 12C12.5523 12 13 12.4477 13 13Z" fill="#9b7653"/>
            <path d="M13 17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17C11 16.4477 11.4477 16 12 16C12.5523 16 13 16.4477 13 17Z" fill="#9b7653"/>
            <path d="M7 14C7.55229 14 8 13.5523 8 13C8 12.4477 7.55229 12 7 12C6.44772 12 6 12.4477 6 13C6 13.5523 6.44772 14 7 14Z" fill="#9b7653"/>
            <path d="M7 18C7.55229 18 8 17.5523 8 17C8 16.4477 7.55229 16 7 16C6.44772 16 6 16.4477 6 17C6 17.5523 6.44772 18 7 18Z" fill="#9b7653"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M7 1.75C7.41421 1.75 7.75 2.08579 7.75 2.5V3.26272C8.412 3.24999 9.14133 3.24999 9.94346 3.25H14.0564C14.8586 3.24999 15.588 3.24999 16.25 3.26272V2.5C16.25 2.08579 16.5858 1.75 17 1.75C17.4142 1.75 17.75 2.08579 17.75 2.5V3.32709C18.0099 3.34691 18.2561 3.37182 18.489 3.40313C19.6614 3.56076 20.6104 3.89288 21.3588 4.64124C22.1071 5.38961 22.4392 6.33855 22.5969 7.51098C22.75 8.65018 22.75 10.1058 22.75 11.9435V14.0564C22.75 15.8941 22.75 17.3498 22.5969 18.489C22.4392 19.6614 22.1071 20.6104 21.3588 21.3588C20.6104 22.1071 19.6614 22.4392 18.489 22.5969C17.3498 22.75 15.8942 22.75 14.0565 22.75H9.94359C8.10585 22.75 6.65018 22.75 5.51098 22.5969C4.33856 22.4392 3.38961 22.1071 2.64124 21.3588C1.89288 20.6104 1.56076 19.6614 1.40314 18.489C1.24997 17.3498 1.24998 15.8942 1.25 14.0564V11.9436C1.24998 10.1058 1.24997 8.65019 1.40314 7.51098C1.56076 6.33855 1.89288 5.38961 2.64124 4.64124C3.38961 3.89288 4.33856 3.56076 5.51098 3.40313C5.7439 3.37182 5.99006 3.34691 6.25 3.32709V2.5C6.25 2.08579 6.58579 1.75 7 1.75ZM5.71085 4.88976C4.70476 5.02502 4.12511 5.27869 3.7019 5.7019C3.27869 6.12511 3.02502 6.70476 2.88976 7.71085C2.86685 7.88123 2.8477 8.06061 2.83168 8.25H21.1683C21.1523 8.06061 21.1331 7.88124 21.1102 7.71085C20.975 6.70476 20.7213 6.12511 20.2981 5.7019C19.8749 5.27869 19.2952 5.02502 18.2892 4.88976C17.2615 4.75159 15.9068 4.75 14 4.75H10C8.09318 4.75 6.73851 4.75159 5.71085 4.88976ZM2.75 12C2.75 11.146 2.75032 10.4027 2.76309 9.75H21.2369C21.2497 10.4027 21.25 11.146 21.25 12V14C21.25 15.9068 21.2484 17.2615 21.1102 18.2892C20.975 19.2952 20.7213 19.8749 20.2981 20.2981C19.8749 20.7213 19.2952 20.975 18.2892 21.1102C17.2615 21.2484 15.9068 21.25 14 21.25H10C8.09318 21.25 6.73851 21.2484 5.71085 21.1102C4.70476 20.975 4.12511 20.7213 3.7019 20.2981C3.27869 19.8749 3.02502 19.2952 2.88976 18.2892C2.75159 17.2615 2.75 15.9068 2.75 14V12Z" fill="#9b7653"/>
          </svg>
        </button>

        {/* Inline calendar */}
        {calOpen && (
          <>
            {/* Прозрачный backdrop — клик вне закрывает */}
            <div className="fixed inset-0 z-10" onClick={() => setCalOpen(false)} />
            <div ref={calWrapRef} className="relative z-20 mt-2 flex justify-center">
            <I18nProvider locale="ru-RU">
              <Calendar
                value={calendarValue}
                onChange={handleCalendarChange}
                color="primary"
                classNames={{
                  base: 'bg-white border border-warm-200 rounded-2xl shadow-md w-full',
                  headerWrapper: 'bg-white rounded-t-2xl px-2 pt-2',
                  title: 'text-warm-900 font-semibold',
                  prevButton: 'text-warm-500',
                  nextButton: 'text-warm-500',
                  gridHeader: 'bg-white px-2',
                  gridHeaderCell: 'text-warm-400 text-xs font-semibold',
                  gridBodyRow: 'first:mt-1',
                  cell: 'text-warm-800',
                  cellButton: 'data-[outside-month=true]:text-warm-300 data-[outside-month=true]:opacity-60',
                  content: 'pb-2',
                }}
              />
            </I18nProvider>
            </div>
          </>
        )}
      </div>

      {/* Events */}
      <div className="px-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" color="#9b7653" />
          </div>
        ) : events.length === 0 ? (
          <div className="warm-card p-8 text-center">
            <div className="flex justify-center mb-3 text-warm-300">
              <IconEmpty />
            </div>
            <p className="font-semibold text-warm-700">Выходов нет</p>
            <p className="text-sm text-warm-400 mt-1">Нажмите + чтобы добавить</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={events.map((e) => e._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-3 select-none">
                {events.map((ev) => (
                  <EventCard
                    key={ev._id}
                    event={ev}
                    onEdit={() => openEdit(ev)}
                    onDelete={() => setDeleteConfirmEvent(ev)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Подтверждение удаления выхода */}
      {deleteConfirmEvent && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => { if (!deleting) setDeleteConfirmEvent(null) }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              {/* Шапка с иконкой */}
              <div className="px-5 pt-6 pb-1 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2.75C11.0215 2.75 10.1871 3.37503 9.87787 4.24993C9.73983 4.64047 9.31134 4.84517 8.9208 4.70713C8.53026 4.56909 8.32557 4.1406 8.46361 3.75007C8.97804 2.29459 10.3661 1.25 12 1.25C13.634 1.25 15.022 2.29459 15.5365 3.75007C15.6745 4.1406 15.4698 4.56909 15.0793 4.70713C14.6887 4.84517 14.2602 4.64047 14.1222 4.24993C13.813 3.37503 12.9785 2.75 12 2.75Z" fill="#ef4444"/>
                    <path d="M2.75 6C2.75 5.58579 3.08579 5.25 3.5 5.25H20.5001C20.9143 5.25 21.2501 5.58579 21.2501 6C21.2501 6.41421 20.9143 6.75 20.5001 6.75H3.5C3.08579 6.75 2.75 6.41421 2.75 6Z" fill="#ef4444"/>
                    <path d="M5.91508 8.45011C5.88753 8.03681 5.53015 7.72411 5.11686 7.75166C4.70356 7.77921 4.39085 8.13659 4.41841 8.54989L4.88186 15.5016C4.96735 16.7844 5.03641 17.8205 5.19838 18.6336C5.36678 19.4789 5.6532 20.185 6.2448 20.7384C6.83639 21.2919 7.55994 21.5307 8.41459 21.6425C9.23663 21.75 10.2751 21.75 11.5607 21.75H12.4395C13.7251 21.75 14.7635 21.75 15.5856 21.6425C16.4402 21.5307 17.1638 21.2919 17.7554 20.7384C18.347 20.185 18.6334 19.4789 18.8018 18.6336C18.9637 17.8205 19.0328 16.7844 19.1183 15.5016L19.5818 8.54989C19.6093 8.13659 19.2966 7.77921 18.8833 7.75166C18.47 7.72411 18.1126 8.03681 18.0851 8.45011L17.6251 15.3492C17.5353 16.6971 17.4712 17.6349 17.3307 18.3405C17.1943 19.025 17.004 19.3873 16.7306 19.6431C16.4572 19.8988 16.083 20.0647 15.391 20.1552C14.6776 20.2485 13.7376 20.25 12.3868 20.25H11.6134C10.2626 20.25 9.32255 20.2485 8.60915 20.1552C7.91715 20.0647 7.54299 19.8988 7.26957 19.6431C6.99616 19.3873 6.80583 19.025 6.66948 18.3405C6.52891 17.6349 6.46488 16.6971 6.37503 15.3492L5.91508 8.45011Z" fill="#ef4444"/>
                  </svg>
                </div>
                <h2 className="text-base font-slab font-bold text-warm-900 leading-snug mb-1">
                  Удалить выход{' '}
                  <span className="text-red-600">
                    «{deleteConfirmEvent.eventType} — {formatDayMonth(date)}»
                  </span>
                  ?
                </h2>
                <p className="text-sm text-warm-500 leading-relaxed pb-5">
                  Все данные о посещаемости будут удалены.
                  <br />Это действие нельзя отменить.
                </p>
              </div>
              <div className="flex border-t border-warm-100">
                <button
                  onClick={() => setDeleteConfirmEvent(null)}
                  className="flex-1 py-3.5 text-sm font-slab font-semibold text-warm-700 active:bg-warm-50 border-r border-warm-100"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 py-3.5 text-sm font-slab font-semibold text-red-500 active:bg-red-50 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {deleting && <LoadingSpinner size="sm" color="#dc2626" />}
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <AddEventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        date={date}
        choirType={session?.choirType || 'festive'}
        editingEvent={editingEvent}
        onSaved={() => { loadEvents(); notify(); }}
      />
    </div>
  )
}
