'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter,
} from '@heroui/react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Member, MemberRole, EventTypeDoc } from '@/lib/types'
import { EVENT_TYPES, DEFAULT_PRICES, pricesToMap, mapToPrices } from '@/lib/types'
import { plural, PERSON } from '@/lib/plural'
import { splitName } from '@/lib/nameFormat'
import { PageHeader } from '@/components/PageHeader'
import { useSession } from '@/hooks/useSession'
import { notifyDataChanged, onDataChanged } from '@/lib/dataSignal'

const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'singer',  label: 'Певчий'  },
  { value: 'soloist', label: 'Солист'  },
  { value: 'regent',  label: 'Регент'  },
  { value: 'reader',  label: 'Чтец'    },
]

function IconResetPrices() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.7275 6C16.7275 5.58579 16.3917 5.25 15.9775 5.25C15.5633 5.25 15.2275 5.58579 15.2275 6V7.0232C12.9877 5.46956 9.91113 5.70783 7.92796 7.73802C5.69068 10.0283 5.69068 13.7346 7.92796 16.0249C10.1748 18.325 13.8252 18.325 16.072 16.0249C17.3754 14.6907 17.9168 12.8781 17.7055 11.1509C17.6552 10.7398 17.2812 10.4472 16.87 10.4975C16.4589 10.5478 16.1663 10.9219 16.2166 11.333C16.3757 12.6337 15.9667 13.9861 14.999 14.9767C13.3407 16.6744 10.6593 16.6744 9.00097 14.9767C7.33301 13.2692 7.33301 10.4937 9.00097 8.78618C10.324 7.4318 12.298 7.15792 13.8844 7.96452H13.3258C12.9116 7.96452 12.5758 8.3003 12.5758 8.71452C12.5758 9.12873 12.9116 9.46452 13.3258 9.46452H15.9775C16.3917 9.46452 16.7275 9.12873 16.7275 8.71452V6Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M11.9426 1.25C9.63423 1.24999 7.82519 1.24998 6.4137 1.43975C4.96897 1.63399 3.82895 2.03933 2.93414 2.93414C2.03933 3.82895 1.63399 4.96897 1.43975 6.41371C1.24998 7.82519 1.24999 9.63423 1.25 11.9426V12.0574C1.24999 14.3658 1.24998 16.1748 1.43975 17.5863C1.63399 19.031 2.03933 20.1711 2.93414 21.0659C3.82895 21.9607 4.96897 22.366 6.4137 22.5603C7.82519 22.75 9.63423 22.75 11.9426 22.75H12.0574C14.3658 22.75 16.1748 22.75 17.5863 22.5603C19.031 22.366 20.1711 21.9607 21.0659 21.0659C21.9607 20.1711 22.366 19.031 22.5603 17.5863C22.75 16.1748 22.75 14.3658 22.75 12.0574V11.9426C22.75 9.63423 22.75 7.82519 22.5603 6.41371C22.366 4.96897 21.9607 3.82895 21.0659 2.93414C20.1711 2.03933 19.031 1.63399 17.5863 1.43975C16.1748 1.24998 14.3658 1.24999 12.0574 1.25H11.9426ZM3.9948 3.9948C4.56445 3.42514 5.33517 3.09825 6.61358 2.92637C7.91356 2.75159 9.62177 2.75 12 2.75C14.3782 2.75 16.0864 2.75159 17.3864 2.92637C18.6648 3.09825 19.4355 3.42514 20.0052 3.9948C20.5749 4.56445 20.9018 5.33517 21.0736 6.61358C21.2484 7.91356 21.25 9.62178 21.25 12C21.25 14.3782 21.2484 16.0864 21.0736 17.3864C20.9018 18.6648 20.5749 19.4355 20.0052 20.0052C19.4355 20.5749 18.6648 20.9018 17.3864 21.0736C16.0864 21.2484 14.3782 21.25 12 21.25C9.62177 21.25 7.91356 21.2484 6.61358 21.0736C5.33517 20.9018 4.56445 20.5749 3.9948 20.0052C3.42514 19.4355 3.09825 18.6648 2.92637 17.3864C2.75159 16.0864 2.75 14.3782 2.75 12C2.75 9.62178 2.75159 7.91356 2.92637 6.61358C3.09825 5.33517 3.42514 4.56445 3.9948 3.9948Z" fill="currentColor"/>
    </svg>
  )
}

function IconClipboardRemove() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.26279 3.25871C7.38317 2.12953 8.33887 1.25 9.5 1.25H14.5C15.6611 1.25 16.6168 2.12953 16.7372 3.25871C17.5004 3.27425 18.1602 3.31372 18.7236 3.41721C19.4816 3.55644 20.1267 3.82168 20.6517 4.34661C21.2536 4.94853 21.5125 5.7064 21.6335 6.60651C21.75 7.47348 21.75 8.5758 21.75 9.94339V16.0531C21.75 17.4207 21.75 18.523 21.6335 19.39C21.5125 20.2901 21.2536 21.048 20.6517 21.6499C20.0497 22.2518 19.2919 22.5107 18.3918 22.6317C17.5248 22.7483 16.4225 22.7483 15.0549 22.7483H8.94513C7.57754 22.7483 6.47522 22.7483 5.60825 22.6317C4.70814 22.5107 3.95027 22.2518 3.34835 21.6499C2.74643 21.048 2.48754 20.2901 2.36652 19.39C2.24996 18.523 2.24998 17.4207 2.25 16.0531V9.94339C2.24998 8.5758 2.24996 7.47348 2.36652 6.60651C2.48754 5.7064 2.74643 4.94853 3.34835 4.34661C3.87328 3.82168 4.51835 3.55644 5.27635 3.41721C5.83977 3.31372 6.49963 3.27425 7.26279 3.25871ZM7.26476 4.75913C6.54668 4.77447 5.99332 4.81061 5.54735 4.89253C4.98054 4.99664 4.65246 5.16382 4.40901 5.40727C4.13225 5.68403 3.9518 6.07261 3.85315 6.80638C3.75159 7.56173 3.75 8.56285 3.75 9.99826V15.9983C3.75 17.4337 3.75159 18.4348 3.85315 19.1901C3.9518 19.9239 4.13225 20.3125 4.40901 20.5893C4.68577 20.866 5.07435 21.0465 5.80812 21.1451C6.56347 21.2467 7.56458 21.2483 9 21.2483H15C16.4354 21.2483 17.4365 21.2467 18.1919 21.1451C18.9257 21.0465 19.3142 20.866 19.591 20.5893C19.8678 20.3125 20.0482 19.9239 20.1469 19.1901C20.2484 18.4348 20.25 17.4337 20.25 15.9983V9.99826C20.25 8.56285 20.2484 7.56173 20.1469 6.80638C20.0482 6.07261 19.8678 5.68403 19.591 5.40727C19.3475 5.16382 19.0195 4.99664 18.4527 4.89253C18.0067 4.81061 17.4533 4.77447 16.7352 4.75913C16.6067 5.87972 15.655 6.75 14.5 6.75H9.5C8.345 6.75 7.39326 5.87972 7.26476 4.75913ZM9.5 2.75C9.08579 2.75 8.75 3.08579 8.75 3.5V4.5C8.75 4.91421 9.08579 5.25 9.5 5.25H14.5C14.9142 5.25 15.25 4.91421 15.25 4.5V3.5C15.25 3.08579 14.9142 2.75 14.5 2.75H9.5ZM8.96967 11.5303C8.67678 11.2375 8.67678 10.7626 8.96967 10.4697C9.26256 10.1768 9.73744 10.1768 10.0303 10.4697L12 12.4394L13.9697 10.4697C14.2626 10.1768 14.7374 10.1768 15.0303 10.4697C15.3232 10.7626 15.3232 11.2375 15.0303 11.5304L13.0607 13.5L15.0303 15.4697C15.3232 15.7626 15.3232 16.2374 15.0303 16.5303C14.7374 16.8232 14.2625 16.8232 13.9697 16.5303L12 14.5607L10.0304 16.5303C9.73746 16.8232 9.26259 16.8232 8.96969 16.5304C8.6768 16.2375 8.6768 15.7626 8.96969 15.4697L10.9394 13.5L8.96967 11.5303Z" fill="currentColor"/>
    </svg>
  )
}

/** Возвращает цены по умолчанию: для праздничного хора — из DEFAULT_PRICES; для буднего — нули */
function buildDefaultPrices(role: MemberRole, eventTypeNames: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  eventTypeNames.forEach((t) => { out[t] = DEFAULT_PRICES[t]?.[role] ?? 0 })
  return out
}

export default function SingersPage() {
  const { session } = useSession()
  const isWeekday = session?.choirType === 'weekday'

  const [members, setMembers] = useState<Member[]>([])
  const [eventTypeDocs, setEventTypeDocs] = useState<EventTypeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [patronymic, setPatronymic] = useState('')
  const [role, setRole] = useState<MemberRole>('singer')
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [disabledEventTypes, setDisabledEventTypes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Список типов выходов для редактора цен — из БД для обоих хоров, константа как запасной вариант
  const priceEventTypes: string[] = eventTypeDocs.length > 0
    ? eventTypeDocs.map((d) => d.name)
    : isWeekday ? [] : [...EVENT_TYPES]

  const load = useCallback(async () => {
    setLoading(true)
    const [mbRes, etRes] = await Promise.all([
      fetch('/api/members'),
      fetch('/api/event-types'),
    ])
    if (mbRes.ok) setMembers(await mbRes.json())
    if (etRes.ok) setEventTypeDocs(await etRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => onDataChanged(load), [load])

  function openNew() {
    setEditing(null)
    setName('')
    setPatronymic('')
    setRole('singer')
    setPrices(buildDefaultPrices('singer', priceEventTypes))
    setDisabledEventTypes([])
    setDrawerOpen(true)
  }

  function openEdit(m: Member) {
    setEditing(m)
    setName(m.name)
    setPatronymic(m.patronymic || '')
    setRole(m.role)
    const stored = pricesToMap(m.defaultPrices)
    setPrices({ ...buildDefaultPrices(m.role, priceEventTypes), ...stored })
    setDisabledEventTypes(m.disabledEventTypes ?? [])
    setDrawerOpen(true)
  }

  function handleRoleChange(r: MemberRole) {
    setRole(r)
    setPrices(buildDefaultPrices(r, priceEventTypes))
    setDisabledEventTypes([])
  }

  function toggleDisabledEventType(t: string) {
    setDisabledEventTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    )
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const body = {
      name: name.trim(),
      patronymic: patronymic.trim(),
      role,
      defaultPrices: mapToPrices(prices),
      regentMultiplier: 1,
      disabledEventTypes,
    }
    if (editing) {
      await fetch(`/api/members/${editing._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    setSaving(false)
    setDrawerOpen(false)
    load()
    notifyDataChanged()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/members/${deleteTarget._id}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteTarget(null)
    load()
    notifyDataChanged()
  }

  const choirLabel = session?.choirType === 'festive' ? 'Певчие праздничного хора' : 'Певчие буднего хора'

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title={choirLabel}
        subtitle={loading ? '' : `${members.length} ${plural(members.length, PERSON)}`}
        right={
          <button
            onClick={openNew}
            className="w-10 h-10 rounded-xl border border-warm-200 bg-white text-warm-700 flex items-center justify-center active:bg-warm-50 transition-colors"
            title="Добавить певчего"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M7.25013 6C7.25013 3.37665 9.37678 1.25 12.0001 1.25C14.6235 1.25 16.7501 3.37665 16.7501 6C16.7501 8.62335 14.6235 10.75 12.0001 10.75C9.37678 10.75 7.25013 8.62335 7.25013 6ZM12.0001 2.75C10.2052 2.75 8.75013 4.20507 8.75013 6C8.75013 7.79493 10.2052 9.25 12.0001 9.25C13.7951 9.25 15.2501 7.79493 15.2501 6C15.2501 4.20507 13.7951 2.75 12.0001 2.75Z" fill="currentColor"/>
              <path d="M18.0001 13.9167C18.4143 13.9167 18.7501 14.2524 18.7501 14.6667V15.25H19.3333C19.7475 15.25 20.0833 15.5858 20.0833 16C20.0833 16.4142 19.7475 16.75 19.3333 16.75H18.7501V17.3333C18.7501 17.7475 18.4143 18.0833 18.0001 18.0833C17.5859 18.0833 17.2501 17.7475 17.2501 17.3333V16.75H16.6666C16.2524 16.75 15.9166 16.4142 15.9166 16C15.9166 15.5858 16.2524 15.25 16.6666 15.25H17.2501V14.6667C17.2501 14.2524 17.5859 13.9167 18.0001 13.9167Z" fill="currentColor"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M14.7748 12.5129C13.9021 12.3421 12.9686 12.25 12.0001 12.25C9.68658 12.25 7.55506 12.7759 5.97558 13.6643C4.41962 14.5396 3.25013 15.8661 3.25013 17.5L3.25007 17.602C3.24894 18.7638 3.24752 20.222 4.52655 21.2635C5.15602 21.7761 6.03661 22.1406 7.22634 22.3815C8.41939 22.6229 9.97436 22.75 12.0001 22.75C14.8682 22.75 16.81 22.4961 18.1197 22.0085C19.2986 21.5697 19.9974 20.9266 20.3705 20.1172C21.7928 19.2966 22.7501 17.7601 22.7501 16C22.7501 13.3766 20.6235 11.25 18.0001 11.25C16.755 11.25 15.6218 11.7291 14.7748 12.5129ZM6.71098 14.9717C5.37151 15.7251 4.75013 16.6487 4.75013 17.5C4.75013 18.8078 4.79045 19.544 5.47372 20.1004C5.84425 20.4022 6.46366 20.6967 7.52392 20.9113C8.58087 21.1252 10.0259 21.25 12.0001 21.25C14.5781 21.25 16.2402 21.0366 17.311 20.7004C15.0142 20.3666 13.2501 18.3893 13.2501 16C13.2501 15.2322 13.4323 14.5069 13.7558 13.865C13.1941 13.79 12.6062 13.75 12.0001 13.75C9.89541 13.75 8.02693 14.2315 6.71098 14.9717ZM14.7501 16C14.7501 14.2051 16.2052 12.75 18.0001 12.75C19.7951 12.75 21.2501 14.2051 21.2501 16C21.2501 17.7949 19.7951 19.25 18.0001 19.25C16.2052 19.25 14.7501 17.7949 14.7501 16Z" fill="currentColor"/>
            </svg>
          </button>
        }
      />

      <div className="px-2">
        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner size="lg" color="#9b7653" /></div>
        ) : (
          <div className="warm-card overflow-hidden">
            <table className="warm-table">
              <thead>
                <tr>
                  <th className="text-left">Фамилия</th>
                  <th className="text-center">Имя</th>
                  <th style={{ width: '72px' }} />
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-warm-400 py-8 font-slab">
                      Певчих нет — добавьте первого
                    </td>
                  </tr>
                ) : (() => {
                  const singerList = members.filter(m => m.role !== 'reader')
                  const readerList = members.filter(m => m.role === 'reader')

                  const EditDeleteBtns = ({ m }: { m: Member }) => (
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(m)} className="w-7 h-7 rounded-lg bg-warm-100 text-warm-600 flex items-center justify-center active:bg-warm-200 transition-colors" title="Редактировать">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M14.7566 2.62145C16.5852 0.792851 19.55 0.792851 21.3786 2.62145C23.2072 4.45005 23.2072 7.41479 21.3786 9.24339L11.8933 18.7287C11.3514 19.2706 11.0323 19.5897 10.6774 19.8665C10.2592 20.1927 9.80655 20.4725 9.32766 20.7007C8.92136 20.8943 8.49334 21.037 7.76623 21.2793L4.43511 22.3897L3.63303 22.6571C2.98247 22.8739 2.26522 22.7046 1.78032 22.2197C1.29542 21.7348 1.1261 21.0175 1.34296 20.367L2.72068 16.2338C2.96303 15.5067 3.10568 15.0787 3.29932 14.6724C3.52755 14.1935 3.80727 13.7409 4.13354 13.3226C4.41035 12.9677 4.72939 12.6487 5.27137 12.1067L14.7566 2.62145ZM4.40051 20.8201L7.24203 19.8729C8.03314 19.6092 8.36927 19.4958 8.68233 19.3466C9.06287 19.1653 9.42252 18.943 9.75492 18.6837C10.0284 18.4704 10.2801 18.2205 10.8698 17.6308L18.4393 10.0614C17.6506 9.78321 16.6346 9.26763 15.6835 8.31651C14.7324 7.36538 14.2168 6.34939 13.9387 5.56075L6.36917 13.1302C5.77951 13.7199 5.52959 13.9716 5.3163 14.2451C5.05704 14.5775 4.83476 14.9371 4.65341 15.3177C4.50421 15.6307 4.3908 15.9669 4.12709 16.758L3.17992 19.5995L4.40051 20.8201ZM15.1554 4.34404C15.1896 4.519 15.2474 4.75684 15.3438 5.03487C15.561 5.66083 15.9712 6.48288 16.7442 7.25585C17.5171 8.02881 18.3392 8.43903 18.9651 8.6562C19.2432 8.75266 19.481 8.81046 19.656 8.84466L20.3179 8.18272C21.5607 6.93991 21.5607 4.92492 20.3179 3.68211C19.0751 2.4393 17.0601 2.4393 15.8173 3.68211L15.1554 4.34404Z" fill="currentColor"/></svg>
                      </button>
                      <button onClick={() => setDeleteTarget(m)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center active:bg-red-100 transition-colors" title="Удалить">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2.75C11.0215 2.75 10.1871 3.37503 9.87787 4.24993C9.73983 4.64047 9.31134 4.84517 8.9208 4.70713C8.53026 4.56909 8.32557 4.1406 8.46361 3.75007C8.97804 2.29459 10.3661 1.25 12 1.25C13.634 1.25 15.022 2.29459 15.5365 3.75007C15.6745 4.1406 15.4698 4.56909 15.0793 4.70713C14.6887 4.84517 14.2602 4.64047 14.1222 4.24993C13.813 3.37503 12.9785 2.75 12 2.75Z" fill="currentColor"/><path d="M2.75 6C2.75 5.58579 3.08579 5.25 3.5 5.25H20.5001C20.9143 5.25 21.2501 5.58579 21.2501 6C21.2501 6.41421 20.9143 6.75 20.5001 6.75H3.5C3.08579 6.75 2.75 6.41421 2.75 6Z" fill="currentColor"/><path d="M5.91508 8.45011C5.88753 8.03681 5.53015 7.72411 5.11686 7.75166C4.70356 7.77921 4.39085 8.13659 4.41841 8.54989L4.88186 15.5016C4.96735 16.7844 5.03641 17.8205 5.19838 18.6336C5.36678 19.4789 5.6532 20.185 6.2448 20.7384C6.83639 21.2919 7.55994 21.5307 8.41459 21.6425C9.23663 21.75 10.2751 21.75 11.5607 21.75H12.4395C13.7251 21.75 14.7635 21.75 15.5856 21.6425C16.4402 21.5307 17.1638 21.2919 17.7554 20.7384C18.347 20.185 18.6334 19.4789 18.8018 18.6336C18.9637 17.8205 19.0328 16.7844 19.1183 15.5016L19.5818 8.54989C19.6093 8.13659 19.2966 7.77921 18.8833 7.75166C18.47 7.72411 18.1126 8.03681 18.0851 8.45011L17.6251 15.3492C17.5353 16.6971 17.4712 17.6349 17.3307 18.3405C17.1943 19.025 17.004 19.3873 16.7306 19.6431C16.4572 19.8988 16.083 20.0647 15.391 20.1552C14.6776 20.2485 13.7376 20.25 12.3868 20.25H11.6134C10.2626 20.25 9.32255 20.2485 8.60915 20.1552C7.91715 20.0647 7.54299 19.8988 7.26957 19.6431C6.99616 19.3873 6.80583 19.025 6.66948 18.3405C6.52891 17.6349 6.46488 16.6971 6.37503 15.3492L5.91508 8.45011Z" fill="currentColor"/><path d="M9.42546 10.2537C9.83762 10.2125 10.2051 10.5132 10.2464 10.9254L10.7464 15.9254C10.7876 16.3375 10.4869 16.7051 10.0747 16.7463C9.66256 16.7875 9.29502 16.4868 9.25381 16.0746L8.75381 11.0746C8.71259 10.6625 9.0133 10.2949 9.42546 10.2537Z" fill="currentColor"/><path d="M15.2464 11.0746C15.2876 10.6625 14.9869 10.2949 14.5747 10.2537C14.1626 10.2125 13.795 10.5132 13.7538 10.9254L13.2538 15.9254C13.2126 16.3375 13.5133 16.7051 13.9255 16.7463C14.3376 16.7875 14.7051 16.4868 14.7464 16.0746L15.2464 11.0746Z" fill="currentColor"/></svg>
                      </button>
                    </div>
                  )

                  return <>
                    {singerList.map((m) => {
                      const { lastName, firstName } = splitName(m.name)
                      return (
                        <tr key={m._id}>
                          <td><span className="font-slab font-semibold text-warm-900">{lastName}</span></td>
                          <td className="text-center">
                            <span className="font-slab text-warm-700">
                              {firstName}{m.patronymic ? <span className="text-warm-500"> {m.patronymic}.</span> : null}
                            </span>
                          </td>
                          <td><EditDeleteBtns m={m} /></td>
                        </tr>
                      )
                    })}
                    {readerList.length > 0 && <>
                      <tr className="no-hover">
                        <td colSpan={3} className="px-4 py-1 bg-warm-50">
                          <span className="text-[10px] font-slab font-bold uppercase tracking-widest" style={{ color: '#7d5e42' }}>Чтец</span>
                        </td>
                      </tr>
                      {readerList.map((m) => {
                        const { lastName, firstName } = splitName(m.name)
                        return (
                          <tr key={m._id}>
                            <td><span className="font-slab font-semibold text-warm-900">{lastName}</span></td>
                            <td className="text-center">
                              <span className="font-slab text-warm-700">
                                {firstName}{m.patronymic ? <span className="text-warm-500"> {m.patronymic}.</span> : null}
                              </span>
                            </td>
                            <td><EditDeleteBtns m={m} /></td>
                          </tr>
                        )
                      })}
                    </>}
                  </>
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawer: добавить / редактировать певчего */}
      <Drawer
        isOpen={drawerOpen}
        onOpenChange={(open) => { if (!open) setDrawerOpen(false) }}
        placement="bottom"
        scrollBehavior="inside"
        classNames={{
          base: 'bg-white rounded-t-2xl max-h-[92dvh] flex flex-col overflow-hidden shadow-[0_-8px_40px_rgba(0,0,0,0.15)]',
          header: 'border-b border-warm-200 px-4 pt-2 pb-3 shrink-0',
          body: 'overflow-y-auto px-4 py-4',
          footer: 'border-t border-warm-200 bg-white px-4 py-3 shrink-0',
          closeButton: 'hidden',
        }}
      >
        <DrawerContent>
          {(closeDrawer) => (
            <>
              <DrawerHeader className="flex-col gap-0">
                {/* Ручка */}
                <div className="flex justify-center pt-1 pb-2 w-full">
                  <div className="w-10 h-1 rounded-full bg-warm-300" />
                </div>
                <span className="text-base font-slab font-bold text-warm-900">
                  {editing ? 'Редактировать певчего' : 'Добавить певчего'}
                </span>
              </DrawerHeader>

              <DrawerBody>
                <div className="flex flex-col gap-4">
                  {/* Имя + Отчество */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
                        Фамилия Имя
                      </label>
                      <input
                        className="warm-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Фамилия Имя"
                      />
                    </div>
                    <div style={{ width: 80 }}>
                      <label className="block text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
                        Отч.
                      </label>
                      <input
                        className="warm-input text-center"
                        value={patronymic}
                        onChange={(e) => setPatronymic(e.target.value.slice(0, 1).toUpperCase())}
                        placeholder="О"
                        maxLength={1}
                      />
                    </div>
                  </div>

                  {/* Роль */}
                  <div>
                    <label className="block text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
                      Роль
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {ROLES.map((r) => (
                        <button
                          key={r.value}
                          onClick={() => handleRoleChange(r.value)}
                          className={`py-2 rounded-xl text-sm font-slab font-semibold border transition-all ${
                            role === r.value
                              ? 'text-white border-transparent'
                              : 'bg-white border-warm-200 text-warm-700'
                          }`}
                          style={role === r.value ? { background: 'linear-gradient(to right, #bd9673, #7d5e42)' } : {}}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Цены */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide">
                        Цены по умолчанию, ₽
                      </label>
                      <button
                        type="button"
                        title="Сбросить к тарифам по умолчанию"
                        onClick={() => setPrices(buildDefaultPrices(role, priceEventTypes))}
                        className="text-warm-400 hover:text-warm-600 active:scale-90 transition-all"
                      >
                        <IconResetPrices />
                      </button>
                    </div>
                    {priceEventTypes.length === 0 ? (
                      <p className="text-sm text-warm-400 text-center py-4">Загрузка...</p>
                    ) : (
                      <div className="warm-card overflow-hidden">
                        {priceEventTypes.map((t, i) => {
                          const isDisabled = disabledEventTypes.includes(t)
                          return (
                            <div
                              key={t}
                              className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${i < priceEventTypes.length - 1 ? 'border-b border-warm-100' : ''} ${isDisabled ? 'opacity-40' : ''}`}
                            >
                              {/* Кнопка отключения (только для чтеца) */}
                              {role === 'reader' && (
                                <button
                                  type="button"
                                  title={isDisabled ? 'Включить этот тип выхода' : 'Отключить этот тип выхода для чтеца'}
                                  onClick={() => toggleDisabledEventType(t)}
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                    isDisabled
                                      ? 'bg-red-100 text-red-500'
                                      : 'bg-warm-100 text-warm-400 active:bg-warm-200'
                                  }`}
                                >
                                  <IconClipboardRemove />
                                </button>
                              )}
                              <span className={`flex-1 text-sm font-slab font-medium ${isDisabled ? 'text-warm-400 line-through' : 'text-warm-800'}`}>
                                {t}
                              </span>
                              <input
                                type="number"
                                value={prices[t] ?? 0}
                                onChange={(e) => setPrices((prev) => ({ ...prev, [t]: parseInt(e.target.value) || 0 }))}
                                disabled={isDisabled}
                                className="w-24 text-right bg-warm-50 border border-warm-200 rounded-lg px-2 py-1 text-sm font-medium text-warm-900 disabled:cursor-not-allowed"
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </DrawerBody>

              <DrawerFooter style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
                <button
                  onClick={closeDrawer}
                  className="flex-1 py-3 rounded-xl border border-warm-200 text-warm-700 text-sm font-slab font-semibold active:bg-warm-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-slab font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}
                >
                  {saving && <LoadingSpinner size="sm" color="white" />}
                  Сохранить
                </button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* Подтверждение удаления */}
      {deleteTarget && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => { if (!deleting) setDeleteTarget(null) }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
              <div className="px-5 pt-5 pb-4">
                <h2 className="text-base font-slab font-bold text-warm-900 mb-2">
                  Удалить певчего?
                </h2>
                <p className="text-sm text-warm-600 leading-relaxed">
                  Вы уверены, что хотите удалить{' '}
                  <span className="font-semibold text-warm-900">{deleteTarget.name}</span>?{' '}
                  Это действие нельзя отменить.
                </p>
              </div>
              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-warm-200 text-warm-700 text-sm font-slab font-semibold active:bg-warm-50"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-slab font-semibold bg-red-500 active:bg-red-600 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {deleting && <LoadingSpinner size="sm" color="white" />}
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
