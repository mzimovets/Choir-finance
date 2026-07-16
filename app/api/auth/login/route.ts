import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { db, dbFindOne } from '@/lib/db'
import { setSession } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import type { User } from '@/lib/types'

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req)
  if (limited) return limited

  const { username, password } = await req.json()

  const user = await dbFindOne<User>(db.users, { username })

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return Response.json({ error: 'Неверный логин или пароль' }, { status: 401 })
  }

  await setSession(user)
  return Response.json({ choirType: user.choirType, displayName: user.displayName })
}
