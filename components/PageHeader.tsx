'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EventTypesDrawer } from './EventTypesDrawer'
import { AuditLogModal } from './AuditLogModal'
import { invalidateSession } from '@/hooks/useSession'

interface Props {
  title: string
  subtitle?: string
  username?: string
  choirType?: string
  right?: React.ReactNode
  left?: React.ReactNode
  /** Если true — title/subtitle по центру, аватар справа поверх (absolute) */
  titleCenter?: boolean
}

export function PageHeader({ title, subtitle, username, choirType, right, left, titleCenter }: Props) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [showEventTypes, setShowEventTypes] = useState(false)
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [showSwitchChoir, setShowSwitchChoir] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [switchingTo, setSwitchingTo] = useState<'festive' | 'weekday' | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const initials = username ? username.slice(0, 2).toUpperCase() : '?'

  const choirLabel = choirType === 'festive' ? 'Праздничный хор' : 'Будний хор'

  async function handleLogout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('cf_session_backup')
    invalidateSession()
    router.replace('/login')
  }

  async function handleSwitchChoir(newChoir: 'festive' | 'weekday') {
    setSwitchingTo(newChoir)
    setSwitching(true)
    try {
      await fetch('/api/auth/switch-choir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choirType: newChoir }),
      })
      invalidateSession()
      window.location.href = '/day'
    } finally {
      setSwitching(false)
      setShowSwitchChoir(false)
    }
  }

  const avatarBlock = username != null && (
    <div className="relative">
      <button
        onClick={() => setShowMenu((v) => !v)}
        className="flex items-center gap-2 rounded-full transition-opacity active:opacity-70"
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-slab font-bold shadow-sm"
          style={{ background: 'linear-gradient(135deg, #bd9673, #7d5e42)' }}
        >
          {initials}
        </div>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-11 z-50 warm-card min-w-[190px] py-2 shadow-lg">
            <div className="px-3 py-2 border-b border-warm-100">
              <p className="text-xs font-slab font-semibold text-warm-800 truncate">
                {username || 'Профиль'}
              </p>
              <p className="text-xs text-warm-500">{choirLabel}</p>
            </div>
            <button
              onClick={() => { setShowMenu(false); setShowSwitchChoir(true) }}
              className="w-full text-left px-3 py-2 text-sm text-warm-700 hover:bg-warm-50 transition-colors border-b border-warm-100"
            >
              Сменить хор
            </button>
            <button
              onClick={() => { setShowMenu(false); setShowEventTypes(true) }}
              className="w-full text-left px-3 py-2 text-sm text-warm-700 hover:bg-warm-50 transition-colors border-b border-warm-100"
            >
              Типы выходов
            </button>
            <button
              onClick={() => { setShowMenu(false); setShowAuditLog(true) }}
              className="w-full text-left px-3 py-2 text-sm text-warm-700 hover:bg-warm-50 transition-colors border-b border-warm-100"
            >
              Журнал изменений
            </button>
            <button
              onClick={() => { setShowMenu(false); setShowLogoutConfirm(true) }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Выйти
            </button>
          </div>
        </>
      )}
    </div>
  )

  const eventTypesDrawer = (
    <EventTypesDrawer isOpen={showEventTypes} onClose={() => setShowEventTypes(false)} />
  )
  const auditLogModal = (
    <AuditLogModal isOpen={showAuditLog} onClose={() => setShowAuditLog(false)} />
  )

  /* ── Модальное окно подтверждения выхода ── */
  const logoutConfirmModal = showLogoutConfirm && (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={() => { if (!loggingOut) setShowLogoutConfirm(false) }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
        <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
          <div className="px-5 pt-6 pb-5 text-center">
            <h2 className="text-base font-slab font-bold text-warm-900 mb-2">Выйти из аккаунта?</h2>
            <p className="text-sm text-warm-500 leading-relaxed">
              Вы выйдете из системы. Чтобы войти снова, потребуется пароль.
            </p>
          </div>
          <div className="flex border-t border-warm-100">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              disabled={loggingOut}
              className="flex-1 py-3.5 text-sm font-slab font-semibold text-warm-700 active:bg-warm-50 border-r border-warm-100"
            >
              Отмена
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex-1 py-3.5 text-sm font-slab font-semibold text-red-500 active:bg-red-50 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loggingOut && <LoadingSpinner size="sm" color="#dc2626" />}
              Выйти
            </button>
          </div>
        </div>
      </div>
    </>
  )

  /* ── Модальное окно смены хора ── */
  const switchChoirModal = showSwitchChoir && (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={() => { if (!switching) setShowSwitchChoir(false) }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <h2 className="text-base font-slab font-bold text-warm-900 mb-1">Сменить хор</h2>
            <p className="text-xs text-warm-500 mb-4">Сейчас: {choirLabel}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSwitchChoir('festive')}
                disabled={switching || choirType === 'festive'}
                className={`w-full py-3.5 px-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all disabled:opacity-40 ${
                  choirType === 'festive'
                    ? 'border-warm-300 bg-warm-50'
                    : 'border-warm-200 hover:border-warm-300 active:bg-warm-50'
                }`}
              >
                <span className="text-xl">🕊</span>
                <span className="text-sm font-slab font-bold text-warm-900">Праздничный хор</span>
                <span className="ml-auto">
                  {switchingTo === 'festive'
                    ? <LoadingSpinner size="sm" color="#9b7653" />
                    : choirType === 'festive' && <span className="text-xs font-semibold text-warm-500">текущий</span>
                  }
                </span>
              </button>
              <button
                onClick={() => handleSwitchChoir('weekday')}
                disabled={switching || choirType === 'weekday'}
                className={`w-full py-3.5 px-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all disabled:opacity-40 ${
                  choirType === 'weekday'
                    ? 'border-warm-300 bg-warm-50'
                    : 'border-warm-200 hover:border-warm-300 active:bg-warm-50'
                }`}
              >
                <span className="text-xl">📅</span>
                <span className="text-sm font-slab font-bold text-warm-900">Будний хор</span>
                <span className="ml-auto">
                  {switchingTo === 'weekday'
                    ? <LoadingSpinner size="sm" color="#9b7653" />
                    : choirType === 'weekday' && <span className="text-xs font-semibold text-warm-500">текущий</span>
                  }
                </span>
              </button>
            </div>
          </div>
          <div className="border-t border-warm-100">
            <button
              onClick={() => setShowSwitchChoir(false)}
              className="w-full py-3.5 text-sm font-slab font-semibold text-warm-600 active:bg-warm-50"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </>
  )

  if (titleCenter) {
    return (
      <>
        <div className="relative flex items-center justify-center px-4 pt-5 pb-3">
          {left && (
            <div className="absolute left-4 flex items-center gap-2">
              {left}
            </div>
          )}
          <div className="text-center">
            <h1 className="text-2xl font-slab font-bold leading-tight gradient-text">{title}</h1>
            {subtitle && (
              <p className="text-sm font-slab font-semibold text-warm-900 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="absolute right-4 flex items-center gap-2">
            {avatarBlock}
            {right}
          </div>
        </div>
        {eventTypesDrawer}
        {auditLogModal}
        {switchChoirModal}
        {logoutConfirmModal}
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div>
          <h1 className="text-xl font-slab font-bold text-warm-900">{title}</h1>
          {subtitle && <p className="text-xs text-warm-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {avatarBlock}
          {right}
        </div>
      </div>
      {eventTypesDrawer}
      {auditLogModal}
      {switchChoirModal}
      {logoutConfirmModal}
    </>
  )
}
