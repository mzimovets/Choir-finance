import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { recalcEvents, monthStart } from '@/lib/recalc'

/**
 * Пересчёт выходов по действующим ценам — вызывается после того, как
 * пользователь подтвердил его в приложении.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const memberId: string | undefined = typeof body.memberId === 'string' ? body.memberId : undefined
  const currentMonth = body.currentMonth === true
  const prevMonth = body.prevMonth === true

  if (!currentMonth && !prevMonth) return Response.json({ ok: true, updated: 0 })

  // Прошлый месяц без текущего — берём только его, поэтому нужна верхняя граница
  const from = monthStart(prevMonth ? -1 : 0)
  const until = prevMonth && !currentMonth ? monthStart(0) : undefined

  const updated = await recalcEvents({ choirType: session.choirType, memberId, from, until })

  const period = currentMonth && prevMonth ? 'за прошлый и текущий месяц'
    : prevMonth ? 'за прошлый месяц'
    : 'с текущего месяца'
  const scope = memberId ? 'одного певчего' : 'всех участников'
  await logAction('update_member', `Пересчёт выходов ${scope} ${period}: обновлено ${updated}`)

  return Response.json({ ok: true, updated })
}
