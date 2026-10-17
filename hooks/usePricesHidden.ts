'use client'

import { useState, useEffect } from 'react'
import { getPricesHidden, isPriceBlurFeatureEnabled, onPricesVisibilityChanged } from '@/lib/priceVisibility'

// Ленивая инициализация useState — значение из localStorage считывается
// прямо на первом рендере, до какой-либо отрисовки. На отложенной
// синхронизации через эффект (даже useLayoutEffect) при маунте нового
// SpoilerAmount — например, когда отмечаешь певчего в чек-листе — мелькала
// настоящая сумма на один кадр, прежде чем состояние «скрыто» подхватывалось.

/** true, если суммы сейчас должны быть скрыты (заблюрены) на экране */
export function usePricesHidden(): boolean {
  const [hidden, setHidden] = useState(() => getPricesHidden())

  useEffect(() => onPricesVisibilityChanged(() => setHidden(getPricesHidden())), [])

  return hidden
}

/** Включена ли вся фича скрытия сумм — выключатель в «Профиле» */
export function usePriceBlurFeatureEnabled(): boolean {
  const [enabled, setEnabled] = useState(() => isPriceBlurFeatureEnabled())

  useEffect(() => onPricesVisibilityChanged(() => setEnabled(isPriceBlurFeatureEnabled())), [])

  return enabled
}
