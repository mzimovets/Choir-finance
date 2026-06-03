'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardBody, CardHeader, Input, Button } from '@heroui/react'

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-primary-100">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="flex flex-col gap-1 px-6 pt-6 pb-2">
          <div className="text-2xl font-bold text-primary">Хор</div>
          <p className="text-small text-default-500">Учёт посещений и зарплата</p>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Логин"
              value={username}
              onValueChange={setUsername}
              autoComplete="username"
              isRequired
            />
            <Input
              label="Пароль"
              type="password"
              value={password}
              onValueChange={setPassword}
              autoComplete="current-password"
              isRequired
            />
            {error && (
              <p className="text-danger text-small text-center">{error}</p>
            )}
            <Button
              type="submit"
              color="primary"
              isLoading={loading}
              className="w-full mt-2"
              size="lg"
            >
              Войти
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
