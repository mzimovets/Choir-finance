'use client'

import { useState, useEffect, useCallback } from 'react'
import { Spinner, Drawer, DrawerContent, DrawerHeader, DrawerBody } from '@heroui/react'
import { useSession } from '@/hooks/useSession'
import { PageHeader } from '@/components/PageHeader'
import type { ChoirEvent, Member } from '@/lib/types'
import { plural, SINGER } from '@/lib/plural'

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface MemberStat {
  member: Member
  events: number
  total: number
  rows: { date: string; eventType: string; basePrice: number; bonus: number }[]
}

export default function StatsPage() {
  const { session } = useSession()
  const [month, setMonth] = useState(currentMonthStr)
  const [stats, setStats] = useState<MemberStat[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MemberStat | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [evRes, mbRes] = await Promise.all([
      fetch(`/api/events?month=${month}`),
      fetch('/api/members'),
    ])
    const events: ChoirEvent[] = evRes.ok ? await evRes.json() : []
    const mbs: Member[] = mbRes.ok ? await mbRes.json() : []

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

  // ✅ Исправлен баг: toISOString использует UTC, что сдвигает месяц в UTC+X
  function changeMonth(delta: number) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function openDetail(s: MemberStat) {
    setSelected(s)
    setDrawerOpen(true)
  }

  const [y, mo] = month.split('-').map(Number)
  const monthLabel = `${MONTHS_RU[mo - 1]} ${y}`
  const grandTotal = stats.reduce((s, r) => s + r.total, 0)

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Статистика"
        subtitle={loading ? '' : monthLabel}
        displayName={session?.displayName}
        choirType={session?.choirType}
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => changeMonth(-1)}
              className="w-8 h-8 rounded-lg border border-warm-200 bg-white text-warm-700 text-sm flex items-center justify-center active:bg-warm-50 transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="w-8 h-8 rounded-lg border border-warm-200 bg-white text-warm-700 text-sm flex items-center justify-center active:bg-warm-50 transition-colors"
            >
              →
            </button>
          </div>
        }
      />

      <div className="px-0">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner color="warning" /></div>
        ) : stats.length === 0 ? (
          <div className="mx-2 warm-card p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="font-semibold text-warm-700">Нет данных</p>
            <p className="text-sm text-warm-400 mt-1">За {monthLabel} записей не найдено</p>
          </div>
        ) : (
          <div className="warm-card overflow-hidden mx-2">
            <table className="warm-table">
              <thead>
                <tr>
                  <th>Певчий</th>
                  <th className="text-center w-16">Выходы</th>
                  <th className="text-center">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr
                    key={s.member._id}
                    onClick={() => openDetail(s)}
                    className="cursor-pointer active:bg-warm-50"
                  >
                    <td>
                      <span className="font-semibold text-warm-900">{s.member.name}</span>
                    </td>
                    <td className="text-center tabular-nums text-warm-500 text-sm">
                      {s.events > 0 ? s.events : '—'}
                    </td>
                    <td className="text-center tabular-nums font-semibold text-warm-800">
                      {s.total > 0 ? `${s.total.toLocaleString('ru-RU')} ₽` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-warm-50">
                  <td className="font-bold text-warm-900 text-sm">Итого</td>
                  <td />
                  <td className="text-center font-bold text-warm-900 tabular-nums">
                    {grandTotal.toLocaleString('ru-RU')} ₽
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Drawer с деталями певчего */}
      <Drawer
        isOpen={drawerOpen}
        onOpenChange={(open) => { if (!open) setDrawerOpen(false) }}
        placement="bottom"
        scrollBehavior="inside"
        classNames={{
          base: 'bg-white rounded-t-2xl max-h-[75dvh] shadow-[0_-8px_40px_rgba(0,0,0,0.15)]',
          header: 'border-b border-warm-200 py-3 px-4',
          body: 'px-0 py-0',
          closeButton: 'hidden',
        }}
      >
        <DrawerContent>
          {(close) => (
            <>
              <div className="flex justify-center pt-3 pb-0">
                <div className="w-10 h-1 rounded-full bg-warm-300" />
              </div>
              <DrawerHeader className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-warm-900">{selected?.member.name}</p>
                  <p className="text-xs text-warm-400 mt-0.5">{monthLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-warm-800 tabular-nums">
                    {selected?.total.toLocaleString('ru-RU')} ₽
                  </p>
                  <p className="text-xs text-warm-400">
                    {selected?.events ?? 0} {plural(selected?.events ?? 0, SINGER === SINGER ? ['выход', 'выхода', 'выходов'] : ['выход', 'выхода', 'выходов'])}
                  </p>
                </div>
              </DrawerHeader>
              <DrawerBody>
                {selected && selected.rows.length > 0 ? (
                  <table className="warm-table">
                    <thead>
                      <tr>
                        <th>Дата</th>
                        <th>Тип</th>
                        <th className="text-right">Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...selected.rows]
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((r, i) => {
                          const [, , d] = r.date.split('-').map(Number)
                          return (
                            <tr key={i}>
                              <td className="text-warm-500 text-xs tabular-nums whitespace-nowrap">
                                {d} {MONTHS_RU[mo - 1].toLowerCase().slice(0, 3)}
                              </td>
                              <td className="font-medium text-warm-700 text-xs">{r.eventType}</td>
                              <td className="text-right tabular-nums font-medium text-warm-800">
                                {r.basePrice.toLocaleString('ru-RU')}
                                {r.bonus > 0 && (
                                  <span className="text-green-600 ml-1">+{r.bonus.toLocaleString('ru-RU')}</span>
                                )}
                                {' '}₽
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-warm-50">
                        <td colSpan={2} className="font-bold text-warm-900 text-sm">Итого</td>
                        <td className="text-right font-bold text-warm-900 tabular-nums">
                          {selected.total.toLocaleString('ru-RU')} ₽
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <div className="py-8 text-center text-warm-400">
                    Выходов нет
                  </div>
                )}
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  )
}
