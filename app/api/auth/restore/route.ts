import { NextRequest } from 'next/server'
import { verifyToken, setSession } from '@/lib/auth'
import { db, dbFindOne } from '@/lib/db'
import type { User } from '@/lib/types'

/** Восстанавливает сессию из токена (используется PWA при потере cookie) */
export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return Response.json({ error: 'token required' }, { status: 400 })

  const payload = await verifyToken(token)
  if (!payload) return Response.json({ error: 'Invalid or expired token' }, { status: 401 })

  const user = await dbFindOne<User>(db.users, { _id: payload.userId })
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  await setSession({ ...user, choirType: payload.choirType as 'festive' | 'weekday' })
  return Response.json({ ok: true, choirType: payload.choirType })
}
