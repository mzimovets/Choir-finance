'use client'

import { useRef } from 'react'

/**
 * Полоска-ручка вверху дравера. Свайп вниз тянет всю панель и закрывает дравер,
 * если утянуть дальше порога; иначе панель возвращается на место.
 *
 * Двигаем панель (прямого ребёнка [data-slot="wrapper"]) напрямую через стиль.
 * Пока дравер открыт, framer-motion трансформацию панели не трогает, конфликта нет.
 */
export function DrawerHandle({ onClose }: { onClose: () => void }) {
  const startY = useRef<number | null>(null)
  const panel = useRef<HTMLElement | null>(null)

  function findPanel(from: HTMLElement): HTMLElement | null {
    let n: HTMLElement | null = from
    while (n && n.parentElement?.getAttribute('data-slot') !== 'wrapper') {
      n = n.parentElement
    }
    return n
  }

  function settle(p: HTMLElement | null, to: string) {
    if (!p) return
    p.style.transition = 'transform 0.25s ease'
    p.style.transform = to
    window.setTimeout(() => { p.style.transition = ''; p.style.transform = '' }, 280)
  }

  return (
    <div
      className="flex justify-center pt-2 pb-2 w-full touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        startY.current = e.clientY
        panel.current = findPanel(e.currentTarget)
        if (panel.current) panel.current.style.transition = 'none'
      }}
      onPointerMove={(e) => {
        if (startY.current === null) return
        const dy = Math.max(0, e.clientY - startY.current)
        if (panel.current) panel.current.style.transform = `translateY(${dy}px)`
      }}
      onPointerUp={(e) => {
        if (startY.current === null) return
        const dy = e.clientY - startY.current
        const p = panel.current
        startY.current = null
        panel.current = null
        if (dy > 90) {
          // утянули достаточно — доводим панель вниз и закрываем
          const h = p ? p.getBoundingClientRect().height : 600
          if (p) { p.style.transition = 'transform 0.2s ease'; p.style.transform = `translateY(${h}px)` }
          onClose()
          if (p) window.setTimeout(() => { p.style.transition = ''; p.style.transform = '' }, 260)
        } else {
          settle(p, 'translateY(0px)')
        }
      }}
      onPointerCancel={() => {
        settle(panel.current, 'translateY(0px)')
        startY.current = null
        panel.current = null
      }}
    >
      <div className="w-10 h-1 rounded-full bg-warm-300" />
    </div>
  )
}
