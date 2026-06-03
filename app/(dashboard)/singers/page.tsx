'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Spinner,
  Drawer, DrawerContent, DrawerHeader, DrawerBody, DrawerFooter,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from '@heroui/react'
import type { Member, MemberRole } from '@/lib/types'
import { EVENT_TYPES, DEFAULT_PRICES, pricesToMap, mapToPrices } from '@/lib/types'
import { plural, PERSON } from '@/lib/plural'
import { splitName } from '@/lib/nameFormat'
import { PageHeader } from '@/components/PageHeader'
import { useSession } from '@/hooks/useSession'

const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'singer',  label: 'Певчий'  },
  { value: 'soloist', label: 'Солист'  },
  { value: 'regent',  label: 'Регент'  },
]

function buildDefaultPrices(role: MemberRole): Record<string, number> {
  const out: Record<string, number> = {}
  EVENT_TYPES.forEach((t) => { out[t] = DEFAULT_PRICES[t]?.[role] ?? 0 })
  return out
}

export default function SingersPage() {
  const { session } = useSession()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [role, setRole] = useState<MemberRole>('singer')
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [regentMult, setRegentMult] = useState(2)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/members')
    if (res.ok) setMembers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditing(null)
    setName('')
    setRole('singer')
    setPrices(buildDefaultPrices('singer'))
    setRegentMult(2)
    setDrawerOpen(true)
  }

  function openEdit(m: Member) {
    setEditing(m)
    setName(m.name)
    setRole(m.role)
    const stored = pricesToMap(m.defaultPrices)
    setPrices({ ...buildDefaultPrices(m.role), ...stored })
    setRegentMult(m.regentMultiplier || 2)
    setDrawerOpen(true)
  }

  function handleRoleChange(r: MemberRole) {
    setRole(r)
    setPrices(buildDefaultPrices(r))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const body = {
      name: name.trim(),
      role,
      defaultPrices: mapToPrices(prices),
      regentMultiplier: regentMult,
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
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/members/${deleteTarget._id}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteTarget(null)
    load()
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
            className="text-sm font-slab font-semibold py-1.5 px-3 rounded-xl text-white"
            style={{ background: 'linear-gradient(to right, #bd9673, #7d5e42)' }}
          >
            + Добавить
          </button>
        }
      />

      <div className="px-2">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner color="warning" /></div>
        ) : (
          <div className="warm-card overflow-hidden">
            <table className="warm-table">
              <thead>
                <tr>
                  <th>Фамилия</th>
                  <th>Имя</th>
                  <th style={{ width: '72px' }} />
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const { lastName, firstName } = splitName(m.name)
                  return (
                  <tr key={m._id}>
                    <td>
                      <span className="font-slab font-semibold text-warm-900">{lastName}</span>
                    </td>
                    <td>
                      <span className="font-slab text-warm-700">{firstName}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(m)}
                          className="w-7 h-7 rounded-lg bg-warm-100 text-warm-600 flex items-center justify-center active:bg-warm-200 transition-colors"
                          title="Редактировать"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M14.7566 2.62145C16.5852 0.792851 19.55 0.792851 21.3786 2.62145C23.2072 4.45005 23.2072 7.41479 21.3786 9.24339L11.8933 18.7287C11.3514 19.2706 11.0323 19.5897 10.6774 19.8665C10.2592 20.1927 9.80655 20.4725 9.32766 20.7007C8.92136 20.8943 8.49334 21.037 7.76623 21.2793L4.43511 22.3897L3.63303 22.6571C2.98247 22.8739 2.26522 22.7046 1.78032 22.2197C1.29542 21.7348 1.1261 21.0175 1.34296 20.367L2.72068 16.2338C2.96303 15.5067 3.10568 15.0787 3.29932 14.6724C3.52755 14.1935 3.80727 13.7409 4.13354 13.3226C4.41035 12.9677 4.72939 12.6487 5.27137 12.1067L14.7566 2.62145ZM4.40051 20.8201L7.24203 19.8729C8.03314 19.6092 8.36927 19.4958 8.68233 19.3466C9.06287 19.1653 9.42252 18.943 9.75492 18.6837C10.0284 18.4704 10.2801 18.2205 10.8698 17.6308L18.4393 10.0614C17.6506 9.78321 16.6346 9.26763 15.6835 8.31651C14.7324 7.36538 14.2168 6.34939 13.9387 5.56075L6.36917 13.1302C5.77951 13.7199 5.52959 13.9716 5.3163 14.2451C5.05704 14.5775 4.83476 14.9371 4.65341 15.3177C4.50421 15.6307 4.3908 15.9669 4.12709 16.758L3.17992 19.5995L4.40051 20.8201ZM15.1554 4.34404C15.1896 4.519 15.2474 4.75684 15.3438 5.03487C15.561 5.66083 15.9712 6.48288 16.7442 7.25585C17.5171 8.02881 18.3392 8.43903 18.9651 8.6562C19.2432 8.75266 19.481 8.81046 19.656 8.84466L20.3179 8.18272C21.5607 6.93991 21.5607 4.92492 20.3179 3.68211C19.0751 2.4393 17.0601 2.4393 15.8173 3.68211L15.1554 4.34404Z" fill="currentColor"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(m)}
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center active:bg-red-100 transition-colors"
                          title="Удалить"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2.75C11.0215 2.75 10.1871 3.37503 9.87787 4.24993C9.73983 4.64047 9.31134 4.84517 8.9208 4.70713C8.53026 4.56909 8.32557 4.1406 8.46361 3.75007C8.97804 2.29459 10.3661 1.25 12 1.25C13.634 1.25 15.022 2.29459 15.5365 3.75007C15.6745 4.1406 15.4698 4.56909 15.0793 4.70713C14.6887 4.84517 14.2602 4.64047 14.1222 4.24993C13.813 3.37503 12.9785 2.75 12 2.75Z" fill="currentColor"/>
                            <path d="M2.75 6C2.75 5.58579 3.08579 5.25 3.5 5.25H20.5001C20.9143 5.25 21.2501 5.58579 21.2501 6C21.2501 6.41421 20.9143 6.75 20.5001 6.75H3.5C3.08579 6.75 2.75 6.41421 2.75 6Z" fill="currentColor"/>
                            <path d="M5.91508 8.45011C5.88753 8.03681 5.53015 7.72411 5.11686 7.75166C4.70356 7.77921 4.39085 8.13659 4.41841 8.54989L4.88186 15.5016C4.96735 16.7844 5.03641 17.8205 5.19838 18.6336C5.36678 19.4789 5.6532 20.185 6.2448 20.7384C6.83639 21.2919 7.55994 21.5307 8.41459 21.6425C9.23663 21.75 10.2751 21.75 11.5607 21.75H12.4395C13.7251 21.75 14.7635 21.75 15.5856 21.6425C16.4402 21.5307 17.1638 21.2919 17.7554 20.7384C18.347 20.185 18.6334 19.4789 18.8018 18.6336C18.9637 17.8205 19.0328 16.7844 19.1183 15.5016L19.5818 8.54989C19.6093 8.13659 19.2966 7.77921 18.8833 7.75166C18.47 7.72411 18.1126 8.03681 18.0851 8.45011L17.6251 15.3492C17.5353 16.6971 17.4712 17.6349 17.3307 18.3405C17.1943 19.025 17.004 19.3873 16.7306 19.6431C16.4572 19.8988 16.083 20.0647 15.391 20.1552C14.6776 20.2485 13.7376 20.25 12.3868 20.25H11.6134C10.2626 20.25 9.32255 20.2485 8.60915 20.1552C7.91715 20.0647 7.54299 19.8988 7.26957 19.6431C6.99616 19.3873 6.80583 19.025 6.66948 18.3405C6.52891 17.6349 6.46488 16.6971 6.37503 15.3492L5.91508 8.45011Z" fill="currentColor"/>
                            <path d="M9.42546 10.2537C9.83762 10.2125 10.2051 10.5132 10.2464 10.9254L10.7464 15.9254C10.7876 16.3375 10.4869 16.7051 10.0747 16.7463C9.66256 16.7875 9.29502 16.4868 9.25381 16.0746L8.75381 11.0746C8.71259 10.6625 9.0133 10.2949 9.42546 10.2537Z" fill="currentColor"/>
                            <path d="M15.2464 11.0746C15.2876 10.6625 14.9869 10.2949 14.5747 10.2537C14.1626 10.2125 13.795 10.5132 13.7538 10.9254L13.2538 15.9254C13.2126 16.3375 13.5133 16.7051 13.9255 16.7463C14.3376 16.7875 14.7051 16.4868 14.7464 16.0746L15.2464 11.0746Z" fill="currentColor"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-warm-400 py-8 font-slab">
                      Певчих нет — добавьте первого
                    </td>
                  </tr>
                )}
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
          base: 'bg-white rounded-t-2xl max-h-[92dvh] shadow-[0_-8px_40px_rgba(0,0,0,0.15)]',
          header: 'border-b border-warm-200 py-3 px-4',
          body: 'px-4 py-4',
          footer: 'border-t border-warm-200 bg-white px-4 py-3',
          closeButton: 'hidden',
        }}
      >
        <DrawerContent>
          {(closeDrawer) => (
            <>
              {/* Ручка */}
              <div className="flex justify-center pt-3 pb-0">
                <div className="w-10 h-1 rounded-full bg-warm-300" />
              </div>

              <DrawerHeader>
                <span className="text-base font-slab font-bold text-warm-900">
                  {editing ? 'Редактировать певчего' : 'Добавить певчего'}
                </span>
              </DrawerHeader>

              <DrawerBody>
                <div className="flex flex-col gap-4">
                  {/* Имя */}
                  <div>
                    <label className="block text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
                      ФИО
                    </label>
                    <input
                      className="warm-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Фамилия И.О."
                    />
                  </div>

                  {/* Роль */}
                  <div>
                    <label className="block text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
                      Роль
                    </label>
                    <div className="grid grid-cols-3 gap-2">
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
                    {role === 'regent' && (
                      <div className="mt-2">
                        <label className="block text-xs font-slab text-warm-500 mb-1">
                          Множитель регента (цена = певчий × N)
                        </label>
                        <input
                          type="number"
                          className="warm-input"
                          value={regentMult}
                          onChange={(e) => setRegentMult(Number(e.target.value) || 1)}
                          min={1}
                          max={10}
                        />
                      </div>
                    )}
                  </div>

                  {/* Цены */}
                  <div>
                    <label className="block text-xs font-slab font-semibold text-warm-600 uppercase tracking-wide mb-2">
                      Цены по умолчанию, ₽
                    </label>
                    <div className="warm-card overflow-hidden">
                      {EVENT_TYPES.map((t, i) => (
                        <div
                          key={t}
                          className={`flex items-center gap-3 px-3 py-2.5 ${i < EVENT_TYPES.length - 1 ? 'border-b border-warm-100' : ''}`}
                        >
                          <span className="flex-1 text-sm text-warm-800 font-slab font-medium">{t}</span>
                          <input
                            type="number"
                            value={prices[t] ?? 0}
                            onChange={(e) => setPrices((prev) => ({ ...prev, [t]: parseInt(e.target.value) || 0 }))}
                            className="w-24 text-right bg-warm-50 border border-warm-200 rounded-lg px-2 py-1 text-sm font-medium text-warm-900"
                          />
                          {role === 'regent' && (
                            <span className="text-xs text-purple-500 font-slab w-20 text-right shrink-0">
                              = {((prices[t] ?? 0) * regentMult).toLocaleString('ru-RU')} ₽
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
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
                  {saving && <Spinner size="sm" color="white" />}
                  Сохранить
                </button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* Modal: подтверждение удаления */}
      <Modal
        isOpen={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        placement="center"
        classNames={{
          base: 'rounded-2xl mx-4',
          header: 'border-b border-warm-200 py-3 px-4',
          body: 'px-4 py-4',
          footer: 'border-t border-warm-200 px-4 py-3',
        }}
      >
        <ModalContent>
          {(closeModal) => (
            <>
              <ModalHeader>
                <span className="text-base font-slab font-bold text-warm-900">Удалить певчего?</span>
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-warm-700">
                  Вы уверены, что хотите удалить{' '}
                  <span className="font-semibold">{deleteTarget?.name}</span>?
                  Это действие нельзя отменить.
                </p>
              </ModalBody>
              <ModalFooter>
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl border border-warm-200 text-warm-700 text-sm font-slab font-semibold active:bg-warm-50"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-slab font-semibold bg-red-500 active:bg-red-600 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {deleting && <Spinner size="sm" color="white" />}
                  Удалить
                </button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
