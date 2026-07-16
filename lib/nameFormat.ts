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
 * Короткий формат: "Иванов И." или "Иванов И.А." (если есть отчество).
 * patronymicInitial — отдельный инициал отчества (1 буква). Если не передан,
 * третья часть имени (если есть) используется автоматически.
 */
export function shortName(fullName: string, patronymicInitial?: string): string {
  const parts = (fullName || '').trim().split(/\s+/)
  const lastName   = parts[0] || ''
  const firstName  = parts[1] || ''
  const thirdPart  = parts[2] || ''
  if (!firstName) return lastName
  const patr = (patronymicInitial || thirdPart || '').trim()
  if (!patr) return `${lastName} ${firstName[0]}.`
  return `${lastName} ${firstName[0]}.${patr[0].toUpperCase()}.`
}

/**
 * Строит memberName для хранения в Attendance:
 * "Зимовец Максим" + patronymic "А" → "Зимовец Максим А"
 */
export function buildMemberName(name: string, patronymic?: string): string {
  if (!patronymic?.trim()) return name
  return `${name} ${patronymic.trim()[0].toUpperCase()}`
}
