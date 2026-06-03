'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  title: string
  subtitle?: string
  displayName?: string
  choirType?: string
  right?: React.ReactNode
}

export function PageHeader({ title, subtitle, displayName, choirType, right }: Props) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)

  const initials = displayName
    ? displayName.split(' ').map((w) => w[0]).slice(0, 2).join('')
    : '?'

  const choirLabel = choirType === 'festive' ? 'Праздничный хор' : 'Будний хор'

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }

  return (
    <div className="flex items-center justify-between px-4 pt-5 pb-3">
      <div>
        <h1 className="text-xl font-slab font-bold text-warm-900">{title}</h1>
        {subtitle && <p className="text-xs text-warm-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {right}
        {displayName && (
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
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-11 z-50 warm-card min-w-[180px] py-2 shadow-lg">
                  <div className="px-3 py-2 border-b border-warm-100">
                    <p className="text-xs font-slab font-semibold text-warm-800 truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-warm-500">{choirLabel}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Выйти
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
