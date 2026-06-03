'use client'

import { useState, useEffect, useCallback } from 'react'
import { Spinner } from '@heroui/react'
import type { Member, MemberRole } from '@/lib/types'
import { EVENT_TYPES, DEFAULT_PRICES, pricesToMap, mapToPrices } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
import { useSession } from '@/hooks/useSession'

const ROLES: { value: MemberRole; label: string; color: string }[] = [
  { value: 'singer',  label: 'Певчий',  color: '#e8ddd3' },
  { value: 'soloist', label: 'Солист',  color: '#fde68a' },
  { value: 'regent',  label: 'Регент',  color: '#ddd6fe' },
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
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)

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
    setModalOpen(true)
  }

  function openEdit(m: Member) {
    setEditing(m)
    setName(m.name)
    setRole(m.role)
    const stored = pricesToMap(m.defaultPrices)
    setPrices({ ...buildDefaultPrices(m.role), ...stored })
    setRegentMult(m.regentMultiplier || 2)
    setModalOpen(true)
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
    setModalOpen(false)
    load()
  }

  async function handleDelete(m: Member) {
    if (!confirm(`Удалить ${m.name}?`)) return
    await fetch(`/api/members/${m._id}`, { method: 'DELETE' })
    load()
  }

  const choirLabel = session?.choirType === 'festive' ? 'Певчие праздничного хора' : 'Певчие буднего хора'

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title={choirLabel}
        subtitle={`${members.length} человек`}
        displayName={session?.displayName}
        choirType={session?.choirType}
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

      <div className="px-4">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner color="warning" /></div>
        ) : (
          <div className="warm-card overflow-hidden">
            <table className="warm-table">
              <thead>
                <tr>
                  <th>Имя</th>
                  <th>Роль</th>
                  <th className="text-right">Спевка</th>
                  <th className="text-right">Служба</th>
                  <th style={{ width: '80px' }} />
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => {
                  const pm = pricesToMap(m.defaultPrices)
                  const roleInfo = ROLES.find((r) => r.value === m.role)!
                  return (
                    <tr key={m._id}>
                      <td>
                        <span className="font-slab font-semibold text-warm-900">{m.name}</span>
                      </td>
                      <td>
                        <span
                          className="role-chip text-warm-800"
                          style={{ backgroundColor: roleInfo.color }}
                        >
                          {roleInfo.label}
                          {m.role === 'regent' && ` ×${m.regentMultiplier}`}
                        </span>
                      </td>
                      <td className="text-right tabular-nums text-warm-600 text-xs">
                        {pm['Спевка'] ?? '—'}
                      </td>
                      <td className="text-right tabular-nums text-warm-600 text-xs">
                        {pm['Арх. Служба'] ?? pm['Служба'] ?? '—'}
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
                            onClick={() => handleDelete(m)}
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
                    <td colSpan={5} className="text-center text-warm-400 py-6 font-slab">
                      Певчих нет — добавьте первого
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit/Add modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'rgba(44,26,14,0.5)' }}>
          <div className="flex-1" onClick={() => setModalOpen(false)} />
          <div
            className="bg-page rounded-t-2xl flex flex-col"
            style={{ maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-warm-300" />
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-b border-warm-200">
              <h2 className="text-base font-slab font-bold text-warm-900">
                {editing ? 'Редактировать певчего' : 'Добавить певчего'}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              {/* Name */}
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

              {/* Role */}
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

              {/* Prices */}
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

            {/* Footer */}
            <div
              className="flex gap-2 px-4 py-3 border-t border-warm-200 bg-white"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-warm-200 text-warm-700 text-sm font-slab font-semibold"
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
