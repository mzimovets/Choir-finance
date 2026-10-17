'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { usePricesHidden } from '@/hooks/usePricesHidden'

interface Particle {
  baseX: number
  baseY: number
  seed: number
}

/**
 * Сумма, скрытая «пылью», как спойлер в Телеграме — вместо CSS-блюра
 * рисуем частицы по форме текста на canvas и слегка анимируем их, пока
 * сумма скрыта. При показе/скрытии текст и частицы плавно крестфейдятся.
 * Анимация идёт только пока суммы реально скрыты — иначе на экранах с
 * десятками сумм было бы столько же холостых requestAnimationFrame.
 */
export function SpoilerAmount({
  text, className, style,
}: {
  text: string
  className?: string
  style?: React.CSSProperties
}) {
  const hidden = usePricesHidden()
  const textRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const colorRef = useRef('#ffffff')

  // Строим маску частиц по реальным пикселям отрисованного текста.
  // useLayoutEffect — чтобы маска была готова до первой отрисовки на экране,
  // иначе при маунте (переключение между разделами) на миг мелькала бы
  // настоящая сумма, пока частицы ещё не посчитаны.
  useLayoutEffect(() => {
    const span = textRef.current
    const canvas = canvasRef.current
    if (!span || !canvas) return

    function build() {
      const rect = span!.getBoundingClientRect()
      const w = Math.ceil(rect.width)
      const h = Math.ceil(rect.height)
      if (w === 0 || h === 0) return

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      canvas!.style.width = `${w}px`
      canvas!.style.height = `${h}px`

      const cs = getComputedStyle(span!)
      colorRef.current = cs.color

      const off = document.createElement('canvas')
      off.width = w
      off.height = h
      const offCtx = off.getContext('2d')
      if (!offCtx) return
      offCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      offCtx.textBaseline = 'middle'
      offCtx.fillStyle = '#000'
      offCtx.fillText(text, 0, h / 2)
      const data = offCtx.getImageData(0, 0, w, h).data

      const points: Particle[] = []
      const step = 2
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const alpha = data[(y * w + x) * 4 + 3]
          if (alpha > 100) points.push({ baseX: x, baseY: y, seed: Math.random() * 1000 })
        }
      }
      particlesRef.current = points
    }

    build()
    const ro = new ResizeObserver(build)
    ro.observe(span)
    return () => ro.disconnect()
  }, [text])

  // Анимация пыли — работает, только пока суммы реально скрыты (при показанных
  // суммах canvas всё равно прозрачный — незачем грузить CPU на сотнях сумм)
  useEffect(() => {
    if (!hidden) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let raf = 0

    function frame(t: number) {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      ctx!.save()
      ctx!.scale(dpr, dpr)
      ctx!.fillStyle = colorRef.current
      for (const p of particlesRef.current) {
        const dx = Math.sin(t / 650 + p.seed) * 1.3
        const dy = Math.cos(t / 520 + p.seed * 1.3) * 1.3
        ctx!.globalAlpha = 0.5 + 0.5 * Math.sin(t / 320 + p.seed)
        ctx!.beginPath()
        ctx!.arc(p.baseX + dx, p.baseY + dy, 1.1, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.restore()
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [hidden])

  return (
    <span className={`relative inline-block ${className ?? ''}`} style={style}>
      <span ref={textRef} style={{ opacity: hidden ? 0 : 1, transition: 'opacity 0.25s ease' }}>
        {text}
      </span>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: hidden ? 1 : 0, transition: 'opacity 0.25s ease' }}
      />
    </span>
  )
}
