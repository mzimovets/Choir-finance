'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@heroui/react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Ошибка входа')
        return
      }
      router.replace('/day')
    } catch {
      setError('Ошибка подключения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-page">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-slab font-bold shadow-lg"
            style={{ background: 'linear-gradient(135deg, #bd9673, #7d5e42)' }}
          >
            ♪
          </div>
          <h1 className="text-2xl font-slab font-bold gradient-text">Хор — Учёт</h1>
          <p className="text-sm text-warm-600 mt-1">Учёт посещений и зарплата</p>
        </div>

        {/* Card */}
        <div className="warm-card p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-slab font-semibold text-warm-700 mb-1.5 uppercase tracking-wide">
                Логин
              </label>
              <input
                className="warm-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                placeholder="Введите логин"
              />
            </div>

            <div>
              <label className="block text-xs font-slab font-semibold text-warm-700 mb-1.5 uppercase tracking-wide">
                Пароль
              </label>
              <input
                className="warm-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="Введите пароль"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full py-3 text-base mt-1 flex items-center justify-center gap-2"
            >
              {loading && <Spinner size="sm" color="white" />}
              Войти
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
