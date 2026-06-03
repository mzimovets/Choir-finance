'use client'

import { useState } from 'react'
import type { ChoirEvent } from '@/lib/types'

interface Props {
  event: ChoirEvent
  onEdit: () => void
  onDelete: () => void
}

export function EventCard({ event, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)

  const total = event.attendances.reduce((s, a) => s + (a.basePrice || 0) + (a.bonus || 0), 0)
  const count = event.attendances.length

  return (
    <div className="warm-card overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3.5 text-left active:bg-warm-50 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-slab font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg, #bd9673, #7d5e42)' }}
        >
          {count}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-slab font-semibold text-warm-900 text-sm">{event.eventType}</p>
          <p className="text-xs text-warm-400 mt-0.5">{count} певчих</p>
        </div>
        <p className="text-base font-slab font-bold text-warm-800 shrink-0">
          {total.toLocaleString('ru-RU')} ₽
        </p>
        <span className="text-warm-400 shrink-0 ml-1 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Actions */}
      <div className="flex border-t border-warm-100">
        <button
          onClick={onEdit}
          className="flex-1 py-2 text-xs font-slab font-semibold text-warm-600 border-r border-warm-100 active:bg-warm-50 transition-colors"
        >
          ✏️ Изменить
        </button>
        <button
          onClick={onDelete}
          className="flex-1 py-2 text-xs font-slab font-semibold text-red-500 active:bg-red-50 transition-colors"
        >
          🗑 Удалить
        </button>
      </div>

      {/* Expanded list */}
      {expanded && count > 0 && (
        <div className="border-t border-warm-100">
          {event.attendances.map((a, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-2 border-b border-warm-50 last:border-b-0"
            >
              <span className="text-sm text-warm-800">{a.memberName}</span>
              <span className="text-sm font-medium text-warm-700 tabular-nums">
                {a.basePrice.toLocaleString('ru-RU')}
                {a.bonus > 0 && (
                  <span className="text-green-600 ml-1">+{a.bonus.toLocaleString('ru-RU')}</span>
                )}
                {' '}₽
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
