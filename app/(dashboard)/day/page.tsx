'use client'

import { useState, useEffect, useCallback } from 'react'
import { Spinner } from '@heroui/react'
import { useSession } from '@/hooks/useSession'
import type { ChoirEvent } from '@/lib/types'
import { AddEventModal } from '@/components/AddEventModal'
import { EventCard } from '@/components/EventCard'
import { PageHeader } from '@/components/PageHeader'

function todayStr() {
  return new Date().toLocaleDateString('sv-SE')
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export default function DayPage() {
  const { session, loading: sessionLoading } = useSession()
  const [date, setDate] = useState(todayStr)
  const [events, setEvents] = useState<ChoirEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ChoirEvent | null>(null)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/events?date=${date}`)
    if (res.ok) setEvents(await res.json())
    setLoading(false)
  }, [date])

  useEffect(() => { loadEvents() }, [loadEvents])

  function changeDate(delta: number) {
    const d = new Date(date + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setDate(d.toLocaleDateString('sv-SE'))
  }

  async function deleteEvent(id: string) {
    if (!confirm('Удалить выход?')) return
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    loadEvents()
  }

  function openEdit(ev: ChoirEvent) {
    setEditingEvent(ev)
    setModalOpen(true)
  }

  function openNew() {
    setEditingEvent(null)
    setModalOpen(true)
  }

  if (sessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-page">
        <Spinner color="warning" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title={formatDate(date)}
        displayName={session?.displayName}
        choirType={session?.choirType}
      />

      {/* Date navigation */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="flex-1 py-2 rounded-xl border border-warm-200 bg-white text-warm-700 text-sm font-medium active:bg-warm-50 transition-colors"
          >
            ← Вчера
          </button>
          <button
            onClick={() => setDate(todayStr())}
            className="px-4 py-2 rounded-xl text-sm font-slab font-semibold transition-colors"
            style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)', color: 'white' }}
          >
            Сегодня
          </button>
          <button
            onClick={() => changeDate(1)}
            className="flex-1 py-2 rounded-xl border border-warm-200 bg-white text-warm-700 text-sm font-medium active:bg-warm-50 transition-colors"
          >
            Завтра →
          </button>
        </div>

        <div className="mt-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="warm-input text-sm"
          />
        </div>
      </div>

      {/* Events */}
      <div className="px-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner color="warning" />
          </div>
        ) : events.length === 0 ? (
          <div className="warm-card p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-slab font-semibold text-warm-700">Выходов нет</p>
            <p className="text-sm text-warm-400 mt-1">Нажмите + чтобы добавить</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((ev) => (
              <EventCard
                key={ev._id}
                event={ev}
                onEdit={() => openEdit(ev)}
                onDelete={() => deleteEvent(ev._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openNew}
        className="fixed z-40 w-14 h-14 rounded-full text-white text-3xl shadow-lg flex items-center justify-center transition-opacity active:opacity-80"
        style={{
          bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px) + 1rem)',
          right: '1rem',
          background: 'linear-gradient(135deg, #bd9673, #7d5e42)',
        }}
      >
        +
      </button>

      <AddEventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        date={date}
        choirType={session?.choirType || 'festive'}
        editingEvent={editingEvent}
        onSaved={loadEvents}
      />
    </div>
  )
}
