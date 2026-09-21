import { db, dbFind, dbFindOne, dbInsert, dbUpdate } from './db'
import { encryptText, decryptText, encryptNumber, decryptNumber, isEncrypted } from './crypto'
import type { Member, ChoirEvent, Attendance } from './types'

/**
 * Шифрующие обёртки над Member и ChoirEvent — единственное место в коде,
 * где ФИО и суммы превращаются в шифротекст и обратно. Всё остальное
 * приложение (роуты, экспорт, клиент) работает с обычными объектами и не
 * знает о шифровании вовсе.
 *
 * Что шифруется: Member.name/patronymic/defaultPrices, Attendance.memberName/
 * basePrice/bonus/fine/fullPrice. Ни одно из этих полей нигде не участвует
 * в фильтре запроса к NeDB (проверено по всем вызовам dbFind/dbFindOne) —
 * значит шифрование не ломает поиск. eventType, даты, _id, choirType,
 * memberId, share, isRegent/isReader остаются как есть: eventType служит
 * фильтром в renameEventType, memberId — идентификатор для сопоставления,
 * остальное — не ФИО и не суммы.
 */

/* ── Певчие ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function encryptMemberDoc(doc: Record<string, any>): Record<string, any> {
  const out = { ...doc }
  if (typeof out.name === 'string') out.name = encryptText(out.name)
  if (typeof out.patronymic === 'string') out.patronymic = encryptText(out.patronymic)
  if (Array.isArray(out.defaultPrices)) out.defaultPrices = encryptText(JSON.stringify(out.defaultPrices))
  return out
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decryptMemberDoc(doc: Record<string, any>): Member {
  const out = { ...doc }
  if (typeof out.name === 'string') out.name = decryptText(out.name)
  if (typeof out.patronymic === 'string') out.patronymic = decryptText(out.patronymic)
  if (typeof out.defaultPrices === 'string') {
    try { out.defaultPrices = JSON.parse(decryptText(out.defaultPrices)) }
    catch { out.defaultPrices = [] }
  }
  return out as Member
}

export async function findMembers(query: Record<string, unknown>): Promise<Member[]> {
  const docs = await dbFind<Record<string, unknown>>(db.members, query)
  return docs.map(decryptMemberDoc)
}

export async function findOneMember(query: Record<string, unknown>): Promise<Member | null> {
  const doc = await dbFindOne<Record<string, unknown>>(db.members, query)
  return doc ? decryptMemberDoc(doc) : null
}

export async function insertMember(doc: Record<string, unknown>): Promise<Member> {
  const inserted = await dbInsert<Record<string, unknown>>(db.members, encryptMemberDoc(doc))
  return decryptMemberDoc(inserted)
}

export async function updateMember(query: Record<string, unknown>, update: Record<string, unknown>): Promise<void> {
  await dbUpdate(db.members, query, encryptMemberDoc(update))
}

/* ── Выходы ── */

function encryptAttendance(a: Attendance): Attendance {
  const out: Attendance = { ...a, memberName: encryptText(a.memberName) as never, basePrice: encryptNumber(a.basePrice) as never, bonus: encryptNumber(a.bonus) as never }
  if (a.fine !== undefined) out.fine = encryptNumber(a.fine) as never
  if (a.fullPrice !== undefined) out.fullPrice = encryptNumber(a.fullPrice) as never
  return out
}

function decryptAttendance(a: Attendance): Attendance {
  const out: Attendance = { ...a, memberName: decryptText(a.memberName as unknown as string), basePrice: decryptNumber(a.basePrice as unknown as string), bonus: decryptNumber(a.bonus as unknown as string) }
  if (a.fine !== undefined) out.fine = decryptNumber(a.fine as unknown as string)
  if (a.fullPrice !== undefined) out.fullPrice = decryptNumber(a.fullPrice as unknown as string)
  return out
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function encryptEventDoc(doc: Record<string, any>): Record<string, any> {
  const out = { ...doc }
  if (Array.isArray(out.attendances)) out.attendances = out.attendances.map(encryptAttendance)
  return out
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decryptEventDoc(doc: Record<string, any>): ChoirEvent {
  const out = { ...doc }
  if (Array.isArray(out.attendances)) out.attendances = out.attendances.map(decryptAttendance)
  return out as ChoirEvent
}

export async function findEvents(query: Record<string, unknown>): Promise<ChoirEvent[]> {
  const docs = await dbFind<Record<string, unknown>>(db.events, query)
  return docs.map(decryptEventDoc)
}

export async function findOneEvent(query: Record<string, unknown>): Promise<ChoirEvent | null> {
  const doc = await dbFindOne<Record<string, unknown>>(db.events, query)
  return doc ? decryptEventDoc(doc) : null
}

export async function insertEvent(doc: Record<string, unknown>): Promise<ChoirEvent> {
  const inserted = await dbInsert<Record<string, unknown>>(db.events, encryptEventDoc(doc))
  return decryptEventDoc(inserted)
}

export async function updateEvent(query: Record<string, unknown>, update: Record<string, unknown>): Promise<void> {
  await dbUpdate(db.events, query, encryptEventDoc(update))
}

/* ── Миграция уже накопленных данных ── */

/** true, если запись ещё не зашифрована (обычные plaintext-значения) */
export function memberNeedsEncryption(raw: Record<string, unknown>): boolean {
  return typeof raw.name === 'string' && !isEncrypted(raw.name)
}

export function eventNeedsEncryption(raw: Record<string, unknown>): boolean {
  const atts = raw.attendances as Array<Record<string, unknown>> | undefined
  const first = atts?.[0]
  return !!first && typeof first.memberName === 'string' && !isEncrypted(first.memberName)
}
