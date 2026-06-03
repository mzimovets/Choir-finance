'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  {
    href: '/day',
    label: 'Табель',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'url(#g)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bd9673" />
            <stop offset="100%" stopColor="#7d5e42" />
          </linearGradient>
        </defs>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: '/singers',
    label: 'Певчие',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'url(#g2)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bd9673" />
            <stop offset="100%" stopColor="#7d5e42" />
          </linearGradient>
        </defs>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/stats',
    label: 'Статистика',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'url(#g3)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bd9673" />
            <stop offset="100%" stopColor="#7d5e42" />
          </linearGradient>
        </defs>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: '/export',
    label: 'Экспорт',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'url(#g4)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#bd9673" />
            <stop offset="100%" stopColor="#7d5e42" />
          </linearGradient>
        </defs>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
  },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-page flex flex-col">
      <main className="flex-1 pb-nav overflow-auto">{children}</main>

      <nav
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-warm-200 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-4 h-[4.5rem] max-w-lg mx-auto">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                  active ? 'font-slab font-semibold' : 'text-warm-400 font-medium'
                }`}
                style={active ? { color: '#9b7653' } : {}}
              >
                {icon(active)}
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
