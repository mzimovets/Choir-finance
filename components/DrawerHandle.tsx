'use client'

import { useRef } from 'react'

/**
 * Полоска-ручка вверху дравера с поддержкой свайпа вниз для закрытия.
 * Работает только на ручке — не конфликтует с прокруткой контента.
 */
export function DrawerHandle({ onClose }: { onClose: () => void }) {
  const startY = useRef<number | null>(null)

  return (
    <div
      className="flex justify-center pt-1 pb-2 w-full touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        startY.current = e.clientY
      }}
      onPointerMove={(e) => {
        if (startY.current === null) return
        const delta = e.clientY - startY.current
        // визуальная обратная связь: чуть двигаем ручку
        if (delta > 0) {
          e.currentTarget.style.transform = `translateY(${Math.min(delta * 0.4, 20)}px)`
        }
      }}
      onPointerUp={(e) => {
        if (startY.current === null) return
        const delta = e.clientY - startY.current
        e.currentTarget.style.transform = ''
        if (delta > 72) onClose()
        startY.current = null
      }}
      onPointerCancel={() => {
        startY.current = null
      }}
    >
      <div className="w-10 h-1 rounded-full bg-warm-300 transition-transform" />
    </div>
  )
}
