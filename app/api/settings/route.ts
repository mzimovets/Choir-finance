import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSettings, saveSettings } from '@/lib/settings'
import type { ChoirSettings } from '@/lib/settings'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json(await getSettings(session.choirType))
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const patch: Partial<ChoirSettings> = {}
  if (typeof body.hideZeroMembers === 'boolean') patch.hideZeroMembers = body.hideZeroMembers
  if (body.festiveReaderPrices && typeof body.festiveReaderPrices === 'object') {
    const normal = Number(body.festiveReaderPrices.normal)
    const festive = Number(body.festiveReaderPrices.festive)
    if (Number.isFinite(normal) && Number.isFinite(festive)) {
      patch.festiveReaderPrices = { normal: Math.max(0, Math.round(normal)), festive: Math.max(0, Math.round(festive)) }
    }
  }

  return Response.json(await saveSettings(session.choirType, patch))
}
