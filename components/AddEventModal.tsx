'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter,
  Spinner,
} from '@heroui/react'
import type { ChoirEvent, Member } from '@/lib/types'
import { EVENT_TYPES, DEFAULT_PRICES, pricesToMap } from '@/lib/types'
import { plural, SINGER } from '@/lib/plural'

interface Props {
  isOpen: boolean
  onClose: () => void
  date: string
  choirType: 'festive' | 'weekday'
  editingEvent: ChoirEvent | null
  onSaved: () => void
}

interface Row {
  memberId: string
  memberName: string
  basePrice: number
  bonus: number
  checked: boolean
}

const ALL_TYPES = [...EVENT_TYPES, 'Другое'] as const

export function AddEventModal({ isOpen, onClose, date, choirType, editingEvent, onSaved }: Props) {
  const [step, setStep] = useState<'type' | 'members'>('type')
  const [eventType, setEventType] = useState('')
  const [customType, setCustomType] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [weekdayRows, setWeekdayRows] = useState<Row[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [saving, setSaving] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const resolvedType = eventType === 'Другое' ? customType.trim() : eventType

  // Загрузка певчих при открытии
  useEffect(() => {
    if (!isOpen) return
    setMembersLoading(true)
    fetch('/api/members')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Member[]) => {
        setMembers(data)
        setMembersLoading(false)
      })
  }, [isOpen])

  // Инициализация при открытии
  useEffect(() => {
    if (!isOpen) return
    if (editingEvent) {
      const et = editingEvent.eventType
      if ((EVENT_TYPES as readonly string[]).includes(et)) {
        setEventType(et)
      } else {
        setEventType('Другое')
        setCustomType(et)
      }
      setStep('members')
    } else {
      setStep('type')
      setEventType('')
      setCustomType('')
      setSearch('')
      setSearchResults([])
      setWeekdayRows([])
      setRows([])
    }
  }, [isOpen, editingEvent])

  // Строки праздничного хора
  useEffect(() => {
    if (choirType !== 'festive' || !resolvedType || members.length === 0) return
    const existingAtt = editingEvent?.attendances || []
    const newRows: Row[] = members.map((m) => {
      const existing = existingAtt.find((a) => a.memberId === m._id)
      const priceMap = pricesToMap(m.defaultPrices)
      const basePrice = existing?.basePrice ?? (
        priceMap[resolvedType] !== undefined
          ? priceMap[resolvedType] * m.regentMultiplier
          : (DEFAULT_PRICES[resolvedType]?.[m.role] ?? 0) * m.regentMultiplier
      )
      return {
        memberId: m._id,
        memberName: m.name,
        basePrice,
        bonus: existing?.bonus ?? 0,
        checked: !!existing,
      }
    })
    setRows(newRows)
  }, [members, resolvedType, choirType, editingEvent])

  // Строки буднего хора из редактируемого события
  useEffect(() => {
    if (choirType !== 'weekday' || !editingEvent) return
    setWeekdayRows(
      editingEvent.attendances.map((a) => ({
        memberId: a.memberId,
        memberName: a.memberName,
        basePrice: a.basePrice,
        bonus: a.bonus,
        checked: true,
      }))
    )
  }, [choirType, editingEvent, isOpen])

  function getPriceForMember(m: Member, type: string): number {
    const priceMap = pricesToMap(m.defaultPrices)
    const p = priceMap[type]
    if (p !== undefined) return p * m.regentMultiplier
    return (DEFAULT_PRICES[type]?.[m.role] ?? 0) * m.regentMultiplier
  }

  function handleSearch(q: string) {
    setSearch(q)
    if (!q.trim()) { setSearchResults([]); return }
    const q2 = q.toLowerCase()
    setSearchResults(
      members
        .filter((m) => m.name.toLowerCase().includes(q2))
        .filter((m) => !weekdayRows.some((r) => r.memberId === m._id))
        .slice(0, 8)
    )
  }

  function addWeekdayMember(m: Member) {
    const price = getPriceForMember(m, resolvedType)
    setWeekdayRows((prev) => [
      ...prev,
      { memberId: m._id, memberName: m.name, basePrice: price, bonus: 0, checked: true },
    ])
    setSearch('')
    setSearchResults([])
    searchRef.current?.focus()
  }

  function updateRow(idx: number, field: 'basePrice' | 'bonus', val: string) {
    const num = parseInt(val, 10) || 0
    setWeekdayRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: num } : r)))
  }

  function updateFestiveRow(id: string, field: 'basePrice' | 'bonus' | 'checked', val: unknown) {
    setRows((prev) =>
      prev.map((r) => (r.memberId === id ? { ...r, [field]: val } : r))
    )
  }

  async function handleSave() {
    if (!resolvedType) return
    setSaving(true)
    const attendances =
      choirType === 'festive'
        ? rows.filter((r) => r.checked).map((r) => ({
            memberId: r.memberId, memberName: r.memberName,
            basePrice: r.basePrice, bonus: r.bonus,
          }))
        : weekdayRows.map((r) => ({
            memberId: r.memberId, memberName: r.memberName,
            basePrice: r.basePrice, bonus: r.bonus,
          }))

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

  const checkedCount = choirType === 'festive' ? rows.filter((r) => r.checked).length : weekdayRows.length

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose() }}
      placement="bottom"
      scrollBehavior="inside"
      classNames={{
        base: 'bg-page rounded-t-2xl max-h-[92dvh]',
        header: 'border-b border-warm-200 py-3 px-4',
        body: 'px-4 py-4',
        footer: 'border-t border-warm-200 bg-white px-4 py-3',
        closeButton: 'hidden',
      }}
    >
      <DrawerContent>
        {(closeDrawer) => (
        <>
        {/* Ручка */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 rounded-full bg-warm-300" />
        </div>

        <DrawerHeader className="flex items-center justify-between">
          <span className="text-base font-bold text-warm-900">
            {editingEvent ? `Редактировать: ${editingEvent.eventType}` : 'Новый выход'}
          </span>
          {checkedCount > 0 && (
            <span className="text-xs text-warm-500">
              {checkedCount} {plural(checkedCount, SINGER)}
            </span>
          )}
        </DrawerHeader>

        <DrawerBody>
          {/* Шаг 1: тип выхода */}
          {step === 'type' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-warm-600 uppercase tracking-wide">
                Тип выхода
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_TYPES.map((t) => {
                  const active = eventType === t
                  return (
                    <button
                      key={t}
                      onClick={() => setEventType(t)}
                      className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                        active
                          ? 'text-white border-transparent'
                          : 'bg-white border-warm-200 text-warm-700 active:bg-warm-50'
                      }`}
                      style={active ? { background: 'linear-gradient(to right, #bd9673, #7d5e42)' } : {}}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
              {eventType === 'Другое' && (
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

          {/* Шаг 2: певчие */}
          {step === 'members' && (
            <>
              {membersLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner color="warning" />
                </div>
              ) : (
                <>
                  {/* Праздничный хор — чеклист */}
                  {choirType === 'festive' && (
                    <div className="flex flex-col gap-1">
                      {rows.map((row) => (
                        <div
                          key={row.memberId}
                          className={`rounded-xl p-2.5 transition-colors ${
                            row.checked ? 'bg-warm-50 border border-warm-200' : 'bg-white border border-warm-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateFestiveRow(row.memberId, 'checked', !row.checked)}
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                row.checked ? 'border-transparent' : 'border-warm-300 bg-white'
                              }`}
                              style={row.checked ? { background: 'linear-gradient(135deg, #bd9673, #7d5e42)' } : {}}
                            >
                              {row.checked && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                            <span
                              className="flex-1 text-sm text-warm-900 cursor-pointer"
                              onClick={() => updateFestiveRow(row.memberId, 'checked', !row.checked)}
                            >
                              {row.memberName}
                            </span>
                            {row.checked && (
                              <div className="flex items-center gap-1.5">
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
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Будний хор — поиск */}
                  {choirType === 'weekday' && (
                    <div className="flex flex-col gap-3">
                      <div className="relative">
                        <input
                          ref={searchRef}
                          className="warm-input"
                          placeholder="Поиск по фамилии..."
                          value={search}
                          onChange={(e) => handleSearch(e.target.value)}
                          autoComplete="off"
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute z-10 top-full left-0 right-0 bg-white border border-warm-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                            {searchResults.map((m) => (
                              <button
                                key={m._id}
                                className="w-full text-left px-4 py-3 text-sm border-b border-warm-100 last:border-b-0 active:bg-warm-50"
                                onClick={() => addWeekdayMember(m)}
                              >
                                <span className="font-semibold text-warm-900">{m.name}</span>
                                <span className="ml-2 text-xs text-warm-400">
                                  {m.role === 'soloist' ? 'Солист' : m.role === 'regent' ? 'Регент' : 'Певчий'}
                                  {' · '}{getPriceForMember(m, resolvedType)} ₽
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {weekdayRows.length > 0 && (
                        <div className="warm-card overflow-hidden">
                          {weekdayRows.map((row, idx) => (
                            <div key={row.memberId} className="flex items-center gap-2 px-3 py-2.5 border-b border-warm-100 last:border-b-0">
                              <span className="flex-1 text-sm font-medium text-warm-900">{row.memberName}</span>
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-warm-400">цена</span>
                                <input
                                  type="number"
                                  value={row.basePrice || ''}
                                  onChange={(e) => updateRow(idx, 'basePrice', e.target.value)}
                                  className="w-20 text-right bg-warm-50 border border-warm-200 rounded-lg px-2 py-1 text-sm font-medium"
                                />
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-warm-400">+доп</span>
                                <input
                                  type="number"
                                  value={row.bonus || ''}
                                  placeholder="0"
                                  onChange={(e) => updateRow(idx, 'bonus', e.target.value)}
                                  className="w-16 text-right bg-warm-50 border border-warm-200 rounded-lg px-2 py-1 text-sm text-green-700"
                                />
                              </div>
                              <button
                                onClick={() => setWeekdayRows((prev) => prev.filter((_, i) => i !== idx))}
                                className="w-7 h-7 rounded-full bg-red-50 text-red-500 text-sm flex items-center justify-center shrink-0 active:bg-red-100"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </DrawerBody>

        <DrawerFooter
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {step === 'members' && !editingEvent && (
            <button
              onClick={() => setStep('type')}
              className="flex-1 py-3 rounded-xl border border-warm-200 text-warm-700 text-sm font-semibold active:bg-warm-50"
            >
              ← Назад
            </button>
          )}
          <button
            onClick={closeDrawer}
            className="flex-1 py-3 rounded-xl border border-warm-200 text-warm-700 text-sm font-semibold active:bg-warm-50"
          >
            Отмена
          </button>

          {step === 'type' ? (
            <button
              onClick={() => setStep('members')}
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
              {saving && <Spinner size="sm" color="white" />}
              Сохранить
            </button>
          )}
        </DrawerFooter>
        </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
