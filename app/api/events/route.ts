import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { db, dbFind, dbInsert, dbRemoveMany } from '@/lib/db'
import { logAction } from '@/lib/audit'
import type { ChoirEvent } from '@/lib/types'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const date = searchParams.get('date')
  const month = searchParams.get('month')

  const query: Record<string, unknown> = { choirType: session.choirType }
  if (date) query.date = date
  else if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: 'Invalid month' }, { status: 400 })
    query.date = { $regex: new RegExp(`^${month}`) }
  }

  const events = await dbFind<ChoirEvent>(db.events, query)
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    const oa = a.order ?? Infinity, ob = b.order ?? Infinity
    if (oa !== ob) return oa - ob
    return a.createdAt.localeCompare(b.createdAt)
  })
  return Response.json(events)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const now = new Date().toISOString()

  const event = await dbInsert<ChoirEvent>(db.events, {
    date: body.date,
    choirType: session.choirType,
    eventType: body.eventType,
    attendances: body.attendances || [],
    createdAt: now,
    updatedAt: now,
  })

  const total = (body.attendances || []).reduce(
    (s: number, a: { basePrice: number; bonus: number }) => s + (a.basePrice || 0) + (a.bonus || 0), 0
  )
  const count = (body.attendances || []).length
  const [, , d] = (body.date as string).split('-').map(Number)
  await logAction(
    'create_event',
    `Добавлен выход «${body.eventType}» ${d} числа — ${count} пев., ${total.toLocaleString('ru-RU')} ₽`
  )

  return Response.json(event, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const month = req.nextUrl.searchParams.get('month')
  if (!month) return Response.json({ error: 'month required' }, { status: 400 })
  if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: 'Invalid month' }, { status: 400 })

  const [y, mo] = month.split('-').map(Number)
  const monthLabel = `${['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'][mo - 1]} ${y}`

  const n = await dbRemoveMany(db.events, {
    choirType: session.choirType,
    date: { $regex: new RegExp(`^${month}`) },
  })

  await logAction('delete_month', `Удалены все выходы за ${monthLabel} — ${n} записей`)

  return Response.json({ ok: true, deleted: n })
}
