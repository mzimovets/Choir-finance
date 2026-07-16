import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { db, dbUpdate } from '@/lib/db'

/** Принимает { ids: string[] } — массив _id в новом порядке */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json() as { ids: string[] }
  await Promise.all(
    ids.map((id, index) =>
      dbUpdate(db.eventTypes, { _id: id, choirType: session.choirType }, { order: index })
    )
  )
  return Response.json({ ok: true })
}
