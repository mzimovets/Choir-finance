const EVENT = 'chorus:data-changed'
const KEY = 'chorus:data-version'

// Записывает timestamp мутации в sessionStorage и шлёт window-event для уже примонтированных страниц
export function notifyDataChanged() {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(KEY, Date.now().toString())
  window.dispatchEvent(new CustomEvent(EVENT))
}

// Возвращает true если были мутации после метки `since`
export function hasChangedSince(since: number): boolean {
  if (typeof window === 'undefined') return false
  return Number(sessionStorage.getItem(KEY) ?? 0) > since
}

// Подписка на оба события; возвращает функцию-отписчик для useEffect cleanup
export function onDataChanged(handler: () => void): () => void {
  window.addEventListener(EVENT, handler)
  window.addEventListener('visibilitychange', handler)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('visibilitychange', handler)
  }
}
