const HASH_KEY = 'chorus:pin-hash'
const HASH_VER_KEY = 'chorus:pin-hash-ver'
const SESSION_KEY = 'chorus:pin-verified'
const CURRENT_VER = '2' // increment when hash algorithm changes

export function markPinVerified(): void {
  sessionStorage.setItem(SESSION_KEY, '1')
}

export function isPinVerified(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

export function clearPinVerified(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

// Простой djb2-хэш — не требует HTTPS, достаточен для локального PIN
function hashPin(pin: string): string {
  const str = 'chorus-pin:' + pin
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h, 33) ^ str.charCodeAt(i)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function setPinHash(pin: string): void {
  localStorage.setItem(HASH_KEY, hashPin(pin))
  localStorage.setItem(HASH_VER_KEY, CURRENT_VER)
}

export function verifyPin(pin: string): boolean {
  const stored = localStorage.getItem(HASH_KEY)
  if (!stored) return false
  return hashPin(pin) === stored
}

export function hasPin(): boolean {
  if (typeof window === 'undefined') return false
  // If hash was saved with an old algorithm version — treat as no PIN
  if (localStorage.getItem(HASH_VER_KEY) !== CURRENT_VER) {
    localStorage.removeItem(HASH_KEY)
    localStorage.removeItem(HASH_VER_KEY)
    return false
  }
  return !!localStorage.getItem(HASH_KEY)
}

export function clearPin(): void {
  localStorage.removeItem(HASH_KEY)
  localStorage.removeItem(HASH_VER_KEY)
}
