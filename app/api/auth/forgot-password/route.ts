import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import nodemailer from 'nodemailer'
import { db, dbFindOne, dbInsert, dbRemove } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import type { User } from '@/lib/types'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, { maxRequests: 3, windowMs: 15 * 60 * 1000 })
  if (limited) return limited

  const { email } = await req.json()
  if (!email?.trim()) {
    return Response.json({ error: 'Введите email' }, { status: 400 })
  }

  const user = await dbFindOne<User>(db.users, { email: email.trim().toLowerCase() })
  // Always return ok to avoid revealing whether email exists
  if (!user) return Response.json({ ok: true })

  // Remove any old tokens for this user
  await dbRemove(db.resetTokens, { userId: user._id })

  const token = randomBytes(32).toString('hex')
  const expiresAt = Date.now() + TOKEN_TTL_MS
  await dbInsert(db.resetTokens, { token, userId: user._id, expiresAt })

  const appUrl = process.env.APP_URL ?? 'https://tabel.nevsky-sobor.ru'
  const resetUrl = `${appUrl}/reset-password?token=${token}`

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: user.email,
    subject: 'Сброс пароля — Табель',
    text: `Для сброса пароля перейдите по ссылке (действует 1 час):\n\n${resetUrl}\n\nЕсли вы не запрашивали сброс пароля — проигнорируйте это письмо.`,
    html: `
      <p>Для сброса пароля перейдите по ссылке (действует 1 час):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="color:#999;font-size:12px">Если вы не запрашивали сброс пароля — проигнорируйте это письмо.</p>
    `,
  })

  return Response.json({ ok: true })
}
