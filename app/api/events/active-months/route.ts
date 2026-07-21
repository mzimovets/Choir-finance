import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { db, dbFind } from '@/lib/db'
import type { ChoirEvent } from '@/lib/types'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const year = req.nextUrl.searchParams.get('year')
  if (!year) return Response.json([])
  if (!/^\d{4}$/.test(year)) return Response.json({ error: 'Invalid year' }, { status: 400 })

  const events = await dbFind<ChoirEvent>(db.events, {
    choirType: session.choirType,
    date: { $regex: new RegExp(`^${year}`) },
  })

  const months = [...new Set(events.map((e) => e.date.slice(0, 7)))].sort()
  return Response.json(months, { headers: { 'Cache-Control': 'no-store' } })
}
