'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, Select, SelectItem, Input, Checkbox, Divider, Chip, Spinner,
} from '@heroui/react'
import type { ChoirEvent, Member, Attendance } from '@/lib/types'
import { EVENT_TYPES, DEFAULT_PRICES, pricesToMap } from '@/lib/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  date: string
  choirType: 'festive' | 'weekday'
  editingEvent: ChoirEvent | null
  onSaved: () => void
}

interface AttendanceRow {
  memberId: string
  memberName: string
  basePrice: number
  bonus: number
  checked: boolean
}

const ALL_EVENT_TYPES = [...EVENT_TYPES, 'Другое']

export function AddEventModal({ isOpen, onClose, date, choirType, editingEvent, onSaved }: Props) {
  const [step, setStep] = useState<'type' | 'members'>('type')
  const [eventType, setEventType] = useState('')
  const [customType, setCustomType] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [membersLoading, setMembersLoading] = useState(false)

  // Weekday: search results
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [weekdayRows, setWeekdayRows] = useState<AttendanceRow[]>([])

  const loadMembers = useCallback(async () => {
    setMembersLoading(true)
    const res = await fetch('/api/members')
    if (res.ok) {
      const data: Member[] = await res.json()
      setMembers(data)
    }
    setMembersLoading(false)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    loadMembers()

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
      setWeekdayRows([])
      setSearch('')
    }
  }, [isOpen, editingEvent, loadMembers])

  // Build rows for festive choir when event type and members are ready
  useEffect(() => {
    if (choirType !== 'festive' || !eventType || members.length === 0) return

    const resolvedType = eventType === 'Другое' ? customType : eventType
    const existingAtt = editingEvent?.attendances || []

    const newRows: AttendanceRow[] = members.map((m) => {
      const existing = existingAtt.find((a) => a.memberId === m._id)
      const basePrice = existing?.basePrice ?? getPriceForMember(m, resolvedType)
      return {
        memberId: m._id,
        memberName: m.name,
        basePrice,
        bonus: existing?.bonus ?? 0,
        checked: !!existing,
      }
    })
    setRows(newRows)
  }, [members, eventType, customType, choirType, editingEvent])

  // Weekday: populate from existing event
  useEffect(() => {
    if (choirType !== 'weekday' || !editingEvent || members.length === 0) return
    const att = editingEvent.attendances
    setWeekdayRows(att.map((a) => ({
      memberId: a.memberId,
      memberName: a.memberName,
      basePrice: a.basePrice,
      bonus: a.bonus,
      checked: true,
    })))
  }, [choirType, editingEvent, members])

  function getPriceForMember(m: Member, type: string): number {
    const priceMap = pricesToMap(m.defaultPrices)
    const custom = priceMap[type]
    if (custom !== undefined) return custom * m.regentMultiplier
    const defaults = DEFAULT_PRICES[type]
    if (defaults) return defaults[m.role] * m.regentMultiplier
    return 0
  }

  function handleSearch(q: string) {
    setSearch(q)
    if (!q.trim()) { setSearchResults([]); return }
    const q2 = q.toLowerCase()
    setSearchResults(
      members
        .filter((m) => m.name.toLowerCase().includes(q2))
        .filter((m) => !weekdayRows.some((r) => r.memberId === m._id))
        .slice(0, 6)
    )
  }

  function addWeekdayMember(m: Member) {
    const resolvedType = eventType === 'Другое' ? customType : eventType
    const row: AttendanceRow = {
      memberId: m._id,
      memberName: m.name,
      basePrice: getPriceForMember(m, resolvedType),
      bonus: 0,
      checked: true,
    }
    setWeekdayRows((prev) => [...prev, row])
    setSearch('')
    setSearchResults([])
  }

  function updateWeekdayRow(idx: number, field: 'basePrice' | 'bonus', val: number) {
    setWeekdayRows((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  function removeWeekdayRow(idx: number) {
    setWeekdayRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateFestiveRow(memberId: string, field: keyof AttendanceRow, val: unknown) {
    setRows((prev) => prev.map((r) => r.memberId === memberId ? { ...r, [field]: val } : r))
  }

  async function handleSave() {
    const resolvedType = eventType === 'Другое' ? customType.trim() : eventType
    if (!resolvedType) return

    let attendances: Attendance[]
    if (choirType === 'festive') {
      attendances = rows
        .filter((r) => r.checked)
        .map((r) => ({ memberId: r.memberId, memberName: r.memberName, basePrice: r.basePrice, bonus: r.bonus }))
    } else {
      attendances = weekdayRows.map((r) => ({
        memberId: r.memberId, memberName: r.memberName, basePrice: r.basePrice, bonus: r.bonus,
      }))
    }

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
    ? rows.filter((r) => r.checked).length
    : weekdayRows.length

  const resolvedType = eventType === 'Другое' ? customType : eventType

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      scrollBehavior="inside"
      classNames={{ base: 'max-w-lg mx-auto', body: 'pb-4' }}
    >
      <ModalContent>
        <ModalHeader>
          {editingEvent ? `Редактировать: ${editingEvent.eventType}` : 'Новый выход'}
        </ModalHeader>

        <ModalBody>
          {/* Step 1: choose event type */}
          {step === 'type' && (
            <div className="flex flex-col gap-3">
              <p className="text-small text-default-500">Тип выхода</p>
              <div className="grid grid-cols-2 gap-2">
                {ALL_EVENT_TYPES.map((t) => (
                  <Button
                    key={t}
                    variant={eventType === t ? 'solid' : 'flat'}
                    color={eventType === t ? 'primary' : 'default'}
                    onPress={() => setEventType(t)}
                    className="h-12"
                  >
                    {t}
                  </Button>
                ))}
              </div>
              {eventType === 'Другое' && (
                <Input
                  label="Название выхода"
                  value={customType}
                  onValueChange={setCustomType}
                  autoFocus
                />
              )}
            </div>
          )}

          {/* Step 2: choose members */}
          {step === 'members' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Chip color="primary" variant="flat" size="sm">{resolvedType || '—'}</Chip>
                </div>
                <span className="text-small text-default-500">{checkedCount} чел.</span>
              </div>

              {membersLoading && <div className="flex justify-center py-8"><Spinner /></div>}

              {/* FESTIVE: checklist */}
              {!membersLoading && choirType === 'festive' && (
                <div className="flex flex-col gap-1">
                  {rows.map((row) => (
                    <div
                      key={row.memberId}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                        row.checked ? 'bg-primary-50' : 'bg-default-50'
                      }`}
                    >
                      <Checkbox
                        isSelected={row.checked}
                        onValueChange={(v) => updateFestiveRow(row.memberId, 'checked', v)}
                        size="md"
                      />
                      <span className="flex-1 text-sm truncate">{row.memberName}</span>
                      {row.checked && (
                        <div className="flex gap-1 items-center">
                          <Input
                            size="sm"
                            type="number"
                            value={String(row.basePrice)}
                            onValueChange={(v) => updateFestiveRow(row.memberId, 'basePrice', Number(v))}
                            className="w-20"
                            classNames={{ input: 'text-right text-sm' }}
                          />
                          {row.bonus > 0 || row.basePrice > 0 ? (
                            <Input
                              size="sm"
                              type="number"
                              placeholder="+доп"
                              value={row.bonus > 0 ? String(row.bonus) : ''}
                              onValueChange={(v) => updateFestiveRow(row.memberId, 'bonus', Number(v) || 0)}
                              className="w-20"
                              classNames={{ input: 'text-right text-sm' }}
                            />
                          ) : (
                            <Button
                              size="sm"
                              variant="light"
                              onPress={() => updateFestiveRow(row.memberId, 'bonus', 0)}
                              className="min-w-0 px-2 text-xs text-default-400"
                            >
                              +доп
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* WEEKDAY: search + list */}
              {!membersLoading && choirType === 'weekday' && (
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Input
                      placeholder="Поиск по фамилии..."
                      value={search}
                      onValueChange={handleSearch}
                      autoComplete="off"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 bg-white border border-divider rounded-lg shadow-lg mt-1 overflow-hidden">
                        {searchResults.map((m) => (
                          <button
                            key={m._id}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary-50 border-b border-divider last:border-b-0"
                            onClick={() => addWeekdayMember(m)}
                          >
                            <span className="font-medium">{m.name}</span>
                            <span className="ml-2 text-xs text-default-400">
                              {m.role === 'soloist' ? 'Солист' : m.role === 'regent' ? 'Регент' : 'Певчий'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {weekdayRows.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {weekdayRows.map((row, idx) => (
                        <div key={row.memberId} className="flex items-center gap-2 bg-primary-50 p-2 rounded-lg">
                          <span className="flex-1 text-sm">{row.memberName}</span>
                          <Input
                            size="sm"
                            type="number"
                            value={String(row.basePrice)}
                            onValueChange={(v) => updateWeekdayRow(idx, 'basePrice', Number(v))}
                            className="w-20"
                            classNames={{ input: 'text-right text-sm' }}
                          />
                          <Input
                            size="sm"
                            type="number"
                            placeholder="+доп"
                            value={row.bonus > 0 ? String(row.bonus) : ''}
                            onValueChange={(v) => updateWeekdayRow(idx, 'bonus', Number(v) || 0)}
                            className="w-20"
                            classNames={{ input: 'text-right text-sm' }}
                          />
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={() => removeWeekdayRow(idx)}
                            className="min-w-0 px-2"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={onClose}>Отмена</Button>
          {step === 'type' ? (
            <Button
              color="primary"
              isDisabled={!eventType || (eventType === 'Другое' && !customType.trim())}
              onPress={() => setStep('members')}
            >
              Далее
            </Button>
          ) : (
            <div className="flex gap-2">
              {!editingEvent && (
                <Button variant="flat" onPress={() => setStep('type')}>← Назад</Button>
              )}
              <Button color="primary" isLoading={saving} onPress={handleSave}>
                Сохранить
              </Button>
            </div>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
