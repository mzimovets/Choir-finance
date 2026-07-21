'use client'

import { useEffect, useState } from 'react'
import { hasPin } from '@/lib/pin'
import PinLock from '@/components/PinLock'
import PinSetup from '@/components/PinSetup'

type PinMode = null | 'verify' | 'new-pin'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function PasswordInput({
  label, placeholder, value, onChange, autoComplete,
}: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; autoComplete: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-xs text-[#9b7653] mb-1 font-slab">{label}</label>
      <div className="relative">
        <input
          className="warm-input pr-10"
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9b7653] opacity-60 active:opacity-100"
          tabIndex={-1}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const [storedUsername, setStoredUsername] = useState('')
  const [storedDisplayName, setStoredDisplayName] = useState('')
  const [editingCreds, setEditingCreds] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
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
      .then((d) => { setStoredUsername(d.username ?? ''); setStoredDisplayName(d.displayName ?? '') })
      .catch(() => null)
  }, [])

  function openCredEdit() {
    setNewUsername(storedUsername)
    setNewDisplayName(storedDisplayName)
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
          newDisplayName: newDisplayName.trim() !== storedDisplayName ? newDisplayName.trim() : undefined,
          newPassword: newPassword || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setStoredUsername(newUsername.trim() || storedUsername)
        setStoredDisplayName(newDisplayName.trim() || storedDisplayName)
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
        <button onClick={() => setPinMode('new-pin')} className="w-full btn-gradient py-3 text-[15px] rounded-xl">
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
            <div>
              {storedDisplayName && <p className="text-[15px] font-slab text-[#2c1a0e]">{storedDisplayName}</p>}
              <p className="text-[13px] font-slab text-[#9b7653]">{storedUsername || '—'}</p>
            </div>
            <button
              onClick={openCredEdit}
              className="text-[13px] font-slab font-semibold text-[#9b7653] px-3 py-1.5 rounded-lg border border-[#e5d9cc] active:bg-[#f7f0e8]"
            >
              Изменить
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <PasswordInput
              label="Текущий пароль"
              placeholder="Введите текущий пароль"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />

            <div>
              <label className="block text-xs text-[#9b7653] mb-1 font-slab">Имя</label>
              <input
                className="warm-input"
                placeholder="Отображаемое имя"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                autoComplete="name"
              />
            </div>

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

            <PasswordInput
              label="Новый пароль"
              placeholder="Оставьте пустым, чтобы не менять"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />

            {newPassword && (
              <PasswordInput
                label="Подтвердите новый пароль"
                placeholder="Повторите новый пароль"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
              />
            )}

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
