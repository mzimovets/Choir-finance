'use client'

import { useEffect, useState } from 'react'

/**
 * Заставка при запуске приложения: экран в цвет приложения с иконкой,
 * которая слегка «вырастает». Монтируется один раз за загрузку документа,
 * поэтому при переходах между разделами и после ввода PIN не появляется.
 *
 * Показывается только в приложении, добавленном на главный экран: видимость
 * задана в CSS через @media (display-mode: standalone), поэтому в обычной
 * вкладке браузера заставка не мелькает даже на миг — ей не нужно ждать JS.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'done'>('visible')

  useEffect(() => {
    const fade = setTimeout(() => setPhase('fading'), 1500)
    const done = setTimeout(() => setPhase('done'), 1900)
    return () => { clearTimeout(fade); clearTimeout(done) }
  }, [])

  if (phase === 'done') return null

  return (
    <div className={`splash${phase === 'fading' ? ' splash-hide' : ''}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="splash-icon" width={112} height={112} />
    </div>
  )
}
