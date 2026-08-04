import { db, dbFindOne, dbInsert, dbUpdate } from './db'

/** Настройки отображения — свои у каждого хора */
export interface ChoirSettings {
  /** Не показывать в табеле и ведомости певчих, у которых за месяц 0 ₽ */
  hideZeroMembers: boolean
}

const DEFAULTS: ChoirSettings = {
  hideZeroMembers: false,
}

function key(choirType: string) {
  return `settings:${choirType}`
}

export async function getSettings(choirType: string): Promise<ChoirSettings> {
  const doc = await dbFindOne<Partial<ChoirSettings>>(db.meta, { _id: key(choirType) })
  return { ...DEFAULTS, ...(doc ?? {}) }
}

export async function saveSettings(choirType: string, patch: Partial<ChoirSettings>): Promise<ChoirSettings> {
  const current = await getSettings(choirType)
  const next = { ...current, ...patch }
  const existing = await dbFindOne<{ _id: string }>(db.meta, { _id: key(choirType) })
  if (existing) await dbUpdate(db.meta, { _id: key(choirType) }, next)
  else await dbInsert(db.meta, { _id: key(choirType), ...next })
  return next
}
