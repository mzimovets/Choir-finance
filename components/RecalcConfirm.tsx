'use client'

import { useState } from 'react'
import { LoadingSpinner } from '@/components/LoadingSpinner'

interface Props {
  open: boolean
  /** Кого касается пересчёт — для пояснения в тексте */
  scope: string
  onClose: () => void
  /** Запустить пересчёт; includePrevMonth — захватить и прошлый месяц */
  onConfirm: (includePrevMonth: boolean) => Promise<number>
}

/**
 * Вопрос после смены цены: пересчитывать ли уже созданные выходы.
 * По умолчанию берётся текущий месяц; прошлый — только по флажку, потому
 * что он обычно уже выгружен и оплачен.
 */
export function RecalcConfirm({ open, scope, onClose, onConfirm }: Props) {
  const [withPrevMonth, setWithPrevMonth] = useState(false)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState<number | null>(null)

  if (!open) return null

  function close() {
    setWithPrevMonth(false)
    setDone(null)
    onClose()
  }

  async function run() {
    setRunning(true)
    try {
      setDone(await onConfirm(withPrevMonth))
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => { if (!running) close() }} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center px-5">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
          {done === null ? (
            <>
              <div className="px-5 pt-6 pb-4 text-center">
                <h2 className="text-base font-slab font-bold text-warm-900 leading-snug mb-1">
                  Пересчитать выходы?
                </h2>
                <p className="text-sm text-warm-500 leading-relaxed">
                  Цена изменилась. Можно обновить {scope} в уже созданных выходах —
                  доплаты, штрафы и доли останутся прежними.
                </p>
              </div>

              <button
                onClick={() => setWithPrevMonth((v) => !v)}
                className="w-full px-5 pb-4 flex items-center gap-3 text-left"
              >
                <span
                  className="shrink-0 rounded-md border-2 flex items-center justify-center"
                  style={{
                    width: 22, height: 22,
                    borderColor: withPrevMonth ? '#9b7653' : '#d4c0ac',
                    background: withPrevMonth ? '#9b7653' : 'white',
                  }}
                >
                  {withPrevMonth && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-sm text-warm-700">
                  За прошлый месяц
                  <span className="block text-xs text-warm-400 leading-snug">
                    Иначе пересчитается только текущий месяц и дальше
                  </span>
                </span>
              </button>

              <div className="flex border-t border-warm-100">
                <button
                  onClick={close}
                  disabled={running}
                  className="flex-1 py-3.5 text-sm font-slab font-semibold text-warm-700 active:bg-warm-50 border-r border-warm-100 disabled:opacity-40"
                >
                  Не нужно
                </button>
                <button
                  onClick={run}
                  disabled={running}
                  className="flex-1 py-3.5 text-sm font-slab font-semibold text-[#7d5e42] active:bg-warm-50 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {running && <LoadingSpinner size="sm" color="#7d5e42" />}
                  Пересчитать
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="px-5 pt-6 pb-4 text-center">
                <p className="text-sm text-warm-700">
                  {done > 0 ? `Пересчитано выходов: ${done}` : 'Пересчитывать было нечего'}
                </p>
              </div>
              <div className="border-t border-warm-100">
                <button
                  onClick={close}
                  className="w-full py-3.5 text-sm font-slab font-semibold text-[#7d5e42] active:bg-warm-50"
                >
                  Готово
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
