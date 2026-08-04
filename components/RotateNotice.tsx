/**
 * Просьба вернуть телефон в вертикальное положение.
 *
 * Видимостью управляет CSS (см. .rotate-notice в globals.css): показывается
 * только на узких экранах в горизонтальном положении, то есть на телефонах.
 * На планшетах высота в горизонте заметно больше — там ничего не появляется
 * и приложением можно пользоваться в любом положении.
 */
export function RotateNotice() {
  return (
    <div className="rotate-notice">
      <svg width="54" height="54" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M9.5 3.25h5A2.25 2.25 0 0 1 16.75 5.5v13a2.25 2.25 0 0 1-2.25 2.25h-5A2.25 2.25 0 0 1 7.25 18.5v-13A2.25 2.25 0 0 1 9.5 3.25Z"
          stroke="currentColor" strokeWidth="1.5"
        />
        <path d="M10.75 17.75h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M3.5 9.5a8.5 8.5 0 0 1 2.2-3.4M20.5 14.5a8.5 8.5 0 0 1-2.2 3.4"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        />
      </svg>
      <p>Поверните телефон</p>
      <span>Табель рассчитан на вертикальный экран</span>
    </div>
  )
}
