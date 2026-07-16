'use client'

import { useEffect, useState } from 'react'
import { clearPin, hasPin } from '@/lib/pin'
import PinLock from '@/components/PinLock'
import PinSetup from '@/components/PinSetup'

type PinMode = null | 'verify' | 'new-pin'

export default function ProfilePage() {
  const [storedUsername, setStoredUsername] = useState('')
  const [editingCreds, setEditingCreds] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [credMsg, setCredMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [credSaving, setCredSaving] = useState(false)

  const [pinMode, setPinMode] = useState<PinMode>(null)
  const [pinExists, setPinExists] = useState(false)

  useEffect(() => {
    setPinExists(hasPin())
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setStoredUsername(d.username ?? ''))
      .catch(() => null)
  }, [])

  function openCredEdit() {
    setNewUsername(storedUsername)
    setNewPassword('')
    setConfirmPassword('')
    setCurrentPassword('')
    setCredMsg(null)
    setEditingCreds(true)
  }

  function cancelCredEdit() {
    setEditingCreds(false)
    setCredMsg(null)
  }

  async function handleCredSave() {
    if (!currentPassword) {
      setCredMsg({ ok: false, text: 'Введите текущий пароль' })
      return
    }
    if (newPassword && newPassword !== confirmPassword) {
      setCredMsg({ ok: false, text: 'Новые пароли не совпадают' })
      return
    }
    setCredSaving(true)
    setCredMsg(null)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername.trim() !== storedUsername ? newUsername.trim() : undefined,
          newPassword: newPassword || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setStoredUsername(newUsername.trim() || storedUsername)
        setCredMsg({ ok: true, text: 'Сохранено' })
        setTimeout(() => setEditingCreds(false), 900)
      } else {
        setCredMsg({ ok: false, text: data.error ?? 'Ошибка' })
      }
    } catch {
      setCredMsg({ ok: false, text: 'Ошибка сети' })
    } finally {
      setCredSaving(false)
    }
  }

  function startPinChange() {
    setPinMode('new-pin')
  }

  if (pinMode === 'verify') {
    return <PinLock onUnlock={() => setPinMode('new-pin')} onCancel={() => setPinMode(null)} />
  }
  if (pinMode === 'new-pin') {
    return <PinSetup onDone={() => { setPinMode(null); setPinExists(true) }} isChange onCancel={() => setPinMode(null)} />
  }

  return (
    <div className="px-4 pt-8 pb-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold font-slab text-[#2c1a0e] mb-6">Профиль</h1>

      {/* PIN section */}
      <div className="warm-card p-4 mb-4">
        <p className="text-[13px] font-semibold text-[#7d5e42] uppercase tracking-wide font-slab mb-3">
          PIN-код
        </p>
        <button onClick={startPinChange} className="w-full btn-gradient py-3 text-[15px] rounded-xl">
          {pinExists ? 'Изменить PIN-код' : 'Установить PIN-код'}
        </button>
      </div>

      {/* Account section */}
      <div className="warm-card p-4">
        <p className="text-[13px] font-semibold text-[#7d5e42] uppercase tracking-wide font-slab mb-3">
          Учётная запись
        </p>

        {!editingCreds ? (
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-slab text-[#2c1a0e]">{storedUsername || '—'}</span>
            <button
              onClick={openCredEdit}
              className="text-[13px] font-slab font-semibold text-[#9b7653] px-3 py-1.5 rounded-lg border border-[#e5d9cc] active:bg-[#f7f0e8]"
            >
              Изменить
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#9b7653] mb-1 font-slab">Логин</label>
              <input
                className="warm-input"
                placeholder="Логин"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div>
              <label className="block text-xs text-[#9b7653] mb-1 font-slab">Новый пароль</label>
              <input
                className="warm-input"
                type="password"
                placeholder="Оставьте пустым, чтобы не менять"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {newPassword && (
              <div>
                <label className="block text-xs text-[#9b7653] mb-1 font-slab">Подтвердите новый пароль</label>
                <input
                  className="warm-input"
                  type="password"
                  placeholder="Повторите новый пароль"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-[#9b7653] mb-1 font-slab">Текущий пароль</label>
              <input
                className="warm-input"
                type="password"
                placeholder="Для подтверждения изменений"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {credMsg && (
              <p className={`text-sm font-slab ${credMsg.ok ? 'text-green-600' : 'text-red-400'}`}>
                {credMsg.text}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={cancelCredEdit}
                className="flex-1 py-3 text-[15px] font-slab font-semibold text-[#9b7653] rounded-xl border border-[#e5d9cc] active:bg-[#f7f0e8]"
              >
                Отмена
              </button>
              <button
                onClick={handleCredSave}
                disabled={credSaving}
                className="flex-1 btn-gradient py-3 text-[15px] rounded-xl"
              >
                {credSaving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
