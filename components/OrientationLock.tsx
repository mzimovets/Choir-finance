'use client'

import { useEffect } from 'react'

/**
 * Держим телефон в вертикальном положении.
 *
 * Блокировка работает там, где браузер её поддерживает (установленное
 * приложение на Android). Safari на iPhone такой возможности не даёт —
 * запрос просто отклоняется, и там экран продолжает поворачиваться.
 *
 * На планшетах не трогаем ничего: горизонтальное положение там нужно —
 * отличаем по короткой стороне экрана (у телефонов меньше 600px).
 */
export function OrientationLock() {
  useEffect(() => {
    const shortSide = Math.min(window.screen.width, window.screen.height)
    if (shortSide >= 600) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orientation = window.screen?.orientation as any
    if (!orientation?.lock) return
    // Промис отклоняется, если браузер не разрешает блокировку — это нормально
    orientation.lock('portrait').catch(() => {})
  }, [])

  return null
}
