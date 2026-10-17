'use client'

import { useState, useEffect } from 'react'
import { getPricesHidden, onPricesVisibilityChanged } from '@/lib/priceVisibility'

/** true, если суммы сейчас должны быть скрыты (заблюрены) на экране */
export function usePricesHidden(): boolean {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setHidden(getPricesHidden())
    return onPricesVisibilityChanged(() => setHidden(getPricesHidden()))
  }, [])

  return hidden
}
