'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Button, Card, CardBody, Chip, Spinner,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure,
} from '@heroui/react'
import { useSession } from '@/hooks/useSession'
import type { ChoirEvent } from '@/lib/types'
import { AddEventModal } from '@/components/AddEventModal'
import { EventCard } from '@/components/EventCard'

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
  const { isOpen, onOpen, onClose } = useDisclosure()
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
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    loadEvents()
  }

  function openEdit(ev: ChoirEvent) {
    setEditingEvent(ev)
    onOpen()
  }

  function openNew() {
    setEditingEvent(null)
    onOpen()
  }

  if (sessionLoading) return <div className="flex h-screen items-center justify-center"><Spinner /></div>

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-default-400 uppercase tracking-wide">
            {session?.displayName}
          </p>
          <h1 className="text-lg font-bold capitalize">{formatDate(date)}</h1>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm border border-divider rounded-lg px-2 py-1.5 bg-white"
        />
      </div>

      {/* Day nav */}
      <div className="flex gap-2 mb-4">
        <Button variant="flat" size="sm" onPress={() => changeDate(-1)}>← Вчера</Button>
        <Button variant="flat" size="sm" onPress={() => setDate(todayStr())}>Сегодня</Button>
        <Button variant="flat" size="sm" onPress={() => changeDate(1)}>Завтра →</Button>
      </div>

      {/* Events list */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : events.length === 0 ? (
        <Card>
          <CardBody className="text-center text-default-400 py-10">
            <p className="text-4xl mb-2">📭</p>
            <p>Выходов за этот день нет</p>
            <p className="text-xs mt-1">Нажмите кнопку ниже, чтобы добавить</p>
          </CardBody>
        </Card>
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

      {/* FAB */}
      <Button
        color="primary"
        size="lg"
        className="fixed bottom-20 right-4 shadow-lg z-40 min-w-0 w-14 h-14 rounded-full p-0 text-2xl"
        onPress={openNew}
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        +
      </Button>

      {/* Add/Edit modal */}
      <AddEventModal
        isOpen={isOpen}
        onClose={onClose}
        date={date}
        choirType={session?.choirType || 'festive'}
        editingEvent={editingEvent}
        onSaved={loadEvents}
      />
    </div>
  )
}
