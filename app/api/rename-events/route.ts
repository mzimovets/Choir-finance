import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { renameEventType } from '@/lib/renameEventType'
import { monthStart } from '@/lib/recalc'

/**
 * Переносит новое название типа на уже созданные выходы — за те месяцы,
 * которые выбрал пользователь. Невыбранные остаются под старым названием,
 * как в сданном табеле.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const from = typeof body.from === 'string' ? body.from : ''
  const to = typeof body.to === 'string' ? body.to : ''
  const currentMonth = body.currentMonth === true
  const prevMonth = body.prevMonth === true

  if (!from || !to) return Response.json({ error: 'Не указаны названия' }, { status: 400 })
  if (!currentMonth && !prevMonth) return Response.json({ ok: true, events: 0, members: 0 })

  const result = await renameEventType(session.choirType, from, to, {
    from: monthStart(prevMonth ? -1 : 0),
    until: prevMonth && !currentMonth ? monthStart(0) : undefined,
  })

  await logAction(
    'update_event_type',
    `«${from}» → «${to}» в выходах: обновлено ${result.events}, певчих ${result.members}`,
  )
  return Response.json({ ok: true, ...result })
}
