import { db, dbFind, dbFindOne, dbInsert, dbUpdate } from './db'
import type { Member } from './types'

/**
 * Одноразовые миграции данных. Метка о выполнении хранится в db.meta и переживает
 * перезапуски/деплои, поэтому каждая миграция отрабатывает ровно один раз и не
 * трогает данные, которые пользователь задал позже.
 */

let started: Promise<void> | null = null
export function ensureMigrations(): Promise<void> {
  if (!started) started = run().catch(() => {})
  return started
}

async function done(key: string): Promise<boolean> {
  const doc = await dbFindOne<{ _id: string }>(db.meta, { _id: key })
  return !!doc
}

async function mark(key: string) {
  try { await dbInsert(db.meta, { _id: key, at: new Date().toISOString() }) } catch { /* уже есть */ }
}

async function run() {
  await clearWeekdayDefaultPrices()
}

/**
 * У будних певчих с первичной настройки остался полный слепок цен всех типов
 * выходов. Он перекрывал текущие тарифы, поэтому изменения тарифов не
 * подхватывались в карточках. Чистим слепок — цены начинают следовать тарифам
 * типов выходов. Личные надбавки/половинные ставки не трогаем (halvedEventTypes),
 * а новые личные цены после этого хранятся уже только как отличия от тарифа.
 */
async function clearWeekdayDefaultPrices() {
  const KEY = 'clear-weekday-default-prices-1'
  if (await done(KEY)) return
  const members = await dbFind<Member>(db.members, { choirType: 'weekday' })
  for (const m of members) {
    if ((m.defaultPrices?.length ?? 0) > 0) {
      await dbUpdate(db.members, { _id: m._id }, { defaultPrices: [] })
    }
  }
  await mark(KEY)
}
