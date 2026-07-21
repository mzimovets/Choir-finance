'use client'

import { useState, useEffect } from 'react'

/** Высота клавиатуры в пикселях (0 если закрыта). Использует visualViewport API. */
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function update() {
      const kh = Math.max(0, window.innerHeight - vv!.height - vv!.offsetTop)
      setHeight(kh)
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return height
}
