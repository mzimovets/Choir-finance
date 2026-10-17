'use client'

import { useState, useLayoutEffect } from 'react'
import { getPricesHidden, isPriceBlurFeatureEnabled, onPricesVisibilityChanged } from '@/lib/priceVisibility'

// useLayoutEffect (а не useEffect) — синхронизация с localStorage должна
// успеть до первой отрисовки на экране. На useEffect при переключении между
// разделами (новый маунт компонента) на долю секунды мелькала настоящая
// сумма, прежде чем состояние «скрыто» подхватывалось.

/** true, если суммы сейчас должны быть скрыты (заблюрены) на экране */
export function usePricesHidden(): boolean {
  const [hidden, setHidden] = useState(false)

  useLayoutEffect(() => {
    setHidden(getPricesHidden())
    return onPricesVisibilityChanged(() => setHidden(getPricesHidden()))
  }, [])

  return hidden
}

/** Включена ли вся фича скрытия сумм — выключатель в «Профиле» */
export function usePriceBlurFeatureEnabled(): boolean {
  const [enabled, setEnabled] = useState(true)

  useLayoutEffect(() => {
    setEnabled(isPriceBlurFeatureEnabled())
    return onPricesVisibilityChanged(() => setEnabled(isPriceBlurFeatureEnabled()))
  }, [])

  return enabled
}
