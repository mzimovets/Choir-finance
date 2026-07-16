import { db, dbInsert, dbFind } from './db'
import { getSession } from './auth'
import { dbFindOne } from './db'
import type { AuditAction, AuditEntry, User } from './types'

export async function logAction(action: AuditAction, description: string) {
  try {
    const session = await getSession()
    if (!session) return

    const user = await dbFindOne<User>(db.users, { _id: session.userId })
    await dbInsert<AuditEntry>(db.auditLog, {
      timestamp: new Date().toISOString(),
      userId: session.userId,
      displayName: user?.displayName || 'Неизвестно',
      choirType: session.choirType,
      action,
      description,
    })
  } catch {
    // не блокируем основное действие если лог не записался
  }
}

export async function getAuditLog(choirType: string, limit = 100): Promise<AuditEntry[]> {
  const all = await dbFind<AuditEntry>(db.auditLog, { choirType })
  all.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return all.slice(0, limit)
}
