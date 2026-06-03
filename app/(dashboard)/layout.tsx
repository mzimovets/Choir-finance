'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/day', label: 'Табель', icon: '📅' },
  { href: '/singers', label: 'Певчие', icon: '🎵' },
  { href: '/stats', label: 'Статистика', icon: '📊' },
  { href: '/export', label: 'Экспорт', icon: '📥' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-nav overflow-auto">{children}</main>

      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-divider z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-4 h-16">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                  active ? 'text-primary font-semibold' : 'text-default-400'
                }`}
              >
                <span className="text-xl leading-none">{icon}</span>
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
