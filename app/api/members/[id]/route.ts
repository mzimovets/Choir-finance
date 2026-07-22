import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { db, dbFind, dbFindOne, dbUpdate, dbRemove } from '@/lib/db'
import { mapToPrices, pricesToMap, applyHalf } from '@/lib/types'
import { logAction } from '@/lib/audit'
import type { Member, ChoirEvent, EventTypeDoc, MemberRole } from '@/lib/types'

/**
 * Пересчитывает базовые цены участника в выходах текущего месяца и позже.
 * Прошлые месяцы не трогаются — они уже выгружены/оплачены.
 * Доплаты и штрафы сохраняются как есть.
 */
async function recalcFutureEvents(member: Member, choirType: string): Promise<number> {
  const now = new Date()
  // Первое число текущего месяца в формате YYYY-MM-DD
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [events, types] = await Promise.all([
    dbFind<ChoirEvent>(db.events, { choirType }),
    dbFind<EventTypeDoc>(db.eventTypes, { choirType }),
  ])

  const personal = pricesToMap(member.defaultPrices)
  const halved = member.halvedEventTypes ?? []
  let updated = 0

  for (const ev of events) {
    if (ev.date < from) continue
    const idx = ev.attendances.findIndex((a) => a.memberId === member._id)
    if (idx === -1) continue

    const att = ev.attendances[idx]
    // Роль слота — точно как при создании выхода в AddEventModal:
    // будний хор считает по слоту (регент/чтец/певчий), праздничный — по роли участника.
    const role: MemberRole = choirType === 'weekday'
      ? (att.isRegent ? 'regent' : att.isReader ? 'reader' : 'singer')
      : member.role
    const etDoc = types.find((t) => t.name === ev.eventType)
    const tariff = (etDoc?.prices as Record<string, number> | undefined)?.[role] ?? 0
    const own = personal[ev.eventType]
    const base = own !== undefined && own > 0 ? own : tariff
    const newPrice = applyHalf(base, halved.includes(ev.eventType))

    if (newPrice === att.basePrice) continue

    const attendances = ev.attendances.map((a, i) =>
      i === idx ? { ...a, basePrice: newPrice } : a
    )
    await dbUpdate(db.events, { _id: ev._id }, { attendances, updatedAt: new Date().toISOString() })
    updated++
  }

  return updated
}

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
  if (body.halvedEventTypes !== undefined) {
    update.halvedEventTypes = Array.isArray(body.halvedEventTypes) ? body.halvedEventTypes : []
  }

  await dbUpdate(db.members, { _id: id, choirType: session.choirType }, update)

  // Пересчитать выходы текущего месяца и позже, если менялись цены/половинные ставки
  let recalculated = 0
  if (body.defaultPrices !== undefined || body.halvedEventTypes !== undefined || body.role !== undefined) {
    const fresh = await dbFindOne<Member>(db.members, { _id: id, choirType: session.choirType })
    if (fresh) recalculated = await recalcFutureEvents(fresh, session.choirType)
  }

  await logAction('update_member', `Изменён певчий «${body.name || id}»`)
  return Response.json({ ok: true, recalculated })
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
