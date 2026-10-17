/**
 * Жест «перевернуть телефон экраном вниз и обратно вверх» — переключает
 * видимость сумм. Работает через датчик ускорения (devicemotion).
 *
 * iOS 13+ не отдаёт данные датчика без явного разрешения, а разрешение
 * можно запросить только внутри обработчика пользовательского жеста
 * (тап/клик), не программно при загрузке страницы. Поэтому при первом
 * открытии показываем маленький баннер с одной кнопкой «Разрешить» —
 * сам этот тап и запрашивает разрешение (см. DashboardLayout).
 */

type MotionPermissionAPI = {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

/** true, если платформа (iOS 13+) требует явного разрешения на датчик движения */
export function needsMotionPermission(): boolean {
  if (typeof window === 'undefined') return false
  const api = (window as unknown as { DeviceMotionEvent?: MotionPermissionAPI }).DeviceMotionEvent
  return typeof api?.requestPermission === 'function'
}

export async function requestMotionPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const api = (window as unknown as { DeviceMotionEvent?: MotionPermissionAPI }).DeviceMotionEvent
  if (!api?.requestPermission) return true // Android и большинство браузеров — разрешение не нужно
  try {
    const result = await api.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}

const ASKED_KEY = 'cf_motion_permission_asked'

/** Спрашивали ли уже один раз (баннер при первом открытии показываем только пока не спросили) */
export function wasMotionPermissionAsked(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(ASKED_KEY) === '1'
}

export function markMotionPermissionAsked() {
  if (typeof window === 'undefined') return
  localStorage.setItem(ASKED_KEY, '1')
}

/**
 * Начинает слушать датчик и вызывает onFlip() при распознанном перевороте.
 * Возвращает функцию отписки.
 *
 * Эвристика: ось z акселерометра (с учётом гравитации) отрицательна, когда
 * телефон лежит экраном вниз, и положительна — экраном вверх. Засчитываем
 * переворот, если после устойчивого «вниз» в течение короткого окна
 * наступает устойчивое «вверх» — так случайный наклон в руке не триггерит
 * срабатывание. Пороги подобраны ориентировочно и могут требовать
 * калибровки на реальных устройствах.
 */
export function startFlipListener(onFlip: () => void): () => void {
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
    return () => {}
  }

  const THRESHOLD = 7 // м/с², порог «устойчиво вниз/вверх»
  const FACE_DOWN_MIN_MS = 120 // столько держать «вниз», чтобы не считать дребезгом
  const FLIP_WINDOW_MS = 3000 // за это время после «вниз» должно случиться «вверх»
  const COOLDOWN_MS = 1200 // не триггерить повторно сразу после срабатывания

  let faceDownSince: number | null = null
  let armed = false // true, когда «вниз» продержался достаточно долго
  let lastTrigger = 0

  function handler(e: DeviceMotionEvent) {
    const z = e.accelerationIncludingGravity?.z
    if (z == null) return
    const now = Date.now()

    if (z < -THRESHOLD) {
      if (faceDownSince == null) faceDownSince = now
      if (!armed && now - faceDownSince >= FACE_DOWN_MIN_MS) armed = true
      return
    }

    if (z > THRESHOLD) {
      if (armed && faceDownSince != null && now - faceDownSince <= FLIP_WINDOW_MS + FACE_DOWN_MIN_MS) {
        if (now - lastTrigger > COOLDOWN_MS) {
          lastTrigger = now
          onFlip()
        }
      }
      faceDownSince = null
      armed = false
      return
    }

    // Промежуточное положение — сбрасываем, если «вниз» затянулось без перехода
    if (faceDownSince != null && now - faceDownSince > FLIP_WINDOW_MS + FACE_DOWN_MIN_MS) {
      faceDownSince = null
      armed = false
    }
  }

  window.addEventListener('devicemotion', handler)
  return () => window.removeEventListener('devicemotion', handler)
}
