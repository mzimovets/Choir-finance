'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter,
} from '@heroui/react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { ChoirEvent, Member, EventTypeDoc } from '@/lib/types'
import { pricesToMap } from '@/lib/types'
import { plural, SINGER, PARTICIPANT } from '@/lib/plural'
import { buildMemberName, shortName } from '@/lib/nameFormat'

interface Props {
  isOpen: boolean
  onClose: () => void
  date: string
  choirType: 'festive' | 'weekday'
  editingEvent: ChoirEvent | null
  onSaved: () => void
}

/* ─── Строка праздничного хора ─── */
interface FestiveRow {
  memberId: string
  memberName: string
  basePrice: number
  bonus: number
  fine: number
  checked: boolean
}

/* ─── Строка буднего хора (певчий) ─── */
interface WeekdayRow {
  key: string
  memberId: string
  memberName: string
  basePrice: number
  bonus: number
  fine: number
  search: string
  results: Member[]
}

/* ─── Состояние регента / чтеца ─── */
interface SlotState {
  memberId: string
  memberName: string
  basePrice: number
  bonus: number
  fine: number
  search: string
  results: Member[]
}

function emptySlot(): SlotState {
  return { memberId: '', memberName: '', basePrice: 0, bonus: 0, fine: 0, search: '', results: [] }
}

let rowKeyCounter = 0
function nextKey() { return String(++rowKeyCounter) }

export function AddEventModal({ isOpen, onClose, date, choirType, editingEvent, onSaved }: Props) {
  const [step, setStep] = useState<'type' | 'members'>('type')
  const [animDir, setAnimDir] = useState<'right' | 'left'>('right')
  const [stepKey, setStepKey] = useState(0)

  const [eventType, setEventType] = useState('')
  const [customType, setCustomType] = useState('')
  const [eventTypeDocs, setEventTypeDocs] = useState<EventTypeDoc[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [typesLoading, setTypesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [emptyError, setEmptyError] = useState(false)

  // Праздничный хор
  const [festiveRows, setFestiveRows] = useState<FestiveRow[]>([])
  const [festiveRegent, setFestiveRegent] = useState<SlotState>(emptySlot())

  // Будний хор
  const [regent, setRegent] = useState<SlotState>(emptySlot())
  const [reader, setReader] = useState<SlotState>(emptySlot())
  const [weekdayRows, setWeekdayRows] = useState<WeekdayRow[]>([])

  const resolvedType = eventType === 'Другое' ? customType.trim() : eventType

  /* ── Утилиты ── */
  /**
   * Возвращает цену участника для данного типа выхода.
   * Личная ненулевая цена имеет приоритет; иначе — тариф из типа выхода.
   */
  function getPriceForMember(m: Member, type: string, slotRole?: string): number {
    const priceMap = pricesToMap(m.defaultPrices)
    const personal = priceMap[type]
    const etDoc = eventTypeDocs.find((et) => et.name === type && et.choirType === choirType)
    const role = slotRole ?? m.role
    const etPrice = (etDoc?.prices as Record<string, number> | undefined)?.[role] ?? 0
    if (personal !== undefined && personal > 0) return personal
    return etPrice
  }

  /** Отображает имя в формате "Фамилия И." или "Фамилия И. О." */
  function memberDisplayName(name: string, patronymic?: string): string {
    const parts = name.trim().split(/\s+/)
    const lastName = parts[0] || ''
    const firstWord = parts[1] || ''
    if (!firstWord || firstWord.endsWith('.')) {
      return patronymic?.trim() ? `${name} ${patronymic.trim()[0].toUpperCase()}.` : name
    }
    const pi = patronymic?.trim() ? ` ${patronymic.trim()[0].toUpperCase()}.` : ''
    return `${lastName} ${firstWord[0]}.${pi}`
  }

  /** Скрыт ли участник для данного типа выхода (отключён в профиле или роль отключена в типе) */
  function isMemberDisabled(m: Member, type: string): boolean {
    if ((m.disabledEventTypes ?? []).includes(type)) return true
    const etDoc = eventTypeDocs.find((et) => et.name === type)
    if ((etDoc?.disabledRoles ?? []).includes(m.role)) return true
    return false
  }

  function goToMembers() {
    setAnimDir('right')
    setStepKey((k) => k + 1)
    setStep('members')

    // Обновить цену чтеца под выбранный тип выхода (или сбросить, если отключён)
    if (choirType === 'weekday' && !editingEvent) {
      const rt = eventType === 'Другое' ? customType.trim() : eventType
      setReader((cur) => {
        if (!cur.memberId) return cur
        const readerMember = members.find((m) => m._id === cur.memberId)
        if (!readerMember) return cur
        if (isMemberDisabled(readerMember, rt)) return emptySlot()
        return { ...cur, basePrice: getPriceForMember(readerMember, rt, 'reader') }
      })
    }
  }

  function goToType() {
    setAnimDir('left')
    setStepKey((k) => k + 1)
    setStep('type')
  }

  /* ── Скролл к активному инпуту при появлении клавиатуры ── */
  useEffect(() => {
    if (!isOpen) return
    const vv = window.visualViewport
    if (!vv) return
    function onResize() {
      document.activeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [isOpen])

  /* ── Загрузка данных + инициализация формы ── */
  useEffect(() => {
    if (!isOpen) return
    setMembersLoading(true)
    setTypesLoading(true)

    const typesPromise = fetch('/api/event-types').then((r) => (r.ok ? r.json() : []))
    const membersPromise = fetch('/api/members').then((r) => (r.ok ? r.json() : []))

    typesPromise.then((typesData: EventTypeDoc[]) => {
      setEventTypeDocs(typesData)
      setTypesLoading(false)
    })

    Promise.all([membersPromise, typesPromise]).then(([membersData, typesData]: [Member[], EventTypeDoc[]]) => {
      setMembers(membersData)
      setEventTypeDocs(typesData)
      setMembersLoading(false)

      if (editingEvent) {
        const et = editingEvent.eventType
        const knownNames = (typesData as EventTypeDoc[]).map((d) => d.name)
        if (knownNames.includes(et)) {
          setEventType(et)
        } else {
          setEventType('Другое')
          setCustomType(et)
        }
        setStep('members')

        if (choirType === 'festive') {
          const regentAtt = editingEvent.attendances.find((a) => a.isRegent)
          setFestiveRegent(regentAtt
            ? { memberId: regentAtt.memberId, memberName: regentAtt.memberName, basePrice: regentAtt.basePrice, bonus: regentAtt.bonus, fine: regentAtt.fine ?? 0, search: '', results: [] }
            : emptySlot()
          )
        }

        if (choirType === 'weekday') {
          const regentAtt = editingEvent.attendances.find((a) => a.isRegent)
            ?? editingEvent.attendances[0]
          const readerAtt = editingEvent.attendances.find((a) => a.isReader)
          const singerAtts = editingEvent.attendances.filter(
            (a) => a !== regentAtt && a !== readerAtt
          )

          setRegent(regentAtt
            ? { memberId: regentAtt.memberId, memberName: regentAtt.memberName, basePrice: regentAtt.basePrice, bonus: regentAtt.bonus, fine: regentAtt.fine ?? 0, search: '', results: [] }
            : emptySlot()
          )
          setReader(readerAtt
            ? { memberId: readerAtt.memberId, memberName: readerAtt.memberName, basePrice: readerAtt.basePrice, bonus: readerAtt.bonus, fine: readerAtt.fine ?? 0, search: '', results: [] }
            : emptySlot()
          )
          setWeekdayRows(singerAtts.map((a) => ({
            key: nextKey(),
            memberId: a.memberId,
            memberName: a.memberName,
            basePrice: a.basePrice,
            bonus: a.bonus,
            fine: a.fine ?? 0,
            search: '',
            results: [],
          })))
        }
      } else {
        setStep('type')
        setAnimDir('right')
        setStepKey(0)
        setEventType('')
        setCustomType('')
        setRegent(emptySlot())
        setWeekdayRows([])
        setFestiveRows([])

        // Предзаполнить регента для праздничного хора
        if (choirType === 'festive') {
          const defaultRegent = (membersData as Member[]).find((m) => m.role === 'regent')
          setFestiveRegent(defaultRegent
            ? { memberId: defaultRegent._id, memberName: buildMemberName(defaultRegent.name, defaultRegent.patronymic), basePrice: 0, bonus: 0, fine: 0, search: '', results: [] }
            : emptySlot()
          )
        } else {
          setFestiveRegent(emptySlot())
        }

        // Автозаполнить чтеца для буднего хора (если он не отключён для нового типа)
        if (choirType === 'weekday') {
          const defaultReader = (membersData as Member[]).find((m) => m.role === 'reader')
          setReader(emptySlot()) // basePrice выставим позже в goToMembers, когда тип будет известен
          if (defaultReader) {
            setReader({ memberId: defaultReader._id, memberName: buildMemberName(defaultReader.name, defaultReader.patronymic), basePrice: 0, bonus: 0, fine: 0, search: '', results: [] })
          }
        } else {
          setReader(emptySlot())
        }
      }
    })
  }, [isOpen, editingEvent, choirType])

  /* ── Праздничные строки (по members + resolvedType) ── */
  useEffect(() => {
    if (choirType !== 'festive' || !resolvedType || members.length === 0) return
    const existingAtt = editingEvent?.attendances || []
    // Отсортировать участников по алфавиту
    const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    const newRows: FestiveRow[] = sorted
      .filter((m) => !isMemberDisabled(m, resolvedType))  // исключить отключённых
      .map((m) => {
        const mName = memberDisplayName(m.name, m.patronymic)
        // Регент в праздничном хоре берётся из отдельного слота, не из общего списка
        const isRegentAtt = existingAtt.find((a) => a.memberId === m._id && a.isRegent)
        if (isRegentAtt) return null
        const existing = existingAtt.find((a) => a.memberId === m._id || a.memberName === m.name || a.memberName === mName)
        const basePrice = existing?.basePrice ?? getPriceForMember(m, resolvedType)
        return {
          memberId: m._id,
          memberName: mName,
          basePrice,
          bonus: existing?.bonus ?? 0,
          fine: existing?.fine ?? 0,
          checked: !!existing,
        }
      })
      .filter((r): r is FestiveRow => r !== null)
    setFestiveRows(newRows)

    // Обновить цену регента по выбранному типу выхода (только для новых событий)
    if (!editingEvent) {
      setFestiveRegent((cur) => {
        if (!cur.memberId) return cur
        const regentMember = members.find((m) => m._id === cur.memberId)
        if (!regentMember) return cur
        return { ...cur, basePrice: getPriceForMember(regentMember, resolvedType) }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, resolvedType, choirType, editingEvent, eventTypeDocs])

  function updateFestiveRow(id: string, field: 'basePrice' | 'bonus' | 'fine' | 'checked', val: unknown) {
    if (field === 'checked') setEmptyError(false)
    setFestiveRows((prev) => prev.map((r) => (r.memberId === id ? { ...r, [field]: val } : r)))
  }

  /* ── Поиск (общий) ── */
  function searchMembers(q: string, excludeIds: string[], preferRole?: string): Member[] {
    if (!q.trim()) return []
    const q2 = q.toLowerCase()
    return members
      .filter((m) =>
        m.name.toLowerCase().includes(q2) &&
        !excludeIds.includes(m._id) &&
        !isMemberDisabled(m, resolvedType)
      )
      .sort((a, b) => {
        if (preferRole) {
          if (a.role === preferRole && b.role !== preferRole) return -1
          if (b.role === preferRole && a.role !== preferRole) return 1
        }
        return a.name.localeCompare(b.name, 'ru')
      })
      .slice(0, 8)
  }

  /* ── Регент ── */
  function handleRegentSearch(q: string) {
    const excludeIds = [reader.memberId, ...weekdayRows.filter((r) => r.memberId).map((r) => r.memberId)].filter(Boolean)
    const results = searchMembers(q, excludeIds, 'regent')
    setRegent((r) => ({ ...r, search: q, results }))

    // Автопрокрутка: инпут регента к верху скролл-контейнера
    if (results.length > 0) {
      setTimeout(() => {
        const input = regentInputRef.current
        if (!input) return
        let el: HTMLElement | null = input.parentElement
        while (el) {
          const { overflow, overflowY } = getComputedStyle(el)
          if (/auto|scroll/.test(overflow + overflowY)) break
          el = el.parentElement
        }
        if (!el) return
        const inputTop = input.getBoundingClientRect().top
        const containerTop = el.getBoundingClientRect().top
        el.scrollBy({ top: inputTop - containerTop - 12, behavior: 'smooth' })
      }, 60)
    }
  }

  function selectRegent(m: Member) {
    const price = getPriceForMember(m, resolvedType, 'regent')
    setRegent({ memberId: m._id, memberName: memberDisplayName(m.name, m.patronymic), basePrice: price, bonus: 0, fine: 0, search: '', results: [] })
  }

  function clearRegent() { setRegent(emptySlot()) }

  /* ── Регент праздничного хора ── */
  function handleFestiveRegentSearch(q: string) {
    const results = searchMembers(q, [], 'regent')
    setFestiveRegent((r) => ({ ...r, search: q, results }))
  }

  function selectFestiveRegent(m: Member) {
    const price = getPriceForMember(m, resolvedType)
    setFestiveRegent({ memberId: m._id, memberName: memberDisplayName(m.name, m.patronymic), basePrice: price, bonus: 0, fine: 0, search: '', results: [] })
  }

  /* ── Чтец ── */
  function handleReaderSearch(q: string) {
    const excludeIds = [regent.memberId, ...weekdayRows.filter((r) => r.memberId).map((r) => r.memberId)].filter(Boolean)
    const results = searchMembers(q, excludeIds, 'reader')
    setReader((r) => ({ ...r, search: q, results }))
  }

  function selectReader(m: Member) {
    const price = getPriceForMember(m, resolvedType, 'reader')   // слот = чтец
    setReader({ memberId: m._id, memberName: memberDisplayName(m.name, m.patronymic), basePrice: price, bonus: 0, fine: 0, search: '', results: [] })
  }

  function clearReader() { setReader(emptySlot()) }

  /* ── Будние певчие ── */
  const regentInputRef = useRef<HTMLInputElement>(null)
  const newRowInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  function addSingerRow() {
    const key = nextKey()
    setWeekdayRows((prev) => [...prev, { key, memberId: '', memberName: '', basePrice: 0, bonus: 0, fine: 0, search: '', results: [] }])
    setTimeout(() => newRowInputRefs.current.get(key)?.focus(), 50)
  }

  function updateSingerRowSearch(key: string, q: string) {
    const excludeIds = [
      regent.memberId,
      reader.memberId,
      ...weekdayRows.filter((r) => r.key !== key && r.memberId).map((r) => r.memberId),
    ].filter(Boolean)
    const results = searchMembers(q, excludeIds)
    setWeekdayRows((prev) => prev.map((r) => r.key === key ? { ...r, search: q, results } : r))

    // Автопрокрутка: инпут к верху скролл-контейнера дравера
    if (results.length > 0) {
      setTimeout(() => {
        const input = newRowInputRefs.current.get(key)
        if (!input) return
        // Найти ближайший scrollable-контейнер через getComputedStyle
        let el: HTMLElement | null = input.parentElement
        while (el) {
          const { overflow, overflowY } = getComputedStyle(el)
          if (/auto|scroll/.test(overflow + overflowY)) break
          el = el.parentElement
        }
        if (!el) return
        const inputTop = input.getBoundingClientRect().top
        const containerTop = el.getBoundingClientRect().top
        el.scrollBy({ top: inputTop - containerTop - 12, behavior: 'smooth' })
      }, 60)
    }
  }

  function selectSingerMember(key: string, m: Member) {
    const price = getPriceForMember(m, resolvedType, 'singer')   // слот = певчий
    setEmptyError(false)
    setWeekdayRows((prev) =>
      prev.map((r) => r.key === key
        ? { ...r, memberId: m._id, memberName: memberDisplayName(m.name, m.patronymic), basePrice: price, bonus: 0, fine: 0, search: '', results: [] }
        : r
      )
    )
  }

  function updateSingerRowField(key: string, field: 'basePrice' | 'bonus' | 'fine', val: string) {
    const num = parseInt(val, 10) || 0
    setWeekdayRows((prev) => prev.map((r) => r.key === key ? { ...r, [field]: num } : r))
  }

  function removeSingerRow(key: string) {
    setWeekdayRows((prev) => prev.filter((r) => r.key !== key))
  }

  /* ── Сохранение ── */
  async function handleSave() {
    if (!resolvedType) return

    let attendances
    if (choirType === 'festive') {
      const singerAtts = festiveRows
        .filter((r) => r.checked)
        .map((r) => ({ memberId: r.memberId, memberName: r.memberName, basePrice: r.basePrice, bonus: r.bonus, ...(r.fine ? { fine: r.fine } : {}) }))
      attendances = [
        ...(festiveRegent.memberId
          ? [{ memberId: festiveRegent.memberId, memberName: festiveRegent.memberName, basePrice: festiveRegent.basePrice, bonus: festiveRegent.bonus, ...(festiveRegent.fine ? { fine: festiveRegent.fine } : {}), isRegent: true as const }]
          : []),
        ...singerAtts,
      ]
    } else {
      const singerAtts = weekdayRows
        .filter((r) => r.memberId)
        .map((r) => ({ memberId: r.memberId, memberName: r.memberName, basePrice: r.basePrice, bonus: r.bonus, ...(r.fine ? { fine: r.fine } : {}) }))
      attendances = [
        ...(regent.memberId
          ? [{ memberId: regent.memberId, memberName: regent.memberName, basePrice: regent.basePrice, bonus: regent.bonus, ...(regent.fine ? { fine: regent.fine } : {}), isRegent: true as const }]
          : []),
        ...(reader.memberId
          ? [{ memberId: reader.memberId, memberName: reader.memberName, basePrice: reader.basePrice, bonus: reader.bonus, ...(reader.fine ? { fine: reader.fine } : {}), isReader: true as const }]
          : []),
        ...singerAtts,
      ]
    }

    if (attendances.length === 0) { setEmptyError(true); return }
    setEmptyError(false)
    setSaving(true)

    if (editingEvent) {
      await fetch(`/api/events/${editingEvent._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: resolvedType, attendances }),
      })
    } else {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, eventType: resolvedType, attendances }),
      })
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  const checkedCount = choirType === 'festive'
    ? (festiveRegent.memberId ? 1 : 0) + festiveRows.filter((r) => r.checked).length
    : (regent.memberId ? 1 : 0) + (reader.memberId ? 1 : 0) + weekdayRows.filter((r) => r.memberId).length

  /* ─── JSX переиспользуемые части ─── */
  function PriceInputs({
    basePrice, bonus, fine,
    onBasePrice, onBonus, onFine,
  }: {
    basePrice: number; bonus: number; fine: number
    onBasePrice: (v: string) => void; onBonus: (v: string) => void; onFine: (v: string) => void
  }) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-warm-400">цена</span>
          <input
            type="number"
            value={basePrice || ''}
            onChange={(e) => onBasePrice(e.target.value)}
            className="w-20 text-right bg-white border border-warm-200 rounded-lg px-2 py-1 text-sm font-medium text-warm-900"
          />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-warm-400">+доп</span>
          <input
            type="number"
            value={bonus || ''}
            placeholder="0"
            onChange={(e) => onBonus(e.target.value)}
            className="w-16 text-right bg-white border border-warm-200 rounded-lg px-2 py-1 text-sm text-green-700"
          />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-red-400">−штраф</span>
          <input
            type="number"
            value={fine || ''}
            placeholder="0"
            onChange={(e) => onFine(e.target.value)}
            className="w-16 text-right bg-red-50 border border-red-200 rounded-lg px-2 py-1 text-sm text-red-600"
          />
        </div>
      </div>
    )
  }

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      placement="bottom"
      scrollBehavior="inside"
      classNames={{
        base: 'bg-white rounded-t-2xl max-h-[92dvh] flex flex-col overflow-hidden shadow-[0_-8px_40px_rgba(0,0,0,0.15)]',
        header: 'border-b border-warm-200 px-4 pt-2 pb-3 shrink-0',
        body: 'overflow-y-auto px-4 py-4',
        footer: 'border-t border-warm-200 bg-white px-4 py-3 shrink-0',
        closeButton: 'hidden',
      }}
    >
      <DrawerContent>
        {(closeDrawer) => (
          <>
            <DrawerHeader className="flex-col gap-0">
              <div className="flex justify-center pt-1 pb-2 w-full">
                <div className="w-10 h-1 rounded-full bg-warm-300" />
              </div>
              <div className="flex items-center gap-2 w-full">
                {step === 'members' && !editingEvent && (
                  <button
                    onClick={goToType}
                    className="w-8 h-8 rounded-xl bg-warm-100 text-warm-600 flex items-center justify-center shrink-0 active:bg-warm-200 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M15.5695 4.43057C15.8841 4.70014 15.9205 5.17361 15.6509 5.48811L10.0693 12L15.6509 18.5119C15.9205 18.8264 15.8841 19.2999 15.5695 19.5695C15.255 19.839 14.7816 19.8026 14.512 19.4881L8.51192 12.4881C8.27128 12.2072 8.27128 11.7928 8.51192 11.5119L14.512 4.51192C14.7816 4.19743 15.255 4.161 15.5695 4.43057Z" fill="currentColor"/>
                    </svg>
                  </button>
                )}
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="text-base font-bold text-warm-900 truncate">
                    {editingEvent
                      ? `Редактировать: ${editingEvent.eventType}`
                      : step === 'type' ? 'Новый выход' : resolvedType || 'Певчие'}
                  </span>
                  {step === 'members' && checkedCount > 0 && (
                    <span className="text-xs text-warm-500 shrink-0 ml-2">
                      {checkedCount} {plural(checkedCount, choirType === 'weekday' ? PARTICIPANT : SINGER)}
                    </span>
                  )}
                </div>
              </div>
            </DrawerHeader>

            <DrawerBody>
              <div key={stepKey} className={animDir === 'right' ? 'anim-slide-right' : 'anim-slide-left'}>

                {/* ── Шаг 1: тип выхода ── */}
                {step === 'type' && (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold text-warm-600 uppercase tracking-wide">Тип выхода</p>
                    {typesLoading ? (
                      <div className="flex justify-center py-6"><LoadingSpinner size="lg" color="#9b7653" /></div>
                    ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {[...eventTypeDocs.map((et) => et.name), 'Другое'].map((t) => {
                        const active = eventType === t
                        return (
                          <button
                            key={t}
                            onClick={() => setEventType(t)}
                            className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                              active ? 'text-white border-transparent' : 'bg-white border-warm-200 text-warm-700 active:bg-warm-50'
                            }`}
                            style={active ? { background: 'linear-gradient(to right, #bd9673, #7d5e42)' } : {}}
                          >
                            {t}
                          </button>
                        )
                      })}
                    </div>
                    )}
                    {!typesLoading && eventType === 'Другое' && (
                      <input
                        className="warm-input"
                        placeholder="Введите название выхода"
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value)}
                        autoFocus
                      />
                    )}
                  </div>
                )}

                {/* ── Шаг 2: певчие ── */}
                {step === 'members' && (
                  <>
                    {membersLoading ? (
                      <div className="flex justify-center py-8"><LoadingSpinner size="lg" color="#9b7653" /></div>
                    ) : (

                      /* ══ ПРАЗДНИЧНЫЙ ХОР ══ */
                      choirType === 'festive' ? (
                        <div className="flex flex-col gap-1.5">

                          {/* ── Регент ── */}
                          <div className="mb-2">
                            <p className="text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-2">Регент</p>
                            {festiveRegent.memberId ? (
                              <div className="flex items-center gap-2 bg-warm-50 border border-warm-200 rounded-xl px-3 py-2.5">
                                <span className="flex-1 text-sm font-slab font-semibold text-warm-900">{shortName(festiveRegent.memberName)}</span>
                                <PriceInputs
                                  basePrice={festiveRegent.basePrice} bonus={festiveRegent.bonus} fine={festiveRegent.fine}
                                  onBasePrice={(v) => setFestiveRegent((r) => ({ ...r, basePrice: parseInt(v) || 0 }))}
                                  onBonus={(v) => setFestiveRegent((r) => ({ ...r, bonus: parseInt(v) || 0 }))}
                                  onFine={(v) => setFestiveRegent((r) => ({ ...r, fine: parseInt(v) || 0 }))}
                                />
                                <button onClick={() => setFestiveRegent(emptySlot())} className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center shrink-0 active:bg-red-100">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  className="warm-input"
                                  placeholder="Поиск по фамилии..."
                                  value={festiveRegent.search}
                                  onChange={(e) => handleFestiveRegentSearch(e.target.value)}
                                  autoComplete="off"
                                />
                                {festiveRegent.results.length > 0 && (
                                  <div className="absolute z-10 top-full left-0 right-0 bg-white border border-warm-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                                    {festiveRegent.results.map((m) => (
                                      <button
                                        key={m._id}
                                        className="w-full text-left px-4 py-3 text-sm border-b border-warm-100 last:border-b-0 active:bg-warm-50 flex items-center gap-2"
                                        onClick={() => selectFestiveRegent(m)}
                                      >
                                        <span className="font-semibold text-warm-900 flex-1">{memberDisplayName(m.name, m.patronymic)}</span>
                                        {m.role === 'regent' && <span className="text-xs text-warm-400 shrink-0">Регент</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <p className="text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-1">Певчие</p>

                          {festiveRows.map((row) => {
                            const isRegent = row.memberId === festiveRegent.memberId && !!festiveRegent.memberId
                            return (
                            <div
                              key={row.memberId}
                              onClick={() => !isRegent && updateFestiveRow(row.memberId, 'checked', !row.checked)}
                              className={`rounded-2xl transition-all ${
                                isRegent
                                  ? 'border border-warm-100 bg-warm-50 opacity-40 cursor-not-allowed'
                                  : row.checked
                                    ? 'border-2 border-warm-300 cursor-pointer'
                                    : 'border border-warm-100 bg-white cursor-pointer'
                              }`}
                              style={!isRegent && row.checked ? { background: 'linear-gradient(135deg, #fdf4ec, #fbeadc)' } : {}}
                            >
                              <div className="flex items-center gap-3 px-3 py-2.5">
                                {/* Круглая галочка */}
                                <div
                                  style={{
                                    width: 22, height: 22, borderRadius: '50%',
                                    border: `2px solid ${row.checked ? '#7d5e42' : '#d4c0ac'}`,
                                    background: row.checked ? '#7d5e42' : 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                                  }}
                                >
                                  {row.checked && (
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                      <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </div>
                                <span
                                  className={`flex-1 text-sm font-medium transition-colors ${
                                    row.checked ? 'text-warm-900' : 'text-warm-600'
                                  }`}
                                >
                                  {shortName(row.memberName)}
                                </span>
                                {row.checked && (
                                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-warm-400">цена</span>
                                      <input
                                        type="number"
                                        value={row.basePrice || ''}
                                        onChange={(e) => updateFestiveRow(row.memberId, 'basePrice', parseInt(e.target.value) || 0)}
                                        className="w-20 text-right bg-white border border-warm-200 rounded-lg px-2 py-1 text-sm font-medium text-warm-900"
                                      />
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-warm-400">+доп</span>
                                      <input
                                        type="number"
                                        value={row.bonus || ''}
                                        placeholder="0"
                                        onChange={(e) => updateFestiveRow(row.memberId, 'bonus', parseInt(e.target.value) || 0)}
                                        className="w-16 text-right bg-white border border-warm-200 rounded-lg px-2 py-1 text-sm text-green-700"
                                      />
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-red-400">−штраф</span>
                                      <input
                                        type="number"
                                        value={row.fine || ''}
                                        placeholder="0"
                                        onChange={(e) => updateFestiveRow(row.memberId, 'fine', parseInt(e.target.value) || 0)}
                                        className="w-16 text-right bg-red-50 border border-red-200 rounded-lg px-2 py-1 text-sm text-red-600"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            )
                          })}
                        </div>

                      ) : (
                        /* ══ БУДНИЙ ХОР ══ */
                        <div className="flex flex-col gap-4">

                          {/* ── Регент ── */}
                          <div>
                            <p className="text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-2">Регент</p>
                            {regent.memberId ? (
                              <div className="flex items-center gap-2 bg-warm-50 border border-warm-200 rounded-xl px-3 py-2.5">
                                <span className="flex-1 text-sm font-slab font-semibold text-warm-900">{shortName(regent.memberName)}</span>
                                <PriceInputs
                                  basePrice={regent.basePrice} bonus={regent.bonus} fine={regent.fine}
                                  onBasePrice={(v) => setRegent((r) => ({ ...r, basePrice: parseInt(v) || 0 }))}
                                  onBonus={(v) => setRegent((r) => ({ ...r, bonus: parseInt(v) || 0 }))}
                                  onFine={(v) => setRegent((r) => ({ ...r, fine: parseInt(v) || 0 }))}
                                />
                                <button onClick={clearRegent} className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center shrink-0 active:bg-red-100">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  ref={regentInputRef}
                                  className="warm-input"
                                  placeholder="Поиск по фамилии..."
                                  value={regent.search}
                                  onChange={(e) => handleRegentSearch(e.target.value)}
                                  autoComplete="off"
                                />
                                {regent.results.length > 0 && (
                                  <div className="absolute z-10 top-full left-0 right-0 bg-white border border-warm-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                                    {regent.results.map((m) => (
                                      <button
                                        key={m._id}
                                        className="w-full text-left px-4 py-3 text-sm border-b border-warm-100 last:border-b-0 active:bg-warm-50 flex items-center gap-2"
                                        onClick={() => selectRegent(m)}
                                      >
                                        <span className="font-semibold text-warm-900 flex-1">{memberDisplayName(m.name, m.patronymic)}</span>
                                        {m.role === 'regent' && <span className="text-xs text-warm-400 shrink-0">Регент</span>}
                                        {m.role === 'reader' && <span className="text-xs text-warm-400 shrink-0">Чтец</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ── Чтец ── */}
                          <div>
                            <p className="text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-2">Чтец</p>
                            {reader.memberId ? (
                              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                                <span className="flex-1 text-sm font-slab font-semibold text-warm-900">{shortName(reader.memberName)}</span>
                                <PriceInputs
                                  basePrice={reader.basePrice} bonus={reader.bonus} fine={reader.fine}
                                  onBasePrice={(v) => setReader((r) => ({ ...r, basePrice: parseInt(v) || 0 }))}
                                  onBonus={(v) => setReader((r) => ({ ...r, bonus: parseInt(v) || 0 }))}
                                  onFine={(v) => setReader((r) => ({ ...r, fine: parseInt(v) || 0 }))}
                                />
                                <button onClick={clearReader} className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center shrink-0 active:bg-red-100">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  className="warm-input"
                                  placeholder="Поиск по фамилии..."
                                  value={reader.search}
                                  onChange={(e) => handleReaderSearch(e.target.value)}
                                  autoComplete="off"
                                />
                                {reader.results.length > 0 && (
                                  <div className="absolute z-10 top-full left-0 right-0 bg-white border border-warm-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                                    {reader.results.map((m) => (
                                      <button
                                        key={m._id}
                                        className="w-full text-left px-4 py-3 text-sm border-b border-warm-100 last:border-b-0 active:bg-warm-50 flex items-center gap-2"
                                        onClick={() => selectReader(m)}
                                      >
                                        <span className="font-semibold text-warm-900 flex-1">{memberDisplayName(m.name, m.patronymic)}</span>
                                        {m.role === 'reader' && <span className="text-xs text-warm-400 shrink-0">Чтец</span>}
                                        <span className="text-xs text-warm-400 shrink-0">{getPriceForMember(m, resolvedType, 'reader')} ₽</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ── Певчие ── */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide">Певчие</p>
                              <span className="text-xs text-warm-400">{weekdayRows.filter((r) => r.memberId).length} чел.</span>
                            </div>

                            <div className="flex flex-col gap-2">
                              {weekdayRows.map((row) => (
                                <div key={row.key}>
                                  {row.memberId ? (
                                    <div className="flex items-center gap-2 bg-white border border-warm-200 rounded-xl px-3 py-2.5">
                                      <span className="flex-1 text-sm text-warm-900 font-medium">{shortName(row.memberName)}</span>
                                      <div className="flex items-center gap-1.5">
                                        <div className="flex flex-col items-end">
                                          <span className="text-[10px] text-warm-400">цена</span>
                                          <input
                                            type="number"
                                            value={row.basePrice || ''}
                                            onChange={(e) => updateSingerRowField(row.key, 'basePrice', e.target.value)}
                                            className="w-20 text-right bg-warm-50 border border-warm-200 rounded-lg px-2 py-1 text-sm font-medium"
                                          />
                                        </div>
                                        <div className="flex flex-col items-end">
                                          <span className="text-[10px] text-warm-400">+доп</span>
                                          <input
                                            type="number"
                                            value={row.bonus || ''}
                                            placeholder="0"
                                            onChange={(e) => updateSingerRowField(row.key, 'bonus', e.target.value)}
                                            className="w-16 text-right bg-warm-50 border border-warm-200 rounded-lg px-2 py-1 text-sm text-green-700"
                                          />
                                        </div>
                                        <div className="flex flex-col items-end">
                                          <span className="text-[10px] text-red-400">−штраф</span>
                                          <input
                                            type="number"
                                            value={row.fine || ''}
                                            placeholder="0"
                                            onChange={(e) => updateSingerRowField(row.key, 'fine', e.target.value)}
                                            className="w-16 text-right bg-red-50 border border-red-200 rounded-lg px-2 py-1 text-sm text-red-600"
                                          />
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => removeSingerRow(row.key)}
                                        className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center shrink-0 active:bg-red-100"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="relative">
                                      <div className="flex items-center gap-2">
                                        <input
                                          ref={(el) => {
                                            if (el) newRowInputRefs.current.set(row.key, el)
                                            else newRowInputRefs.current.delete(row.key)
                                          }}
                                          className="warm-input flex-1"
                                          placeholder="Поиск по фамилии..."
                                          value={row.search}
                                          onChange={(e) => updateSingerRowSearch(row.key, e.target.value)}
                                          autoComplete="off"
                                        />
                                        <button
                                          onClick={() => removeSingerRow(row.key)}
                                          className="w-9 h-9 rounded-xl bg-red-50 text-red-400 flex items-center justify-center shrink-0 active:bg-red-100"
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                          </svg>
                                        </button>
                                      </div>
                                      {row.results.length > 0 && (
                                        <div className="absolute z-10 top-full left-0 right-0 bg-white border border-warm-200 rounded-xl shadow-lg mt-1 overflow-hidden" style={{ right: '44px' }}>
                                          {row.results.map((m) => (
                                            <button
                                              key={m._id}
                                              className="w-full text-left px-4 py-3 text-sm border-b border-warm-100 last:border-b-0 active:bg-warm-50 flex items-center gap-2"
                                              onClick={() => selectSingerMember(row.key, m)}
                                            >
                                              <span className="font-semibold text-warm-900 flex-1">{memberDisplayName(m.name, m.patronymic)}</span>
                                              {m.role === 'reader' && <span className="text-xs text-warm-400 shrink-0">Чтец</span>}
                                              <span className="text-xs text-warm-400 shrink-0">{getPriceForMember(m, resolvedType, 'singer')} ₽</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}

                              <button
                                onClick={addSingerRow}
                                className="w-full py-2.5 rounded-xl border border-dashed border-warm-300 text-warm-500 text-sm font-medium flex items-center justify-center gap-2 active:bg-warm-50 transition-colors"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path fillRule="evenodd" clipRule="evenodd" d="M12 3.25C12.4142 3.25 12.75 3.58579 12.75 4V11.25H20C20.4142 11.25 20.75 11.5858 20.75 12C20.75 12.4142 20.4142 12.75 20 12.75H12.75V20C12.75 20.4142 12.4142 20.75 12 20.75C11.5858 20.75 11.25 20.4142 11.25 20V12.75H4C3.58579 12.75 3.25 12.4142 3.25 12C3.25 11.5858 3.58579 11.25 4 11.25H11.25V4C11.25 3.58579 11.5858 3.25 12 3.25Z" fill="currentColor"/>
                                </svg>
                                Добавить певчего
                              </button>
                            </div>
                          </div>

                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </DrawerBody>

            <DrawerFooter style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
              {emptyError && step === 'members' && (
                <p className="w-full text-center text-sm text-red-500 pb-1">
                  {choirType === 'weekday' ? 'Добавьте хотя бы одного участника' : 'Выберите хотя бы одного певчего'}
                </p>
              )}
              <button
                onClick={closeDrawer}
                className="flex-1 py-3 rounded-xl border border-warm-200 text-warm-700 text-sm font-semibold active:bg-warm-50"
              >
                Отмена
              </button>

              {step === 'type' ? (
                <button
                  onClick={goToMembers}
                  disabled={!eventType || (eventType === 'Другое' && !customType.trim())}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}
                >
                  Далее →
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || !resolvedType}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}
                >
                  {saving && <LoadingSpinner size="sm" color="white" />}
                  {editingEvent ? 'Сохранить' : 'Добавить'}
                </button>
              )}
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
