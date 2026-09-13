#!/usr/bin/env node
/**
 * Переводит вписанные вручную уменьшенные суммы в доли выхода.
 *
 * Сумма вроде 225 при тарифе 900 — это четверть выхода, но записанная
 * числом: пересчёт вернёт её к 900. Та же четверть, записанная долей,
 * переживает смену цен — она применяется к новой ставке.
 *
 * Берутся только «ровные» доли (¼, ⅓, ½, ⅔, ¾) с точностью до рубля.
 * Надбавки и произвольные суммы не трогаются.
 *
 * Показать, что будет:   node scripts/manual-to-share.mjs 2026-09
 * Применить:             node scripts/manual-to-share.mjs 2026-09 --apply
 *
 * ВАЖНО: перед --apply остановить приложение (pm2 stop chorus), иначе оно
 * перезапишет файл базы из своей памяти. После — pm2 start chorus.
 */
import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const monthArg = process.argv[2] || new Date().toISOString().slice(0, 7)
const apply = process.argv.includes('--apply')

const SHARES = [
  { value: 0.25, label: '¼' },
  { value: 1 / 3, label: '⅓' },
  { value: 0.5,  label: '½' },
  { value: 2 / 3, label: '⅔' },
  { value: 0.75, label: '¾' },
]

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

/** Полная ставка участника для этого выхода */
function fullRate(member, ev, att) {
  const role = ev.choirType === 'weekday'
    ? (att.isRegent ? 'regent' : att.isReader ? 'reader' : 'singer')
    : member.role
  const etDoc = types.find((t) => t.name === ev.eventType && t.choirType === ev.choirType)
  const tariff = etDoc?.prices?.[role] ?? 0
  const own = (member.defaultPrices || []).find((p) => p.eventType === ev.eventType)?.price
  const base = own !== undefined && own > 0 ? own : tariff
  if (base <= 0) return null
  return (member.halvedEventTypes || []).includes(ev.eventType) ? Math.round(base / 2) : base
}

const planned = []

for (const ev of events.filter((e) => monthArg === 'all' || (e.date || '').startsWith(monthArg))) {
  for (const att of ev.attendances || []) {
    if (att.share !== undefined) continue          // доля уже стоит
    const member = byId.get(att.memberId)
    if (!member) continue
    const full = fullRate(member, ev, att)
    if (!full || att.basePrice >= full || att.basePrice <= 0) continue

    const match = SHARES.find((s) => Math.round(full * s.value) === att.basePrice)
    if (!match) continue

    planned.push({ ev, att, full, share: match.value, label: match.label })
  }
}

console.log(`\nПериод: ${monthArg}   найдено записей: ${planned.length}\n`)
for (const p of planned) {
  console.log(
    `  ${p.ev.date}  ${String(p.ev.eventType).padEnd(14)} ${String(p.att.memberName).padEnd(20)} ` +
    `${String(p.att.basePrice).padStart(5)} = ${p.label} от ${p.full}`,
  )
}
if (!planned.length) console.log('  —')

if (!apply) {
  console.log('\nЭто предварительный просмотр. Чтобы применить:')
  console.log('  pm2 stop chorus')
  console.log(`  node scripts/manual-to-share.mjs ${monthArg} --apply`)
  console.log('  pm2 start chorus\n')
  process.exit(0)
}

// Запись: NeDB дописывает новые версии документов в конец файла
const touched = new Map()
for (const p of planned) {
  const doc = touched.get(p.ev._id) || JSON.parse(JSON.stringify(p.ev))
  const att = doc.attendances.find(
    (a) => a.memberId === p.att.memberId && a.basePrice === p.att.basePrice && a.share === undefined,
  )
  if (!att) continue
  att.share = p.share
  att.fullPrice = p.full
  doc.updatedAt = new Date().toISOString()
  touched.set(p.ev._id, doc)
}

if (touched.size) {
  const lines = [...touched.values()].map((d) => JSON.stringify(d)).join('\n') + '\n'
  fs.appendFileSync(path.join(DATA_DIR, 'events.db'), lines)
}
console.log(`\nГотово. Обновлено выходов: ${touched.size}, записей: ${planned.length}`)
console.log('Запустите приложение: pm2 start chorus\n')
