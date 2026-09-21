import crypto from 'crypto'

/**
 * Шифрование данных на диске. Работает на границе базы: остальной код
 * (роуты, экспорт, клиент) видит только обычные расшифрованные значения —
 * шифротекст существует исключительно в файлах data/*.db.
 *
 * Ключ — DATA_ENC_KEY, base64 от 32 случайных байт. Если сервер снова
 * получат под root во время его работы, ключ всё равно можно достать из
 * памяти процесса — это защищает не от такой атаки, а от случаев, когда
 * получают доступ только к файлам (скопированная папка data/, бэкап,
 * утечка при неверных правах на диске), не к работающему приложению.
 */

const ALGO = 'aes-256-gcm'
const PREFIX = 'enc1:'

function getKey(): Buffer {
  const raw = process.env.DATA_ENC_KEY
  if (!raw) throw new Error('DATA_ENC_KEY environment variable is not set')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('DATA_ENC_KEY must be a base64-encoded 32-byte key')
  return key
}

/** Пустую строку не шифруем — экономим и не плодим лишние вызовы crypto */
export function encryptText(plain: string): string {
  if (plain === '') return ''
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64')
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

/** Значения без метки шифрования возвращаются как есть — данные до миграции */
export function decryptText(value: string): string {
  if (!isEncrypted(value)) return value
  const raw = Buffer.from(value.slice(PREFIX.length), 'base64')
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const data = raw.subarray(28)
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(data), decipher.final()])
  return dec.toString('utf8')
}

export function encryptNumber(n: number): string {
  return encryptText(String(n))
}

export function decryptNumber(value: string): number {
  return Number(decryptText(value))
}
