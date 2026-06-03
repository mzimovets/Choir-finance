'use client'

import { useState, useEffect, useCallback } from 'react'
import { Spinner } from '@heroui/react'
import { useSession } from '@/hooks/useSession'
import { PageHeader } from '@/components/PageHeader'
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
  const { session } = useSession()
  const [month, setMonth] = useState(monthStr())
  const [stats, setStats] = useState<MemberStat[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<MemberStat | null>(null)

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

  function changeMonth(delta: number) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonth(d.toISOString().slice(0, 7))
  }

  const [y, mo] = month.split('-').map(Number)
  const monthLabel = `${MONTHS_RU[mo - 1]} ${y}`
  const grandTotal = stats.reduce((s, r) => s + r.total, 0)

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Статистика"
        subtitle={monthLabel}
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

      <div className="px-2">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner color="warning" /></div>
        ) : stats.length === 0 ? (
          <div className="warm-card p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="font-slab font-semibold text-warm-700">Нет данных</p>
            <p className="text-sm text-warm-400 mt-1">За {monthLabel} записей не найдено</p>
          </div>
        ) : (
          <>
            <div className="warm-card overflow-hidden mb-3">
              <table className="warm-table">
                <thead>
                  <tr>
                    <th>Певчий</th>
                    <th className="text-center">Выходы</th>
                    <th className="text-center">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr
                      key={s.member._id}
                      onClick={() => setSelected(selected?.member._id === s.member._id ? null : s)}
                      className="cursor-pointer"
                    >
                      <td>
                        <span className="font-slab font-semibold text-warm-900">{s.member.name}</span>
                      </td>
                      <td className="text-center tabular-nums text-warm-600 text-xs">
                        {s.events}
                      </td>
                      <td className="text-center tabular-nums font-slab font-semibold text-warm-800">
                        {s.total > 0 ? `${s.total.toLocaleString('ru-RU')} ₽` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-warm-50">
                    <td className="font-slab font-bold text-warm-900 text-sm">Итого</td>
                    <td />
                    <td className="text-center font-slab font-bold text-warm-900 tabular-nums">
                      {grandTotal.toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Detail panel */}
            {selected && selected.rows.length > 0 && (
              <div className="warm-card overflow-hidden mb-3">
                <div className="px-4 py-3 border-b border-warm-100 flex items-center justify-between">
                  <p className="font-slab font-bold text-warm-900 text-sm">{selected.member.name}</p>
                  <button
                    onClick={() => setSelected(null)}
                    className="w-6 h-6 rounded-full bg-warm-100 text-warm-500 text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
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
                            <td className="text-warm-500 text-xs tabular-nums">
                              {d} {MONTHS_RU[mo - 1].toLowerCase().slice(0, 3)}
                            </td>
                            <td>
                              <span className="text-xs font-slab font-medium text-warm-700">{r.eventType}</span>
                            </td>
                            <td className="text-right tabular-nums text-sm font-medium text-warm-800">
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
                      <td colSpan={2} className="font-slab font-bold text-warm-900 text-sm">Итого</td>
                      <td className="text-right font-slab font-bold text-warm-900 tabular-nums">
                        {selected.total.toLocaleString('ru-RU')} ₽
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
