import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { User } from './types'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'chorus-finance-secret-key-change-in-prod'
)
const COOKIE_NAME = 'cf_session'

export async function signToken(payload: { userId: string; choirType: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SECRET)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { userId: string; choirType: string }
  } catch {
    return null
  }
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function setSession(user: User) {
  const token = await signToken({ userId: user._id, choirType: user.choirType })
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
