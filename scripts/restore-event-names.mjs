#!/usr/bin/env node
/**
 * Возвращает выходам названия типов, с которыми они были созданы.
 *
 * Переименование типа меняет название во всех выходах сразу, включая сданные
 * месяцы. Этот скрипт откатывает название обратно для старых выходов, беря
 * его из истории базы: NeDB хранит все версии записей, и первая версия — это
 * состояние на момент создания выхода.
 *
 * Суммы не трогаются: скрипт только показывает, где они отличаются от
 * исходных, чтобы можно было проверить вручную.
 *
 * Показать, что будет:   node scripts/restore-event-names.mjs 2026-09
 * Применить:             node scripts/restore-event-names.mjs 2026-09 --apply
 *
 * Аргумент — граница: трогаются выходы СТРОГО РАНЬШЕ этого месяца.
 *
 * ВАЖНО: перед --apply остановить приложение (pm2 stop chorus), иначе оно
 * перезапишет базу из своей памяти. После — pm2 start chorus.
 */
import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const before = process.argv[2]
const apply = process.argv.includes('--apply')

if (!before || !/^\d{4}-\d{2}$/.test(before)) {
  console.error('Укажите границу в виде YYYY-MM: node scripts/restore-event-names.mjs 2026-09')
  process.exit(1)
}

// История: все версии каждой записи в порядке записи в файл
const history = new Map()
const deleted = new Set()
for (const line of fs.readFileSync(path.join(DATA_DIR, 'events.db'), 'utf8').split('\n')) {
  if (!line.trim()) continue
  let doc
  try { doc = JSON.parse(line) } catch { continue }
  if (doc.$$deleted) { deleted.add(doc._id); history.delete(doc._id); continue }
  deleted.delete(doc._id)
  const list = history.get(doc._id) || []
  list.push(doc)
  history.set(doc._id, list)
}

const renames = []
const priceDiffs = []

for (const versions of history.values()) {
  const current = versions[versions.length - 1]
  const first = versions[0]
  if (!current.date || current.date.slice(0, 7) >= before) continue

  if (current.eventType !== first.eventType) {
    renames.push({ current, name: first.eventType })
  }

  // Суммы сверяем с исходными — по участникам, которые были с самого начала
  for (const att of first.attendances || []) {
    const now = (current.attendances || []).find((a) => a.memberId === att.memberId)
    if (!now || now.basePrice === att.basePrice) continue
    priceDiffs.push(
      `${current.date}  ${String(current.eventType).padEnd(16)} ${String(att.memberName).padEnd(20)} ` +
      `было ${String(att.basePrice).padStart(5)} → сейчас ${String(now.basePrice).padStart(5)}`,
    )
  }
}

console.log(`\nВыходы раньше ${before}\n`)

console.log(`=== Вернуть название (${renames.length})`)
const byName = {}
for (const r of renames) {
  const key = `${r.current.eventType} → ${r.name}`
  byName[key] = (byName[key] || 0) + 1
}
Object.entries(byName).forEach(([k, n]) => console.log(`  ${k}  — выходов: ${n}`))
if (!renames.length) console.log('  —')

console.log(`\n=== Суммы отличаются от исходных (${priceDiffs.length})`)
console.log(priceDiffs.length ? priceDiffs.map((s) => '  ' + s).join('\n') : '  —')
console.log('  Скрипт их не трогает: правки могли быть намеренными.\n')

if (!apply) {
  console.log('Это предварительный просмотр. Чтобы применить:')
  console.log('  pm2 stop chorus')
  console.log(`  node scripts/restore-event-names.mjs ${before} --apply`)
  console.log('  pm2 start chorus\n')
  process.exit(0)
}

if (!renames.length) {
  console.log('Возвращать нечего.\n')
  process.exit(0)
}

const lines = renames
  .map((r) => JSON.stringify({ ...r.current, eventType: r.name, updatedAt: new Date().toISOString() }))
  .join('\n') + '\n'
fs.appendFileSync(path.join(DATA_DIR, 'events.db'), lines)

console.log(`Готово. Возвращено названий: ${renames.length}`)
console.log('Запустите приложение: pm2 start chorus\n')
