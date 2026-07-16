import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { db, dbFindOne, dbUpdate, dbRemove } from '@/lib/db'
import { mapToPrices } from '@/lib/types'
import { logAction } from '@/lib/audit'
import type { Member } from '@/lib/types'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
  if (body.patronymic !== undefined) {
    const p = String(body.patronymic || '').trim()
    update.patronymic = p ? p[0].toUpperCase() : ''
  }
  if (body.role !== undefined) {
    update.role = body.role
    update.regentMultiplier = body.role === 'regent' ? (body.regentMultiplier || 2) : 1
  }
  if (body.defaultPrices !== undefined) {
    update.defaultPrices = Array.isArray(body.defaultPrices)
      ? body.defaultPrices
      : mapToPrices(body.defaultPrices)
  }
  if (body.isActive !== undefined) update.isActive = body.isActive
  if (body.disabledEventTypes !== undefined) {
    update.disabledEventTypes = Array.isArray(body.disabledEventTypes) ? body.disabledEventTypes : []
  }

  await dbUpdate(db.members, { _id: id, choirType: session.choirType }, update)
  await logAction('update_member', `Изменён певчий «${body.name || id}»`)
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const member = await dbFindOne<Member>(db.members, { _id: id, choirType: session.choirType })
  await dbRemove(db.members, { _id: id, choirType: session.choirType })
  await logAction('delete_member', `Удалён певчий «${member?.name || id}»`)
  return Response.json({ ok: true })
}
