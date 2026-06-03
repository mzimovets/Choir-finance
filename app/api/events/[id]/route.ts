import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import type { ChoirEvent } from '@/lib/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const event = await new Promise<ChoirEvent | null>((res) =>
    db.events.findOne({ _id: id, choirType: session.choirType }, (err, doc) =>
      res(err ? null : (doc as unknown as ChoirEvent | null))
    )
  )

  if (!event) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json(event)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const now = new Date().toISOString()

  const update: Record<string, unknown> = { updatedAt: now }
  if (body.eventType !== undefined) update.eventType = body.eventType
  if (body.attendances !== undefined) update.attendances = body.attendances

  await new Promise<void>((res, rej) =>
    db.events.update(
      { _id: id, choirType: session.choirType },
      { $set: update },
      {},
      (err) => (err ? rej(err) : res())
    )
  )

  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await new Promise<void>((res, rej) =>
    db.events.remove({ _id: id, choirType: session.choirType }, {}, (err) =>
      err ? rej(err) : res()
    )
  )

  return Response.json({ ok: true })
}
