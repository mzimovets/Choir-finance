import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { db, dbFind, dbInsert } from '@/lib/db'
import { DEFAULT_PRICES, EVENT_TYPES } from '@/lib/types'
import { logAction } from '@/lib/audit'
import type { EventTypeDoc } from '@/lib/types'

/** Засеваем типы из дефолтов если база пустая */
async function seedIfEmpty(choirType: string) {
  const existing = await dbFind<EventTypeDoc>(db.eventTypes, { choirType })
  if (existing.length > 0) return
  for (let i = 0; i < EVENT_TYPES.length; i++) {
    const name = EVENT_TYPES[i]
    const def = DEFAULT_PRICES[name] ?? { singer: 0, soloist: 0, regent: 0 }
    await dbInsert<EventTypeDoc>(db.eventTypes, {
      choirType,
      name,
      prices: { singer: def.singer, soloist: def.soloist, regent: def.regent },
      order: i,
    })
  }
}

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  await seedIfEmpty(session.choirType)
  const types = await dbFind<EventTypeDoc>(db.eventTypes, { choirType: session.choirType })
  types.sort((a, b) => a.order - b.order)
  return Response.json(types)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const all = await dbFind<EventTypeDoc>(db.eventTypes, { choirType: session.choirType })
  const maxOrder = all.length > 0 ? Math.max(...all.map((t) => t.order)) : -1

  const name = String(body.name).trim()
  const doc = await dbInsert<EventTypeDoc>(db.eventTypes, {
    choirType: session.choirType,
    name,
    prices: {
      singer:  Number(body.prices?.singer)  || 0,
      soloist: Number(body.prices?.soloist) || 0,
      regent:  Number(body.prices?.regent)  || 0,
      reader:  Number(body.prices?.reader)  || 0,
    },
    order: maxOrder + 1,
  })
  await logAction('create_event_type', `Добавлен тип выхода «${name}»`)
  return Response.json(doc, { status: 201 })
}
