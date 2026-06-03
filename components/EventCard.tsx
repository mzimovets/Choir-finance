'use client'

import { useState } from 'react'
import type { ChoirEvent } from '@/lib/types'
import { plural, SINGER } from '@/lib/plural'

interface Props {
  event: ChoirEvent
  onEdit: () => void
  onDelete: () => void
}

function IconArrow({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
    >
      <path
        fillRule="evenodd" clipRule="evenodd"
        d="M4.43057 8.51192C4.70014 8.19743 5.17361 8.161 5.48811 8.43057L12 14.0122L18.5119 8.43057C18.8264 8.16101 19.2999 8.19743 19.5695 8.51192C19.839 8.82642 19.8026 9.29989 19.4881 9.56946L12.4881 15.5695C12.2072 15.8102 11.7928 15.8102 11.5119 15.5695L4.51192 9.56946C4.19743 9.29989 4.161 8.82641 4.43057 8.51192Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconPen() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        fillRule="evenodd" clipRule="evenodd"
        d="M14.7566 2.62145C16.5852 0.792851 19.55 0.792851 21.3786 2.62145C23.2072 4.45005 23.2072 7.41479 21.3786 9.24339L11.8933 18.7287C11.3514 19.2706 11.0323 19.5897 10.6774 19.8665C10.2592 20.1927 9.80655 20.4725 9.32766 20.7007C8.92136 20.8943 8.49334 21.037 7.76623 21.2793L4.43511 22.3897L3.63303 22.6571C2.98247 22.8739 2.26522 22.7046 1.78032 22.2197C1.29542 21.7348 1.1261 21.0175 1.34296 20.367L2.72068 16.2338C2.96303 15.5067 3.10568 15.0787 3.29932 14.6724C3.52755 14.1935 3.80727 13.7409 4.13354 13.3226C4.41035 12.9677 4.72939 12.6487 5.27137 12.1067L14.7566 2.62145ZM4.40051 20.8201L7.24203 19.8729C8.03314 19.6092 8.36927 19.4958 8.68233 19.3466C9.06287 19.1653 9.42252 18.943 9.75492 18.6837C10.0284 18.4704 10.2801 18.2205 10.8698 17.6308L18.4393 10.0614C17.6506 9.78321 16.6346 9.26763 15.6835 8.31651C14.7324 7.36538 14.2168 6.34939 13.9387 5.56075L6.36917 13.1302C5.77951 13.7199 5.52959 13.9716 5.3163 14.2451C5.05704 14.5775 4.83476 14.9371 4.65341 15.3177C4.50421 15.6307 4.3908 15.9669 4.12709 16.758L3.17992 19.5995L4.40051 20.8201ZM15.1554 4.34404C15.1896 4.519 15.2474 4.75684 15.3438 5.03487C15.561 5.66083 15.9712 6.48288 16.7442 7.25585C17.5171 8.02881 18.3392 8.43903 18.9651 8.6562C19.2432 8.75266 19.481 8.81046 19.656 8.84466L20.3179 8.18272C21.5607 6.93991 21.5607 4.92492 20.3179 3.68211C19.0751 2.4393 17.0601 2.4393 15.8173 3.68211L15.1554 4.34404Z"
        fill="currentColor"
      />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 2.75C11.0215 2.75 10.1871 3.37503 9.87787 4.24993C9.73983 4.64047 9.31134 4.84517 8.9208 4.70713C8.53026 4.56909 8.32557 4.1406 8.46361 3.75007C8.97804 2.29459 10.3661 1.25 12 1.25C13.634 1.25 15.022 2.29459 15.5365 3.75007C15.6745 4.1406 15.4698 4.56909 15.0793 4.70713C14.6887 4.84517 14.2602 4.64047 14.1222 4.24993C13.813 3.37503 12.9785 2.75 12 2.75Z" fill="currentColor"/>
      <path d="M2.75 6C2.75 5.58579 3.08579 5.25 3.5 5.25H20.5001C20.9143 5.25 21.2501 5.58579 21.2501 6C21.2501 6.41421 20.9143 6.75 20.5001 6.75H3.5C3.08579 6.75 2.75 6.41421 2.75 6Z" fill="currentColor"/>
      <path d="M5.91508 8.45011C5.88753 8.03681 5.53015 7.72411 5.11686 7.75166C4.70356 7.77921 4.39085 8.13659 4.41841 8.54989L4.88186 15.5016C4.96735 16.7844 5.03641 17.8205 5.19838 18.6336C5.36678 19.4789 5.6532 20.185 6.2448 20.7384C6.83639 21.2919 7.55994 21.5307 8.41459 21.6425C9.23663 21.75 10.2751 21.75 11.5607 21.75H12.4395C13.7251 21.75 14.7635 21.75 15.5856 21.6425C16.4402 21.5307 17.1638 21.2919 17.7554 20.7384C18.347 20.185 18.6334 19.4789 18.8018 18.6336C18.9637 17.8205 19.0328 16.7844 19.1183 15.5016L19.5818 8.54989C19.6093 8.13659 19.2966 7.77921 18.8833 7.75166C18.47 7.72411 18.1126 8.03681 18.0851 8.45011L17.6251 15.3492C17.5353 16.6971 17.4712 17.6349 17.3307 18.3405C17.1943 19.025 17.004 19.3873 16.7306 19.6431C16.4572 19.8988 16.083 20.0647 15.391 20.1552C14.6776 20.2485 13.7376 20.25 12.3868 20.25H11.6134C10.2626 20.25 9.32255 20.2485 8.60915 20.1552C7.91715 20.0647 7.54299 19.8988 7.26957 19.6431C6.99616 19.3873 6.80583 19.025 6.66948 18.3405C6.52891 17.6349 6.46488 16.6971 6.37503 15.3492L5.91508 8.45011Z" fill="currentColor"/>
      <path d="M9.42546 10.2537C9.83762 10.2125 10.2051 10.5132 10.2464 10.9254L10.7464 15.9254C10.7876 16.3375 10.4869 16.7051 10.0747 16.7463C9.66256 16.7875 9.29502 16.4868 9.25381 16.0746L8.75381 11.0746C8.71259 10.6625 9.0133 10.2949 9.42546 10.2537Z" fill="currentColor"/>
      <path d="M15.2464 11.0746C15.2876 10.6625 14.9869 10.2949 14.5747 10.2537C14.1626 10.2125 13.795 10.5132 13.7538 10.9254L13.2538 15.9254C13.2126 16.3375 13.5133 16.7051 13.9255 16.7463C14.3376 16.7875 14.7051 16.4868 14.7464 16.0746L15.2464 11.0746Z" fill="currentColor"/>
    </svg>
  )
}

export function EventCard({ event, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)

  const total = event.attendances.reduce((s, a) => s + (a.basePrice || 0) + (a.bonus || 0), 0)
  const count = event.attendances.length

  return (
    <div className="warm-card overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-3.5 text-left active:bg-warm-50 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-slab font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg, #bd9673, #7d5e42)' }}
        >
          {count}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-slab font-semibold text-warm-900 text-sm">{event.eventType}</p>
          <p className="text-xs text-warm-400 mt-0.5">{count} {plural(count, SINGER)}</p>
        </div>
        <p className="text-base font-slab font-bold text-warm-800 shrink-0">
          {total.toLocaleString('ru-RU')} ₽
        </p>
        <span className="text-warm-400 shrink-0 ml-1">
          <IconArrow expanded={expanded} />
        </span>
      </button>

      {/* Actions */}
      <div className="flex border-t border-warm-100">
        <button
          onClick={onEdit}
          className="flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-slab font-semibold text-warm-600 border-r border-warm-100 active:bg-warm-50 transition-colors"
        >
          <IconPen />
          Изменить
        </button>
        <button
          onClick={onDelete}
          className="flex-1 py-2 flex items-center justify-center gap-1.5 text-xs font-slab font-semibold text-red-500 active:bg-red-50 transition-colors"
        >
          <IconTrash />
          Удалить
        </button>
      </div>

      {/* Expanded list */}
      {expanded && count > 0 && (
        <div className="border-t border-warm-100">
          {event.attendances.map((a, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-2 border-b border-warm-50 last:border-b-0"
            >
              <span className="text-sm text-warm-800">{a.memberName}</span>
              <span className="text-sm font-medium text-warm-700 tabular-nums">
                {a.basePrice.toLocaleString('ru-RU')}
                {a.bonus > 0 && (
                  <span className="text-green-600 ml-1">+{a.bonus.toLocaleString('ru-RU')}</span>
                )}
                {' '}₽
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
