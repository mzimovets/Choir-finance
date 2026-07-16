'use client'

import { useState, useEffect } from 'react'
import { Spinner } from '@heroui/react'
import type { AuditEntry } from '@/lib/types'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  create_event:      { label: 'Добавлен выход',    color: 'text-green-600',  icon: '＋' },
  update_event:      { label: 'Изменён выход',     color: 'text-blue-500',   icon: '✎' },
  delete_event:      { label: 'Удалён выход',      color: 'text-red-500',    icon: '✕' },
  create_member:     { label: 'Добавлен певчий',   color: 'text-green-600',  icon: '＋' },
  update_member:     { label: 'Изменён певчий',    color: 'text-blue-500',   icon: '✎' },
  delete_member:     { label: 'Удалён певчий',     color: 'text-red-500',    icon: '✕' },
  create_event_type: { label: 'Добавлен тип',      color: 'text-green-600',  icon: '＋' },
  update_event_type: { label: 'Изменён тип',       color: 'text-blue-500',   icon: '✎' },
  delete_event_type: { label: 'Удалён тип',        color: 'text-red-500',    icon: '✕' },
}

function IconBroom() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M21.0367 2.88373C21.3296 3.17663 21.3296 3.6515 21.0367 3.94439L19.404 5.57701C20.6352 7.27231 20.6068 9.59792 19.319 11.2642L19.3229 11.2962L19.291 11.3C19.291 11.3001 19.2911 11.3 19.291 11.3C19.3231 11.2963 19.3229 11.2962 19.3229 11.2962L19.3234 11.3007L19.3243 11.3089L19.3273 11.336C19.3296 11.3588 19.3328 11.391 19.3365 11.432C19.3438 11.5141 19.353 11.6317 19.3611 11.7805C19.3774 12.0779 19.3898 12.5013 19.3756 13.0165C19.3471 14.0442 19.2121 15.4509 18.7816 16.9569C18.4906 17.9747 18.0376 18.9818 17.5726 19.8625C16.4115 22.0616 13.7398 22.7184 11.6965 21.6754L11.6716 21.6627L10.5514 20.9812C7.44145 19.0893 4.8309 16.4788 2.93902 13.3688L2.25761 12.2487L2.24489 12.2238C1.20189 10.1805 1.85869 7.50879 4.0578 6.34768C4.93847 5.88268 5.94556 5.42972 6.96344 5.13874C8.46937 4.70823 9.8761 4.57319 10.9038 4.54473C11.419 4.53046 11.8424 4.54288 12.1398 4.55919C12.2886 4.56734 12.4062 4.57649 12.4882 4.5838C12.5293 4.58745 12.5615 4.59065 12.5843 4.59304L12.6114 4.59597L12.6196 4.5969L12.6223 4.59722L12.6233 4.59734C12.6233 4.59735 12.6238 4.5974 12.62 4.62984C12.6199 4.62989 12.6201 4.62978 12.62 4.62984L12.6233 4.59734L12.6565 4.60132C14.3228 3.31367 16.6482 3.2853 18.3434 4.51635L19.976 2.88373C20.2689 2.59084 20.7438 2.59084 21.0367 2.88373ZM12.1978 6.06557C12.1559 6.06269 12.1092 6.05976 12.0577 6.05694C11.7959 6.04259 11.4141 6.03117 10.9454 6.04415C10.0053 6.07019 8.72929 6.19401 7.37573 6.58096C6.49186 6.83364 5.58509 7.23752 4.75816 7.67414C3.35154 8.41682 2.88512 10.1484 3.56901 11.5182L4.22052 12.5892C5.98767 15.4941 8.42609 17.9325 11.331 19.6997L12.402 20.3513C13.7719 21.0352 15.5035 20.5688 16.2462 19.1621C16.6828 18.3352 17.0867 17.4284 17.3393 16.5446C17.7263 15.191 17.8501 13.915 17.8761 12.9749C17.8891 12.5062 17.8777 12.1244 17.8634 11.8626C17.8605 11.8111 17.8576 11.7644 17.8547 11.7225L12.1978 6.06557ZM18.3236 10.0701L13.8504 5.5969C15.1034 4.82281 16.768 4.97907 17.8547 6.06571C18.9413 7.15238 19.0977 8.81714 18.3236 10.0701Z" fill="currentColor"/>
    </svg>
  )
}

function formatTs(ts: string) {
  const d = new Date(ts)
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return { date, time }
}

function groupByDate(entries: AuditEntry[]) {
  const groups: { date: string; items: AuditEntry[] }[] = []
  for (const e of entries) {
    const { date } = formatTs(e.timestamp)
    const last = groups[groups.length - 1]
    if (last && last.date === date) last.items.push(e)
    else groups.push({ date, items: [e] })
  }
  return groups
}

export function AuditLogModal({ isOpen, onClose }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetch('/api/audit-log')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AuditEntry[]) => {
        setEntries(data)
        setLoading(false)
      })
  }, [isOpen])

  async function handleClear() {
    setClearing(true)
    await fetch('/api/audit-log', { method: 'DELETE' })
    setEntries([])
    setClearing(false)
    setConfirmClear(false)
  }

  if (!isOpen) return null

  const groups = groupByDate(entries)

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div
          className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col"
          style={{ maxHeight: '88dvh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-warm-100 shrink-0">
            <h2 className="text-base font-slab font-bold text-warm-900">Журнал изменений</h2>
            <div className="flex items-center gap-2">
              {/* Кнопка очистки */}
              {entries.length > 0 && !loading && (
                confirmClear ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-warm-500">Очистить?</span>
                    <button
                      onClick={handleClear}
                      disabled={clearing}
                      className="px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold active:bg-red-600 disabled:opacity-40 flex items-center gap-1"
                    >
                      {clearing ? <Spinner size="sm" color="white" /> : 'Да'}
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="px-2.5 py-1 rounded-lg bg-warm-100 text-warm-600 text-xs font-semibold active:bg-warm-200"
                    >
                      Нет
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="w-7 h-7 rounded-lg bg-warm-100 text-warm-500 flex items-center justify-center active:bg-warm-200"
                    title="Очистить журнал"
                  >
                    <IconBroom />
                  </button>
                )
              )}
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg bg-warm-100 text-warm-500 flex items-center justify-center active:bg-warm-200 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-4 py-3">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner color="warning" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-warm-400 text-sm">
                Журнал пуст — изменения появятся здесь
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {groups.map((g) => (
                  <div key={g.date}>
                    <p className="text-xs font-semibold text-warm-400 uppercase tracking-wide mb-2">
                      {g.date}
                    </p>
                    <div className="warm-card overflow-hidden">
                      {g.items.map((e, i) => {
                        const meta = ACTION_LABELS[e.action] ?? { label: e.action, color: 'text-warm-500', icon: '•' }
                        const { time } = formatTs(e.timestamp)
                        return (
                          <div
                            key={e._id}
                            className={`px-4 py-3 ${i < g.items.length - 1 ? 'border-b border-warm-50' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`text-sm font-bold mt-0.5 shrink-0 ${meta.color}`}>
                                {meta.icon}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-warm-900 leading-snug">{e.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                                  <span className="text-xs text-warm-300">·</span>
                                  <span className="text-xs text-warm-400">{e.displayName}</span>
                                  <span className="text-xs text-warm-300">·</span>
                                  <span className="text-xs text-warm-400 tabular-nums">{time}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Safe area bottom */}
          <div className="shrink-0" style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
        </div>
      </div>
    </>
  )
}
