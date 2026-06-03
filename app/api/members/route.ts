import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { db, dbFind, dbInsert } from '@/lib/db'
import { mapToPrices } from '@/lib/types'
import type { Member } from '@/lib/types'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const members = await dbFind<Member>(db.members, { choirType: session.choirType })
  members.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  return Response.json(members)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const now = new Date().toISOString()

  const doc = {
    name: body.name,
    choirType: session.choirType,
    role: body.role || 'singer',
    defaultPrices: Array.isArray(body.defaultPrices)
      ? body.defaultPrices
      : mapToPrices(body.defaultPrices || {}),
    regentMultiplier: body.role === 'regent' ? (body.regentMultiplier || 2) : 1,
    isActive: true,
    createdAt: now,
  }

  const member = await dbInsert<Member>(db.members, doc)
  return Response.json(member, { status: 201 })
}
