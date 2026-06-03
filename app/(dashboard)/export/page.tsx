'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, Card, CardBody, Spinner, Chip } from '@heroui/react'
import { useSession } from '@/hooks/useSession'
import type { ChoirEvent } from '@/lib/types'

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
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Экспорт в Excel</h1>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="flat" onPress={() => setMonth(monthStr(-1))}>←</Button>
          <span className="text-sm w-32 text-center font-medium">{monthLabel}</span>
          <Button size="sm" variant="flat" onPress={() => setMonth(monthStr(1))}>→</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <>
          <Card className="mb-4">
            <CardBody className="flex flex-col gap-3 p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{events.length}</p>
                  <p className="text-xs text-default-400">выходов</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{uniqueMembers}</p>
                  <p className="text-xs text-default-400">певчих</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {(totalAmount / 1000).toFixed(1)}к
                  </p>
                  <p className="text-xs text-default-400">рублей</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Preview */}
          <div className="flex flex-col gap-2 mb-4">
            {events.length === 0 ? (
              <p className="text-center text-default-400 py-4">Нет данных за {monthLabel}</p>
            ) : (
              events.map((ev) => {
                const evTotal = ev.attendances.reduce((s, a) => s + a.basePrice + a.bonus, 0)
                const [, , d] = ev.date.split('-').map(Number)
                return (
                  <Card key={ev._id}>
                    <CardBody className="flex flex-row items-center gap-2 p-2.5">
                      <span className="text-sm text-default-500 w-6 shrink-0">{d}</span>
                      <Chip size="sm" variant="flat" color="primary">{ev.eventType}</Chip>
                      <span className="text-xs text-default-400">{ev.attendances.length} чел.</span>
                      <span className="ml-auto text-sm font-medium tabular-nums">
                        {evTotal.toLocaleString('ru-RU')} ₽
                      </span>
                    </CardBody>
                  </Card>
                )
              })
            )}
          </div>

          <Button
            color="primary"
            size="lg"
            className="w-full"
            isLoading={downloading}
            isDisabled={events.length === 0}
            onPress={handleExport}
          >
            📥 Скачать Excel ({monthLabel})
          </Button>
        </>
      )}
    </div>
  )
}
