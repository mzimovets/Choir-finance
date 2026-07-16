import { NextRequest } from 'next/server'
import { getSession, setSession } from '@/lib/auth'
import { db, dbFindOne } from '@/lib/db'
import type { User } from '@/lib/types'

/** Переключает тип хора в текущей сессии */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { choirType } = await req.json()
  if (!['festive', 'weekday'].includes(choirType)) {
    return Response.json({ error: 'Неверный тип хора' }, { status: 400 })
  }

  const user = await dbFindOne<User>(db.users, { _id: session.userId })
  if (!user) return Response.json({ error: 'Пользователь не найден' }, { status: 404 })

  await setSession({ ...user, choirType })
  return Response.json({ ok: true, choirType })
}
