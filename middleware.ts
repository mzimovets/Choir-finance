import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PUBLIC = ['/login', '/api/auth/login', '/api/auth/verify', '/api/auth/select-choir', '/api/auth/restore']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get('cf_session')?.value
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const payload = await verifyToken(token)
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  // manifest.json и apple-touch-icon.png — статика, которую iOS запрашивает
  // при «Добавить на экран Домой» без гарантии передачи сессионной куки.
  // Если middleware отдаёт им редирект на /login вместо JSON/PNG, PWA
  // не подхватывает тему/иконку (отсюда чёрная статус-бар полоса).
  matcher: ['/((?!_next/static|_next/image|favicon|icons/|fonts/|manifest.json|apple-touch-icon.png).*)'],
}
