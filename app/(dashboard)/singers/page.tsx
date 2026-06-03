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
                          className="w-7 h-7 rounded-lg bg-warm-100 text-warm-600 text-sm flex items-center justify-center active:bg-warm-200 transition-colors"
                          title="Редактировать"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteTarget(m)}
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-500 text-sm flex items-center justify-center active:bg-red-100 transition-colors"
                          title="Удалить"
                        >
                          🗑
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
