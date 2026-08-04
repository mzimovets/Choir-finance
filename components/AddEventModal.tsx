'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { flushSync } from 'react-dom'
import {
  Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter,
} from '@heroui/react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { InlineNumpad } from '@/components/InlineNumpad'
import { DrawerHandle } from '@/components/DrawerHandle'
import { DiscardConfirm } from '@/components/DiscardConfirm'
import type { ChoirEvent, Member, EventTypeDoc } from '@/lib/types'
import { pricesToMap, applyHalf } from '@/lib/types'
import { plural, SINGER, PARTICIPANT } from '@/lib/plural'
import { buildMemberName, shortName } from '@/lib/nameFormat'

interface Props {
  isOpen: boolean
  onClose: () => void
  date: string
  choirType: 'festive' | 'weekday'
  editingEvent: ChoirEvent | null
  onSaved: () => void
}

/* ─── Строка праздничного хора ─── */
interface FestiveRow {
  memberId: string
  memberName: string
  basePrice: number
  bonus: number
  fine: number
  checked: boolean
  /** Полная ставка — от неё считается доля выхода */
  fullPrice: number
  /** Доля выхода: 1 — целиком, 0.5 — половина */
  share: number
}

/* ─── Строка буднего хора (певчий) ─── */
interface WeekdayRow {
  key: string
  memberId: string
  memberName: string
  basePrice: number
  bonus: number
  fine: number
  search: string
  results: Member[]
  fullPrice: number
  share: number
}

/* ─── Состояние регента / чтеца ─── */
interface SlotState {
  memberId: string
  memberName: string
  basePrice: number
  bonus: number
  fine: number
  search: string
  results: Member[]
  fullPrice: number
  share: number
}

function emptySlot(): SlotState {
  return { memberId: '', memberName: '', basePrice: 0, bonus: 0, fine: 0, search: '', results: [], fullPrice: 0, share: 1 }
}

/** Цена с учётом доли выхода */
function priceForShare(fullPrice: number, share: number): number {
  return Math.round(fullPrice * share)
}

/** «½», «⅓», «60%» — как показать долю на бейдже */
function shareLabel(share: number): string {
  if (share === 1) return '1'
  if (Math.abs(share - 0.5) < 0.001) return '\u00bd'
  if (Math.abs(share - 1 / 3) < 0.005) return '\u2153'
  if (Math.abs(share - 0.25) < 0.001) return '\u00bc'
  if (Math.abs(share - 0.75) < 0.001) return '\u00be'
  return `${Math.round(share * 100)}%`
}

const ROSTER_CLIPBOARD_KEY = 'cf_roster_clipboard'
type RosterRole = 'regent' | 'reader' | 'singer'
interface RosterClip {
  choirType: string
  items: { memberId: string; role: RosterRole }[]
}

function IconCopy() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M15 1.25H10.9436C9.10583 1.24998 7.65019 1.24997 6.51098 1.40314C5.33856 1.56076 4.38961 1.89288 3.64124 2.64124C2.89288 3.38961 2.56076 4.33856 2.40314 5.51098C2.24997 6.65019 2.24998 8.10582 2.25 9.94357V16C2.25 17.8722 3.62205 19.424 5.41551 19.7047C5.55348 20.4687 5.81753 21.1208 6.34835 21.6517C6.95027 22.2536 7.70814 22.5125 8.60825 22.6335C9.47522 22.75 10.5775 22.75 11.9451 22.75H15.0549C16.4225 22.75 17.5248 22.75 18.3918 22.6335C19.2919 22.5125 20.0497 22.2536 20.6517 21.6517C21.2536 21.0497 21.5125 20.2919 21.6335 19.3918C21.75 18.5248 21.75 17.4225 21.75 16.0549V10.9451C21.75 9.57754 21.75 8.47522 21.6335 7.60825C21.5125 6.70814 21.2536 5.95027 20.6517 5.34835C20.1208 4.81753 19.4687 4.55348 18.7047 4.41551C18.424 2.62205 16.8722 1.25 15 1.25ZM17.1293 4.27117C16.8265 3.38623 15.9876 2.75 15 2.75H11C9.09318 2.75 7.73851 2.75159 6.71085 2.88976C5.70476 3.02502 5.12511 3.27869 4.7019 3.7019C4.27869 4.12511 4.02502 4.70476 3.88976 5.71085C3.75159 6.73851 3.75 8.09318 3.75 10V16C3.75 16.9876 4.38624 17.8265 5.27117 18.1293C5.24998 17.5194 5.24999 16.8297 5.25 16.0549V10.9451C5.24998 9.57754 5.24996 8.47522 5.36652 7.60825C5.48754 6.70814 5.74643 5.95027 6.34835 5.34835C6.95027 4.74643 7.70814 4.48754 8.60825 4.36652C9.47522 4.24996 10.5775 4.24998 11.9451 4.25H15.0549C15.8297 4.24999 16.5194 4.24998 17.1293 4.27117ZM7.40901 6.40901C7.68577 6.13225 8.07435 5.9518 8.80812 5.85315C9.56347 5.75159 10.5646 5.75 12 5.75H15C16.4354 5.75 17.4365 5.75159 18.1919 5.85315C18.9257 5.9518 19.3142 6.13225 19.591 6.40901C19.8678 6.68577 20.0482 7.07435 20.1469 7.80812C20.2484 8.56347 20.25 9.56458 20.25 11V16C20.25 17.4354 20.2484 18.4365 20.1469 19.1919C20.0482 19.9257 19.8678 20.3142 19.591 20.591C19.3142 20.8678 18.9257 21.0482 18.1919 21.1469C17.4365 21.2484 16.4354 21.25 15 21.25H12C10.5646 21.25 9.56347 21.2484 8.80812 21.1469C8.07435 21.0482 7.68577 20.8678 7.40901 20.591C7.13225 20.3142 6.9518 19.9257 6.85315 19.1919C6.75159 18.4365 6.75 17.4354 6.75 16V11C6.75 9.56458 6.75159 8.56347 6.85315 7.80812C6.9518 7.07435 7.13225 6.68577 7.40901 6.40901Z" fill="currentColor"/>
    </svg>
  )
}

function IconClipboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.2626 3.26045C7.38219 2.13044 8.33828 1.25 9.5 1.25H14.5C15.6617 1.25 16.6178 2.13044 16.7374 3.26045C17.5005 3.27599 18.1603 3.31546 18.7236 3.41895C19.4816 3.55818 20.1267 3.82342 20.6517 4.34835C21.2536 4.95027 21.5125 5.70814 21.6335 6.60825C21.75 7.47522 21.75 8.57754 21.75 9.94513V16.0549C21.75 17.4225 21.75 18.5248 21.6335 19.3918C21.5125 20.2919 21.2536 21.0497 20.6517 21.6517C20.0497 22.2536 19.2919 22.5125 18.3918 22.6335C17.5248 22.75 16.4225 22.75 15.0549 22.75H8.94513C7.57754 22.75 6.47522 22.75 5.60825 22.6335C4.70814 22.5125 3.95027 22.2536 3.34835 21.6517C2.74643 21.0497 2.48754 20.2919 2.36652 19.3918C2.24996 18.5248 2.24998 17.4225 2.25 16.0549V9.94513C2.24998 8.57754 2.24996 7.47522 2.36652 6.60825C2.48754 5.70814 2.74643 4.95027 3.34835 4.34835C3.87328 3.82342 4.51835 3.55818 5.27635 3.41895C5.83973 3.31546 6.49952 3.27599 7.2626 3.26045ZM7.26496 4.76087C6.54678 4.7762 5.99336 4.81234 5.54735 4.89426C4.98054 4.99838 4.65246 5.16556 4.40901 5.40901C4.13225 5.68577 3.9518 6.07435 3.85315 6.80812C3.75159 7.56347 3.75 8.56458 3.75 10V16C3.75 17.4354 3.75159 18.4365 3.85315 19.1919C3.9518 19.9257 4.13225 20.3142 4.40901 20.591C4.68577 20.8678 5.07435 21.0482 5.80812 21.1469C6.56347 21.2484 7.56458 21.25 9 21.25H15C16.4354 21.25 17.4365 21.2484 18.1919 21.1469C18.9257 21.0482 19.3142 20.8678 19.591 20.591C19.8678 20.3142 20.0482 19.9257 20.1469 19.1919C20.2484 18.4365 20.25 17.4354 20.25 16V10C20.25 8.56458 20.2484 7.56347 20.1469 6.80812C20.0482 6.07434 19.8678 5.68577 19.591 5.40901C19.3475 5.16556 19.0195 4.99838 18.4527 4.89426C18.0066 4.81234 17.4532 4.7762 16.735 4.76087C16.6058 5.88062 15.6544 6.75 14.5 6.75H9.5C8.34559 6.75 7.39424 5.88062 7.26496 4.76087ZM9.5 2.75C9.08579 2.75 8.75 3.08579 8.75 3.5V4.5C8.75 4.91421 9.08579 5.25 9.5 5.25H14.5C14.9142 5.25 15.25 4.91421 15.25 4.5V3.5C15.25 3.08579 14.9142 2.75 14.5 2.75H9.5ZM6.25 10.5C6.25 10.0858 6.58579 9.75 7 9.75H17C17.4142 9.75 17.75 10.0858 17.75 10.5C17.75 10.9142 17.4142 11.25 17 11.25H7C6.58579 11.25 6.25 10.9142 6.25 10.5ZM7.25 14C7.25 13.5858 7.58579 13.25 8 13.25H16C16.4142 13.25 16.75 13.5858 16.75 14C16.75 14.4142 16.4142 14.75 16 14.75H8C7.58579 14.75 7.25 14.4142 7.25 14ZM8.25 17.5C8.25 17.0858 8.58579 16.75 9 16.75H15C15.4142 16.75 15.75 17.0858 15.75 17.5C15.75 17.9142 15.4142 18.25 15 18.25H9C8.58579 18.25 8.25 17.9142 8.25 17.5Z" fill="currentColor"/>
    </svg>
  )
}

function IconClipboardCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.26279 3.25871C7.38317 2.12953 8.33887 1.25 9.5 1.25H14.5C15.6611 1.25 16.6168 2.12953 16.7372 3.25871C17.5004 3.27425 18.1602 3.31372 18.7236 3.41721C19.4816 3.55644 20.1267 3.82168 20.6517 4.34661C21.2536 4.94853 21.5125 5.7064 21.6335 6.60651C21.75 7.47348 21.75 8.5758 21.75 9.94339V16.0531C21.75 17.4207 21.75 18.523 21.6335 19.39C21.5125 20.2901 21.2536 21.048 20.6517 21.6499C20.0497 22.2518 19.2919 22.5107 18.3918 22.6317C17.5248 22.7483 16.4225 22.7483 15.0549 22.7483H8.94513C7.57754 22.7483 6.47522 22.7483 5.60825 22.6317C4.70814 22.5107 3.95027 22.2518 3.34835 21.6499C2.74643 21.048 2.48754 20.2901 2.36652 19.39C2.24996 18.523 2.24998 17.4207 2.25 16.0531V9.94339C2.24998 8.5758 2.24996 7.47348 2.36652 6.60651C2.48754 5.7064 2.74643 4.94853 3.34835 4.34661C3.87328 3.82168 4.51835 3.55644 5.27635 3.41721C5.83977 3.31372 6.49963 3.27425 7.26279 3.25871ZM7.26476 4.75913C6.54668 4.77447 5.99332 4.81061 5.54735 4.89253C4.98054 4.99664 4.65246 5.16382 4.40901 5.40727C4.13225 5.68403 3.9518 6.07261 3.85315 6.80638C3.75159 7.56173 3.75 8.56285 3.75 9.99826V15.9983C3.75 17.4337 3.75159 18.4348 3.85315 19.1901C3.9518 19.9239 4.13225 20.3125 4.40901 20.5893C4.68577 20.866 5.07435 21.0465 5.80812 21.1451C6.56347 21.2467 7.56458 21.2483 9 21.2483H15C16.4354 21.2483 17.4365 21.2467 18.1919 21.1451C18.9257 21.0465 19.3142 20.866 19.591 20.5893C19.8678 20.3125 20.0482 19.9239 20.1469 19.1901C20.2484 18.4348 20.25 17.4337 20.25 15.9983V9.99826C20.25 8.56285 20.2484 7.56173 20.1469 6.80638C20.0482 6.07261 19.8678 5.68403 19.591 5.40727C19.3475 5.16382 19.0195 4.99664 18.4527 4.89253C18.0067 4.81061 17.4533 4.77447 16.7352 4.75913C16.6067 5.87972 15.655 6.75 14.5 6.75H9.5C8.345 6.75 7.39326 5.87972 7.26476 4.75913ZM9.5 2.75C9.08579 2.75 8.75 3.08579 8.75 3.5V4.5C8.75 4.91421 9.08579 5.25 9.5 5.25H14.5C14.9142 5.25 15.25 4.91421 15.25 4.5V3.5C15.25 3.08579 14.9142 2.75 14.5 2.75H9.5ZM15.5483 10.4883C15.8309 10.7911 15.8146 11.2657 15.5117 11.5483L11.226 15.5483C10.9379 15.8172 10.4907 15.8172 10.2025 15.5483L8.48826 13.9483C8.18545 13.6657 8.16908 13.1911 8.45171 12.8883C8.73433 12.5854 9.20893 12.5691 9.51174 12.8517L10.7143 13.9741L14.4883 10.4517C14.7911 10.1691 15.2657 10.1854 15.5483 10.4883Z" fill="currentColor"/>
    </svg>
  )
}

let rowKeyCounter = 0
function nextKey() { return String(++rowKeyCounter) }

export function AddEventModal({ isOpen, onClose, date, choirType, editingEvent, onSaved }: Props) {
  const [step, setStep] = useState<'type' | 'members'>('type')
  const [animDir, setAnimDir] = useState<'right' | 'left'>('right')
  const [stepKey, setStepKey] = useState(0)

  const [eventType, setEventType] = useState('')
  const [customType, setCustomType] = useState('')
  const [eventTypeDocs, setEventTypeDocs] = useState<EventTypeDoc[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [typesLoading, setTypesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [emptyError, setEmptyError] = useState(false)

  // Праздничный хор
  const [festiveRows, setFestiveRows] = useState<FestiveRow[]>([])
  const [festiveRegent, setFestiveRegent] = useState<SlotState>(emptySlot())

  // Будний хор
  const [regent, setRegent] = useState<SlotState>(emptySlot())
  const [reader, setReader] = useState<SlotState>(emptySlot())
  const [weekdayRows, setWeekdayRows] = useState<WeekdayRow[]>([])

  // Активное поле нампада: id слота/строки + поле (цена/доплата/штраф)
  // 'share' — доля выхода в процентах, 'allBase' — цена сразу всем певчим
  type PriceField = 'basePrice' | 'bonus' | 'fine' | 'share'
  const [activeNumpad, setActiveNumpad] = useState<{ id: string; field: PriceField; label: string } | null>(null)

  const [discardOpen, setDiscardOpen] = useState(false)

  // Снимок формы для определения несохранённых изменений
  const formSnapshot = useRef('')
  const serializeForm = useCallback((): string => {
    const slot = (s: SlotState) => s.memberId ? [s.memberId, s.basePrice, s.bonus, s.fine, s.share] : null
    return JSON.stringify({
      type: eventType, custom: customType.trim(),
      fReg: slot(festiveRegent), reg: slot(regent), rdr: slot(reader),
      fRows: festiveRows.filter((r) => r.checked).map((r) => [r.memberId, r.basePrice, r.bonus, r.fine, r.share]),
      wRows: weekdayRows.filter((r) => r.memberId).map((r) => [r.memberId, r.basePrice, r.bonus, r.fine, r.share]),
    })
  }, [eventType, customType, festiveRegent, regent, reader, festiveRows, weekdayRows])

  // Всегда держим ссылку на свежую версию (для чтения из отложенного снимка)
  const serializeRef = useRef(serializeForm)
  serializeRef.current = serializeForm

  // Пересниму базовое состояние после смены шага/загрузки — с задержкой, чтобы
  // авто-заполнение цен (goToMembers, тарифы) успело устаканиться и не считалось изменением.
  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => { formSnapshot.current = serializeRef.current() }, 350)
    return () => clearTimeout(t)
  }, [isOpen, step, membersLoading])

  function requestCloseDrawer() {
    if (formSnapshot.current && formSnapshot.current !== serializeForm()) {
      setDiscardOpen(true)
      return true
    }
    return false
  }

  // Копирование/вставка списка участников (без цен — цены подставляются по типу выхода)
  const [clipboard, setClipboard] = useState<RosterClip | null>(null)
  const [copyDone, setCopyDone] = useState(false)
  const [pasteDone, setPasteDone] = useState(false)

  function copyRoster() {
    const items: { memberId: string; role: RosterRole }[] = []
    if (choirType === 'festive') {
      if (festiveRegent.memberId) items.push({ memberId: festiveRegent.memberId, role: 'regent' })
      festiveRows.filter((r) => r.checked && r.memberId !== festiveRegent.memberId)
        .forEach((r) => items.push({ memberId: r.memberId, role: 'singer' }))
    } else {
      if (regent.memberId) items.push({ memberId: regent.memberId, role: 'regent' })
      if (reader.memberId) items.push({ memberId: reader.memberId, role: 'reader' })
      weekdayRows.filter((r) => r.memberId).forEach((r) => items.push({ memberId: r.memberId, role: 'singer' }))
    }
    if (items.length === 0) return
    const data: RosterClip = { choirType, items }
    try { localStorage.setItem(ROSTER_CLIPBOARD_KEY, JSON.stringify(data)) } catch {}
    setClipboard(data)
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 3000)
  }

  function pasteRoster() {
    if (!clipboard || clipboard.choirType !== choirType) return
    // Пропускаем участников, недоступных в целевом типе выхода (роль отключена в
    // этом типе или тип отключён у самого участника). Напр. чтец не вставится в
    // молебен, где чтеца нет.
    const byId = (id: string) => {
      const m = members.find((mm) => mm._id === id)
      return m && !isMemberDisabled(m, resolvedType) ? m : undefined
    }

    if (choirType === 'festive') {
      const reg = clipboard.items.find((i) => i.role === 'regent')
      if (reg) {
        const m = byId(reg.memberId)
        if (m) setFestiveRegent({
          memberId: m._id, memberName: buildMemberName(m.name, m.patronymic),
          basePrice: getPriceForMember(m, resolvedType), bonus: 0, fine: 0, search: '', results: [],
          fullPrice: getPriceForMember(m, resolvedType), share: 1,
        })
      }
      const singerIds = new Set(clipboard.items.filter((i) => i.role === 'singer').map((i) => i.memberId))
      setFestiveRows((prev) => prev.map((r) => {
        if (!singerIds.has(r.memberId)) return r
        const m = byId(r.memberId)
        if (!m) return r
        const p = getPriceForMember(m, resolvedType)
        return { ...r, checked: true, basePrice: p, fullPrice: p, share: 1 }
      }))
    } else {
      const reg = clipboard.items.find((i) => i.role === 'regent')
      const rdr = clipboard.items.find((i) => i.role === 'reader')
      const regM = reg && byId(reg.memberId)
      const rdrM = rdr && byId(rdr.memberId)
      if (regM) setRegent({
        memberId: regM._id, memberName: buildMemberName(regM.name, regM.patronymic),
        basePrice: getPriceForMember(regM, resolvedType, 'regent'), bonus: 0, fine: 0, search: '', results: [],
        fullPrice: getPriceForMember(regM, resolvedType, 'regent'), share: 1,
      })
      if (rdrM) setReader({
        memberId: rdrM._id, memberName: buildMemberName(rdrM.name, rdrM.patronymic),
        basePrice: getPriceForMember(rdrM, resolvedType, 'reader'), bonus: 0, fine: 0, search: '', results: [],
        fullPrice: getPriceForMember(rdrM, resolvedType, 'reader'), share: 1,
      })
      const rows: WeekdayRow[] = clipboard.items.filter((i) => i.role === 'singer').flatMap((i) => {
        const m = byId(i.memberId)
        if (!m) return []
        return [{
          key: nextKey(), memberId: m._id, memberName: buildMemberName(m.name, m.patronymic),
          basePrice: getPriceForMember(m, resolvedType, 'singer'), bonus: 0, fine: 0, search: '', results: [],
          fullPrice: getPriceForMember(m, resolvedType, 'singer'), share: 1,
        }]
      })
      if (rows.length) setWeekdayRows((prev) => {
        const existing = new Set(prev.filter((r) => r.memberId).map((r) => r.memberId))
        const add = rows.filter((r) => !existing.has(r.memberId))
        const kept = prev.filter((r) => r.memberId)
        return [...kept, ...add]
      })
    }
    setPasteDone(true)
    setTimeout(() => setPasteDone(false), 3000)
  }

  // Закрыть нампад, если его цель больше не редактируется (сняли галочку, удалили, очистили слот)
  useEffect(() => {
    if (!activeNumpad) return
    const { id } = activeNumpad
    let visible = false
    if (id === 'all') {
      visible = choirType === 'weekday'
        ? weekdayRows.some((r) => r.memberId)
        : festiveRows.some((r) => r.checked)
    }
    else if (id === 'festiveRegent') visible = !!festiveRegent.memberId
    else if (id === 'regent') visible = !!regent.memberId
    else if (id === 'reader') visible = !!reader.memberId
    else if (id.startsWith('f:')) visible = festiveRows.find((r) => r.memberId === id.slice(2))?.checked ?? false
    else if (id.startsWith('w:')) visible = !!weekdayRows.find((r) => r.key === id.slice(2))?.memberId
    if (!visible) setActiveNumpad(null)
  }, [activeNumpad, festiveRegent, regent, reader, festiveRows, weekdayRows, choirType])

  const resolvedType = eventType === 'Другое' ? customType.trim() : eventType

  /* ── Утилиты ── */
  /**
   * Возвращает цену участника для данного типа выхода.
   * Личная ненулевая цена имеет приоритет; иначе — тариф из типа выхода.
   * Если тип помечен половинной ставкой — результат делится на 2.
   */
  function getPriceForMember(m: Member, type: string, slotRole?: string): number {
    const priceMap = pricesToMap(m.defaultPrices)
    const personal = priceMap[type]
    const etDoc = eventTypeDocs.find((et) => et.name === type && et.choirType === choirType)
    const role = slotRole ?? m.role
    const etPrice = (etDoc?.prices as Record<string, number> | undefined)?.[role] ?? 0
    const base = (personal !== undefined && personal > 0) ? personal : etPrice
    return applyHalf(base, (m.halvedEventTypes ?? []).includes(type))
  }

  /** Отображает имя в формате "Фамилия И." или "Фамилия И. О." */
  function memberDisplayName(name: string, patronymic?: string): string {
    const parts = name.trim().split(/\s+/)
    const lastName = parts[0] || ''
    const firstWord = parts[1] || ''
    if (!firstWord || firstWord.endsWith('.')) {
      return patronymic?.trim() ? `${name} ${patronymic.trim()[0].toUpperCase()}.` : name
    }
    const pi = patronymic?.trim() ? ` ${patronymic.trim()[0].toUpperCase()}.` : ''
    return `${lastName} ${firstWord[0]}.${pi}`
  }

  /** Скрыт ли участник для данного типа выхода (отключён в профиле или роль отключена в типе) */
  function isMemberDisabled(m: Member, type: string): boolean {
    if ((m.disabledEventTypes ?? []).includes(type)) return true
    const etDoc = eventTypeDocs.find((et) => et.name === type)
    if ((etDoc?.disabledRoles ?? []).includes(m.role)) return true
    return false
  }

  function goToMembers() {
    setAnimDir('right')
    setStepKey((k) => k + 1)
    setStep('members')

    // Обновить цену чтеца под выбранный тип выхода (или сбросить, если отключён)
    if (choirType === 'weekday' && !editingEvent) {
      const rt = eventType === 'Другое' ? customType.trim() : eventType
      setReader((cur) => {
        if (!cur.memberId) return cur
        const readerMember = members.find((m) => m._id === cur.memberId)
        if (!readerMember) return cur
        if (isMemberDisabled(readerMember, rt)) return emptySlot()
        const full = getPriceForMember(readerMember, rt, 'reader')
        return { ...cur, fullPrice: full, basePrice: priceForShare(full, cur.share) }
      })
    }
  }

  /** Слот из сохранённой записи: восстанавливаем полную ставку по доле */
  function slotFromAtt(a: { memberId: string; memberName: string; basePrice: number; bonus: number; fine?: number; share?: number }): SlotState {
    const share = a.share ?? 1
    return {
      memberId: a.memberId, memberName: a.memberName,
      basePrice: a.basePrice, bonus: a.bonus, fine: a.fine ?? 0,
      search: '', results: [],
      fullPrice: share === 1 ? a.basePrice : Math.round(a.basePrice / share),
      share,
    }
  }

  function goToType() {
    setAnimDir('left')
    setStepKey((k) => k + 1)
    setStep('type')
    setActiveNumpad(null)
  }

  /* ── Подгонка шторки под клавиатуру ──
     Обёртку модалки HeroUI прижимает к верху layout viewport, а тот при
     открытой клавиатуре не совпадает с видимой областью: iOS сдвигает
     страницу (visualViewport.offsetTop) и урезает высоту. Из-за расхождения
     низ шторки не доходил до клавиатуры — там и зияла дыра со сквозящей
     страницей. Прикладываем обёртку ровно к visual viewport через
     CSS-переменные (см. .kb-aware-wrapper в globals.css). */
  const [vvHeight, setVvHeight] = useState(0)
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) { setVvHeight(0); setKeyboardOpen(false); return }
    const vv = window.visualViewport
    if (!vv) return
    const root = document.documentElement
    let lastHeight = vv.height
    function sync() {
      setVvHeight(vv!.height)
      // Клавиатура занимает заметную часть экрана — по этому её и определяем
      const kbOpen = window.innerHeight - vv!.height > 120
      setKeyboardOpen(kbOpen)
      if (kbOpen) {
        root.style.setProperty('--kb-top', `${vv!.offsetTop}px`)
        root.style.setProperty('--kb-height', `${vv!.height}px`)
        // Высота области под видимой частью: клавиатура вместе с системной
        // панелью ⌃⌄. Панель полупрозрачная, и сквозь неё видно страницу —
        // поэтому продолжаем под ней фон шторки
        root.style.setProperty('--kb-gap', `${Math.max(0, window.innerHeight - vv!.height - vv!.offsetTop)}px`)
      } else {
        root.style.removeProperty('--kb-top')
        root.style.removeProperty('--kb-height')
        root.style.removeProperty('--kb-gap')
      }

      const shrink = lastHeight - vv!.height
      lastHeight = vv!.height
      // Скроллим только на выехавшую клавиатуру. Без этого порога iOS шлёт
      // resize при каждой мелочи (схлопывание панелей Safari, набор текста),
      // и страница дёргается на ровном месте.
      if (shrink < 120) return
      const el = document.activeElement as HTMLElement | null
      if (!el || typeof el.getBoundingClientRect !== 'function') return
      // Уже видно над клавиатурой — не трогаем
      if (el.getBoundingClientRect().bottom <= vv!.height - 8) return
      // 'nearest', а не 'center': подтягиваем ровно настолько, чтобы стало
      // видно, иначе инпут уплывает в середину экрана
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
      root.style.removeProperty('--kb-top')
      root.style.removeProperty('--kb-height')
      root.style.removeProperty('--kb-gap')
    }
  }, [isOpen])

  /* ── Загрузка данных + инициализация формы ── */
  useEffect(() => {
    if (!isOpen) return
    setActiveNumpad(null)
    setCopyDone(false)
    setPasteDone(false)
    // Загрузим скопированный список, чтобы показать кнопку «Вставить»
    try {
      const raw = localStorage.getItem(ROSTER_CLIPBOARD_KEY)
      setClipboard(raw ? JSON.parse(raw) as RosterClip : null)
    } catch { setClipboard(null) }
    setMembersLoading(true)
    setTypesLoading(true)

    const typesPromise = fetch('/api/event-types').then((r) => (r.ok ? r.json() : []))
    const membersPromise = fetch('/api/members').then((r) => (r.ok ? r.json() : []))

    typesPromise.then((typesData: EventTypeDoc[]) => {
      setEventTypeDocs(typesData)
      setTypesLoading(false)
    })

    Promise.all([membersPromise, typesPromise]).then(([membersData, typesData]: [Member[], EventTypeDoc[]]) => {
      setMembers(membersData)
      setEventTypeDocs(typesData)
      setMembersLoading(false)

      if (editingEvent) {
        const et = editingEvent.eventType
        const knownNames = (typesData as EventTypeDoc[]).map((d) => d.name)
        if (knownNames.includes(et)) {
          setEventType(et)
        } else {
          setEventType('Другое')
          setCustomType(et)
        }
        setStep('members')

        if (choirType === 'festive') {
          const regentAtt = editingEvent.attendances.find((a) => a.isRegent)
          setFestiveRegent(regentAtt ? slotFromAtt(regentAtt) : emptySlot())
        }

        if (choirType === 'weekday') {
          const regentAtt = editingEvent.attendances.find((a) => a.isRegent)
            ?? editingEvent.attendances[0]
          const readerAtt = editingEvent.attendances.find((a) => a.isReader)
          const singerAtts = editingEvent.attendances.filter(
            (a) => a !== regentAtt && a !== readerAtt
          )

          setRegent(regentAtt ? slotFromAtt(regentAtt) : emptySlot())
          setReader(readerAtt ? slotFromAtt(readerAtt) : emptySlot())
          setWeekdayRows(singerAtts.map((a) => ({ key: nextKey(), ...slotFromAtt(a) })))
        }
      } else {
        setStep('type')
        setAnimDir('right')
        setStepKey(0)
        setEventType('')
        setCustomType('')
        setRegent(emptySlot())
        setWeekdayRows([])
        setFestiveRows([])

        // Предзаполнить регента для праздничного хора
        if (choirType === 'festive') {
          const defaultRegent = (membersData as Member[]).find((m) => m.role === 'regent')
          setFestiveRegent(defaultRegent
            ? { memberId: defaultRegent._id, memberName: buildMemberName(defaultRegent.name, defaultRegent.patronymic), basePrice: 0, bonus: 0, fine: 0, search: '', results: [], fullPrice: 0, share: 1 }
            : emptySlot()
          )
        } else {
          setFestiveRegent(emptySlot())
        }

        // Автозаполнить чтеца для буднего хора (если он не отключён для нового типа)
        if (choirType === 'weekday') {
          const defaultReader = (membersData as Member[]).find((m) => m.role === 'reader')
          setReader(emptySlot()) // basePrice выставим позже в goToMembers, когда тип будет известен
          if (defaultReader) {
            setReader({ memberId: defaultReader._id, memberName: buildMemberName(defaultReader.name, defaultReader.patronymic), basePrice: 0, bonus: 0, fine: 0, search: '', results: [], fullPrice: 0, share: 1 })
          }
        } else {
          setReader(emptySlot())
        }
      }
    })
  }, [isOpen, editingEvent, choirType])

  /* ── Праздничные строки (по members + resolvedType) ── */
  useEffect(() => {
    if (choirType !== 'festive' || !resolvedType || members.length === 0) return
    const existingAtt = editingEvent?.attendances || []
    // Отсортировать участников по алфавиту
    const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    const newRows: FestiveRow[] = sorted
      .filter((m) => !isMemberDisabled(m, resolvedType))  // исключить отключённых
      .map((m) => {
        const mName = memberDisplayName(m.name, m.patronymic)
        // Регент в праздничном хоре берётся из отдельного слота, не из общего списка
        const isRegentAtt = existingAtt.find((a) => a.memberId === m._id && a.isRegent)
        if (isRegentAtt) return null
        const existing = existingAtt.find((a) => a.memberId === m._id || a.memberName === m.name || a.memberName === mName)
        const basePrice = existing?.basePrice ?? getPriceForMember(m, resolvedType)
        const share = existing?.share ?? 1
        return {
          memberId: m._id,
          memberName: mName,
          basePrice,
          bonus: existing?.bonus ?? 0,
          fine: existing?.fine ?? 0,
          checked: !!existing,
          fullPrice: share === 1 ? basePrice : Math.round(basePrice / share),
          share,
        }
      })
      .filter((r): r is FestiveRow => r !== null)
    setFestiveRows(newRows)

    // Обновить цену регента по выбранному типу выхода (только для новых событий)
    if (!editingEvent) {
      setFestiveRegent((cur) => {
        if (!cur.memberId) return cur
        const regentMember = members.find((m) => m._id === cur.memberId)
        if (!regentMember) return cur
        const full = getPriceForMember(regentMember, resolvedType)
        return { ...cur, fullPrice: full, basePrice: priceForShare(full, cur.share) }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, resolvedType, choirType, editingEvent, eventTypeDocs])

  function updateFestiveRow(id: string, field: 'basePrice' | 'bonus' | 'fine' | 'checked', val: unknown) {
    if (field === 'checked') {
      setEmptyError(false)
      // При снятии галочки — сбросить цены певчего к тарифу по умолчанию
      if (val === false) {
        const member = members.find((m) => m._id === id)
        const defaultPrice = member ? getPriceForMember(member, resolvedType) : 0
        setFestiveRows((prev) => prev.map((r) =>
          r.memberId === id ? { ...r, checked: false, basePrice: defaultPrice, fullPrice: defaultPrice, share: 1, bonus: 0, fine: 0 } : r
        ))
        return
      }
    }
    setFestiveRows((prev) => prev.map((r) => (r.memberId === id ? { ...r, [field]: val } : r)))
  }

  /* ── Поиск (общий) ── */
  function searchMembers(q: string, excludeIds: string[], preferRole?: string): Member[] {
    if (!q.trim()) return []
    const q2 = q.toLowerCase()
    return members
      .filter((m) =>
        m.name.toLowerCase().includes(q2) &&
        !excludeIds.includes(m._id) &&
        !isMemberDisabled(m, resolvedType)
      )
      .sort((a, b) => {
        if (preferRole) {
          if (a.role === preferRole && b.role !== preferRole) return -1
          if (b.role === preferRole && a.role !== preferRole) return 1
        }
        return a.name.localeCompare(b.name, 'ru')
      })
      .slice(0, 8)
  }

  /* ── Регент ── */
  function handleRegentSearch(q: string) {
    const excludeIds = [reader.memberId, ...weekdayRows.filter((r) => r.memberId).map((r) => r.memberId)].filter(Boolean)
    const results = searchMembers(q, excludeIds, 'regent')
    setRegent((r) => ({ ...r, search: q, results }))

    // Автопрокрутка: инпут регента к верху скролл-контейнера
    if (results.length > 0) {
      setTimeout(() => {
        const input = regentInputRef.current
        if (!input) return
        let el: HTMLElement | null = input.parentElement
        while (el) {
          const { overflow, overflowY } = getComputedStyle(el)
          if (/auto|scroll/.test(overflow + overflowY)) break
          el = el.parentElement
        }
        if (!el) return
        const inputTop = input.getBoundingClientRect().top
        const containerTop = el.getBoundingClientRect().top
        el.scrollBy({ top: inputTop - containerTop - 12, behavior: 'smooth' })
      }, 60)
    }
  }

  function selectRegent(m: Member) {
    const price = getPriceForMember(m, resolvedType, 'regent')
    setRegent({ memberId: m._id, memberName: memberDisplayName(m.name, m.patronymic), basePrice: price, bonus: 0, fine: 0, search: '', results: [], fullPrice: price, share: 1 })
  }

  function clearRegent() { setRegent(emptySlot()) }

  /* ── Регент праздничного хора ── */
  function handleFestiveRegentSearch(q: string) {
    const results = searchMembers(q, [], 'regent')
    setFestiveRegent((r) => ({ ...r, search: q, results }))
  }

  function selectFestiveRegent(m: Member) {
    const price = getPriceForMember(m, resolvedType)
    setFestiveRegent({ memberId: m._id, memberName: memberDisplayName(m.name, m.patronymic), basePrice: price, bonus: 0, fine: 0, search: '', results: [], fullPrice: price, share: 1 })
  }

  /* ── Чтец ── */
  function handleReaderSearch(q: string) {
    const excludeIds = [regent.memberId, ...weekdayRows.filter((r) => r.memberId).map((r) => r.memberId)].filter(Boolean)
    const results = searchMembers(q, excludeIds, 'reader')
    setReader((r) => ({ ...r, search: q, results }))
  }

  function selectReader(m: Member) {
    const price = getPriceForMember(m, resolvedType, 'reader')   // слот = чтец
    setReader({ memberId: m._id, memberName: memberDisplayName(m.name, m.patronymic), basePrice: price, bonus: 0, fine: 0, search: '', results: [], fullPrice: price, share: 1 })
  }

  function clearReader() { setReader(emptySlot()) }

  /* ── Будние певчие ── */
  const regentInputRef = useRef<HTMLInputElement>(null)
  const newRowInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  function addSingerRow() {
    // Не плодим пустые строки: если незаполненная уже есть — просто ставим в неё курсор
    const empty = weekdayRows.find((r) => !r.memberId && !r.search.trim())
    if (empty) {
      newRowInputRefs.current.get(empty.key)?.focus()
      return
    }
    const key = nextKey()
    // flushSync — рендерим строку синхронно, чтобы инпут появился сразу и focus()
    // остался внутри пользовательского жеста. Иначе iOS не покажет клавиатуру.
    flushSync(() => {
      setWeekdayRows((prev) => [...prev, { key, memberId: '', memberName: '', basePrice: 0, bonus: 0, fine: 0, search: '', results: [], fullPrice: 0, share: 1 }])
    })
    newRowInputRefs.current.get(key)?.focus()
  }

  function updateSingerRowSearch(key: string, q: string) {
    const excludeIds = [
      regent.memberId,
      reader.memberId,
      ...weekdayRows.filter((r) => r.key !== key && r.memberId).map((r) => r.memberId),
    ].filter(Boolean)
    const results = searchMembers(q, excludeIds)
    setWeekdayRows((prev) => prev.map((r) => r.key === key ? { ...r, search: q, results } : r))

    // Подтягиваем список, только если он не влезает на экран, и ровно на
    // столько, сколько не хватает. Когда список и так виден целиком —
    // ничего не двигаем, иначе каждое стирание и повторный ввод дёргали экран.
    if (results.length === 0) return
    setTimeout(() => {
      const input = newRowInputRefs.current.get(key)
      if (!input) return
      const list = input.closest('.relative')?.querySelector('[data-suggest]') as HTMLElement | null
      if (!list) return

      let el: HTMLElement | null = input.parentElement
      while (el) {
        const { overflow, overflowY } = getComputedStyle(el)
        if (/auto|scroll/.test(overflow + overflowY)) break
        el = el.parentElement
      }
      if (!el) return

      const visibleBottom = Math.min(
        el.getBoundingClientRect().bottom,
        window.visualViewport?.height ?? window.innerHeight,
      )
      const overflowPx = list.getBoundingClientRect().bottom - visibleBottom + 12
      if (overflowPx < 8) return
      // Не утаскиваем сам инпут за верх контейнера
      const maxShift = input.getBoundingClientRect().top - el.getBoundingClientRect().top - 12
      el.scrollBy({ top: Math.min(overflowPx, Math.max(maxShift, 0)), behavior: 'smooth' })
    }, 60)
  }

  function selectSingerMember(key: string, m: Member) {
    const price = getPriceForMember(m, resolvedType, 'singer')   // слот = певчий
    setEmptyError(false)
    setWeekdayRows((prev) =>
      prev.map((r) => r.key === key
        ? { ...r, memberId: m._id, memberName: memberDisplayName(m.name, m.patronymic), basePrice: price, bonus: 0, fine: 0, search: '', results: [], fullPrice: price, share: 1 }
        : r
      )
    )
  }

  function updateSingerRowField(key: string, field: 'basePrice' | 'bonus' | 'fine', val: string) {
    const num = parseInt(val, 10) || 0
    setWeekdayRows((prev) => prev.map((r) => r.key === key ? { ...r, [field]: num } : r))
  }

  function removeSingerRow(key: string) {
    setWeekdayRows((prev) => prev.filter((r) => r.key !== key))
  }

  /* ── Сохранение ── */
  async function handleSave() {
    if (!resolvedType) return

    let attendances
    if (choirType === 'festive') {
      const singerAtts = festiveRows
        .filter((r) => r.checked)
        .map((r) => ({ memberId: r.memberId, memberName: r.memberName, basePrice: r.basePrice, bonus: r.bonus, ...(r.fine ? { fine: r.fine } : {}), ...(r.share !== 1 ? { share: r.share } : {}) }))
      attendances = [
        ...(festiveRegent.memberId
          ? [{ memberId: festiveRegent.memberId, memberName: festiveRegent.memberName, basePrice: festiveRegent.basePrice, bonus: festiveRegent.bonus, ...(festiveRegent.fine ? { fine: festiveRegent.fine } : {}), ...(festiveRegent.share !== 1 ? { share: festiveRegent.share } : {}), isRegent: true as const }]
          : []),
        ...singerAtts,
      ]
    } else {
      const singerAtts = weekdayRows
        .filter((r) => r.memberId)
        .map((r) => ({ memberId: r.memberId, memberName: r.memberName, basePrice: r.basePrice, bonus: r.bonus, ...(r.fine ? { fine: r.fine } : {}), ...(r.share !== 1 ? { share: r.share } : {}) }))
      attendances = [
        ...(regent.memberId
          ? [{ memberId: regent.memberId, memberName: regent.memberName, basePrice: regent.basePrice, bonus: regent.bonus, ...(regent.fine ? { fine: regent.fine } : {}), ...(regent.share !== 1 ? { share: regent.share } : {}), isRegent: true as const }]
          : []),
        ...(reader.memberId
          ? [{ memberId: reader.memberId, memberName: reader.memberName, basePrice: reader.basePrice, bonus: reader.bonus, ...(reader.fine ? { fine: reader.fine } : {}), ...(reader.share !== 1 ? { share: reader.share } : {}), isReader: true as const }]
          : []),
        ...singerAtts,
      ]
    }

    if (attendances.length === 0) { setEmptyError(true); return }
    setEmptyError(false)
    setSaving(true)

    if (editingEvent) {
      await fetch(`/api/events/${editingEvent._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: resolvedType, attendances }),
      })
    } else {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, eventType: resolvedType, attendances }),
      })
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  const checkedCount = choirType === 'festive'
    ? (festiveRegent.memberId ? 1 : 0) + festiveRows.filter((r) => r.checked).length
    : (regent.memberId ? 1 : 0) + (reader.memberId ? 1 : 0) + weekdayRows.filter((r) => r.memberId).length

  /* ─── Нампад: чтение и запись значения активного поля ─── */
  // Доля и общая цена набираются с чистого листа — держим их черновики
  const [shareDraft, setShareDraft] = useState(0)
  const [allPriceDraft, setAllPriceDraft] = useState(0)

  const FIELD_LABELS: Record<PriceField, string> = { basePrice: 'цена', bonus: 'доплата', fine: 'штраф', share: 'доля, %' }

  function numpadValue(): number {
    if (!activeNumpad) return 0
    const { id, field } = activeNumpad
    // Цена всем — поле общее, стартуем с чистого листа
    if (id === 'all') return allPriceDraft
    if (field === 'share') return shareDraft
    if (id === 'festiveRegent') return festiveRegent[field]
    if (id === 'regent') return regent[field]
    if (id === 'reader') return reader[field]
    if (id.startsWith('f:')) return festiveRows.find((r) => r.memberId === id.slice(2))?.[field] ?? 0
    if (id.startsWith('w:')) return weekdayRows.find((r) => r.key === id.slice(2))?.[field] ?? 0
    return 0
  }

  /** Новое состояние слота/строки после правки поля через нампад */
  function applyField<T extends { basePrice: number; bonus: number; fine: number; fullPrice: number; share: number }>(
    row: T, field: PriceField, v: number,
  ): T {
    if (field === 'share') {
      // Доля вводится в процентах; 0 или пусто — считаем целым выходом
      const share = v > 0 ? Math.min(v, 100) / 100 : 1
      return { ...row, share, basePrice: priceForShare(row.fullPrice, share) }
    }
    if (field === 'basePrice') {
      // Цену вписали руками — это и есть итог, долю больше не применяем
      return { ...row, basePrice: v, fullPrice: v, share: 1 }
    }
    return { ...row, [field]: v }
  }

  function applyNumpad(v: number) {
    if (!activeNumpad) return
    const { id, field } = activeNumpad
    if (id === 'all') { setAllPriceDraft(v); applyPriceToAll(v); return }
    if (field === 'share') {
      if (v > 100) return   // больше целого выхода не бывает
      setShareDraft(v)
    }
    if (id === 'festiveRegent') setFestiveRegent((r) => applyField(r, field, v))
    else if (id === 'regent') setRegent((r) => applyField(r, field, v))
    else if (id === 'reader') setReader((r) => applyField(r, field, v))
    else if (id.startsWith('f:')) {
      const mid = id.slice(2)
      setFestiveRows((prev) => prev.map((r) => r.memberId === mid ? applyField(r, field, v) : r))
    } else if (id.startsWith('w:')) {
      const key = id.slice(2)
      setWeekdayRows((prev) => prev.map((r) => r.key === key ? applyField(r, field, v) : r))
    }
  }

  /** Особая цена на весь выход: ставим её всем певчим, сохраняя их доли */
  function applyPriceToAll(v: number) {
    if (choirType === 'weekday') {
      setWeekdayRows((prev) => prev.map((r) =>
        r.memberId ? { ...r, fullPrice: v, basePrice: priceForShare(v, r.share) } : r))
    } else {
      setFestiveRows((prev) => prev.map((r) =>
        r.checked ? { ...r, fullPrice: v, basePrice: priceForShare(v, r.share) } : r))
    }
  }

  /** Доля выхода у слота/строки по id нампада */
  function currentShare(id: string): number {
    if (id === 'festiveRegent') return festiveRegent.share
    if (id === 'regent') return regent.share
    if (id === 'reader') return reader.share
    if (id.startsWith('f:')) return festiveRows.find((r) => r.memberId === id.slice(2))?.share ?? 1
    if (id.startsWith('w:')) return weekdayRows.find((r) => r.key === id.slice(2))?.share ?? 1
    return 1
  }

  /** Поставить долю и пересчитать цену от полной ставки */
  function setShareFor(id: string, share: number) {
    const set = <T extends { basePrice: number; fullPrice: number; share: number }>(row: T): T =>
      ({ ...row, share, basePrice: priceForShare(row.fullPrice, share) })
    if (id === 'festiveRegent') setFestiveRegent(set)
    else if (id === 'regent') setRegent(set)
    else if (id === 'reader') setReader(set)
    else if (id.startsWith('f:')) {
      const mid = id.slice(2)
      setFestiveRows((prev) => prev.map((r) => r.memberId === mid ? set(r) : r))
    } else if (id.startsWith('w:')) {
      const key = id.slice(2)
      setWeekdayRows((prev) => prev.map((r) => r.key === key ? set(r) : r))
    }
  }

  /** Особая цена сразу всем певчим этого выхода */
  function AllPriceButton() {
    const isActive = activeNumpad?.id === 'all'
    const has = choirType === 'weekday'
      ? weekdayRows.some((r) => r.memberId)
      : festiveRows.some((r) => r.checked)
    if (!has) return null
    return (
      <button
        type="button"
        onClick={() => {
          if (isActive) { setActiveNumpad(null); return }
          setAllPriceDraft(0)
          setActiveNumpad({ id: 'all', field: 'basePrice', label: 'Цена всем певчим' })
        }}
        className={`text-[11px] font-slab font-semibold rounded-lg px-2 py-1 border transition-all ${
          isActive
            ? 'bg-[#f5ece3] border-[#bd9673] text-[#7d5e42] ring-2 ring-[#bd9673]'
            : 'bg-white border-warm-200 text-warm-600 active:bg-warm-50'
        }`}
      >
        другое
      </button>
    )
  }

  /* ─── JSX переиспользуемые части ─── */
  function PriceButton({ id, field, name, value, tone, share }: {
    id: string; field: PriceField; name: string; value: number; tone: 'base' | 'bonus' | 'fine'
    share?: number
  }) {
    const isActive = activeNumpad?.id === id && activeNumpad?.field === field
    const partial = share !== undefined && share !== 1
    const labelText = field === 'basePrice'
      ? (partial ? `цена · ${shareLabel(share)}` : 'цена')
      : field === 'bonus' ? '+доп' : '−штраф'
    const toneClass =
      tone === 'fine' ? 'bg-red-50 border-red-200 text-red-600'
      : tone === 'bonus' ? 'bg-white border-warm-200 text-green-700'
      : 'bg-white border-warm-200 text-warm-900'
    return (
      <div className="flex flex-col items-end">
        <span className={`text-[10px] ${tone === 'fine' ? 'text-red-400' : partial ? 'text-[#7d5e42] font-semibold' : 'text-warm-400'}`}>{labelText}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setActiveNumpad(isActive ? null : { id, field, label: `${name} · ${FIELD_LABELS[field]}` })
          }}
          className={`text-right rounded-lg px-2 py-1 text-sm font-medium border transition-all ${toneClass} ${isActive ? 'ring-2 ring-[#bd9673] border-[#bd9673]' : ''}`}
          style={{ minWidth: tone === 'base' ? 72 : 56 }}
        >
          {value.toLocaleString('ru-RU')}
        </button>
      </div>
    )
  }

  function PriceInputs({ id, name, basePrice, bonus, fine, share }: {
    id: string; name: string; basePrice: number; bonus: number; fine: number; share: number
  }) {
    return (
      <div className="flex items-center gap-1.5">
        <PriceButton id={id} field="basePrice" name={name} value={basePrice} tone="base" share={share} />
        <PriceButton id={id} field="bonus" name={name} value={bonus} tone="bonus" />
        <PriceButton id={id} field="fine" name={name} value={fine} tone="fine" />
      </div>
    )
  }

  return (
    <>
    <Drawer
      isOpen={isOpen}
      onOpenChange={(open) => { if (open) return; if (requestCloseDrawer()) return; onClose() }}
      placement="bottom"
      scrollBehavior="inside"
      isDismissable={!discardOpen}
      classNames={{
        wrapper: 'kb-aware-wrapper',
        base: 'bg-white rounded-t-2xl max-h-[92dvh] flex flex-col overflow-hidden shadow-[0_-8px_40px_rgba(0,0,0,0.15)]',
        header: 'border-b border-warm-200 px-4 pt-2 pb-3 shrink-0',
        body: 'overflow-y-auto px-4 py-4',
        footer: 'border-t border-warm-200 bg-white px-4 py-3 shrink-0',
        closeButton: 'hidden',
      }}
    >
      <DrawerContent style={keyboardOpen ? { maxHeight: vvHeight } : undefined}>
        {(closeDrawer) => (
          <>
            <DrawerHeader className="flex-col gap-0">
              <DrawerHandle onClose={closeDrawer} interceptClose={requestCloseDrawer} />
              <div className="flex items-center gap-2 w-full">
                {step === 'members' && !editingEvent && (
                  <button
                    onClick={goToType}
                    className="w-8 h-8 rounded-xl bg-warm-100 text-warm-600 flex items-center justify-center shrink-0 active:bg-warm-200 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M15.5695 4.43057C15.8841 4.70014 15.9205 5.17361 15.6509 5.48811L10.0693 12L15.6509 18.5119C15.9205 18.8264 15.8841 19.2999 15.5695 19.5695C15.255 19.839 14.7816 19.8026 14.512 19.4881L8.51192 12.4881C8.27128 12.2072 8.27128 11.7928 8.51192 11.5119L14.512 4.51192C14.7816 4.19743 15.255 4.161 15.5695 4.43057Z" fill="currentColor"/>
                    </svg>
                  </button>
                )}
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="text-base font-bold text-warm-900 truncate">
                    {editingEvent
                      ? `Редактировать: ${editingEvent.eventType}`
                      : step === 'type' ? 'Новый выход' : resolvedType || 'Певчие'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* Копировать список участников (в режиме редактирования) */}
                    {step === 'members' && editingEvent && checkedCount > 0 && (
                      <button
                        type="button"
                        onClick={copyRoster}
                        title="Скопировать список участников"
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                          copyDone ? 'bg-green-500 text-white' : 'bg-warm-100 text-warm-600 active:bg-warm-200'
                        }`}
                      >
                        {copyDone ? <IconClipboardCheck /> : <IconCopy />}
                      </button>
                    )}
                    {/* Вставить скопированный список (при создании нового) */}
                    {step === 'members' && !editingEvent && clipboard && clipboard.choirType === choirType && (
                      <button
                        type="button"
                        onClick={pasteRoster}
                        title="Вставить скопированный список"
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                          pasteDone ? 'bg-green-500 text-white' : 'bg-warm-100 text-warm-600 active:bg-warm-200'
                        }`}
                      >
                        {pasteDone ? <IconClipboardCheck /> : <IconClipboard />}
                      </button>
                    )}
                    {step === 'members' && checkedCount > 0 && (
                      <span className="text-xs text-warm-500">
                        {checkedCount} {plural(checkedCount, choirType === 'weekday' ? PARTICIPANT : SINGER)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </DrawerHeader>

            <DrawerBody>
              <div key={stepKey} className={animDir === 'right' ? 'anim-slide-right' : 'anim-slide-left'}>

                {/* ── Шаг 1: тип выхода ── */}
                {step === 'type' && (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold text-warm-600 uppercase tracking-wide">Тип выхода</p>
                    {typesLoading ? (
                      <div className="flex justify-center py-6"><LoadingSpinner size="lg" color="#9b7653" /></div>
                    ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {[...eventTypeDocs.map((et) => et.name), 'Другое'].map((t) => {
                        const active = eventType === t
                        return (
                          <button
                            key={t}
                            onClick={() => setEventType(t)}
                            className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                              active ? 'text-white border-transparent' : 'bg-white border-warm-200 text-warm-700 active:bg-warm-50'
                            }`}
                            style={active ? { background: 'linear-gradient(to right, #bd9673, #7d5e42)' } : {}}
                          >
                            {t}
                          </button>
                        )
                      })}
                    </div>
                    )}
                    {!typesLoading && eventType === 'Другое' && (
                      <input
                        className="warm-input"
                        placeholder="Введите название выхода"
                        onFocus={() => setActiveNumpad(null)}
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value)}
                        autoFocus
                      />
                    )}
                  </div>
                )}

                {/* ── Шаг 2: певчие ── */}
                {step === 'members' && (
                  <>
                    {membersLoading ? (
                      <div className="flex justify-center py-8"><LoadingSpinner size="lg" color="#9b7653" /></div>
                    ) : (

                      /* ══ ПРАЗДНИЧНЫЙ ХОР ══ */
                      choirType === 'festive' ? (
                        <div className="flex flex-col gap-1.5">

                          {/* ── Регент ── */}
                          <div className="mb-2">
                            <p className="text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-2">Регент</p>
                            {festiveRegent.memberId ? (
                              <div className="flex items-center gap-2 bg-warm-50 border border-warm-200 rounded-xl px-3 py-2.5">
                                <span className="flex-1 text-sm font-slab font-semibold text-warm-900">{shortName(festiveRegent.memberName)}</span>
                                <PriceInputs
                                  id="festiveRegent" name={shortName(festiveRegent.memberName)}
                                  basePrice={festiveRegent.basePrice} bonus={festiveRegent.bonus} fine={festiveRegent.fine} share={festiveRegent.share}
                                />
                                <button onClick={() => setFestiveRegent(emptySlot())} className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center shrink-0 active:bg-red-100">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  className="warm-input"
                                  placeholder="Поиск по фамилии..."
                                  onFocus={() => setActiveNumpad(null)}
                                  value={festiveRegent.search}
                                  onChange={(e) => handleFestiveRegentSearch(e.target.value)}
                                  autoComplete="off"
                                />
                                {festiveRegent.results.length > 0 && (
                                  <div className="absolute z-10 top-full left-0 right-0 bg-white border border-warm-200 rounded-xl shadow-lg mt-1 overflow-y-auto max-h-56">
                                    {festiveRegent.results.map((m) => (
                                      <button
                                        key={m._id}
                                        className="w-full text-left px-4 py-3 text-sm border-b border-warm-100 last:border-b-0 active:bg-warm-50 flex items-center gap-2"
                                        onClick={() => selectFestiveRegent(m)}
                                      >
                                        <span className="font-semibold text-warm-900 flex-1">{memberDisplayName(m.name, m.patronymic)}</span>
                                        {m.role === 'regent' && <span className="text-xs text-warm-400 shrink-0">Регент</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide">Певчие</p>
                            <AllPriceButton />
                          </div>

                          {festiveRows.map((row) => {
                            const isRegent = row.memberId === festiveRegent.memberId && !!festiveRegent.memberId
                            return (
                            <div
                              key={row.memberId}
                              onClick={() => !isRegent && updateFestiveRow(row.memberId, 'checked', !row.checked)}
                              className={`rounded-2xl transition-all ${
                                isRegent
                                  ? 'border border-warm-100 bg-warm-50 opacity-40 cursor-not-allowed'
                                  : row.checked
                                    ? 'border-2 border-warm-300 cursor-pointer'
                                    : 'border border-warm-100 bg-white cursor-pointer'
                              }`}
                              style={!isRegent && row.checked ? { background: 'linear-gradient(135deg, #fdf4ec, #fbeadc)' } : {}}
                            >
                              <div className="flex items-center gap-3 px-3 py-2.5">
                                {/* Круглая галочка */}
                                <div
                                  style={{
                                    width: 22, height: 22, borderRadius: '50%',
                                    border: `2px solid ${row.checked ? '#7d5e42' : '#d4c0ac'}`,
                                    background: row.checked ? '#7d5e42' : 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                                  }}
                                >
                                  {row.checked && (
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                                      <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </div>
                                <span
                                  className={`flex-1 text-sm font-medium transition-colors ${
                                    row.checked ? 'text-warm-900' : 'text-warm-600'
                                  }`}
                                >
                                  {shortName(row.memberName)}
                                </span>
                                {row.checked && (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <PriceInputs
                                      id={`f:${row.memberId}`} name={shortName(row.memberName)}
                                      basePrice={row.basePrice} bonus={row.bonus} fine={row.fine} share={row.share}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            )
                          })}
                        </div>

                      ) : (
                        /* ══ БУДНИЙ ХОР ══ */
                        <div className="flex flex-col gap-4">

                          {/* ── Регент ── */}
                          <div>
                            <p className="text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-2">Регент</p>
                            {regent.memberId ? (
                              <div className="flex items-center gap-2 bg-warm-50 border border-warm-200 rounded-xl px-3 py-2.5">
                                <span className="flex-1 text-sm font-slab font-semibold text-warm-900">{shortName(regent.memberName)}</span>
                                <PriceInputs
                                  id="regent" name={shortName(regent.memberName)}
                                  basePrice={regent.basePrice} bonus={regent.bonus} fine={regent.fine} share={regent.share}
                                />
                                <button onClick={clearRegent} className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center shrink-0 active:bg-red-100">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  ref={regentInputRef}
                                  className="warm-input"
                                  placeholder="Поиск по фамилии..."
                                  onFocus={() => setActiveNumpad(null)}
                                  value={regent.search}
                                  onChange={(e) => handleRegentSearch(e.target.value)}
                                  autoComplete="off"
                                />
                                {regent.results.length > 0 && (
                                  <div className="absolute z-10 top-full left-0 right-0 bg-white border border-warm-200 rounded-xl shadow-lg mt-1 overflow-y-auto max-h-56">
                                    {regent.results.map((m) => (
                                      <button
                                        key={m._id}
                                        className="w-full text-left px-4 py-3 text-sm border-b border-warm-100 last:border-b-0 active:bg-warm-50 flex items-center gap-2"
                                        onClick={() => selectRegent(m)}
                                      >
                                        <span className="font-semibold text-warm-900 flex-1">{memberDisplayName(m.name, m.patronymic)}</span>
                                        {m.role === 'regent' && <span className="text-xs text-warm-400 shrink-0">Регент</span>}
                                        {m.role === 'reader' && <span className="text-xs text-warm-400 shrink-0">Чтец</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ── Чтец ── */}
                          <div>
                            <p className="text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-2">Чтец</p>
                            {reader.memberId ? (
                              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                                <span className="flex-1 text-sm font-slab font-semibold text-warm-900">{shortName(reader.memberName)}</span>
                                <PriceInputs
                                  id="reader" name={shortName(reader.memberName)}
                                  basePrice={reader.basePrice} bonus={reader.bonus} fine={reader.fine} share={reader.share}
                                />
                                <button onClick={clearReader} className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center shrink-0 active:bg-red-100">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  className="warm-input"
                                  placeholder="Поиск по фамилии..."
                                  onFocus={() => setActiveNumpad(null)}
                                  value={reader.search}
                                  onChange={(e) => handleReaderSearch(e.target.value)}
                                  autoComplete="off"
                                />
                                {reader.results.length > 0 && (
                                  <div className="absolute z-10 top-full left-0 right-0 bg-white border border-warm-200 rounded-xl shadow-lg mt-1 overflow-y-auto max-h-56">
                                    {reader.results.map((m) => (
                                      <button
                                        key={m._id}
                                        className="w-full text-left px-4 py-3 text-sm border-b border-warm-100 last:border-b-0 active:bg-warm-50 flex items-center gap-2"
                                        onClick={() => selectReader(m)}
                                      >
                                        <span className="font-semibold text-warm-900 flex-1">{memberDisplayName(m.name, m.patronymic)}</span>
                                        {m.role === 'reader' && <span className="text-xs text-warm-400 shrink-0">Чтец</span>}
                                        <span className="text-xs text-warm-400 shrink-0">{getPriceForMember(m, resolvedType, 'reader')} ₽</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ── Певчие ── */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide">Певчие</p>
                              <div className="flex items-center gap-2">
                                <AllPriceButton />
                                <span className="text-xs text-warm-400">{weekdayRows.filter((r) => r.memberId).length} чел.</span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              {weekdayRows.map((row) => (
                                <div key={row.key}>
                                  {row.memberId ? (
                                    <div className="flex items-center gap-2 bg-white border border-warm-200 rounded-xl px-3 py-2.5">
                                      <span className="flex-1 text-sm text-warm-900 font-medium">{shortName(row.memberName)}</span>
                                      <PriceInputs
                                        id={`w:${row.key}`} name={shortName(row.memberName)}
                                        basePrice={row.basePrice} bonus={row.bonus} fine={row.fine} share={row.share}
                                      />
                                      <button
                                        onClick={() => removeSingerRow(row.key)}
                                        className="w-7 h-7 rounded-full bg-red-50 text-red-400 flex items-center justify-center shrink-0 active:bg-red-100"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="relative">
                                      <div className="flex items-center gap-2">
                                        <input
                                          ref={(el) => {
                                            if (el) newRowInputRefs.current.set(row.key, el)
                                            else newRowInputRefs.current.delete(row.key)
                                          }}
                                          className="warm-input flex-1"
                                          placeholder="Поиск по фамилии..."
                                  onFocus={() => setActiveNumpad(null)}
                                          value={row.search}
                                          onChange={(e) => updateSingerRowSearch(row.key, e.target.value)}
                                          autoComplete="off"
                                        />
                                        <button
                                          onClick={() => removeSingerRow(row.key)}
                                          className="w-9 h-9 rounded-xl bg-red-50 text-red-400 flex items-center justify-center shrink-0 active:bg-red-100"
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                          </svg>
                                        </button>
                                      </div>
                                      {row.results.length > 0 && (
                                        <div data-suggest="1" className="absolute z-10 top-full left-0 right-0 bg-white border border-warm-200 rounded-xl shadow-lg mt-1 overflow-y-auto max-h-56" style={{ right: '44px' }}>
                                          {row.results.map((m) => (
                                            <button
                                              key={m._id}
                                              className="w-full text-left px-4 py-3 text-sm border-b border-warm-100 last:border-b-0 active:bg-warm-50 flex items-center gap-2"
                                              onClick={() => selectSingerMember(row.key, m)}
                                            >
                                              <span className="font-semibold text-warm-900 flex-1">{memberDisplayName(m.name, m.patronymic)}</span>
                                              {m.role === 'reader' && <span className="text-xs text-warm-400 shrink-0">Чтец</span>}
                                              <span className="text-xs text-warm-400 shrink-0">{getPriceForMember(m, resolvedType, 'singer')} ₽</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}

                              <button
                                onClick={addSingerRow}
                                className="w-full py-2.5 rounded-xl border border-dashed border-warm-300 text-warm-500 text-sm font-medium flex items-center justify-center gap-2 active:bg-warm-50 transition-colors"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path fillRule="evenodd" clipRule="evenodd" d="M12 3.25C12.4142 3.25 12.75 3.58579 12.75 4V11.25H20C20.4142 11.25 20.75 11.5858 20.75 12C20.75 12.4142 20.4142 12.75 20 12.75H12.75V20C12.75 20.4142 12.4142 20.75 12 20.75C11.5858 20.75 11.25 20.4142 11.25 20V12.75H4C3.58579 12.75 3.25 12.4142 3.25 12C3.25 11.5858 3.58579 11.25 4 11.25H11.25V4C11.25 3.58579 11.5858 3.25 12 3.25Z" fill="currentColor"/>
                                </svg>
                                Добавить певчего
                              </button>
                            </div>
                          </div>

                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            </DrawerBody>

            {activeNumpad && step === 'members' && (
              <div className="absolute bottom-0 left-0 right-0 z-50">
                <InlineNumpad
                  role={activeNumpad.label}
                  value={String(numpadValue())}
                  unit={activeNumpad.field === 'share' ? '%' : '₽'}
                  onChange={(v) => applyNumpad(parseInt(v.replace(/\D/g, '')) || 0)}
                  onClose={() => setActiveNumpad(null)}
                  share={activeNumpad.field === 'basePrice' && activeNumpad.id !== 'all'
                    ? {
                        value: currentShare(activeNumpad.id),
                        onPick: (sh) => setShareFor(activeNumpad.id, sh),
                        onCustom: () => {
                          setShareDraft(0)
                          setActiveNumpad({ ...activeNumpad, field: 'share', label: `${activeNumpad.label.split(' · ')[0]} · ${FIELD_LABELS.share}` })
                        },
                      }
                    : undefined}
                />
              </div>
            )}

            {/* Пока набирают певчих и открыта клавиатура, кнопки всё равно
                оказались бы под ней — прячем, чтобы не занимали экран */}
            {!(keyboardOpen && step === 'members') && (
            <DrawerFooter style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
              {emptyError && step === 'members' && (
                <p className="w-full text-center text-sm text-red-500 pb-1">
                  {choirType === 'weekday' ? 'Добавьте хотя бы одного участника' : 'Выберите хотя бы одного певчего'}
                </p>
              )}
              <button
                onClick={closeDrawer}
                className="flex-1 py-3 rounded-xl border border-warm-200 text-warm-700 text-sm font-semibold active:bg-warm-50"
              >
                Отмена
              </button>

              {step === 'type' ? (
                <button
                  onClick={goToMembers}
                  disabled={!eventType || (eventType === 'Другое' && !customType.trim())}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}
                >
                  Далее →
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || !resolvedType}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}
                >
                  {saving && <LoadingSpinner size="sm" color="white" />}
                  {editingEvent ? 'Сохранить' : 'Добавить'}
                </button>
              )}
            </DrawerFooter>
            )}
          </>
        )}
      </DrawerContent>
    </Drawer>

    <DiscardConfirm
      open={discardOpen}
      onStay={() => setDiscardOpen(false)}
      onDiscard={() => { setDiscardOpen(false); onClose() }}
    />
    </>
  )
}
