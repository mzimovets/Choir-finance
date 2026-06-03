export type ChoirType = 'festive' | 'weekday'
export type MemberRole = 'singer' | 'soloist' | 'regent'

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
  choirType: ChoirType
  role: MemberRole
  defaultPrices: PriceEntry[]
  regentMultiplier: number
  isActive: boolean
  createdAt: string
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
}

export interface ChoirEvent {
  _id: string
  date: string
  choirType: ChoirType
  eventType: string
  attendances: Attendance[]
  createdAt: string
  updatedAt: string
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
  'Спевка': { singer: 900, soloist: 900, regent: 900 },
  'Служба': { singer: 1000, soloist: 1200, regent: 1000 },
  'Арх. Служба': { singer: 1000, soloist: 1200, regent: 1000 },
  'Молебен': { singer: 550, soloist: 550, regent: 550 },
  'Кр. ход': { singer: 330, soloist: 330, regent: 330 },
  'ПАСХА': { singer: 2250, soloist: 2250, regent: 2250 },
}
