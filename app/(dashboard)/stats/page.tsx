'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card, CardBody, Spinner, Button, Chip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
} from '@heroui/react'
import type { ChoirEvent, Member } from '@/lib/types'

function monthStr(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return d.toISOString().slice(0, 7)
}

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

interface MemberStat {
  member: Member
  events: number
  total: number
  rows: { date: string; eventType: string; basePrice: number; bonus: number }[]
}

export default function StatsPage() {
  const [month, setMonth] = useState(monthStr())
  const [stats, setStats] = useState<MemberStat[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [selected, setSelected] = useState<MemberStat | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [evRes, mbRes] = await Promise.all([
      fetch(`/api/events?month=${month}`),
      fetch('/api/members'),
    ])
    const events: ChoirEvent[] = evRes.ok ? await evRes.json() : []
    const mbs: Member[] = mbRes.ok ? await mbRes.json() : []
    setMembers(mbs)

    const map = new Map<string, MemberStat>()
    mbs.forEach((m) => map.set(m._id, { member: m, events: 0, total: 0, rows: [] }))

    events.forEach((ev) => {
      ev.attendances.forEach((a) => {
        if (!map.has(a.memberId)) return
        const s = map.get(a.memberId)!
        s.events++
        s.total += a.basePrice + a.bonus
        s.rows.push({ date: ev.date, eventType: ev.eventType, basePrice: a.basePrice, bonus: a.bonus })
      })
    })

    const sorted = [...map.values()].sort((a, b) => b.total - a.total)
    setStats(sorted)
    setLoading(false)
  }, [month])

  useEffect(() => { load() }, [load])

  const [y, m] = month.split('-').map(Number)
  const monthLabel = `${MONTHS_RU[m - 1]} ${y}`

  function openDetail(s: MemberStat) {
    setSelected(s)
    onOpen()
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Статистика</h1>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="flat" onPress={() => setMonth(monthStr(-1))}>←</Button>
          <span className="text-sm w-32 text-center font-medium">{monthLabel}</span>
          <Button size="sm" variant="flat" onPress={() => setMonth(monthStr(1))}>→</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-2">
          {stats.map((s) => (
            <Card
              key={s.member._id}
              isPressable
              onPress={() => openDetail(s)}
              className="w-full"
            >
              <CardBody className="flex flex-row items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{s.member.name}</p>
                  <p className="text-xs text-default-400 mt-0.5">{s.events} выходов</p>
                </div>
                <p className="text-base font-bold text-primary tabular-nums">
                  {s.total.toLocaleString('ru-RU')} ₽
                </p>
              </CardBody>
            </Card>
          ))}

          {stats.length > 0 && (
            <Card className="mt-2 bg-primary-50">
              <CardBody className="flex flex-row items-center justify-between p-3">
                <span className="font-bold text-sm">Итого по хору:</span>
                <span className="font-bold text-primary tabular-nums">
                  {stats.reduce((s, r) => s + r.total, 0).toLocaleString('ru-RU')} ₽
                </span>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {/* Detail modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            <div>
              <p className="text-base">{selected?.member.name}</p>
              <p className="text-xs text-default-400 font-normal">{monthLabel}</p>
            </div>
          </ModalHeader>
          <ModalBody>
            {selected && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-sm text-default-500 font-medium pb-1 border-b border-divider">
                  <span>Дата / Тип</span>
                  <span>Сумма</span>
                </div>
                {selected.rows.sort((a, b) => a.date.localeCompare(b.date)).map((r, i) => {
                  const [, , d] = r.date.split('-').map(Number)
                  return (
                    <div key={i} className="flex items-center justify-between py-1 text-sm border-b border-divider last:border-b-0">
                      <div>
                        <span className="text-default-500 mr-2">{d} {MONTHS_RU[m - 1].toLowerCase()}</span>
                        <Chip size="sm" variant="flat" color="primary">{r.eventType}</Chip>
                      </div>
                      <span className="tabular-nums">
                        {r.basePrice.toLocaleString('ru-RU')}
                        {r.bonus > 0 && <span className="text-success ml-1">+{r.bonus.toLocaleString('ru-RU')}</span>}
                        {' '}₽
                      </span>
                    </div>
                  )
                })}
                <div className="flex justify-between font-bold pt-2 text-sm">
                  <span>Итого:</span>
                  <span className="text-primary tabular-nums">{selected.total.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onPress={onClose}>Закрыть</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
