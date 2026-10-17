'use client'

import { useEffect, useState } from 'react'
import { hasPin } from '@/lib/pin'
import PinLock from '@/components/PinLock'
import PinSetup from '@/components/PinSetup'
import { usePriceBlurFeatureEnabled, usePricesHidden } from '@/hooks/usePricesHidden'
import { setPriceBlurFeatureEnabled, togglePricesHidden } from '@/lib/priceVisibility'

type PinMode = null | 'verify' | 'new-pin'

function IconEyeBig() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 8.25C9.92893 8.25 8.25 9.92893 8.25 12C8.25 14.0711 9.92893 15.75 12 15.75C14.0711 15.75 15.75 14.0711 15.75 12C15.75 9.92893 14.0711 8.25 12 8.25ZM9.75 12C9.75 10.7574 10.7574 9.75 12 9.75C13.2426 9.75 14.25 10.7574 14.25 12C14.25 13.2426 13.2426 14.25 12 14.25C10.7574 14.25 9.75 13.2426 9.75 12Z" fill="currentColor"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 3.25C7.48587 3.25 4.44529 5.9542 2.68057 8.24686L2.64874 8.2882C2.24964 8.80653 1.88206 9.28392 1.63269 9.8484C1.36564 10.4529 1.25 11.1117 1.25 12C1.25 12.8883 1.36564 13.5471 1.63269 14.1516C1.88206 14.7161 2.24964 15.1935 2.64875 15.7118L2.68057 15.7531C4.44529 18.0458 7.48587 20.75 12 20.75C16.5141 20.75 19.5547 18.0458 21.3194 15.7531L21.3512 15.7118C21.7504 15.1935 22.1179 14.7161 22.3673 14.1516C22.6344 13.5471 22.75 12.8883 22.75 12C22.75 11.1117 22.6344 10.4529 22.3673 9.8484C22.1179 9.28391 21.7504 8.80652 21.3512 8.28818L21.3194 8.24686C19.5547 5.9542 16.5141 3.25 12 3.25ZM3.86922 9.1618C5.49864 7.04492 8.15036 4.75 12 4.75C15.8496 4.75 18.5014 7.04492 20.1308 9.1618C20.5694 9.73159 20.8263 10.0721 20.9952 10.4545C21.1532 10.812 21.25 11.2489 21.25 12C21.25 12.7511 21.1532 13.188 20.9952 13.5455C20.8263 13.9279 20.5694 14.2684 20.1308 14.8382C18.5014 16.9551 15.8496 19.25 12 19.25C8.15036 19.25 5.49864 16.9551 3.86922 14.8382C3.43064 14.2684 3.17374 13.9279 3.00476 13.5455C2.84684 13.188 2.75 12.7511 2.75 12C2.75 11.2489 2.84684 10.812 3.00476 10.4545C3.17374 10.0721 3.43063 9.73159 3.86922 9.1618Z" fill="currentColor"/>
    </svg>
  )
}

function IconEyeBigClosed() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path fillRule="evenodd" clipRule="evenodd" d="M22.2954 6.31083C22.6761 6.474 22.8524 6.91491 22.6893 7.29563L21.9999 7.00019C22.6893 7.29563 22.6894 7.29546 22.6893 7.29563L22.6886 7.29731L22.6875 7.2998L22.6843 7.30716L22.6736 7.33123C22.6646 7.35137 22.6518 7.37958 22.6352 7.41527C22.6019 7.48662 22.5533 7.58794 22.4888 7.71435C22.3599 7.967 22.1675 8.32087 21.9084 8.73666C21.4828 9.4197 20.8724 10.2778 20.0619 11.1304L21.0303 12.0987C21.3231 12.3916 21.3231 12.8665 21.0303 13.1594C20.7374 13.4523 20.2625 13.4523 19.9696 13.1594L18.969 12.1588C18.3093 12.7115 17.5528 13.2302 16.695 13.6564L17.6286 15.0912C17.8545 15.4383 17.7562 15.9029 17.409 16.1288C17.0618 16.3547 16.5972 16.2564 16.3713 15.9092L15.2821 14.2353C14.5028 14.4898 13.659 14.6628 12.7499 14.7248V16.5002C12.7499 16.9144 12.4141 17.2502 11.9999 17.2502C11.5857 17.2502 11.2499 16.9144 11.2499 16.5002V14.7248C10.3689 14.6647 9.54909 14.5004 8.78982 14.2586L7.71575 15.9093C7.48984 16.2565 7.02526 16.3548 6.67807 16.1289C6.33089 15.903 6.23257 15.4384 6.45847 15.0912L7.37089 13.689C6.5065 13.2668 5.74381 12.7504 5.07842 12.1984L4.11744 13.1594C3.82455 13.4523 3.34968 13.4523 3.05678 13.1594C2.76389 12.8665 2.76389 12.3917 3.05678 12.0988L3.98055 11.175C3.15599 10.3153 2.53525 9.44675 2.10277 8.75486C1.83984 8.33423 1.6446 7.97584 1.51388 7.71988C1.44848 7.59182 1.3991 7.48914 1.36537 7.41683C1.3485 7.38067 1.33553 7.35207 1.32641 7.33167L1.31562 7.30729L1.31238 7.29984L1.31129 7.29733L1.31088 7.29638C1.31081 7.2962 1.31056 7.29563 1.99992 7.00019L1.31088 7.29638C1.14772 6.91565 1.32376 6.474 1.70448 6.31083C2.08489 6.1478 2.52539 6.32374 2.68888 6.70381L2.68983 6.706L2.69591 6.71972C2.7018 6.73291 2.7114 6.7541 2.72472 6.78267C2.75139 6.83983 2.79296 6.92644 2.84976 7.03767C2.96345 7.26029 3.13762 7.58046 3.37472 7.95979C3.85033 8.72067 4.57157 9.70728 5.55561 10.6218C6.42151 11.4265 7.48259 12.1678 8.75165 12.656C9.70614 13.0232 10.7854 13.2502 11.9999 13.2502C13.2416 13.2502 14.342 13.013 15.3124 12.631C16.5738 12.1345 17.6277 11.3884 18.4866 10.5822C19.4562 9.67216 20.1668 8.69535 20.6354 7.9434C20.869 7.5685 21.0405 7.25246 21.1525 7.03286C21.2085 6.92315 21.2494 6.83776 21.2757 6.78144C21.2888 6.75328 21.2983 6.73242 21.3041 6.71943L21.31 6.70595C21.4738 6.32423 21.9147 6.14771 22.2954 6.31083Z" fill="currentColor"/>
    </svg>
  )
}

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
  label, placeholder, value, onChange, autoComplete, autoFocus,
}: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; autoComplete: string; autoFocus?: boolean
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
          autoFocus={autoFocus}
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
  const [editingCreds, setEditingCreds] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [credMsg, setCredMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [credSaving, setCredSaving] = useState(false)

  const [pinMode, setPinMode] = useState<PinMode>(null)
  const [pinExists, setPinExists] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const priceBlurFeatureEnabled = usePriceBlurFeatureEnabled()
  const pricesHidden = usePricesHidden()

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0)
    setPinExists(hasPin())
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { setStoredUsername(d.username ?? '') })
      .catch(() => null)
  }, [])

  function openCredEdit() {
    setNewUsername(storedUsername)
    setNewPassword('')
    setConfirmPassword('')
    setCurrentPassword(localStorage.getItem('cf_pw_hint') || '')
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

  if (pinMode === 'verify') {
    return <PinLock onUnlock={() => setPinMode('new-pin')} onCancel={() => setPinMode(null)} />
  }
  if (pinMode === 'new-pin') {
    return <PinSetup onDone={() => { setPinMode(null); setPinExists(true) }} isChange onCancel={() => setPinMode(null)} />
  }

  return (
    <div className="px-4 pt-8 pb-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold font-slab text-[#2c1a0e]">Профиль</h1>
        {priceBlurFeatureEnabled && (
          <button
            type="button"
            onClick={() => togglePricesHidden()}
            title={pricesHidden ? 'Показать суммы в приложении' : 'Скрыть суммы в приложении'}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-[#e5d9cc] text-[#9b7653] shadow-sm active:bg-[#f7f4f1] transition-colors"
          >
            <span style={pricesHidden ? { transform: 'translateY(2px)' } : undefined}>
              {pricesHidden ? <IconEyeBigClosed /> : <IconEyeBig />}
            </span>
          </button>
        )}
      </div>

      {/* PIN section — только на мобильных/планшетах */}
      {isMobile && (
        <div className="warm-card p-4 mb-4">
          <p className="text-[13px] font-semibold text-[#7d5e42] uppercase tracking-wide font-slab mb-3">
            PIN-код
          </p>
          <button
            onClick={() => setPinMode('new-pin')}
            className="w-full btn-gradient py-3 text-[15px] rounded-xl"
          >
            {pinExists ? 'Изменить PIN-код' : 'Установить PIN-код'}
          </button>
        </div>
      )}

      {/* Скрытие сумм: блюр — можно выключить совсем */}
      <div className="warm-card p-4 mb-4">
        <p className="text-[13px] font-semibold text-[#7d5e42] uppercase tracking-wide font-slab mb-3">
          Скрытие сумм
        </p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-slab text-[#2c1a0e]">Блюр сумм</p>
            <p className="text-[12px] text-[#9b7653] mt-0.5">
              Кнопка-глаз или длинный свайп сверху вниз скрывают суммы
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={priceBlurFeatureEnabled}
            onClick={() => setPriceBlurFeatureEnabled(!priceBlurFeatureEnabled)}
            className="shrink-0 w-12 h-7 rounded-full p-1 transition-colors"
            style={{ background: priceBlurFeatureEnabled ? '#7d5e42' : '#e5d9cc' }}
          >
            <span
              className="block w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
              style={{ transform: priceBlurFeatureEnabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </div>

      {/* Account section */}
      <div className="warm-card p-4">
        <p className="text-[13px] font-semibold text-[#7d5e42] uppercase tracking-wide font-slab mb-3">
          Учётная запись
        </p>

        {!editingCreds ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] font-slab text-[#2c1a0e]">{storedUsername || '—'}</p>
            </div>
            <button
              onClick={openCredEdit}
              className="text-[13px] font-slab font-semibold text-[#9b7653] px-3 py-1.5 rounded-lg border border-[#e5d9cc] active:bg-[#f7f0e8]"
            >
              Изменить
            </button>
          </div>
        ) : (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); handleCredSave() }} autoComplete="on">
            {/* Скрытое поле логина помогает браузеру правильно автозаполнить текущий пароль */}
            <input type="text" name="username" value={newUsername} onChange={() => {}} autoComplete="username" className="sr-only" tabIndex={-1} readOnly />

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
              label="Текущий пароль"
              placeholder="Введите текущий пароль"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              autoFocus
            />

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
                type="button"
                onClick={cancelCredEdit}
                className="flex-1 py-3 text-[15px] font-slab font-semibold text-[#9b7653] rounded-xl border border-[#e5d9cc] active:bg-[#f7f0e8]"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={credSaving}
                className="flex-1 btn-gradient py-3 text-[15px] rounded-xl"
              >
                {credSaving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
