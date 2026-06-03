/**
 * Разбивает полное имя "Фамилия Имя [Отчество]" на части.
 * Первое слово — фамилия, остальное — имя (с отчеством).
 */
export function splitName(fullName: string): { lastName: string; firstName: string } {
  const parts = (fullName || '').trim().split(/\s+/)
  return {
    lastName: parts[0] || '',
    firstName: parts.slice(1).join(' '),
  }
}

/**
 * Короткий формат: "Иванов И." — используется в таблицах, Excel, событиях.
 */
export function shortName(fullName: string): string {
  const { lastName, firstName } = splitName(fullName)
  if (!firstName) return lastName
  return `${lastName} ${firstName[0]}.`
}
