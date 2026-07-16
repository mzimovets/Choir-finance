import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { db, dbFindOne, dbUpdate } from '@/lib/db'
import type { User } from '@/lib/types'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await dbFindOne<User>(db.users, { _id: session.userId })
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({
    userId: user._id,
    // choirType берём из сессии — чтобы смена хора через switch-choir работала
    choirType: session.choirType,
    displayName: user.displayName,
    username: user.username,
  })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { currentPassword, newUsername, newPassword, newDisplayName } = await req.json()

  const user = await dbFindOne<User>(db.users, { _id: session.userId })
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })

  if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return Response.json({ error: 'Неверный текущий пароль' }, { status: 400 })
  }

  if (newPassword && newPassword.length < 8) {
    return Response.json({ error: 'Пароль должен быть не короче 8 символов' }, { status: 400 })
  }

  const update: Record<string, string> = {}
  if (newUsername?.trim()) update.username = newUsername.trim()
  if (newPassword) update.passwordHash = bcrypt.hashSync(newPassword, 10)
  if (newDisplayName?.trim()) update.displayName = newDisplayName.trim()

  if (Object.keys(update).length === 0) {
    return Response.json({ error: 'Нечего обновлять' }, { status: 400 })
  }

  await dbUpdate(db.users, { _id: session.userId }, update)
  return Response.json({ ok: true })
}
