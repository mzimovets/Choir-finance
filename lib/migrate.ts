import { db, dbFind, dbFindOne, dbInsert, dbUpdate } from './db'
import { updateMember, updateEvent, memberNeedsEncryption, eventNeedsEncryption } from './secureStore'
import type { Member } from './types'

/**
 * Одноразовые миграции данных. Метка о выполнении хранится в db.meta и переживает
 * перезапуски/деплои, поэтому каждая миграция отрабатывает ровно один раз и не
 * трогает данные, которые пользователь задал позже.
 */

let started: Promise<void> | null = null
export function ensureMigrations(): Promise<void> {
  if (!started) {
    started = run().catch((err) => {
      // Ошибка (например, DATA_ENC_KEY не был выставлен в момент запуска)
      // не должна портить обычные запросы — но и не должна навсегда
      // застревать: сбрасываем started, чтобы следующий вызов попробовал
      // снова, а не молча считал миграцию якобы завершённой.
      console.error('[migrate] ошибка при выполнении миграций:', err)
      started = null
    })
  }
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
  await encryptExistingData()
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

/**
 * Шифрует ФИО и суммы в уже накопленных данных. Читает файлы напрямую
 * (в обход расшифровки — иначе не отличить зашифрованное от ещё не
 * тронутого) и переписывает через те же обёртки, что использует всё
 * приложение, поэтому формат получается ровно такой же, как у новых
 * записей. Идемпотентна и без метки: memberNeedsEncryption/eventNeedsEncryption
 * пропускают уже зашифрованное, так что запуск дважды ничего не испортит.
 */
async function encryptExistingData() {
  const KEY = 'encrypt-members-events-1'
  if (await done(KEY)) return

  const rawMembers = await dbFind<Record<string, unknown>>(db.members, {})
  for (const m of rawMembers) {
    if (!memberNeedsEncryption(m)) continue
    await updateMember(
      { _id: m._id },
      { name: m.name, patronymic: m.patronymic, defaultPrices: m.defaultPrices },
    )
  }

  const rawEvents = await dbFind<Record<string, unknown>>(db.events, {})
  for (const ev of rawEvents) {
    if (!eventNeedsEncryption(ev)) continue
    await updateEvent({ _id: ev._id }, { attendances: ev.attendances })
  }

  await mark(KEY)
}
