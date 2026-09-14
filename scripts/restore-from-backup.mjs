#!/usr/bin/env node
/**
 * Возвращает выходам прежние названия типов из резервной копии.
 *
 * Нужен, когда переименование типа задело уже сданные месяцы, а история
 * версий в базе не сохранилась: NeDB периодически сжимает файл, оставляя
 * по одной версии на запись.
 *
 * Выходы сопоставляются по идентификатору, поэтому правки участников,
 * сделанные после копии, не теряются — по умолчанию меняется только
 * название типа. Суммы показываются отдельным списком и возвращаются
 * лишь по явному флагу --with-prices.
 *
 * Показать, что будет:
 *   node scripts/restore-from-backup.mjs data.backup-2026-09-14 2026-09
 * Применить названия:
 *   node scripts/restore-from-backup.mjs data.backup-2026-09-14 2026-09 --apply
 * Применить названия и суммы:
 *   node scripts/restore-from-backup.mjs data.backup-2026-09-14 2026-09 --apply --with-prices
 *
 * Второй аргумент — граница: трогаются выходы СТРОГО РАНЬШЕ этого месяца.
 *
 * ВАЖНО: перед --apply остановить приложение (pm2 stop chorus), иначе оно
 * перезапишет базу из своей памяти. После — pm2 start chorus.
 */
import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const [backupDir, before] = args
const apply = process.argv.includes('--apply')
const withPrices = process.argv.includes('--with-prices')

if (!backupDir || !before || !/^\d{4}-\d{2}$/.test(before)) {
  console.error('Укажите копию и границу: node scripts/restore-from-backup.mjs data.backup-2026-09-14 2026-09')
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

const oldEvents = readStore(backupDir, 'events.db')
const nowEvents = readStore(DATA_DIR, 'events.db')

const renames = []
const priceDiffs = []
const missing = []

for (const [id, current] of nowEvents) {
  if (!current.date || current.date.slice(0, 7) >= before) continue
  const old = oldEvents.get(id)
  if (!old) { missing.push(`${current.date}  ${current.eventType}`); continue }

  const nameChanged = current.eventType !== old.eventType
  const changedPrices = []
  for (const att of old.attendances || []) {
    const now = (current.attendances || []).find((a) => a.memberId === att.memberId)
    if (!now || now.basePrice === att.basePrice) continue
    changedPrices.push(
      `${current.date}  ${String(old.eventType).padEnd(16)} ${String(att.memberName).padEnd(20)} ` +
      `было ${String(att.basePrice).padStart(5)} → сейчас ${String(now.basePrice).padStart(5)}`,
    )
  }
  priceDiffs.push(...changedPrices)

  if (nameChanged || (withPrices && changedPrices.length)) {
    renames.push({ current, old, nameChanged, pricesChanged: changedPrices.length > 0 })
  }
}

console.log(`\nКопия: ${backupDir}   выходы раньше ${before}\n`)

const byName = {}
renames.filter((r) => r.nameChanged).forEach((r) => {
  const key = `${r.current.eventType} → ${r.old.eventType}`
  byName[key] = (byName[key] || 0) + 1
})
console.log(`=== Вернуть название (${renames.filter((r) => r.nameChanged).length})`)
Object.entries(byName).forEach(([k, n]) => console.log(`  ${k}  — выходов: ${n}`))
if (!Object.keys(byName).length) console.log('  —')

console.log(`\n=== Суммы отличаются от копии (${priceDiffs.length})`)
console.log(priceDiffs.length ? priceDiffs.slice(0, 40).map((s) => '  ' + s).join('\n') : '  —')
if (priceDiffs.length > 40) console.log(`  … и ещё ${priceDiffs.length - 40}`)
console.log(withPrices
  ? '  Будут возвращены из копии (--with-prices).'
  : '  Не трогаются. Чтобы вернуть и их, добавьте --with-prices.')

if (missing.length) {
  console.log(`\n=== Нет в копии — созданы позже (${missing.length})`)
  missing.slice(0, 10).forEach((s) => console.log('  ' + s))
  console.log('  Такие выходы не трогаются.')
}

if (!apply) {
  console.log('\nЭто предварительный просмотр. Чтобы применить:')
  console.log('  pm2 stop chorus')
  console.log(`  node scripts/restore-from-backup.mjs ${backupDir} ${before} --apply${withPrices ? ' --with-prices' : ''}`)
  console.log('  pm2 start chorus\n')
  process.exit(0)
}

if (!renames.length) {
  console.log('\nВозвращать нечего.\n')
  process.exit(0)
}

const lines = renames
  .map((r) => JSON.stringify({
    ...r.current,
    eventType: r.old.eventType,
    ...(withPrices ? { attendances: r.old.attendances } : {}),
    updatedAt: new Date().toISOString(),
  }))
  .join('\n') + '\n'
fs.appendFileSync(path.join(DATA_DIR, 'events.db'), lines)

console.log(`\nГотово. Обновлено выходов: ${renames.length}`)
console.log('Запустите приложение: pm2 start chorus\n')
