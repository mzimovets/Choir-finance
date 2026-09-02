'use client'

import { useState } from 'react'
import { LoadingSpinner } from '@/components/LoadingSpinner'

interface Props {
  open: boolean
  /** Кого касается пересчёт — для пояснения в тексте */
  scope: string
  onClose: () => void
  /** Запустить пересчёт за выбранные месяцы */
  onConfirm: (months: { currentMonth: boolean; prevMonth: boolean }) => Promise<number>
}

/**
 * Вопрос после смены цены: пересчитывать ли уже созданные выходы.
 * Месяцы выбираются независимо — можно обновить только прошлый, если
 * текущий трогать не нужно. Снятые оба флажка означают, что новая цена
 * пойдёт только на будущие выходы.
 */
export function RecalcConfirm({ open, scope, onClose, onConfirm }: Props) {
  const [currentMonth, setCurrentMonth] = useState(true)
  const [prevMonth, setPrevMonth] = useState(false)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState<number | null>(null)

  if (!open) return null

  function close() {
    setCurrentMonth(true)
    setPrevMonth(false)
    setDone(null)
    onClose()
  }

  async function run() {
    setRunning(true)
    try {
      setDone(await onConfirm({ currentMonth, prevMonth }))
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
                  Цена изменилась. Отметьте месяцы, где нужно обновить {scope} в уже
                  созданных выходах — доплаты, штрафы и доли останутся прежними.
                </p>
              </div>

              <div className="pb-2">
                {([
                  {
                    checked: currentMonth,
                    toggle: () => setCurrentMonth((v) => !v),
                    title: 'Текущий месяц',
                    hint: 'Без него уже проставленные выходы останутся с прежней ценой',
                  },
                  {
                    checked: prevMonth,
                    toggle: () => setPrevMonth((v) => !v),
                    title: 'Прошлый месяц',
                    hint: 'Если табель за него ещё не сдан',
                  },
                ]).map((row) => (
                  <button
                    key={row.title}
                    onClick={row.toggle}
                    className="w-full px-5 py-2 flex items-center gap-3 text-left active:bg-warm-50"
                  >
                    <span
                      className="shrink-0 rounded-md border-2 flex items-center justify-center"
                      style={{
                        width: 22, height: 22,
                        borderColor: row.checked ? '#9b7653' : '#d4c0ac',
                        background: row.checked ? '#9b7653' : 'white',
                      }}
                    >
                      {row.checked && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-warm-700">
                      {row.title}
                      <span className="block text-xs text-warm-400 leading-snug">{row.hint}</span>
                    </span>
                  </button>
                ))}
              </div>

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
                  disabled={running || (!currentMonth && !prevMonth)}
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
