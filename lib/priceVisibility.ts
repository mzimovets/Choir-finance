const KEY = 'cf_prices_hidden'
const FEATURE_KEY = 'cf_price_blur_feature_enabled'
const EVENT = 'chorus:prices-visibility-changed'

/** Включена ли вся фича целиком (блюр + переворот). Выключатель — в «Профиле». */
export function isPriceBlurFeatureEnabled(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(FEATURE_KEY) !== '0'
}

export function setPriceBlurFeatureEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  if (enabled) localStorage.removeItem(FEATURE_KEY)
  else localStorage.setItem(FEATURE_KEY, '0')
  window.dispatchEvent(new CustomEvent(EVENT))
}

/**
 * Скрыты ли суммы на экране. Хранится в localStorage, чтобы режим
 * переживал закрытие и повторное открытие приложения. Если вся фича
 * выключена в профиле — суммы считаются видимыми независимо от
 * сохранённого значения (но само значение не стираем, вдруг включат обратно).
 */
export function getPricesHidden(): boolean {
  if (typeof window === 'undefined') return false
  if (!isPriceBlurFeatureEnabled()) return false
  return localStorage.getItem(KEY) === '1'
}

export function setPricesHidden(hidden: boolean) {
  if (typeof window === 'undefined') return
  if (hidden) localStorage.setItem(KEY, '1')
  else localStorage.removeItem(KEY)
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function togglePricesHidden() {
  setPricesHidden(!getPricesHidden())
}

/** Подписка на изменение режима; возвращает функцию-отписчик для useEffect cleanup */
export function onPricesVisibilityChanged(handler: () => void): () => void {
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
