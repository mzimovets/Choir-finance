import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { db, dbFindOne } from '@/lib/db'
import { setSession } from '@/lib/auth'
import type { User } from '@/lib/types'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

/** Создаёт сессию с выбранным типом хора (вызывается после verify) */
export async function POST(req: NextRequest) {
  const { verifyToken, choirType } = await req.json()

  if (!verifyToken || !['festive', 'weekday'].includes(choirType)) {
    return Response.json({ error: 'Неверные параметры' }, { status: 400 })
  }

  // Верифицируем краткосрочный токен из /api/auth/verify
  let userId: string
  try {
    const { payload } = await jwtVerify(verifyToken, SECRET)
    if (payload.purpose !== 'choir-select' || typeof payload.userId !== 'string') {
      throw new Error('invalid purpose')
    }
    userId = payload.userId
  } catch {
    return Response.json({ error: 'Токен недействителен или истёк' }, { status: 401 })
  }

  const user = await dbFindOne<User>(db.users, { _id: userId })
  if (!user) {
    return Response.json({ error: 'Пользователь не найден' }, { status: 404 })
  }

  await setSession({ ...user, choirType })
  return Response.json({ ok: true, choirType })
}
