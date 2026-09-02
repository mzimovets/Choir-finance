import { db, dbFind, dbUpdate } from './db'
import { pricesToMap, applyHalf } from './types'
import type { Member, ChoirEvent, EventTypeDoc, MemberRole } from './types'

/** Первое число месяца со сдвигом: 0 — текущий, -1 — прошлый */
export function monthStart(offset = 0): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

interface RecalcOptions {
  choirType: string
  /** Пересчитать только этого участника; без него — всех */
  memberId?: string
  /** Не трогать выходы раньше этой даты (YYYY-MM-DD) */
  from: string
}

/**
 * Пересчитывает базовые цены в выходах по действующим тарифам.
 * Доплаты, штрафы и доли выхода сохраняются: доля применяется к новой
 * ставке, поэтому «половина» остаётся половиной и после смены цены.
 */
export async function recalcEvents({ choirType, memberId, from }: RecalcOptions): Promise<number> {
  const [events, types, members] = await Promise.all([
    dbFind<ChoirEvent>(db.events, { choirType }),
    dbFind<EventTypeDoc>(db.eventTypes, { choirType }),
    dbFind<Member>(db.members, { choirType }),
  ])

  const byId = new Map(members.map((m) => [m._id, m]))
  let updated = 0

  for (const ev of events) {
    if (ev.date < from) continue

    let changed = false
    const attendances = ev.attendances.map((att) => {
      if (memberId && att.memberId !== memberId) return att
      const member = byId.get(att.memberId)
      if (!member) return att

      // Роль слота — как при создании выхода: будний хор считает по слоту,
      // праздничный — по роли участника
      const role: MemberRole = choirType === 'weekday'
        ? (att.isRegent ? 'regent' : att.isReader ? 'reader' : 'singer')
        : member.role

      const etDoc = types.find((t) => t.name === ev.eventType)
      const tariff = (etDoc?.prices as Record<string, number> | undefined)?.[role] ?? 0
      const own = pricesToMap(member.defaultPrices)[ev.eventType]
      const base = own !== undefined && own > 0 ? own : tariff
      const full = applyHalf(base, (member.halvedEventTypes ?? []).includes(ev.eventType))

      const share = att.share ?? 1
      const newPrice = share === 1 ? full : Math.round(full * share)
      if (newPrice === att.basePrice && (share === 1 || att.fullPrice === full)) return att

      changed = true
      return {
        ...att,
        basePrice: newPrice,
        ...(share === 1 ? {} : { fullPrice: full }),
      }
    })

    if (!changed) continue
    await dbUpdate(db.events, { _id: ev._id }, { attendances, updatedAt: new Date().toISOString() })
    updated++
  }

  return updated
}
