'use client'

import { useState, useEffect, useCallback } from 'react'
import { Spinner } from '@heroui/react'
import { useSession } from '@/hooks/useSession'
import { PageHeader } from '@/components/PageHeader'
import type { ChoirEvent } from '@/lib/types'
import { plural, SINGER, EVENT } from '@/lib/plural'

function monthStr(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return d.toISOString().slice(0, 7)
}

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export default function ExportPage() {
  const { session } = useSession()
  const [month, setMonth] = useState(monthStr())
  const [events, setEvents] = useState<ChoirEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const [y, m] = month.split('-').map(Number)
  const monthLabel = `${MONTHS_RU[m - 1]} ${y}`

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/events?month=${month}`)
    if (res.ok) setEvents(await res.json())
    setLoading(false)
  }, [month])

  useEffect(() => { load() }, [load])

  function changeMonth(delta: number) {
    const [ym, mm] = month.split('-').map(Number)
    const d = new Date(ym, mm - 1 + delta, 1)
    setMonth(d.toISOString().slice(0, 7))
  }

  async function handleExport() {
    setDownloading(true)
    const res = await fetch(`/api/export?month=${month}`)
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disp = res.headers.get('Content-Disposition') || ''
      const match = disp.match(/filename\*=UTF-8''(.+)/)
      a.download = match ? decodeURIComponent(match[1]) : `Табель_${month}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    }
    setDownloading(false)
  }

  const totalAmount = events.reduce(
    (sum, ev) => sum + ev.attendances.reduce((s, a) => s + a.basePrice + a.bonus, 0),
    0
  )
  const uniqueMembers = new Set(events.flatMap((ev) => ev.attendances.map((a) => a.memberId))).size

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Экспорт"
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
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { value: events.length,   label: plural(events.length, EVENT) },
                { value: uniqueMembers,   label: plural(uniqueMembers, SINGER) },
                { value: totalAmount > 0 ? `${(totalAmount / 1000).toFixed(1)}к` : '0', label: 'рублей' },
              ].map(({ value, label }) => (
                <div key={label} className="warm-card p-3 text-center">
                  <p className="text-xl font-slab font-bold gradient-text">{value}</p>
                  <p className="text-xs text-warm-400 mt-0.5 font-slab">{label}</p>
                </div>
              ))}
            </div>

            {/* Event list */}
            {events.length > 0 && (
              <div className="warm-card overflow-hidden mb-4">
                <table className="warm-table">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Тип</th>
                      <th className="text-right">Певчих</th>
                      <th className="text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...events]
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((ev) => {
                        const evTotal = ev.attendances.reduce((s, a) => s + a.basePrice + a.bonus, 0)
                        const [, , d] = ev.date.split('-').map(Number)
                        return (
                          <tr key={ev._id}>
                            <td className="text-warm-500 tabular-nums text-xs">{d}</td>
                            <td>
                              <span className="text-xs font-slab font-medium text-warm-700">{ev.eventType}</span>
                            </td>
                            <td className="text-right text-warm-500 text-xs tabular-nums">
                              {ev.attendances.length}
                            </td>
                            <td className="text-right font-slab font-semibold text-warm-800 tabular-nums text-sm">
                              {evTotal.toLocaleString('ru-RU')} ₽
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                  {events.length > 0 && (
                    <tfoot>
                      <tr className="bg-warm-50">
                        <td colSpan={3} className="font-slab font-bold text-warm-900 text-sm">Итого</td>
                        <td className="text-right font-slab font-bold text-warm-900 tabular-nums">
                          {totalAmount.toLocaleString('ru-RU')} ₽
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {events.length === 0 && (
              <div className="warm-card p-8 text-center mb-4">
                <div className="text-4xl mb-3">📭</div>
                <p className="font-slab font-semibold text-warm-700">Нет данных</p>
                <p className="text-sm text-warm-400 mt-1">За {monthLabel} выходов не найдено</p>
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={downloading || events.length === 0}
              className="w-full py-3.5 rounded-xl text-white font-slab font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}
            >
              {downloading ? (
                <Spinner size="sm" color="white" />
              ) : (
                '📥'
              )}
              Скачать Excel — {monthLabel}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
