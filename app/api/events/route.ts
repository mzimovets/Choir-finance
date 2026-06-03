import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { db, dbFind, dbInsert } from '@/lib/db'
import type { ChoirEvent } from '@/lib/types'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const date = searchParams.get('date')
  const month = searchParams.get('month')

  const query: Record<string, unknown> = { choirType: session.choirType }
  if (date) query.date = date
  else if (month) query.date = { $regex: new RegExp(`^${month}`) }

  const events = await dbFind<ChoirEvent>(db.events, query)
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
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

  return Response.json(event, { status: 201 })
}
