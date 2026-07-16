import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { db, dbUpdate } from '@/lib/db'

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Body: { ids: string[] } — упорядоченный список _id событий одного дня
  const { ids } = await req.json() as { ids: string[] }
  if (!Array.isArray(ids)) return Response.json({ error: 'ids required' }, { status: 400 })

  await Promise.all(
    ids.map((id, idx) =>
      dbUpdate(db.events, { _id: id, choirType: session.choirType }, { order: idx })
    )
  )

  return Response.json({ ok: true })
}
