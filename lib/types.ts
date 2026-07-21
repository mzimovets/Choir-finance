export type ChoirType = 'festive' | 'weekday'
export type MemberRole = 'singer' | 'soloist' | 'regent' | 'reader'

export interface User {
  _id: string
  username: string
  passwordHash: string
  choirType: ChoirType
  displayName: string

}

export interface PriceEntry {
  eventType: string
  price: number
}

export interface Member {
  _id: string
  name: string
  patronymic?: string   // инициал отчества, напр. «А» → отображается «И.А.»
  choirType: ChoirType
  role: MemberRole
  defaultPrices: PriceEntry[]
  regentMultiplier: number
  isActive: boolean
  createdAt: string
  /** Типы выходов, на которые участник не выходит (не показывается при добавлении выхода) */
  disabledEventTypes?: string[]
}

export function pricesToMap(prices: PriceEntry[]): Record<string, number> {
  const m: Record<string, number> = {}
  prices.forEach((p) => { m[p.eventType] = p.price })
  return m
}

export function mapToPrices(map: Record<string, number>): PriceEntry[] {
  return Object.entries(map).map(([eventType, price]) => ({ eventType, price }))
}

export interface Attendance {
  memberId: string
  memberName: string
  basePrice: number
  bonus: number
  fine?: number
  isRegent?: boolean
  isReader?: boolean
}

export interface ChoirEvent {
  _id: string
  date: string
  choirType: ChoirType
  eventType: string
  attendances: Attendance[]
  createdAt: string
  updatedAt: string
  order?: number
}

export type AuditAction =
  | 'create_event' | 'update_event' | 'delete_event' | 'delete_month'
  | 'create_member' | 'update_member' | 'delete_member'
  | 'create_event_type' | 'update_event_type' | 'delete_event_type'

export interface AuditEntry {
  _id: string
  timestamp: string
  userId: string
  displayName: string
  choirType: ChoirType
  action: AuditAction
  description: string
}

export interface EventTypeDoc {
  _id: string
  choirType: ChoirType
  name: string
  /** Базовые цены по умолчанию для каждой роли (до множителя регента) */
  prices: { singer: number; soloist: number; regent: number; reader?: number }
  order: number
  /** Роли, полностью отключённые для этого типа выхода */
  disabledRoles?: MemberRole[]
}

export const EVENT_TYPES = [
  'Спевка',
  'Служба',
  'Арх. Служба',
  'Молебен',
  'Кр. ход',
  'ПАСХА',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

export const DEFAULT_PRICES: Record<string, Record<MemberRole, number>> = {
  'Спевка':     { singer: 900,  soloist: 900,  regent: 900,  reader: 0 },
  'Служба':     { singer: 1000, soloist: 1200, regent: 1000, reader: 0 },
  'Арх. Служба':{ singer: 1000, soloist: 1200, regent: 1000, reader: 0 },
  'Молебен':    { singer: 550,  soloist: 550,  regent: 550,  reader: 0 },
  'Кр. ход':    { singer: 330,  soloist: 330,  regent: 330,  reader: 0 },
  'ПАСХА':      { singer: 2250, soloist: 2250, regent: 2250, reader: 0 },
}
