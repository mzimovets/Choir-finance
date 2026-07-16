import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { db, dbUpdate, dbRemove, dbFindOne } from '@/lib/db'
import { logAction } from '@/lib/audit'
import type { EventTypeDoc } from '@/lib/types'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const update: Partial<EventTypeDoc> = {}

  if (body.name !== undefined) update.name = String(body.name).trim()
  if (body.prices !== undefined) {
    update.prices = {
      singer:  Number(body.prices.singer)  || 0,
      soloist: Number(body.prices.soloist) || 0,
      regent:  Number(body.prices.regent)  || 0,
      reader:  Number(body.prices.reader)  || 0,
    }
  }
  if (body.disabledRoles !== undefined) {
    update.disabledRoles = Array.isArray(body.disabledRoles) ? body.disabledRoles : []
  }

  await dbUpdate(db.eventTypes, { _id: id, choirType: session.choirType }, update)
  const updated = await dbFindOne<EventTypeDoc>(db.eventTypes, { _id: id })
  if (updated) await logAction('update_event_type', `Изменён тип выхода «${updated.name}»`)
  return Response.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await dbFindOne<EventTypeDoc>(db.eventTypes, { _id: id, choirType: session.choirType })
  await dbRemove(db.eventTypes, { _id: id, choirType: session.choirType })
  if (existing) await logAction('delete_event_type', `Удалён тип выхода «${existing.name}»`)
  return Response.json({ ok: true })
}
