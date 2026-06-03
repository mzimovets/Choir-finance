import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { mapToPrices } from '@/lib/types'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const update: Record<string, unknown> = {}
  if (body.name !== undefined) update.name = body.name
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

  await new Promise<void>((res, rej) =>
    db.members.update(
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
    db.members.remove({ _id: id, choirType: session.choirType }, {}, (err) =>
      err ? rej(err) : res()
    )
  )

  return Response.json({ ok: true })
}
