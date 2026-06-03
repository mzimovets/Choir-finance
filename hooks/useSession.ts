'use client'

import { useState, useEffect } from 'react'

interface SessionData {
  userId: string
  choirType: 'festive' | 'weekday'
  displayName: string
}

export function useSession() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(setSession)
      .finally(() => setLoading(false))
  }, [])

  return { session, loading }
}
