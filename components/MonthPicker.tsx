"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const MONTHS_SHORT = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
];

interface Props {
  value: string;       // "YYYY-MM"
  onChange: (month: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function MonthPicker({ value, onChange, onClose, anchorRef }: Props) {
  const [year, setYear] = useState(() => Number(value.split("-")[0]));
  const [activeMonths, setActiveMonths] = useState<Set<string>>(new Set());
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const selectedYear = Number(value.split("-")[0]);
  const selectedMonth = Number(value.split("-")[1]);

  // Position below the anchor button
  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  }, [anchorRef]);

  useEffect(() => {
    fetch(`/api/events/active-months?year=${year}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((months: string[]) => setActiveMonths(new Set(months)));
  }, [year]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function select(m: number) {
    onChange(`${year}-${String(m).padStart(2, "0")}`);
    onClose();
  }

  const picker = (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-white border border-warm-200 rounded-2xl shadow-xl p-3"
        style={{ top: pos.top, right: pos.right, minWidth: 228 }}
      >
        {/* Year navigation */}
        <div className="flex items-center justify-between mb-2 px-1">
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg text-warm-500 hover:bg-warm-50 transition-colors"
            onClick={() => setYear((y) => y - 1)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M15.0303 6.46967C15.3232 6.76256 15.3232 7.23744 15.0303 7.53033L11.3107 11.25H19.5C20.4142 11.25 20.75 11.5858 20.75 12C20.75 12.4142 20.4142 12.75 19.5 12.75H11.3107L15.0303 16.4697C15.3232 16.7626 15.3232 17.2374 15.0303 17.5303C14.7374 17.8232 14.2626 17.8232 13.9697 17.5303L8.96967 12.5303C8.67678 12.2374 8.67678 11.7626 8.96967 11.4697L13.9697 6.46967C14.2626 6.17678 14.7374 6.17678 15.0303 6.46967Z" fill="currentColor"/>
            </svg>
          </button>
          <span className="font-slab font-bold text-warm-900 text-sm select-none">{year}</span>
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg text-warm-500 hover:bg-warm-50 transition-colors"
            onClick={() => setYear((y) => y + 1)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M8.96967 6.46967C9.26256 6.17678 9.73744 6.17678 10.0303 6.46967L15.0303 11.4697C15.3232 11.7626 15.3232 12.2374 15.0303 12.5303L10.0303 17.5303C9.73744 17.8232 9.26256 17.8232 8.96967 17.5303C8.67678 17.2374 8.67678 16.7626 8.96967 16.4697L12.6893 12.75H4.5C4.08579 12.75 3.75 12.4142 3.75 12C3.75 11.5858 4.08579 11.25 4.5 11.25H12.6893L8.96967 7.53033C8.67678 7.23744 8.67678 6.76256 8.96967 6.46967Z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-4 gap-1">
          {MONTHS_SHORT.map((name, i) => {
            const m = i + 1;
            const key = `${year}-${String(m).padStart(2, "0")}`;
            const isSelected = year === selectedYear && m === selectedMonth;
            const hasDot = activeMonths.has(key);

            return (
              <button
                key={m}
                onClick={() => select(m)}
                className="relative flex flex-col items-center justify-center rounded-xl py-2.5 transition-colors active:opacity-70"
                style={{
                  background: isSelected ? "#7d5e42" : "transparent",
                  color: isSelected ? "#fff" : "#2c1a0e",
                }}
              >
                {hasDot && (
                  <span
                    style={{
                      position: "absolute",
                      top: 4,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: isSelected ? "rgba(255,255,255,0.7)" : "#9b7653",
                      pointerEvents: "none",
                    }}
                  />
                )}
                <span className="text-xs font-slab font-semibold leading-none">{name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(picker, document.body);
}

/* ── Иконка календаря (та же что в разделе «Табель») ─────────────── */
export function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 14C17.5523 14 18 13.5523 18 13C18 12.4477 17.5523 12 17 12C16.4477 12 16 12.4477 16 13C16 13.5523 16.4477 14 17 14Z" fill="#9b7653"/>
      <path d="M17 18C17.5523 18 18 17.5523 18 17C18 16.4477 17.5523 16 17 16C16.4477 16 16 16.4477 16 17C16 17.5523 16.4477 18 17 18Z" fill="#9b7653"/>
      <path d="M13 13C13 13.5523 12.5523 14 12 14C11.4477 14 11 13.5523 11 13C11 12.4477 11.4477 12 12 12C12.5523 12 13 12.4477 13 13Z" fill="#9b7653"/>
      <path d="M13 17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17C11 16.4477 11.4477 16 12 16C12.5523 16 13 16.4477 13 17Z" fill="#9b7653"/>
      <path d="M7 14C7.55229 14 8 13.5523 8 13C8 12.4477 7.55229 12 7 12C6.44772 12 6 12.4477 6 13C6 13.5523 6.44772 14 7 14Z" fill="#9b7653"/>
      <path d="M7 18C7.55229 18 8 17.5523 8 17C8 16.4477 7.55229 16 7 16C6.44772 16 6 16.4477 6 17C6 17.5523 6.44772 18 7 18Z" fill="#9b7653"/>
      <path fillRule="evenodd" clipRule="evenodd" d="M7 1.75C7.41421 1.75 7.75 2.08579 7.75 2.5V3.26272C8.412 3.24999 9.14133 3.24999 9.94346 3.25H14.0564C14.8586 3.24999 15.588 3.24999 16.25 3.26272V2.5C16.25 2.08579 16.5858 1.75 17 1.75C17.4142 1.75 17.75 2.08579 17.75 2.5V3.32709C18.0099 3.34691 18.2561 3.37182 18.489 3.40313C19.6614 3.56076 20.6104 3.89288 21.3588 4.64124C22.1071 5.38961 22.4392 6.33855 22.5969 7.51098C22.75 8.65018 22.75 10.1058 22.75 11.9435V14.0564C22.75 15.8941 22.75 17.3498 22.5969 18.489C22.4392 19.6614 22.1071 20.6104 21.3588 21.3588C20.6104 22.1071 19.6614 22.4392 18.489 22.5969C17.3498 22.75 15.8942 22.75 14.0565 22.75H9.94359C8.10585 22.75 6.65018 22.75 5.51098 22.5969C4.33856 22.4392 3.38961 22.1071 2.64124 21.3588C1.89288 20.6104 1.56076 19.6614 1.40314 18.489C1.24997 17.3498 1.24998 15.8942 1.25 14.0564V11.9436C1.24998 10.1058 1.24997 8.65019 1.40314 7.51098C1.56076 6.33855 1.89288 5.38961 2.64124 4.64124C3.38961 3.89288 4.33856 3.56076 5.51098 3.40313C5.7439 3.37182 5.99006 3.34691 6.25 3.32709V2.5C6.25 2.08579 6.58579 1.75 7 1.75ZM5.71085 4.88976C4.70476 5.02502 4.12511 5.27869 3.7019 5.7019C3.27869 6.12511 3.02502 6.70476 2.88976 7.71085C2.86685 7.88123 2.8477 8.06061 2.83168 8.25H21.1683C21.1523 8.06061 21.1331 7.88124 21.1102 7.71085C20.975 6.70476 20.7213 6.12511 20.2981 5.7019C19.8749 5.27869 19.2952 5.02502 18.2892 4.88976C17.2615 4.75159 15.9068 4.75 14 4.75H10C8.09318 4.75 6.73851 4.75159 5.71085 4.88976ZM2.75 12C2.75 11.146 2.75032 10.4027 2.76309 9.75H21.2369C21.2497 10.4027 21.25 11.146 21.25 12V14C21.25 15.9068 21.2484 17.2615 21.1102 18.2892C20.975 19.2952 20.7213 19.8749 20.2981 20.2981C19.8749 20.7213 19.2952 20.975 18.2892 21.1102C17.2615 21.2484 15.9068 21.25 14 21.25H10C8.09318 21.25 6.73851 21.2484 5.71085 21.1102C4.70476 20.975 4.12511 20.7213 3.7019 20.2981C3.27869 19.8749 3.02502 19.2952 2.88976 18.2892C2.75159 17.2615 2.75 15.9068 2.75 14V12Z" fill="#9b7653"/>
    </svg>
  );
}
