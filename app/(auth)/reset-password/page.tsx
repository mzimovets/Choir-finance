'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) setError('Неверная ссылка сброса пароля')
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.replace('/login'), 2500)
      } else {
        setError(data.error ?? 'Ошибка')
      }
    } catch {
      setError('Ошибка подключения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-page">
      <div className="w-full max-w-lg">
        <div className="warm-card p-6">
          {done ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-3">✓</p>
              <p className="text-base font-slab font-bold text-warm-900">Пароль изменён</p>
              <p className="text-sm text-warm-500 mt-1">Перенаправляем на страницу входа…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-center text-xl font-slab font-bold text-warm-900">Новый пароль</p>

              <div>
                <label className="block text-xs font-slab font-semibold text-warm-700 mb-1.5 uppercase tracking-wide">
                  Новый пароль
                </label>
                <div className="relative">
                  <input
                    className="warm-input pr-11"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="Минимум 8 символов"
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600"
                    tabIndex={-1}>
                    <EyeIcon open={showNew} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-slab font-semibold text-warm-700 mb-1.5 uppercase tracking-wide">
                  Подтвердите пароль
                </label>
                <div className="relative">
                  <input
                    className="warm-input pr-11"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    placeholder="Повторите пароль"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-600"
                    tabIndex={-1}>
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="btn-gradient w-full py-3 text-base mt-1"
              >
                {loading ? 'Сохранение…' : 'Сохранить пароль'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  )
}
