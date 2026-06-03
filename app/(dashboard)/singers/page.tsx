'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Button, Card, CardBody, Chip, Input, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Spinner,
} from '@heroui/react'
import type { Member, MemberRole } from '@/lib/types'
import { EVENT_TYPES, DEFAULT_PRICES, pricesToMap, mapToPrices } from '@/lib/types'

const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'singer', label: 'Певчий' },
  { value: 'soloist', label: 'Солист' },
  { value: 'regent', label: 'Регент' },
]

const roleColor = {
  singer: 'default',
  soloist: 'warning',
  regent: 'secondary',
} as const

function buildDefaultPrices(role: MemberRole): Record<string, number> {
  const prices: Record<string, number> = {}
  EVENT_TYPES.forEach((t) => {
    prices[t] = DEFAULT_PRICES[t]?.[role] ?? 0
  })
  return prices
}

export default function SingersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const { isOpen, onOpen, onClose } = useDisclosure()
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
    onOpen()
  }

  function openEdit(m: Member) {
    setEditing(m)
    setName(m.name)
    setRole(m.role)
    const stored = pricesToMap(m.defaultPrices)
    setPrices({ ...buildDefaultPrices(m.role), ...stored })
    setRegentMult(m.regentMultiplier || 2)
    onOpen()
  }

  function handleRoleChange(r: MemberRole) {
    setRole(r)
    setPrices(buildDefaultPrices(r))
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)

    const body = { name: name.trim(), role, defaultPrices: mapToPrices(prices), regentMultiplier: regentMult }

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
    onClose()
    load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/members/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Певчие</h1>
        <Button color="primary" size="sm" onPress={openNew}>+ Добавить</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <Card key={m._id} className="w-full">
              <CardBody className="flex flex-row items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.name}</p>
                  <Chip size="sm" color={roleColor[m.role]} variant="flat" className="mt-0.5">
                    {ROLES.find((r) => r.value === m.role)?.label}
                    {m.role === 'regent' && ` ×${m.regentMultiplier}`}
                  </Chip>
                </div>
                <Button size="sm" variant="light" onPress={() => openEdit(m)} className="min-w-0 px-2">✏️</Button>
                <Button size="sm" variant="light" color="danger" onPress={() => handleDelete(m._id)} className="min-w-0 px-2">🗑</Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>{editing ? 'Редактировать певчего' : 'Добавить певчего'}</ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <Input label="ФИО" value={name} onValueChange={setName} isRequired />

            <Select
              label="Роль"
              selectedKeys={[role]}
              onSelectionChange={(k) => handleRoleChange(k.currentKey as MemberRole)}
            >
              {ROLES.map((r) => (
                <SelectItem key={r.value}>{r.label}</SelectItem>
              ))}
            </Select>

            {role === 'regent' && (
              <Input
                label="Множитель регента (×)"
                type="number"
                value={String(regentMult)}
                onValueChange={(v) => setRegentMult(Number(v))}
                description="Цена регента = цена певчего × множитель"
              />
            )}

            <div>
              <p className="text-small font-medium mb-2">Цены по умолчанию (руб.)</p>
              <div className="flex flex-col gap-2">
                {EVENT_TYPES.map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="w-32 text-sm text-default-600 shrink-0">{t}</span>
                    <Input
                      size="sm"
                      type="number"
                      value={String(prices[t] ?? 0)}
                      onValueChange={(v) => setPrices((prev) => ({ ...prev, [t]: Number(v) || 0 }))}
                      classNames={{ input: 'text-right' }}
                      endContent={<span className="text-default-400 text-xs">₽</span>}
                    />
                    {role === 'regent' && (
                      <span className="text-xs text-secondary shrink-0 w-20 text-right">
                        = {((prices[t] ?? 0) * regentMult).toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>Отмена</Button>
            <Button color="primary" isLoading={saving} onPress={handleSave} isDisabled={!name.trim()}>
              Сохранить
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
