/**
 * Управление пользователями без сброса базы данных.
 *
 * Использование:
 *   npx tsx scripts/users.ts list
 *   npx tsx scripts/users.ts add <username> <password> <displayName> <choirType: festive|weekday>
 *   npx tsx scripts/users.ts set-password <username> <newPassword>
 *   npx tsx scripts/users.ts set-login <username> <newUsername>
 *   npx tsx scripts/users.ts remove <username>
 */

import Datastore from '@seald-io/nedb'
import bcrypt from 'bcryptjs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const users = new Datastore({ filename: path.join(DATA_DIR, 'users.db'), autoload: true })

type User = {
  _id: string
  username: string
  passwordHash: string
  choirType: string
  displayName: string
}

function find<T>(store: Datastore, q: object): Promise<T[]> {
  return new Promise((res) => store.find(q, (err: unknown, docs: T[]) => res(err ? [] : docs)))
}
function findOne<T>(store: Datastore, q: object): Promise<T | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Promise((res) => store.findOne(q, (err: unknown, doc: any) => res(err ? null : doc as T)))
}
function insert(store: Datastore, doc: object): Promise<void> {
  return new Promise((res, rej) => store.insert(doc, (err: unknown) => err ? rej(err) : res()))
}
function update(store: Datastore, q: object, upd: object): Promise<void> {
  return new Promise((res, rej) => store.update(q, { $set: upd }, {}, (err: unknown) => err ? rej(err) : res()))
}
function remove(store: Datastore, q: object): Promise<void> {
  return new Promise((res, rej) => store.remove(q, {}, (err: unknown) => err ? rej(err) : res()))
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2)

  if (!cmd || cmd === 'list') {
    const all = await find<User>(users, {})
    if (all.length === 0) {
      console.log('Пользователей нет.')
    } else {
      console.log('\nПользователи:')
      all.forEach((u) => {
        const choir = u.choirType === 'festive' ? 'Праздничный' : 'Будний'
        console.log(`  ${u.username.padEnd(16)} ${u.displayName.padEnd(24)} [${choir}]`)
      })
    }
    console.log()
    process.exit(0)
  }

  if (cmd === 'add') {
    const [username, password, displayName, choirType] = args
    if (!username || !password || !displayName || !choirType) {
      console.error('Использование: add <username> <password> <displayName> <festive|weekday>')
      process.exit(1)
    }
    const existing = await findOne<User>(users, { username })
    if (existing) {
      console.error(`Ошибка: пользователь "${username}" уже существует`)
      process.exit(1)
    }
    await insert(users, {
      username,
      passwordHash: bcrypt.hashSync(password, 10),
      displayName,
      choirType,
      createdAt: new Date().toISOString(),
    })
    console.log(`✓ Создан пользователь: ${username} / ${password} → ${displayName} [${choirType}]`)
    process.exit(0)
  }

  if (cmd === 'set-password') {
    const [username, newPassword] = args
    if (!username || !newPassword) {
      console.error('Использование: set-password <username> <newPassword>')
      process.exit(1)
    }
    const user = await findOne<User>(users, { username })
    if (!user) {
      console.error(`Ошибка: пользователь "${username}" не найден`)
      process.exit(1)
    }
    await update(users, { username }, { passwordHash: bcrypt.hashSync(newPassword, 10) })
    console.log(`✓ Пароль обновлён для: ${username}`)
    process.exit(0)
  }

  if (cmd === 'set-login') {
    const [username, newUsername] = args
    if (!username || !newUsername) {
      console.error('Использование: set-login <username> <newUsername>')
      process.exit(1)
    }
    const user = await findOne<User>(users, { username })
    if (!user) {
      console.error(`Ошибка: пользователь "${username}" не найден`)
      process.exit(1)
    }
    const conflict = await findOne<User>(users, { username: newUsername })
    if (conflict) {
      console.error(`Ошибка: логин "${newUsername}" уже занят`)
      process.exit(1)
    }
    await update(users, { username }, { username: newUsername })
    console.log(`✓ Логин изменён: ${username} → ${newUsername}`)
    process.exit(0)
  }

  if (cmd === 'remove') {
    const [username] = args
    if (!username) {
      console.error('Использование: remove <username>')
      process.exit(1)
    }
    const user = await findOne<User>(users, { username })
    if (!user) {
      console.error(`Ошибка: пользователь "${username}" не найден`)
      process.exit(1)
    }
    await remove(users, { username })
    console.log(`✓ Пользователь удалён: ${username}`)
    process.exit(0)
  }

  console.log(`
Команды:
  list                                               — список всех пользователей
  add <login> <пароль> <Имя> <festive|weekday>      — создать пользователя
  set-password <login> <новый_пароль>               — сменить пароль
  set-login <login> <новый_логин>                   — сменить логин
  remove <login>                                     — удалить пользователя
`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
