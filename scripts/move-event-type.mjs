#!/usr/bin/env node
/**
 * Переносит выходы одного типа в другой — когда два типа сливают в один.
 *
 * Переименование для этого не годится: если целевое название уже занято,
 * в справочнике окажутся два одинаковых типа и станет непонятно, чей тариф
 * брать. Поэтому выходам просто меняется тип, а лишний тип потом удаляется
 * в приложении.
 *
 * Личные цены певчих не трогаются — только показывается, у кого они есть
 * на старом типе, чтобы можно было проверить их вручную.
 *
 * Показать, что будет:   node scripts/move-event-type.mjs "Утро суббота" "Литургия"
 * Применить:             node scripts/move-event-type.mjs "Утро суббота" "Литургия" --apply
 *
 * ВАЖНО: перед --apply остановить приложение (pm2 stop chorus), иначе оно
 * перезапишет базу из своей памяти. После — pm2 start chorus.
 */
import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const [fromName, toName] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const apply = process.argv.includes('--apply')

if (!fromName || !toName) {
  console.error('Укажите два названия: node scripts/move-event-type.mjs "Старый тип" "Новый тип"')
  process.exit(1)
}

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

const targetTypes = types.filter((t) => t.name === toName)
const moving = events.filter((e) => e.eventType === fromName)

console.log(`\nПеренос «${fromName}» → «${toName}»`)

if (!targetTypes.length) {
  console.log(`\n  ВНИМАНИЕ: типа «${toName}» нет в справочнике.`)
  console.log('  Сначала создайте или переименуйте его в приложении, иначе выходы')
  console.log('  останутся без тарифа и выпадут из пересчёта.\n')
}

const byMonth = {}
for (const ev of moving) {
  const key = (ev.date || '').slice(0, 7)
  byMonth[key] = (byMonth[key] || 0) + 1
}
console.log(`\nВыходов к переносу: ${moving.length}`)
Object.entries(byMonth).sort().forEach(([m, n]) => console.log(`   ${m} — ${n}`))
if (!moving.length) console.log('   —')

// Личные настройки певчих на старый тип: переносить их вслепую опасно,
// поэтому только показываем
const affected = members.filter((m) =>
  (m.defaultPrices || []).some((p) => p.eventType === fromName) ||
  (m.halvedEventTypes || []).includes(fromName) ||
  (m.disabledEventTypes || []).includes(fromName),
)
if (affected.length) {
  console.log(`\nУ этих певчих есть личные настройки на «${fromName}» — проверьте их в карточках:`)
  affected.forEach((m) => {
    const price = (m.defaultPrices || []).find((p) => p.eventType === fromName)?.price
    const marks = [
      price !== undefined ? `цена ${price}` : null,
      (m.halvedEventTypes || []).includes(fromName) ? 'половина' : null,
      (m.disabledEventTypes || []).includes(fromName) ? 'отключён' : null,
    ].filter(Boolean).join(', ')
    console.log(`   ${m.name} — ${marks}`)
  })
}

if (!apply) {
  console.log('\nЭто предварительный просмотр. Чтобы применить:')
  console.log('  pm2 stop chorus')
  console.log(`  node scripts/move-event-type.mjs "${fromName}" "${toName}" --apply`)
  console.log('  pm2 start chorus\n')
  process.exit(0)
}

if (!moving.length) {
  console.log('\nПереносить нечего.\n')
  process.exit(0)
}

const lines = moving
  .map((ev) => JSON.stringify({ ...ev, eventType: toName, updatedAt: new Date().toISOString() }))
  .join('\n') + '\n'
fs.appendFileSync(path.join(DATA_DIR, 'events.db'), lines)

console.log(`\nГотово. Перенесено выходов: ${moving.length}`)
console.log(`Теперь можно удалить тип «${fromName}» в приложении.`)
console.log('Запустите приложение: pm2 start chorus\n')
