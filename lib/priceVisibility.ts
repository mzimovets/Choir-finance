const KEY = 'cf_prices_hidden'
const EVENT = 'chorus:prices-visibility-changed'

/**
 * Скрыты ли суммы на экране. Хранится в localStorage, чтобы режим
 * переживал закрытие и повторное открытие приложения.
 */
export function getPricesHidden(): boolean {
  if (typeof window === 'undefined') return false
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
