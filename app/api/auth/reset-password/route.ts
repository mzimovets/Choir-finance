import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { db, dbFindOne, dbUpdate, dbRemove } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

interface ResetToken {
  _id: string
  token: string
  userId: string
  expiresAt: number
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, { maxRequests: 5, windowMs: 15 * 60 * 1000 })
  if (limited) return limited

  const { token, newPassword } = await req.json()
  if (!token || !newPassword) {
    return Response.json({ error: 'Неверные данные' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return Response.json({ error: 'Пароль должен быть не короче 8 символов' }, { status: 400 })
  }

  const record = await dbFindOne<ResetToken>(db.resetTokens, { token })
  if (!record || record.expiresAt < Date.now()) {
    return Response.json({ error: 'Ссылка недействительна или истекла' }, { status: 400 })
  }

  await dbUpdate(db.users, { _id: record.userId }, { passwordHash: bcrypt.hashSync(newPassword, 10) })
  await dbRemove(db.resetTokens, { token })

  return Response.json({ ok: true })
}
