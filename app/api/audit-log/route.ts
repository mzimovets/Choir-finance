import { getSession } from '@/lib/auth'
import { getAuditLog } from '@/lib/audit'
import { db, dbRemove } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const entries = await getAuditLog(session.choirType)
  return Response.json(entries)
}

export async function DELETE() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  // multi: true — удалить все записи хора
  await new Promise<void>((res, rej) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.auditLog as any).remove({ choirType: session.choirType }, { multi: true }, (err: any) => (err ? rej(err) : res()))
  )
  return Response.json({ ok: true })
}
