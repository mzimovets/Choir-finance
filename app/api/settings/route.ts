import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { getSettings, saveSettings } from '@/lib/settings'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json(await getSettings(session.choirType))
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const patch: { hideZeroMembers?: boolean } = {}
  if (typeof body.hideZeroMembers === 'boolean') patch.hideZeroMembers = body.hideZeroMembers

  return Response.json(await saveSettings(session.choirType, patch))
}
