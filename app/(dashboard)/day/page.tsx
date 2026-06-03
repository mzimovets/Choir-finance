'use client'

import { useState, useEffect, useCallback } from 'react'
import { Spinner, Calendar } from '@heroui/react'
import { I18nProvider } from '@react-aria/i18n'
import { parseDate } from '@internationalized/date'
import { useSession } from '@/hooks/useSession'
import type { ChoirEvent } from '@/lib/types'
import { AddEventModal } from '@/components/AddEventModal'
import { EventCard } from '@/components/EventCard'
import { PageHeader } from '@/components/PageHeader'

function todayStr() {
  return new Date().toLocaleDateString('sv-SE')
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
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

  async function deleteEvent(id: string) {
    if (!confirm('Удалить выход?')) return
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    loadEvents()
  }

  function openEdit(ev: ChoirEvent) {
    setEditingEvent(ev)
    setModalOpen(true)
  }

  function openNew() {
    setEditingEvent(null)
    setModalOpen(true)
  }

  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-page">
        <Spinner color="warning" />
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendarValue = parseDate(date) as any

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title={formatDate(date)}
        displayName={session?.displayName}
        choirType={session?.choirType}
      />

      {/* Date navigation */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => changeDate(-1)}
            className="flex-1 py-2 rounded-xl border border-warm-200 bg-white text-warm-700 text-sm font-medium active:bg-warm-50 transition-colors"
          >
            ← Вчера
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
            className="flex-1 py-2 rounded-xl border border-warm-200 bg-white text-warm-700 text-sm font-medium active:bg-warm-50 transition-colors"
          >
            Завтра →
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
          <div className="mt-2 flex justify-center">
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
        )}
      </div>

      {/* Events */}
      <div className="px-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner color="warning" />
          </div>
        ) : events.length === 0 ? (
          <div className="warm-card p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-semibold text-warm-700">Выходов нет</p>
            <p className="text-sm text-warm-400 mt-1">Нажмите + чтобы добавить</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((ev) => (
              <EventCard
                key={ev._id}
                event={ev}
                onEdit={() => openEdit(ev)}
                onDelete={() => deleteEvent(ev._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openNew}
        className="fixed z-40 w-14 h-14 rounded-full text-white text-3xl shadow-lg flex items-center justify-center transition-opacity active:opacity-80"
        style={{
          bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px) + 1rem)',
          right: '1rem',
          background: 'linear-gradient(135deg, #bd9673, #7d5e42)',
        }}
      >
        +
      </button>

      <AddEventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        date={date}
        choirType={session?.choirType || 'festive'}
        editingEvent={editingEvent}
        onSaved={loadEvents}
      />
    </div>
  )
}
