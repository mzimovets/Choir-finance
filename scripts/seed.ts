import Datastore from '@seald-io/nedb'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const users = new Datastore({ filename: path.join(DATA_DIR, 'users.db'), autoload: true })
const members = new Datastore({ filename: path.join(DATA_DIR, 'members.db'), autoload: true })

async function seed() {
  await new Promise<void>((res) => users.remove({}, { multi: true }, () => res()))
  await new Promise<void>((res) => members.remove({}, { multi: true }, () => res()))

  const now = new Date().toISOString()
  const hash = (pw: string) => bcrypt.hashSync(pw, 10)

  await new Promise<void>((res, rej) =>
    users.insert([
      {
        username: 'zimovets',
        passwordHash: hash('zimovets'),
        choirType: 'festive',
        displayName: 'Мария Зимовец',
        createdAt: now,
      },
      {
        username: 'yazveckaya',
        passwordHash: hash('yazveckaya'),
        choirType: 'festive',
        displayName: 'Ольга Язвецкая',
        createdAt: now,
      },
      {
        username: 'peretyatko',
        passwordHash: hash('peretyatko'),
        choirType: 'weekday',
        displayName: 'Наталья Перетятко',
        createdAt: now,
      },
      {
        username: 'larionov',
        passwordHash: hash('larionov'),
        choirType: 'weekday',
        displayName: 'Дмитрий Ларионов',
        createdAt: now,
      },
      {
        username: 'shishkina',
        passwordHash: hash('shishkina'),
        choirType: 'weekday',
        displayName: 'Варвара Шишкина',
        createdAt: now,
      },
    ], (err) => err ? rej(err) : res())
  )

  function makePrices(isSoloist: boolean) {
    return [
      { eventType: 'Спевка', price: 900 },
      { eventType: 'Служба', price: isSoloist ? 1200 : 1000 },
      { eventType: 'Арх. Служба', price: isSoloist ? 1200 : 1000 },
      { eventType: 'Молебен', price: 550 },
      { eventType: 'Кр. ход', price: 330 },
      { eventType: 'ПАСХА', price: 2250 },
    ]
  }

  const festiveMembers = [
    { name: 'Брейдаков М.',    role: 'singer'  },
    { name: 'Букатина Л.',     role: 'singer'  },
    { name: 'Волкова И.',      role: 'singer'  },
    { name: 'Гапиенко В.',     role: 'soloist' },
    { name: 'Голенков М.',     role: 'singer'  },
    { name: 'Гурина М.',       role: 'singer'  },
    { name: 'Зимовец М.А.',    role: 'singer'  },
    { name: 'Зимовец М.В.',    role: 'regent'  },
    { name: 'Кудин М.',        role: 'singer'  },
    { name: 'Кулькова К.',     role: 'singer'  },
    { name: 'Кучина Ю.',       role: 'singer'  },
    { name: 'Ларионов Д.',     role: 'singer'  },
    { name: 'Лядов Р.',        role: 'singer'  },
    { name: 'Мезинова Т.',     role: 'singer'  },
    { name: 'Мухлаев Н.',      role: 'singer'  },
    { name: 'Пантелеев А.',    role: 'singer'  },
    { name: 'Пелин П.',        role: 'singer'  },
    { name: 'Пирогова Н.',     role: 'soloist' },
    { name: 'Ревякин В.',      role: 'soloist' },
    { name: 'Рубцова А.',      role: 'singer'  },
    { name: 'Саманов Е.',      role: 'singer'  },
    { name: 'Соколкова Г.',    role: 'singer'  },
    { name: 'Старцева Е.',     role: 'soloist' },
    { name: 'Тормосин И.',     role: 'singer'  },
    { name: 'Филиппи О.',      role: 'singer'  },
    { name: 'Финогенов А.',    role: 'singer'  },
    { name: 'Шишкина В.',      role: 'singer'  },
    { name: 'Ягупова Н.',      role: 'singer'  },
    { name: 'Язвецкая О.',     role: 'singer'  },
  ]

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

  console.log('\n✓ База данных заполнена\n')
  console.log('Аккаунты (логин / пароль):')
  console.log('  [Праздничный хор]')
  console.log('  zimovets    / zimovets    → Мария Зимовец')
  console.log('  yazveckaya  / yazveckaya  → Ольга Язвецкая')
  console.log('  [Будний хор]')
  console.log('  peretyatko  / peretyatko  → Наталья Перетятко')
  console.log('  larionov    / larionov    → Дмитрий Ларионов')
  console.log('  shishkina   / shishkina   → Варвара Шишкина')
  console.log(`\n  Певчих праздничного хора: ${festiveMembers.length}`)
  process.exit(0)
}

seed().catch((e) => { console.error(e); process.exit(1) })
