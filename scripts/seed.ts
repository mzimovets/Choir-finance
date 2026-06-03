import Datastore from '@seald-io/nedb'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const users = new Datastore({ filename: path.join(DATA_DIR, 'users.db'), autoload: true })
const members = new Datastore({ filename: path.join(DATA_DIR, 'members.db'), autoload: true })

async function seed() {
  // Clear existing
  await new Promise<void>((res) => users.remove({}, { multi: true }, () => res()))
  await new Promise<void>((res) => members.remove({}, { multi: true }, () => res()))

  const now = new Date().toISOString()
  const hash = (pw: string) => bcrypt.hashSync(pw, 10)

  // Create regent users
  await new Promise<void>((res, rej) =>
    users.insert([
      {
        username: 'festive',
        passwordHash: hash('festive123'),
        choirType: 'festive',
        displayName: 'Регент праздничного хора',
        createdAt: now,
      },
      {
        username: 'weekday',
        passwordHash: hash('weekday123'),
        choirType: 'weekday',
        displayName: 'Регент буднего хора',
        createdAt: now,
      },
    ], (err) => err ? rej(err) : res())
  )

  // Festive choir members
  const festiveMembers = [
    { name: 'Брейдаков М.', role: 'singer' },
    { name: 'Букатина Л.', role: 'singer' },
    { name: 'Волкова И.', role: 'singer' },
    { name: 'Гапиенко В.', role: 'soloist' },
    { name: 'Голенков М.', role: 'singer' },
    { name: 'Гурина М.', role: 'singer' },
    { name: 'Зимовец М.А.', role: 'singer' },
    { name: 'Зимовец М.В.', role: 'regent' },
    { name: 'Кудин М.', role: 'singer' },
    { name: 'Кулькова К.', role: 'singer' },
    { name: 'Кучина Ю.', role: 'singer' },
    { name: 'Ларионов Д.', role: 'singer' },
    { name: 'Лядов Р.', role: 'singer' },
    { name: 'Мезинова Т.', role: 'singer' },
    { name: 'Мухлаев Н.', role: 'singer' },
    { name: 'Пантелеев А.', role: 'singer' },
    { name: 'Пелин П.', role: 'singer' },
    { name: 'Пирогова Н.', role: 'soloist' },
    { name: 'Ревякин В.', role: 'soloist' },
    { name: 'Рубцова А.', role: 'singer' },
    { name: 'Саманов Е.', role: 'singer' },
    { name: 'Соколкова Г.', role: 'singer' },
    { name: 'Старцева Е.', role: 'soloist' },
    { name: 'Тормосин И.', role: 'singer' },
    { name: 'Филиппи О.', role: 'singer' },
    { name: 'Финогенов А.', role: 'singer' },
    { name: 'Шишкина В.', role: 'singer' },
    { name: 'Ягупова Н.', role: 'singer' },
    { name: 'Язвецкая О.', role: 'singer' },
  ]

  function makePrices(issoloist: boolean) {
    return [
      { eventType: 'Спевка', price: 900 },
      { eventType: 'Служба', price: issoloist ? 1200 : 1000 },
      { eventType: 'Арх. Служба', price: issoloist ? 1200 : 1000 },
      { eventType: 'Молебен', price: 550 },
      { eventType: 'Кр. ход', price: 330 },
      { eventType: 'ПАСХА', price: 2250 },
    ]
  }

  const festiveDocs = festiveMembers.map((m) => ({
    name: m.name,
    choirType: 'festive',
    role: m.role,
    defaultPrices: makePrices(m.role === 'soloist'),
    regentMultiplier: m.role === 'regent' ? 2 : 1,
    isActive: true,
    createdAt: now,
  }))

  await new Promise<void>((res, rej) =>
    members.insert(festiveDocs, (err) => err ? rej(err) : res())
  )

  console.log('✓ Seed complete')
  console.log('  festive regent: festive / festive123')
  console.log('  weekday regent: weekday / weekday123')
  console.log(`  ${festiveMembers.length} festive members created`)
  process.exit(0)
}

seed().catch((e) => { console.error(e); process.exit(1) })
