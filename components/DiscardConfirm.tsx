'use client'

/** Подтверждение закрытия формы с несохранёнными изменениями. */
export function DiscardConfirm({ open, onStay, onDiscard }: {
  open: boolean
  onStay: () => void
  onDiscard: () => void
}) {
  if (!open) return null
  return (
    <>
      {/* Клик по фону ничего не делает — выбор только кнопками */}
      <div className="fixed inset-0 z-[70] bg-black/50" />
      <div className="fixed inset-0 z-[70] flex items-center justify-center px-5">
        <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
          <div className="px-5 pt-6 pb-5 text-center">
            <h2 className="text-base font-slab font-bold text-warm-900 mb-2">Закрыть без сохранения?</h2>
            <p className="text-sm text-warm-500 leading-relaxed">Внесённые изменения не сохранятся.</p>
          </div>
          <div className="flex border-t border-warm-100">
            <button
              onClick={onStay}
              className="flex-1 py-3.5 text-sm font-slab font-semibold text-warm-700 active:bg-warm-50 border-r border-warm-100"
            >
              Остаться
            </button>
            <button
              onClick={onDiscard}
              className="flex-1 py-3.5 text-sm font-slab font-semibold text-red-500 active:bg-red-50"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
