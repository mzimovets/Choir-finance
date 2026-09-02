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
  const includePrevMonth = body.includePrevMonth === true

  const updated = await recalcEvents({
    choirType: session.choirType,
    memberId,
    from: monthStart(includePrevMonth ? -1 : 0),
  })

  const period = includePrevMonth ? 'с прошлого месяца' : 'с текущего месяца'
  const scope = memberId ? 'одного певчего' : 'всех участников'
  await logAction('update_member', `Пересчёт выходов ${scope} ${period}: обновлено ${updated}`)

  return Response.json({ ok: true, updated })
}
