'use client'

import { useState, useEffect } from 'react'

interface SessionData {
  userId: string
  choirType: 'festive' | 'weekday'
  username: string
}

let cached: SessionData | null = null
let promise: Promise<SessionData | null> | null = null

function fetchSession(): Promise<SessionData | null> {
  if (!promise) {
    promise = fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { cached = data; return data })
      .catch(() => null)
  }
  return promise
}

export function invalidateSession() {
  cached = null
  promise = null
}

export function useSession() {
  const [session, setSession] = useState<SessionData | null>(cached)
  const [loading, setLoading] = useState(cached === null)

  useEffect(() => {
    if (cached !== null) return
    fetchSession().then((data) => {
      setSession(data)
      setLoading(false)
    })
  }, [])

  return { session, loading }
}
