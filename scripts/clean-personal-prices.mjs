#!/usr/bin/env node
/**
 * Убирает у певчих личные цены, которые просто дублируют прежний тариф.
 *
 * Личная цена всегда важнее тарифа, поэтому такой «дубль» намертво
 * фиксирует старую ставку: сколько ни меняй тариф в справочнике, человек
 * продолжает считаться по своей цене. Настоящие персональные ставки
 * (например, у солистов) при этом не трогаются — цена сверяется со старым
 * тарифом именно для роли этого человека.
 *
 * Старые тарифы берутся из резервной копии.
 *
 * Показать, что будет:
 *   node scripts/clean-personal-prices.mjs data.backup-2026-09-14
 * Применить:
 *   node scripts/clean-personal-prices.mjs data.backup-2026-09-14 --apply
 *
 * ВАЖНО: перед --apply остановить приложение (pm2 stop chorus), иначе оно
 * перезапишет базу из своей памяти. После — pm2 start chorus.
 */
import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const backupDir = process.argv.slice(2).find((a) => !a.startsWith('--'))
const apply = process.argv.includes('--apply')

if (!backupDir) {
  console.error('Укажите копию со старыми тарифами: node scripts/clean-personal-prices.mjs data.backup-2026-09-14')
  process.exit(1)
}

function readStore(dir, file) {
  const full = path.join(dir, file)
  if (!fs.existsSync(full)) {
    console.error(`Не найден файл ${full}`)
    process.exit(1)
  }
  const map = new Map()
  for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let doc
    try { doc = JSON.parse(line) } catch { continue }
    if (doc.$$deleted) map.delete(doc._id)
    else map.set(doc._id, doc)
  }
  return map
}

const members = readStore(DATA_DIR, 'members.db')
const oldTypes = [...readStore(backupDir, 'event-types.db').values()]

const planned = []

for (const member of members.values()) {
  const own = member.defaultPrices || []
  if (!own.length) continue

  const drop = []
  for (const entry of own) {
    const oldType = oldTypes.find((t) => t.name === entry.eventType && t.choirType === member.choirType)
    if (!oldType) continue
    const oldTariff = oldType.prices?.[member.role]
    if (oldTariff === undefined || oldTariff !== entry.price) continue
    drop.push(entry)
  }
  if (drop.length) planned.push({ member, drop })
}

const total = planned.reduce((s, p) => s + p.drop.length, 0)
console.log(`\nСтарые тарифы из: ${backupDir}\n`)
console.log(`=== Убрать личных цен: ${total} у ${planned.length} чел.\n`)

for (const p of planned) {
  const list = p.drop.map((d) => `${d.eventType} ${d.price}`).join(', ')
  console.log(`  ${String(p.member.name).padEnd(22)} [${p.member.role}]  ${list}`)
}
if (!planned.length) console.log('  —')

// Что останется — это настоящие персональные ставки
const kept = []
for (const member of members.values()) {
  const dropped = planned.find((p) => p.member._id === member._id)?.drop || []
  for (const entry of member.defaultPrices || []) {
    if (dropped.includes(entry)) continue
    kept.push(`  ${String(member.name).padEnd(22)} [${member.role}]  ${entry.eventType} ${entry.price}`)
  }
}
console.log(`\n=== Останутся личными (${kept.length})`)
console.log(kept.length ? kept.join('\n') : '  —')
console.log('  Это цены, отличающиеся от прежнего тарифа, — их трогать нельзя.')

if (!apply) {
  console.log('\nЭто предварительный просмотр. Чтобы применить:')
  console.log('  pm2 stop chorus')
  console.log(`  node scripts/clean-personal-prices.mjs ${backupDir} --apply`)
  console.log('  pm2 start chorus\n')
  process.exit(0)
}

if (!planned.length) {
  console.log('\nУбирать нечего.\n')
  process.exit(0)
}

const lines = planned
  .map((p) => JSON.stringify({
    ...p.member,
    defaultPrices: (p.member.defaultPrices || []).filter((e) => !p.drop.includes(e)),
  }))
  .join('\n') + '\n'
fs.appendFileSync(path.join(DATA_DIR, 'members.db'), lines)

console.log(`\nГотово. Очищено певчих: ${planned.length}, цен: ${total}`)
console.log('Дальше: запустите приложение и сделайте пересчёт за текущий месяц')
console.log('(Экспорт → настройки → «Пересчитать выходы»).\n')
