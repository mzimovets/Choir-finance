import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { db, dbFindOne, dbUpdate, dbRemove } from '@/lib/db'
import { logAction } from '@/lib/audit'
import type { ChoirEvent } from '@/lib/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const event = await dbFindOne<ChoirEvent>(db.events, { _id: id, choirType: session.choirType })
  if (!event) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(event)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const now = new Date().toISOString()

  const before = await dbFindOne<ChoirEvent>(db.events, { _id: id, choirType: session.choirType })

  const update: Record<string, unknown> = { updatedAt: now }
  if (body.eventType !== undefined) update.eventType = body.eventType
  if (body.attendances !== undefined) update.attendances = body.attendances

  await dbUpdate(db.events, { _id: id, choirType: session.choirType }, update)

  if (before) {
    const total = (body.attendances || before.attendances).reduce(
      (s: number, a: { basePrice: number; bonus: number }) => s + (a.basePrice || 0) + (a.bonus || 0), 0
    )
    const count = (body.attendances || before.attendances).length
    await logAction(
      'update_event',
      `Изменён выход «${body.eventType || before.eventType}» (${before.date}) — ${count} пев., ${total.toLocaleString('ru-RU')} ₽`
    )
  }

  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const event = await dbFindOne<ChoirEvent>(db.events, { _id: id, choirType: session.choirType })

  await dbRemove(db.events, { _id: id, choirType: session.choirType })

  if (event) {
    await logAction('delete_event', `Удалён выход «${event.eventType}» (${event.date})`)
  }

  return Response.json({ ok: true })
}
