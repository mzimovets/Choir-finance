import { db, dbFind, dbUpdate } from './db'
import { mapToPrices, pricesToMap } from './types'
import type { ChoirEvent, Member } from './types'

export interface RenameResult {
  events: number
  members: number
}

/**
 * Переносит название типа выхода на всё, что на него ссылается.
 *
 * Выходы и личные настройки певчих хранят тип по названию, а не по ссылке.
 * Без этого переноса переименование отвязывало уже проставленные выходы от
 * справочника: тариф для них переставал находиться, личные цены и половинные
 * ставки повисали на старом названии.
 */
export async function renameEventType(
  choirType: string,
  oldName: string,
  newName: string,
): Promise<RenameResult> {
  if (!oldName || !newName || oldName === newName) return { events: 0, members: 0 }

  const [events, members] = await Promise.all([
    dbFind<ChoirEvent>(db.events, { choirType, eventType: oldName }),
    dbFind<Member>(db.members, { choirType }),
  ])

  for (const ev of events) {
    await dbUpdate(db.events, { _id: ev._id }, { eventType: newName, updatedAt: new Date().toISOString() })
  }

  let touchedMembers = 0
  for (const m of members) {
    const prices = pricesToMap(m.defaultPrices)
    const disabled = m.disabledEventTypes ?? []
    const halved = m.halvedEventTypes ?? []

    const hasPrice = Object.prototype.hasOwnProperty.call(prices, oldName)
    const hasDisabled = disabled.includes(oldName)
    const hasHalved = halved.includes(oldName)
    if (!hasPrice && !hasDisabled && !hasHalved) continue

    const update: Record<string, unknown> = {}
    if (hasPrice) {
      const value = prices[oldName]
      delete prices[oldName]
      prices[newName] = value
      update.defaultPrices = mapToPrices(prices)
    }
    if (hasDisabled) {
      update.disabledEventTypes = disabled.map((t) => (t === oldName ? newName : t))
    }
    if (hasHalved) {
      update.halvedEventTypes = halved.map((t) => (t === oldName ? newName : t))
    }

    await dbUpdate(db.members, { _id: m._id }, update)
    touchedMembers++
  }

  return { events: events.length, members: touchedMembers }
}
