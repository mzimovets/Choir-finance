'use client'

import { useState, useEffect } from 'react'
import { getPricesHidden, isPriceBlurFeatureEnabled, onPricesVisibilityChanged } from '@/lib/priceVisibility'

/** true, если суммы сейчас должны быть скрыты (заблюрены) на экране */
export function usePricesHidden(): boolean {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setHidden(getPricesHidden())
    return onPricesVisibilityChanged(() => setHidden(getPricesHidden()))
  }, [])

  return hidden
}

/** Включена ли вся фича (блюр + переворот) — выключатель в «Профиле» */
export function usePriceBlurFeatureEnabled(): boolean {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    setEnabled(isPriceBlurFeatureEnabled())
    return onPricesVisibilityChanged(() => setEnabled(isPriceBlurFeatureEnabled()))
  }, [])

  return enabled
}
