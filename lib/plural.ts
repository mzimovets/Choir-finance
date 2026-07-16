/**
 * Возвращает правильную форму слова в зависимости от числа.
 * forms: [1 певчий, 2 певчих, 5 певчих]
 */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = Math.abs(n) % 10
  const mod100 = Math.abs(n) % 100
  if (mod100 >= 11 && mod100 <= 19) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]
  return forms[2]
}

// Готовые склонения
export const SINGER      = ['певчий',     'певчих',      'певчих']      as [string, string, string]
export const PERSON      = ['человек',    'человека',    'человек']     as [string, string, string]
export const EVENT       = ['выход',      'выхода',      'выходов']     as [string, string, string]
export const PARTICIPANT = ['участник',   'участника',   'участников']  as [string, string, string]
