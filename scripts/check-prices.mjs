#!/usr/bin/env node
/**
 * Отчёт перед сменой цен: что пересчёт изменит и где он бессилен.
 *
 * Ничего не меняет — только читает базу и печатает списки:
 *   1. выходы, тип которых отсутствует в справочнике (пересчёт их не тронет);
 *   2. записи с ценой, отличной от расчётной, — вписанные вручную или
 *      оставшиеся от прежних тарифов (пересчёт их перезапишет).
 *
 * Запуск:  node scripts/check-prices.mjs 2026-09
 *          node scripts/check-prices.mjs all
 */
import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const monthArg = process.argv[2] || new Date().toISOString().slice(0, 7)

/** NeDB дописывает новые версии в конец файла: берём последнюю по _id */
function readStore(file) {
  const full = path.join(DATA_DIR, file)
  if (!fs.existsSync(full)) return []
  const map = new Map()
  for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let doc
    try { doc = JSON.parse(line) } catch { continue }
    if (doc.$$deleted) map.delete(doc._id)
    else map.set(doc._id, doc)
  }
  return [...map.values()]
}

const events = readStore('events.db')
const members = readStore('members.db')
const types = readStore('event-types.db')

const byId = new Map(members.map((m) => [m._id, m]))
const inMonth = (d) => monthArg === 'all' || (d || '').startsWith(monthArg)

/** Цена, которую поставит пересчёт: личная цена важнее тарифа */
function expectedPrice(member, ev, att) {
  const role = ev.choirType === 'weekday'
    ? (att.isRegent ? 'regent' : att.isReader ? 'reader' : 'singer')
    : member.role
  const etDoc = types.find((t) => t.name === ev.eventType && t.choirType === ev.choirType)
  const tariff = etDoc?.prices?.[role] ?? 0
  const own = (member.defaultPrices || []).find((p) => p.eventType === ev.eventType)?.price
  const base = own !== undefined && own > 0 ? own : tariff
  if (base <= 0) return null            // тариф не задан — пересчёт пропустит
  const full = (member.halvedEventTypes || []).includes(ev.eventType) ? Math.round(base / 2) : base
  const share = att.share ?? 1
  return share === 1 ? full : Math.round(full * share)
}

const typeNames = new Set(types.map((t) => `${t.choirType}|${t.name}`))
const orphans = []
const diffs = []

for (const ev of events.filter((e) => inMonth(e.date)).sort((a, b) => (a.date || '').localeCompare(b.date || ''))) {
  if (!typeNames.has(`${ev.choirType}|${ev.eventType}`)) {
    orphans.push(`${ev.date}  ${ev.eventType}  [${ev.choirType}]  участников: ${(ev.attendances || []).length}`)
    continue
  }
  for (const att of ev.attendances || []) {
    const member = byId.get(att.memberId)
    if (!member) {
      orphans.push(`${ev.date}  ${ev.eventType}  [${ev.choirType}]  участник не найден в картотеке: ${att.memberName}`)
      continue
    }
    const expected = expectedPrice(member, ev, att)
    if (expected === null || expected === att.basePrice) continue
    const shareNote = att.share && att.share !== 1 ? `  доля ${Math.round(att.share * 100)}%` : ''
    diffs.push(
      `${ev.date}  ${String(ev.eventType).padEnd(16)} ${String(att.memberName).padEnd(20)} ` +
      `сейчас ${String(att.basePrice).padStart(5)} → станет ${String(expected).padStart(5)}${shareNote}`,
    )
  }
}

console.log(`\nПериод: ${monthArg}   выходов просмотрено: ${events.filter((e) => inMonth(e.date)).length}\n`)

console.log(`=== Пересчёт НЕ тронет (${orphans.length})`)
console.log(orphans.length ? orphans.map((s) => '  ' + s).join('\n') : '  —')
console.log('  Тип выхода отсутствует в справочнике или певчий удалён из картотеки.')
console.log('  Такие суммы останутся прежними — их правят вручную в самом выходе.\n')

console.log(`=== Пересчёт ИЗМЕНИТ (${diffs.length})`)
console.log(diffs.length ? diffs.map((s) => '  ' + s).join('\n') : '  —')
console.log('  Сюда попадают и цены, вписанные вручную: пересчёт вернёт их к тарифу.\n')
