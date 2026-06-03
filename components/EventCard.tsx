'use client'

import { useState } from 'react'
import { Card, CardBody, Chip, Button } from '@heroui/react'
import type { ChoirEvent } from '@/lib/types'

interface Props {
  event: ChoirEvent
  onEdit: () => void
  onDelete: () => void
}

export function EventCard({ event, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)

  const total = event.attendances.reduce((s, a) => s + a.basePrice + a.bonus, 0)
  const count = event.attendances.length

  return (
    <Card className="w-full">
      <CardBody className="p-3">
        <div className="flex items-start gap-2">
          <button
            className="flex-1 text-left"
            onClick={() => setExpanded((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <Chip size="sm" color="primary" variant="flat">{event.eventType}</Chip>
              <span className="text-xs text-default-400">{count} чел.</span>
              <span className="ml-auto text-sm font-semibold">{total.toLocaleString('ru-RU')} ₽</span>
            </div>
          </button>
          <Button size="sm" variant="light" onPress={onEdit} className="min-w-0 px-2">✏️</Button>
          <Button size="sm" variant="light" color="danger" onPress={onDelete} className="min-w-0 px-2">🗑</Button>
        </div>

        {expanded && event.attendances.length > 0 && (
          <div className="mt-2 pt-2 border-t border-divider">
            {event.attendances.map((a) => (
              <div key={a.memberId} className="flex items-center justify-between py-0.5 text-sm">
                <span className="text-default-700">{a.memberName}</span>
                <span className="text-default-500 tabular-nums">
                  {a.basePrice.toLocaleString('ru-RU')}
                  {a.bonus > 0 && (
                    <span className="text-success ml-1">+{a.bonus.toLocaleString('ru-RU')}</span>
                  )}
                  {' '}₽
                </span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
