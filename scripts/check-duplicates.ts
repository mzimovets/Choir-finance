#!/usr/bin/env -S npx tsx
/**
 * Ищет дубликаты певчих и выходов. Расшифровывает данные через те же
 * функции, что использует приложение (lib/secureStore), поэтому имена
 * сравниваются как есть, а не как разный шифротекст с разными IV.
 *
 * Ничего не меняет — только показывает. Запуск:
 *   npx tsx scripts/check-duplicates.ts
 *
 * DATA_ENC_KEY нужно взять из .env — если запускаете не из корня проекта
 * или без Next.js рантайма, .env вручную не подхватится, поэтому скрипт
 * сам читает его при старте.
 */
import fs from 'fs'
import path from 'path'

// .env не грузится автоматически вне Next.js — читаем сами
for (const file of ['.env.local', '.env']) {
  const full = path.join(process.cwd(), file)
  if (!fs.existsSync(full)) continue
  for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

async function main() {
  const { findMembers } = await import('../lib/secureStore')
  const { findEvents } = await import('../lib/secureStore')

  console.log('=== Дубликаты певчих (одинаковые ФИО в одном хоре) ===')
  const members = await findMembers({})
  const byName = new Map<string, typeof members>()
  for (const m of members) {
    const key = `${m.choirType}::${m.name.trim().toLowerCase()}::${(m.patronymic || '').trim().toLowerCase()}`
    byName.set(key, [...(byName.get(key) ?? []), m])
  }
  let memberDupes = 0
  for (const [, group] of byName) {
    if (group.length < 2) continue
    memberDupes++
    console.log(`\n  ${group[0].name}${group[0].patronymic ? ' ' + group[0].patronymic + '.' : ''} — ${group[0].choirType}, найдено ${group.length}:`)
    for (const m of group) {
      console.log(`    ${m._id}  роль:${m.role}  активен:${m.isActive}  создан:${m.createdAt}`)
    }
  }
  console.log(memberDupes ? `\nВсего групп с дубликатами: ${memberDupes}` : '\nДубликатов певчих нет')

  console.log('\n=== Дубликаты выходов (одна дата + тип в одном хоре, встречается больше раза) ===')
  const events = await findEvents({})
  const byEvent = new Map<string, typeof events>()
  for (const ev of events) {
    const key = `${ev.choirType}::${ev.date}::${ev.eventType}`
    byEvent.set(key, [...(byEvent.get(key) ?? []), ev])
  }
  let eventDupes = 0
  for (const [, group] of byEvent) {
    if (group.length < 2) continue
    eventDupes++
    console.log(`\n  ${group[0].date}  ${group[0].eventType}  ${group[0].choirType} — найдено ${group.length}:`)
    for (const ev of group) {
      console.log(`    ${ev._id}  участников:${ev.attendances.length}  создан:${ev.createdAt}`)
    }
  }
  console.log(eventDupes ? `\nВсего групп с дубликатами: ${eventDupes}` : '\nДубликатов выходов нет')
}

main()
