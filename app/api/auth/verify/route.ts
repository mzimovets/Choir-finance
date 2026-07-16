import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { db, dbFindOne } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import type { User } from '@/lib/types'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

/** Проверяет логин/пароль, возвращает краткосрочный токен для выбора хора */
export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req)
  if (limited) return limited

  const { username, password } = await req.json()

  const user = await dbFindOne<User>(db.users, { username })

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return Response.json({ error: 'Неверный логин или пароль' }, { status: 401 })
  }

  // Одноразовый токен на 5 минут — только для выбора хора
  const verifyToken = await new SignJWT({ userId: user._id, purpose: 'choir-select' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('5m')
    .sign(SECRET)

  return Response.json({
    verifyToken,
    displayName: user.displayName,
  })
}
