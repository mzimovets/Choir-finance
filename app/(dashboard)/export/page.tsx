"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Spinner } from "@heroui/react";
import { useSession } from "@/hooks/useSession";
import { PageHeader } from "@/components/PageHeader";
import type { ChoirEvent, Member } from "@/lib/types";
import { plural, EVENT } from "@/lib/plural";
import { shortName } from "@/lib/nameFormat";
import { IconEmpty } from "@/components/IconEmpty";
import { MonthPicker, IconCalendar } from "@/components/MonthPicker";
import { onDataChanged } from "@/lib/dataSignal";

function monthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const MONTHS_UPPER = [
  "ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ",
  "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ",
];

/* ── Размеры колонок (px) ── */
const COL_NUM  = 34;   // №
const COL_NAME = 128;  // Фамилия И.
const COL_EVT  = 64;   // каждый выход
const COL_SUM  = 72;   // Итого

/* ── Цвета (тёплая тема) ── */
const C_BG       = "#ffffff";
const C_HEAD_BG  = "#fdf8f4";
const C_BORDER   = "#f0e8df";
const C_SEP      = "#d4c0ac";   // единый цвет вертикальных разграничителей
const C_TOTAL_BG = "#c9a882";
const C_TEXT     = "#2c1a0e";
const C_MUTED    = "#9b7653";
const C_ACCENT   = "#7d5e42";

export default function ExportPage() {
  const { session } = useSession();
  const [month, setMonth] = useState(monthStr);
  const [events, setEvents] = useState<ChoirEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingXlsx, setDownloadingXlsx] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFsBtn, setShowFsBtn] = useState(false);
  const [memberModal, setMemberModal] = useState<Member | null>(null);
  const [memberActiveTab, setMemberActiveTab] = useState<"xlsx" | "docx">("xlsx");
  const [dlMemberXlsx, setDlMemberXlsx] = useState(false);
  const [dlMemberDocx, setDlMemberDocx] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupModal, setGroupModal] = useState(false);
  const [snapshotIds, setSnapshotIds] = useState<Set<string>>(new Set());
  const [exportTitle, setExportTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [docxTitle, setDocxTitle] = useState("");
  const [editingDocxTitle, setEditingDocxTitle] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<"xlsx" | "docx">("xlsx");
  const docxTitleInputRef = useRef<HTMLInputElement>(null);
  const [dlGroupXlsx, setDlGroupXlsx] = useState(false);
  const [dlGroupDocx, setDlGroupDocx] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [groupXlsxTitle, setGroupXlsxTitle] = useState("");
  const [groupDocxTitle, setGroupDocxTitle] = useState("");
  const [groupActiveTab, setGroupActiveTab] = useState<"xlsx" | "docx">("xlsx");
  const calBtnRef = useRef<HTMLButtonElement>(null);
  const fsBtnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapStartRef = useRef<{ x: number; y: number } | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [y, m] = month.split("-").map(Number);
  const monthLabel = `${MONTHS_RU[m - 1]} ${y}`;

  const load = useCallback(async () => {
    setLoading(true);
    const [evRes, mbRes] = await Promise.all([
      fetch(`/api/events?month=${month}`),
      fetch("/api/members"),
    ]);
    if (evRes.ok) setEvents(await evRes.json());
    if (mbRes.ok) setMembers(await mbRes.json());
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => onDataChanged(load), [load]);
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  useEffect(() => () => { if (fsBtnTimeoutRef.current) clearTimeout(fsBtnTimeoutRef.current); }, []);

  function handleTablePointerDown(e: React.PointerEvent) {
    tapStartRef.current = { x: e.clientX, y: e.clientY };
  }

  function handleTablePointerUp(e: React.PointerEvent) {
    if (!tapStartRef.current) return;
    const dx = Math.abs(e.clientX - tapStartRef.current.x);
    const dy = Math.abs(e.clientY - tapStartRef.current.y);
    tapStartRef.current = null;
    if (dx < 6 && dy < 6) {
      setShowFsBtn(true);
      if (fsBtnTimeoutRef.current) clearTimeout(fsBtnTimeoutRef.current);
      fsBtnTimeoutRef.current = setTimeout(() => setShowFsBtn(false), 4000);
    }
  }

  function changeMonth(delta: number) {
    const [ym, mm] = month.split("-").map(Number);
    const d = new Date(ym, mm - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  async function downloadFile(url: string, fallback: string) {
    const res = await fetch(url);
    if (!res.ok) return;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    const disp = res.headers.get("Content-Disposition") || "";
    const match = disp.match(/filename\*=UTF-8''(.+)/);
    a.download = match ? decodeURIComponent(match[1]) : fallback;
    a.click();
    URL.revokeObjectURL(objectUrl);
  }

  function toggleMember(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleGroupXlsx() {
    if (selectedIds.size === 0) return;
    setDlGroupXlsx(true);
    const ids = Array.from(selectedIds).join(",");
    const choirLabel = session?.choirType === 'festive' ? 'ПРАЗДНИЧНОГО' : 'БУДНЕГО';
    const defaultXlsx = `ГРАФИК ПОСЕЩЕНИЯ ПЕВЧИХ ${choirLabel} ХОРА ЗА ${MONTHS_UPPER[m - 1]} ${y} Г.`;
    const title = groupXlsxTitle || defaultXlsx;
    await downloadFile(`/api/export?month=${month}&memberIds=${ids}&title=${encodeURIComponent(title)}`, `Табель_группа_${month}.xlsx`);
    setDlGroupXlsx(false);
  }

  async function handleGroupDocx() {
    if (selectedIds.size === 0) return;
    setDlGroupDocx(true);
    const ids = Array.from(selectedIds).join(",");
    const choirLabel = session?.choirType === 'festive' ? 'ПРАЗДНИЧНОГО' : 'БУДНЕГО';
    const defaultDocx = `ИТОГОВАЯ ВЕДОМОСТЬ ПЕВЧИХ ${choirLabel} ХОРА ${MONTHS_UPPER[m - 1]} ${y} Г.`;
    const title = groupDocxTitle || defaultDocx;
    await downloadFile(`/api/export-docx?month=${month}&memberIds=${ids}&title=${encodeURIComponent(title)}`, `Ведомость_группа_${month}.docx`);
    setDlGroupDocx(false);
  }

  async function handleExportXlsx() {
    setDownloadingXlsx(true);
    const choirLabel = session?.choirType === 'festive' ? 'ПРАЗДНИЧНОГО' : 'БУДНЕГО';
    const defaultXlsx = `ГРАФИК ПОСЕЩЕНИЯ ПЕВЧИХ ${choirLabel} ХОРА ЗА ${MONTHS_UPPER[m - 1]} ${y} Г.`;
    const title = exportTitle || defaultXlsx;
    await downloadFile(`/api/export?month=${month}&title=${encodeURIComponent(title)}`, `export_${month}.xlsx`);
    setDownloadingXlsx(false);
  }

  async function handleExportDocx() {
    setDownloadingDocx(true);
    const choirLabel = session?.choirType === 'festive' ? 'ПРАЗДНИЧНОГО' : 'БУДНЕГО';
    const defaultDocx = `ИТОГОВАЯ ВЕДОМОСТЬ ПО ВОЗНАГРАЖДЕНИЮ ${choirLabel} ХОРА ${MONTHS_UPPER[m - 1]} ${y} Г.`;
    const title = docxTitle || defaultDocx;
    await downloadFile(`/api/export-docx?month=${month}&title=${encodeURIComponent(title)}`, `export_${month}.docx`);
    setDownloadingDocx(false);
  }

  async function handleMemberXlsx() {
    if (!memberModal) return;
    setDlMemberXlsx(true);
    await downloadFile(`/api/export?month=${month}&memberId=${memberModal._id}`, `export_${month}_member.xlsx`);
    setDlMemberXlsx(false);
  }

  async function handleMemberDocx() {
    if (!memberModal) return;
    setDlMemberDocx(true);
    await downloadFile(`/api/export-docx?month=${month}&memberId=${memberModal._id}`, `export_${month}_member.docx`);
    setDlMemberDocx(false);
  }

  async function handleDeleteMonth() {
    setDeleting(true);
    await fetch(`/api/events?month=${month}`, { method: 'DELETE' });
    setDeleting(false);
    setShowDeleteConfirm(false);
    load();
  }

  /* Нормализуем дату: локальный YYYY-MM-DD */
  function datePart(d: string) {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  }

  /* Краткий формат даты для заголовка: "1.7" / "30.6" */
  function dayLabel(isoDate: string) {
    const [, mo, d] = isoDate.split('T')[0].split('-').map(Number);
    return `${d}.${mo}`;
  }

  /* ── Данные таблицы ── */
  const sortedEvents = [...events].sort((a, b) => {
    const da = datePart(a.date), db = datePart(b.date);
    if (da !== db) return da.localeCompare(db);
    const oa = a.order ?? Infinity, ob = b.order ?? Infinity;
    if (oa !== ob) return oa - ob;
    return (a.createdAt || "").localeCompare(b.createdAt || "");
  });

  /* Группы событий одного дня для объединения ячеек заголовка */
  type DateGroup = { date: string; label: string; count: number };
  const dateGroups: DateGroup[] = [];
  sortedEvents.forEach((ev) => {
    const key = datePart(ev.date);
    if (dateGroups.length && dateGroups[dateGroups.length - 1].date === key) {
      dateGroups[dateGroups.length - 1].count++;
    } else {
      dateGroups.push({ date: key, label: dayLabel(ev.date), count: 1 });
    }
  });

  const activeMembers = members
    .filter((mb) => mb.isActive)
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const totalAmount = events.reduce(
    (sum, ev) => sum + ev.attendances.reduce((s, a) => s + a.basePrice + a.bonus - (a.fine || 0), 0),
    0,
  );

  /* ── Таблица ── */
  const frozenW = COL_NUM + COL_NAME; // 162px — ширина закреплённой зоны

  /* Стили закреплённых колонок */
  const stickyBase: React.CSSProperties = {
    position: "sticky",
    zIndex: 2,
    background: C_BG,
  };
  // boxShadow вместо borderRight — иначе граница «пропадает» при скролле (border-collapse)
  const stickyNum:  React.CSSProperties = { ...stickyBase, left: 0,       minWidth: COL_NUM,  maxWidth: COL_NUM,
    boxShadow: `inset -1px 0 0 ${C_SEP}`,
  };
  const stickyName: React.CSSProperties = { ...stickyBase, left: COL_NUM, minWidth: COL_NAME, maxWidth: COL_NAME,
    boxShadow: `inset -1px 0 0 ${C_SEP}`,
  };

  const stickyNumH:  React.CSSProperties = { ...stickyNum,  background: C_HEAD_BG, zIndex: 3 };
  const stickyNameH: React.CSSProperties = { ...stickyName, background: C_HEAD_BG, zIndex: 3 };

  // Закреплённая колонка «Итого» справа
  const stickySum:  React.CSSProperties = { ...stickyBase, right: 0, minWidth: COL_SUM, maxWidth: COL_SUM,
    boxShadow: `inset 1px 0 0 ${C_SEP}`,
    background: "#f5ece3",
  };
  const stickySumH: React.CSSProperties = { ...stickySum,  background: C_HEAD_BG, zIndex: 3 };

  const tdBase: React.CSSProperties = {
    padding: "7px 6px",
    borderBottom: `1px solid ${C_BORDER}`,
    fontSize: 13,
    color: C_TEXT,
    textAlign: "center",
    whiteSpace: "nowrap",
  };
  const thBase: React.CSSProperties = {
    ...tdBase,
    background: C_HEAD_BG,
    color: C_ACCENT,
    fontFamily: "'Roboto Slab', serif",
    fontWeight: 600,
    fontSize: 11,
    borderBottom: `1px solid #e5d9cc`,
    padding: "6px 4px",
  };

  return (
    <div className="max-w-screen-lg mx-auto">
      <PageHeader
        title="Экспорт"
        subtitle={monthLabel}
        right={
          <div className="relative flex items-center gap-0.5">
            <button
              onClick={() => changeMonth(-1)}
              className="w-9 h-9 rounded-xl border border-warm-200 bg-white text-warm-700 flex items-center justify-center active:bg-warm-50 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ transform: "scaleX(-1)" }}>
                <path fillRule="evenodd" clipRule="evenodd" d="M13.9697 6.46967C14.2626 6.17678 14.7374 6.17678 15.0303 6.46967L20.0303 11.4697C20.3232 11.7626 20.3232 12.2374 20.0303 12.5303L15.0303 17.5303C14.7374 17.8232 14.2626 17.8232 13.9697 17.5303C13.6768 17.2374 13.6768 16.7626 13.9697 16.4697L17.6893 12.75L9.5 12.75C8.78668 12.75 7.70002 12.9702 6.81323 13.6087C5.96468 14.2196 5.25 15.2444 5.25 17C5.25 17.4142 4.91421 17.75 4.5 17.75C4.08579 17.75 3.75 17.4142 3.75 17C3.75 14.7556 4.70198 13.2804 5.93677 12.3913C7.13332 11.5298 8.54665 11.25 9.5 11.25L17.6893 11.25L13.9697 7.53033C13.6768 7.23744 13.6768 6.76256 13.9697 6.46967Z" fill="currentColor"/>
              </svg>
            </button>
            <button
              ref={calBtnRef}
              onClick={() => setCalOpen((v) => !v)}
              className="w-9 h-9 rounded-xl border border-warm-200 bg-white flex items-center justify-center active:bg-warm-50 transition-colors"
            >
              <IconCalendar />
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="w-9 h-9 rounded-xl border border-warm-200 bg-white text-warm-700 flex items-center justify-center active:bg-warm-50 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M13.9697 6.46967C14.2626 6.17678 14.7374 6.17678 15.0303 6.46967L20.0303 11.4697C20.3232 11.7626 20.3232 12.2374 20.0303 12.5303L15.0303 17.5303C14.7374 17.8232 14.2626 17.8232 13.9697 17.5303C13.6768 17.2374 13.6768 16.7626 13.9697 16.4697L17.6893 12.75L9.5 12.75C8.78668 12.75 7.70002 12.9702 6.81323 13.6087C5.96468 14.2196 5.25 15.2444 5.25 17C5.25 17.4142 4.91421 17.75 4.5 17.75C4.08579 17.75 3.75 17.4142 3.75 17C3.75 14.7556 4.70198 13.2804 5.93677 12.3913C7.13332 11.5298 8.54665 11.25 9.5 11.25L17.6893 11.25L13.9697 7.53033C13.6768 7.23744 13.6768 6.76256 13.9697 6.46967Z" fill="currentColor"/>
              </svg>
            </button>
            <div className="w-px h-6 bg-warm-400 mx-0.5 opacity-40" />
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={events.length === 0}
              title={`Удалить все выходы за ${monthLabel}`}
              className="w-9 h-9 rounded-xl border border-red-200 bg-red-50 text-red-400 flex items-center justify-center active:bg-red-100 transition-colors disabled:opacity-30"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.75C11.0215 2.75 10.1871 3.37503 9.87787 4.24993C9.73983 4.64047 9.31134 4.84517 8.9208 4.70713C8.53026 4.56909 8.32557 4.1406 8.46361 3.75007C8.97804 2.29459 10.3661 1.25 12 1.25C13.634 1.25 15.022 2.29459 15.5365 3.75007C15.6745 4.1406 15.4698 4.56909 15.0793 4.70713C14.6887 4.84517 14.2602 4.64047 14.1222 4.24993C13.813 3.37503 12.9785 2.75 12 2.75Z" fill="currentColor"/>
                <path d="M2.75 6C2.75 5.58579 3.08579 5.25 3.5 5.25H20.5001C20.9143 5.25 21.2501 5.58579 21.2501 6C21.2501 6.41421 20.9143 6.75 20.5001 6.75H3.5C3.08579 6.75 2.75 6.41421 2.75 6Z" fill="currentColor"/>
                <path d="M5.91508 8.45011C5.88753 8.03681 5.53015 7.72411 5.11686 7.75166C4.70356 7.77921 4.39085 8.13659 4.41841 8.54989L4.88186 15.5016C4.96735 16.7844 5.03641 17.8205 5.19838 18.6336C5.36678 19.4789 5.6532 20.185 6.2448 20.7384C6.83639 21.2919 7.55994 21.5307 8.41459 21.6425C9.23663 21.75 10.2751 21.75 11.5607 21.75H12.4395C13.7251 21.75 14.7635 21.75 15.5856 21.6425C16.4402 21.5307 17.1638 21.2919 17.7554 20.7384C18.347 20.185 18.6334 19.4789 18.8018 18.6336C18.9637 17.8205 19.0328 16.7844 19.1183 15.5016L19.5818 8.54989C19.6093 8.13659 19.2966 7.77921 18.8833 7.75166C18.47 7.72411 18.1126 8.03681 18.0851 8.45011L17.6251 15.3492C17.5353 16.6971 17.4712 17.6349 17.3307 18.3405C17.1943 19.025 17.004 19.3873 16.7306 19.6431C16.4572 19.8988 16.083 20.0647 15.391 20.1552C14.6776 20.2485 13.7376 20.25 12.3868 20.25H11.6134C10.2626 20.25 9.32255 20.2485 8.60915 20.1552C7.91715 20.0647 7.54299 19.8988 7.26957 19.6431C6.99616 19.3873 6.80583 19.025 6.66948 18.3405C6.52891 17.6349 6.46488 16.6971 6.37503 15.3492L5.91508 8.45011Z" fill="currentColor"/>
                <path d="M9.42546 10.2537C9.83762 10.2125 10.2051 10.5132 10.2464 10.9254L10.7464 15.9254C10.7876 16.3375 10.4869 16.7051 10.0747 16.7463C9.66256 16.7875 9.29502 16.4868 9.25381 16.0746L8.75381 11.0746C8.71259 10.6625 9.0133 10.2949 9.42546 10.2537Z" fill="currentColor"/>
                <path d="M15.2464 11.0746C15.2876 10.6625 14.9869 10.2949 14.5747 10.2537C14.1626 10.2125 13.795 10.5132 13.7538 10.9254L13.2538 15.9254C13.2126 16.3375 13.5133 16.7051 13.9255 16.7463C14.3376 16.7875 14.7051 16.4868 14.7464 16.0746L15.2464 11.0746Z" fill="currentColor"/>
              </svg>
            </button>
            <div className="w-px h-6 bg-warm-400 mx-0.5 opacity-40" />
            <button
              onClick={handleExportDocx}
              disabled={downloadingDocx || events.length === 0}
              title={`Скачать Word — ${monthLabel}`}
              className="w-9 h-9 rounded-xl border border-warm-200 bg-white text-warm-600 flex items-center justify-center active:bg-warm-50 transition-colors disabled:opacity-30"
            >
              {downloadingDocx ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M15.6111 1.5837C17.2678 1.34703 18.75 2.63255 18.75 4.30606V5.68256C19.9395 6.31131 20.75 7.56102 20.75 9.00004V19C20.75 21.0711 19.0711 22.75 17 22.75H7C4.92893 22.75 3.25 21.0711 3.25 19V5.00004C3.25 4.99074 3.25017 4.98148 3.2505 4.97227C3.25017 4.95788 3.25 4.94344 3.25 4.92897C3.25 4.02272 3.91638 3.25437 4.81353 3.12621L15.6111 1.5837ZM4.75 6.75004V19C4.75 20.2427 5.75736 21.25 7 21.25H17C18.2426 21.25 19.25 20.2427 19.25 19V9.00004C19.25 7.7574 18.2426 6.75004 17 6.75004H4.75ZM5.07107 5.25004H17.25V4.30606C17.25 3.54537 16.5763 2.96104 15.8232 3.06862L5.02566 4.61113C4.86749 4.63373 4.75 4.76919 4.75 4.92897C4.75 5.10629 4.89375 5.25004 5.07107 5.25004ZM7.25 12C7.25 11.5858 7.58579 11.25 8 11.25H16C16.4142 11.25 16.75 11.5858 16.75 12C16.75 12.4143 16.4142 12.75 16 12.75H8C7.58579 12.75 7.25 12.4143 7.25 12ZM7.25 15.5C7.25 15.0858 7.58579 14.75 8 14.75H13.5C13.9142 14.75 14.25 15.0858 14.25 15.5C14.25 15.9143 13.9142 16.25 13.5 16.25H8C7.58579 16.25 7.25 15.9143 7.25 15.5Z" fill="currentColor"/>
                </svg>
              )}
            </button>
            <button
              onClick={handleExportXlsx}
              disabled={downloadingXlsx || events.length === 0}
              title={`Скачать Excel — ${monthLabel}`}
              className="w-9 h-9 rounded-xl border border-warm-200 bg-white text-warm-600 flex items-center justify-center active:bg-warm-50 transition-colors disabled:opacity-30"
            >
              {downloadingXlsx ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="animate-spin">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12.25 2.83422C11.7896 2.75598 11.162 2.75005 10.0298 2.75005C8.11311 2.75005 6.75075 2.75163 5.71785 2.88987C4.70596 3.0253 4.12453 3.27933 3.7019 3.70195C3.27869 4.12516 3.02502 4.70481 2.88976 5.7109C2.75159 6.73856 2.75 8.09323 2.75 10.0001V14.0001C2.75 15.9069 2.75159 17.2615 2.88976 18.2892C3.02502 19.2953 3.27869 19.8749 3.7019 20.2981C4.12511 20.7214 4.70476 20.975 5.71085 21.1103C6.73851 21.2485 8.09318 21.2501 10 21.2501H14C15.9068 21.2501 17.2615 21.2485 18.2892 21.1103C19.2952 20.975 19.8749 20.7214 20.2981 20.2981C20.7213 19.8749 20.975 19.2953 21.1102 18.2892C21.2484 17.2615 21.25 15.9069 21.25 14.0001V13.5629C21.25 12.0269 21.2392 11.2988 21.0762 10.7501H17.9463C16.8135 10.7501 15.8877 10.7501 15.1569 10.6518C14.3929 10.5491 13.7306 10.3268 13.2019 9.79815C12.6732 9.26945 12.4509 8.60712 12.3482 7.84317C12.25 7.1123 12.25 6.18657 12.25 5.05374V2.83422ZM13.75 3.6095V5.00005C13.75 6.19976 13.7516 7.0241 13.8348 7.64329C13.9152 8.24091 14.059 8.53395 14.2626 8.73749C14.4661 8.94103 14.7591 9.08486 15.3568 9.16521C15.976 9.24846 16.8003 9.25005 18 9.25005H20.0195C19.723 8.9625 19.3432 8.61797 18.85 8.17407L14.8912 4.61117C14.4058 4.17433 14.0446 3.85187 13.75 3.6095ZM10.1755 1.25002C11.5601 1.24965 12.4546 1.24942 13.2779 1.56535C14.1012 1.88129 14.7632 2.47735 15.7873 3.39955C15.8226 3.43139 15.8584 3.46361 15.8947 3.49623L19.8534 7.05912C19.8956 7.09705 19.9372 7.1345 19.9783 7.17149C21.162 8.23614 21.9274 8.92458 22.3391 9.84902C22.7508 10.7734 22.7505 11.8029 22.75 13.3949C22.75 13.4502 22.75 13.5062 22.75 13.5629V14.0565C22.75 15.8942 22.75 17.3499 22.5969 18.4891C22.4392 19.6615 22.1071 20.6104 21.3588 21.3588C20.6104 22.1072 19.6614 22.4393 18.489 22.5969C17.3498 22.7501 15.8942 22.7501 14.0564 22.7501H9.94359C8.10583 22.7501 6.65019 22.7501 5.51098 22.5969C4.33856 22.4393 3.38961 22.1072 2.64124 21.3588C1.89288 20.6104 1.56076 19.6615 1.40314 18.4891C1.24997 17.3499 1.24998 15.8942 1.25 14.0565V9.94363C1.24998 8.10587 1.24997 6.65024 1.40314 5.51103C1.56076 4.33861 1.89288 3.38966 2.64124 2.64129C3.39019 1.89235 4.34232 1.56059 5.51887 1.40313C6.66283 1.25002 8.1257 1.25003 9.97352 1.25005L10.0298 1.25005C10.0789 1.25005 10.1275 1.25004 10.1755 1.25002Z" fill="currentColor"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M7.98705 19.0472C8.27554 19.3177 8.72446 19.3177 9.01296 19.0472L11.013 17.1722C11.3151 16.8889 11.3305 16.4143 11.0472 16.1121C10.7639 15.8099 10.2892 15.7946 9.98705 16.0779L9.25 16.7689V13.5001C9.25 13.0858 8.91421 12.7501 8.5 12.7501C8.08579 12.7501 7.75 13.0858 7.75 13.5001V16.7689L7.01296 16.0779C6.71077 15.7946 6.23615 15.8099 5.95285 16.1121C5.66955 16.4143 5.68486 16.8889 5.98705 17.1722L7.98705 19.0472Z" fill="currentColor"/>
                </svg>
              )}
            </button>
          </div>
        }
      />

      {calOpen && (
        <MonthPicker
          value={month}
          onChange={(m) => { setMonth(m); setCalOpen(false); }}
          onClose={() => setCalOpen(false)}
          anchorRef={calBtnRef}
        />
      )}

      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => { if (!deleting) setShowDeleteConfirm(false); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
              <div className="px-5 pt-6 pb-5 text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-red-400">
                    <path d="M12 2.75C11.0215 2.75 10.1871 3.37503 9.87787 4.24993C9.73983 4.64047 9.31134 4.84517 8.9208 4.70713C8.53026 4.56909 8.32557 4.1406 8.46361 3.75007C8.97804 2.29459 10.3661 1.25 12 1.25C13.634 1.25 15.022 2.29459 15.5365 3.75007C15.6745 4.1406 15.4698 4.56909 15.0793 4.70713C14.6887 4.84517 14.2602 4.64047 14.1222 4.24993C13.813 3.37503 12.9785 2.75 12 2.75Z" fill="currentColor"/>
                    <path d="M2.75 6C2.75 5.58579 3.08579 5.25 3.5 5.25H20.5001C20.9143 5.25 21.2501 5.58579 21.2501 6C21.2501 6.41421 20.9143 6.75 20.5001 6.75H3.5C3.08579 6.75 2.75 6.41421 2.75 6Z" fill="currentColor"/>
                    <path d="M5.91508 8.45011C5.88753 8.03681 5.53015 7.72411 5.11686 7.75166C4.70356 7.77921 4.39085 8.13659 4.41841 8.54989L4.88186 15.5016C4.96735 16.7844 5.03641 17.8205 5.19838 18.6336C5.36678 19.4789 5.6532 20.185 6.2448 20.7384C6.83639 21.2919 7.55994 21.5307 8.41459 21.6425C9.23663 21.75 10.2751 21.75 11.5607 21.75H12.4395C13.7251 21.75 14.7635 21.75 15.5856 21.6425C16.4402 21.5307 17.1638 21.2919 17.7554 20.7384C18.347 20.185 18.6334 19.4789 18.8018 18.6336C18.9637 17.8205 19.0328 16.7844 19.1183 15.5016L19.5818 8.54989C19.6093 8.13659 19.2966 7.77921 18.8833 7.75166C18.47 7.72411 18.1126 8.03681 18.0851 8.45011L17.6251 15.3492C17.5353 16.6971 17.4712 17.6349 17.3307 18.3405C17.1943 19.025 17.004 19.3873 16.7306 19.6431C16.4572 19.8988 16.083 20.0647 15.391 20.1552C14.6776 20.2485 13.7376 20.25 12.3868 20.25H11.6134C10.2626 20.25 9.32255 20.2485 8.60915 20.1552C7.91715 20.0647 7.54299 19.8988 7.26957 19.6431C6.99616 19.3873 6.80583 19.025 6.66948 18.3405C6.52891 17.6349 6.46488 16.6971 6.37503 15.3492L5.91508 8.45011Z" fill="currentColor"/>
                    <path d="M9.42546 10.2537C9.83762 10.2125 10.2051 10.5132 10.2464 10.9254L10.7464 15.9254C10.7876 16.3375 10.4869 16.7051 10.0747 16.7463C9.66256 16.7875 9.29502 16.4868 9.25381 16.0746L8.75381 11.0746C8.71259 10.6625 9.0133 10.2949 9.42546 10.2537Z" fill="currentColor"/>
                    <path d="M15.2464 11.0746C15.2876 10.6625 14.9869 10.2949 14.5747 10.2537C14.1626 10.2125 13.795 10.5132 13.7538 10.9254L13.2538 15.9254C13.2126 16.3375 13.5133 16.7051 13.9255 16.7463C14.3376 16.7875 14.7051 16.4868 14.7464 16.0746L15.2464 11.0746Z" fill="currentColor"/>
                  </svg>
                </div>
                <h2 className="text-base font-slab font-bold text-warm-900 mb-2">Удалить {monthLabel}?</h2>
                <p className="text-sm text-warm-500 leading-relaxed">
                  Все {events.length} {events.length === 1 ? 'выход' : events.length < 5 ? 'выхода' : 'выходов'} за этот месяц будут удалены без возможности восстановления.
                </p>
              </div>
              <div className="flex border-t border-warm-100">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 py-3.5 text-sm font-slab font-semibold text-warm-700 active:bg-warm-50 border-r border-warm-100"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDeleteMonth}
                  disabled={deleting}
                  className="flex-1 py-3.5 text-sm font-slab font-semibold text-red-500 active:bg-red-50 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {deleting && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
                    </svg>
                  )}
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="px-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner color="warning" />
          </div>
        ) : events.length === 0 ? (
          <>
            <div className="warm-card p-8 text-center mb-4">
              <div className="flex justify-center mb-3 text-warm-300">
                <IconEmpty />
              </div>
              <p className="font-slab font-semibold text-warm-700">Нет данных</p>
              <p className="text-sm text-warm-400 mt-1">За {monthLabel} выходов не найдено</p>
            </div>
            <button
              disabled
              className="w-full py-3.5 rounded-xl text-white font-slab font-semibold text-sm flex items-center justify-center gap-2 opacity-40"
              style={{ background: "linear-gradient(to right, #bd9673, #7d5e42)" }}
            >
              Скачать Excel — {monthLabel}
            </button>
          </>
        ) : (
          <>
            {/* ── Сводка ── */}
            <div className="flex gap-2 mb-3">
              {/* Карточка: кол-во выходов */}
              <div
                className="flex-none flex flex-col justify-center items-center rounded-xl px-4 py-3"
                style={{ background: "#f5ece3", border: "1px solid #e8d6c5", minWidth: 90 }}
              >
                <span className="font-slab font-bold text-2xl text-warm-900 tabular-nums leading-none">
                  {events.length}
                </span>
                <span className="text-xs text-warm-500 font-slab mt-1">
                  {plural(events.length, EVENT)}
                </span>
              </div>
              {/* Карточка: общая сумма (растянутая) */}
              <div
                className="flex-1 flex flex-col justify-center items-end rounded-xl px-5 py-3"
                style={{ background: "linear-gradient(135deg, #c4a07a 0%, #8f6540 100%)", border: "1px solid #b08a5e" }}
              >
                <span className="font-slab font-bold tabular-nums leading-none text-white"
                  style={{ fontSize: totalAmount >= 100000 ? 22 : 26 }}>
                  {totalAmount.toLocaleString("ru-RU")} ₽
                </span>
                <span className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Roboto Slab', serif" }}>
                  общая сумма
                </span>
              </div>
            </div>

            {/* ── Таблица ── */}
            <div
              className={isFullscreen ? "fixed inset-0 z-[51] flex flex-col" : "relative mb-4"}
              style={isFullscreen ? { background: "#fdf8f4" } : undefined}
            >
              {/* Кнопка выбора группы — появляется по тапу, остаётся при активном режиме */}
              <button
                onClick={() => { setSelectionMode(true); }}
                title="Выбрать группу"
                className="absolute z-[15] w-9 h-9 rounded-xl border bg-white/90 flex items-center justify-center transition-all duration-300"
                style={{
                  top: 10, left: 10,
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                  borderColor: selectionMode ? C_ACCENT : "#e5d8cc",
                  color: selectionMode ? C_ACCENT : "#9b7653",
                  opacity: (showFsBtn || selectionMode) ? 1 : 0,
                  pointerEvents: selectionMode ? "none" : (showFsBtn ? "auto" : "none"),
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M9 1.25C6.37665 1.25 4.25 3.37665 4.25 6C4.25 8.62335 6.37665 10.75 9 10.75C11.6234 10.75 13.75 8.62335 13.75 6C13.75 3.37665 11.6234 1.25 9 1.25ZM5.75 6C5.75 4.20507 7.20507 2.75 9 2.75C10.7949 2.75 12.25 4.20507 12.25 6C12.25 7.79493 10.7949 9.25 9 9.25C7.20507 9.25 5.75 7.79493 5.75 6Z" fill="currentColor"/>
                  <path d="M15 2.25C14.5858 2.25 14.25 2.58579 14.25 3C14.25 3.41421 14.5858 3.75 15 3.75C16.2426 3.75 17.25 4.75736 17.25 6C17.25 7.24264 16.2426 8.25 15 8.25C14.5858 8.25 14.25 8.58579 14.25 9C14.25 9.41421 14.5858 9.75 15 9.75C17.0711 9.75 18.75 8.07107 18.75 6C18.75 3.92893 17.0711 2.25 15 2.25Z" fill="currentColor"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M3.67815 13.5204C5.07752 12.7208 6.96067 12.25 9 12.25C11.0393 12.25 12.9225 12.7208 14.3219 13.5204C15.7 14.3079 16.75 15.5101 16.75 17C16.75 18.4899 15.7 19.6921 14.3219 20.4796C12.9225 21.2792 11.0393 21.75 9 21.75C6.96067 21.75 5.07752 21.2792 3.67815 20.4796C2.3 19.6921 1.25 18.4899 1.25 17C1.25 15.5101 2.3 14.3079 3.67815 13.5204ZM4.42236 14.8228C3.26701 15.483 2.75 16.2807 2.75 17C2.75 17.7193 3.26701 18.517 4.42236 19.1772C5.55649 19.8253 7.17334 20.25 9 20.25C10.8267 20.25 12.4435 19.8253 13.5776 19.1772C14.733 18.517 15.25 17.7193 15.25 17C15.25 16.2807 14.733 15.483 13.5776 14.8228C12.4435 14.1747 10.8267 13.75 9 13.75C7.17334 13.75 5.55649 14.1747 4.42236 14.8228Z" fill="currentColor"/>
                  <path d="M18.1607 13.2674C17.7561 13.1787 17.3561 13.4347 17.2674 13.8393C17.1787 14.2439 17.4347 14.6439 17.8393 14.7326C18.6317 14.9064 19.2649 15.2048 19.6829 15.5468C20.1014 15.8892 20.25 16.2237 20.25 16.5C20.25 16.7507 20.1294 17.045 19.7969 17.3539C19.462 17.665 18.9475 17.9524 18.2838 18.1523C17.8871 18.2717 17.6624 18.69 17.7818 19.0867C17.9013 19.4833 18.3196 19.708 18.7162 19.5886C19.5388 19.3409 20.2743 18.9578 20.8178 18.4529C21.3637 17.9457 21.75 17.2786 21.75 16.5C21.75 15.6352 21.2758 14.912 20.6328 14.3859C19.9893 13.8593 19.1225 13.4783 18.1607 13.2674Z" fill="currentColor"/>
                </svg>
              </button>
              {/* OK */}
              <button
                onClick={() => { if (selectedIds.size > 0) { setSnapshotIds(new Set(selectedIds)); setSelectedIds(new Set()); setGroupModal(true); setSelectionMode(false); } }}
                title="Подтвердить выбор"
                className="absolute z-[15] w-9 h-9 rounded-xl border border-warm-200 bg-white/90 flex items-center justify-center active:bg-warm-50 transition-all duration-200"
                style={{
                  top: 10, left: 58,
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                  color: "#16a34a",
                  opacity: selectionMode ? (selectedIds.size > 0 ? 1 : 0.3) : 0,
                  pointerEvents: selectionMode && selectedIds.size > 0 ? "auto" : "none",
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M16.0303 10.0303C16.3232 9.73744 16.3232 9.26256 16.0303 8.96967C15.7374 8.67678 15.2626 8.67678 14.9697 8.96967L10.5 13.4393L9.03033 11.9697C8.73744 11.6768 8.26256 11.6768 7.96967 11.9697C7.67678 12.2626 7.67678 12.7374 7.96967 13.0303L9.96967 15.0303C10.2626 15.3232 10.7374 15.3232 11.0303 15.0303L16.0303 10.0303Z" fill="currentColor"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12Z" fill="currentColor"/>
                </svg>
              </button>
              {/* Отмена */}
              <button
                onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                title="Отменить выбор"
                className="absolute z-[15] w-9 h-9 rounded-xl border border-warm-200 bg-white/90 flex items-center justify-center active:bg-warm-50 transition-all duration-200"
                style={{
                  top: 10, left: 106,
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                  color: "#dc2626",
                  opacity: selectionMode ? 1 : 0,
                  pointerEvents: selectionMode ? "auto" : "none",
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M10.0303 8.96965C9.73741 8.67676 9.26253 8.67676 8.96964 8.96965C8.67675 9.26255 8.67675 9.73742 8.96964 10.0303L10.9393 12L8.96966 13.9697C8.67677 14.2625 8.67677 14.7374 8.96966 15.0303C9.26255 15.3232 9.73743 15.3232 10.0303 15.0303L12 13.0607L13.9696 15.0303C14.2625 15.3232 14.7374 15.3232 15.0303 15.0303C15.3232 14.7374 15.3232 14.2625 15.0303 13.9696L13.0606 12L15.0303 10.0303C15.3232 9.73744 15.3232 9.26257 15.0303 8.96968C14.7374 8.67678 14.2625 8.67678 13.9696 8.96968L12 10.9393L10.0303 8.96965Z" fill="currentColor"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 1.25C6.06294 1.25 1.25 6.06294 1.25 12C1.25 17.9371 6.06294 22.75 12 22.75C17.9371 22.75 22.75 17.9371 22.75 12C22.75 6.06294 17.9371 1.25 12 1.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75C17.1086 2.75 21.25 6.89137 21.25 12C21.25 17.1086 17.1086 21.25 12 21.25C6.89137 21.25 2.75 17.1086 2.75 12Z" fill="currentColor"/>
                </svg>
              </button>
              {/* Полный экран — кнопка: появляется по тапу, 4 сек, потом пропадает */}
              <button
                onClick={() => { setIsFullscreen(v => !v); setShowFsBtn(false); if (fsBtnTimeoutRef.current) clearTimeout(fsBtnTimeoutRef.current); }}
                title={isFullscreen ? "Свернуть" : "На весь экран"}
                className="absolute z-10 w-9 h-9 rounded-xl border border-warm-200 bg-white/90 text-warm-500 flex items-center justify-center active:bg-warm-50 transition-all duration-300"
                style={{
                  top: 10, right: 10,
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                  opacity: showFsBtn ? 1 : 0,
                  pointerEvents: showFsBtn ? "auto" : "none",
                }}
              >
                {isFullscreen ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M20.8571 9.75C21.2714 9.75 21.6071 9.41421 21.6071 9C21.6071 8.58579 21.2714 8.25 20.8571 8.25H16.8107L22.5303 2.53033C22.8232 2.23744 22.8232 1.76256 22.5303 1.46967C22.2374 1.17678 21.7626 1.17678 21.4697 1.46967L15.75 7.18934V3.14286C15.75 2.72864 15.4142 2.39286 15 2.39286C14.5858 2.39286 14.25 2.72864 14.25 3.14286V9C14.25 9.41421 14.5858 9.75 15 9.75H20.8571Z" fill="currentColor"/>
                    <path d="M3.14286 14.25C2.72864 14.25 2.39286 14.5858 2.39286 15C2.39286 15.4142 2.72864 15.75 3.14286 15.75H7.18934L1.46967 21.4697C1.17678 21.7626 1.17678 22.2374 1.46967 22.5303C1.76256 22.8232 2.23744 22.8232 2.53033 22.5303L8.25 16.8107V20.8571C8.25 21.2714 8.58579 21.6071 9 21.6071C9.41421 21.6071 9.75 21.2714 9.75 20.8571V15C9.75 14.5858 9.41421 14.25 9 14.25H3.14286Z" fill="currentColor"/>
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M16.1429 1.25C15.7286 1.25 15.3929 1.58579 15.3929 2C15.3929 2.41421 15.7286 2.75 16.1429 2.75H20.1893L14.4697 8.46967C14.1768 8.76256 14.1768 9.23744 14.4697 9.53033C14.7626 9.82322 15.2374 9.82322 15.5303 9.53033L21.25 3.81066V7.85714C21.25 8.27136 21.5858 8.60714 22 8.60714C22.4142 8.60714 22.75 8.27136 22.75 7.85714V2C22.75 1.58579 22.4142 1.25 22 1.25H16.1429Z" fill="currentColor"/>
                    <path d="M7.85714 22.75C8.27136 22.75 8.60714 22.4142 8.60714 22C8.60714 21.5858 8.27136 21.25 7.85714 21.25H3.81066L9.53033 15.5303C9.82322 15.2374 9.82322 14.7626 9.53033 14.4697C9.23744 14.1768 8.76256 14.1768 8.46967 14.4697L2.75 20.1893V16.1429C2.75 15.7286 2.41421 15.3929 2 15.3929C1.58579 15.3929 1.25 15.7286 1.25 16.1429V22C1.25 22.4142 1.58579 22.75 2 22.75H7.85714Z" fill="currentColor"/>
                  </svg>
                )}
              </button>

            <div className={isFullscreen ? "flex-1 flex flex-col overflow-hidden" : "warm-card overflow-hidden"}>
              {/* ── Табы + Заголовок ── */}
              {(() => {
                const choirLabel = session?.choirType === 'festive' ? 'ПРАЗДНИЧНОГО' : 'БУДНЕГО';
                const defaultXlsxTitle = `ГРАФИК ПОСЕЩЕНИЯ ПЕВЧИХ ${choirLabel} ХОРА ЗА ${MONTHS_UPPER[m - 1]} ${y} Г.`;
                const defaultDocxTitle = `ИТОГОВАЯ ВЕДОМОСТЬ ПО ВОЗНАГРАЖДЕНИЮ ${choirLabel} ХОРА ${MONTHS_UPPER[m - 1]} ${y} Г.`;
                const isXlsx = activeDocTab === "xlsx";
                return (
                  <div>
                    {/* Табы */}
                    <div style={{ display: "flex", background: C_HEAD_BG, borderBottom: `1px solid ${C_BORDER}` }}>
                      {([{ id: "xlsx", label: "Табель" }, { id: "docx", label: "Ведомость" }] as const).map(tab => (
                        <button key={tab.id} onClick={() => setActiveDocTab(tab.id)} style={{
                          padding: "10px 18px",
                          fontFamily: "'Roboto Slab', serif",
                          fontSize: 12, fontWeight: 600,
                          color: activeDocTab === tab.id ? C_ACCENT : C_MUTED,
                          borderBottom: `2px solid ${activeDocTab === tab.id ? C_ACCENT : "transparent"}`,
                          background: "transparent",
                          transition: "all 0.15s",
                          marginBottom: -1,
                        }}>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    {/* Заголовок */}
                    <div style={{ borderBottom: `1px solid ${C_BORDER}`, padding: "6px 16px", background: C_BG, textTransform: "uppercase" }}>
                      <div
                        key={activeDocTab}
                        contentEditable
                        suppressContentEditableWarning
                        onFocus={() => isXlsx ? setEditingTitle(true) : setEditingDocxTitle(true)}
                        onBlur={(e) => {
                          const val = e.currentTarget.textContent?.trim() || "";
                          if (isXlsx) { setExportTitle(val || defaultXlsxTitle); setEditingTitle(false); }
                          else { setDocxTitle(val || defaultDocxTitle); setEditingDocxTitle(false); }
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLElement).blur(); } }}
                        style={{
                          fontFamily: "'Roboto Slab', serif",
                          fontSize: 11,
                          fontWeight: 600,
                          color: C_MUTED,
                          outline: "none",
                          textAlign: "center",
                          cursor: "text",
                          letterSpacing: "0.06em",
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                        }}
                      >
                        {isXlsx ? (exportTitle || defaultXlsxTitle) : (docxTitle || defaultDocxTitle)}
                      </div>
                    </div>
                  </div>
                );
              })()}
              {/* ── Прокрутка таблицы ── */}
              <div
                onPointerDown={handleTablePointerDown}
                onPointerUp={handleTablePointerUp}
                style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", flex: 1 } as React.CSSProperties}
              >
              {activeDocTab === "xlsx" ? (
                /* ── Табель: выходы по датам ── */
                <table
                  style={{
                    borderCollapse: "collapse",
                    tableLayout: "auto",
                    width: "100%",
                    fontFamily: "'Roboto Slab', serif",
                  }}
                >
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ ...thBase, ...stickyNumH, textAlign: "center", verticalAlign: "middle" }}>
                        №
                      </th>
                      <th rowSpan={2} style={{ ...thBase, ...stickyNameH, textAlign: "left", paddingLeft: 8, verticalAlign: "middle" }}>
                        Певчий
                      </th>
                      {dateGroups.map((g, gi) => {
                        const isLast = gi === dateGroups.length - 1;
                        return (
                          <th key={g.date} colSpan={g.count} style={{
                            ...thBase,
                            textAlign: "center", verticalAlign: "middle",
                            fontSize: 16, fontWeight: 700, color: C_TEXT,
                            paddingTop: 7, paddingBottom: 3,
                            borderRight: !isLast ? `1px solid ${C_SEP}` : undefined,
                          }}>
                            {g.label}
                          </th>
                        );
                      })}
                      <th rowSpan={2} style={{ ...thBase, textAlign: "center", fontWeight: 700, color: C_TEXT, verticalAlign: "middle", borderLeft: `1px solid ${C_SEP}` }}>
                        Итого
                      </th>
                    </tr>
                    <tr style={{ borderBottom: `1px solid #e5d9cc` }}>
                      {sortedEvents.map((ev, idx) => {
                        let cumIdx = 0, isGroupEnd = false;
                        for (const g of dateGroups) {
                          cumIdx += g.count;
                          if (idx === cumIdx - 1) { isGroupEnd = true; break; }
                          if (idx < cumIdx) break;
                        }
                        return (
                          <th key={ev._id} style={{
                            ...thBase, fontSize: 10, color: C_MUTED,
                            verticalAlign: "middle", padding: "2px 8px 5px", whiteSpace: "nowrap",
                            borderRight: isGroupEnd && idx < sortedEvents.length - 1 ? `1px solid ${C_SEP}` : undefined,
                          }}>
                            {ev.eventType}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  {(() => {
                    const singers = activeMembers.filter(mb => mb.role !== "reader");
                    const readers = activeMembers.filter(mb => mb.role === "reader");
                    const memberTotal = (mb: typeof activeMembers[0]) => sortedEvents.reduce((s, ev) => {
                      const att = ev.attendances.find((a) => a.memberId === mb._id);
                      return s + (att ? att.basePrice + att.bonus - (att.fine || 0) : 0);
                    }, 0);
                    const singerTotal = singers.reduce((s, mb) => s + memberTotal(mb), 0);
                    const readerTotal = readers.reduce((s, mb) => s + memberTotal(mb), 0);
                    const hasReaders = readers.length > 0;
                    const numEvCols = sortedEvents.length;

                    const renderRow = (mb: typeof activeMembers[0], displayIdx: number) => {
                      const rowTotal = memberTotal(mb);
                      const evenRow = displayIdx % 2 === 1;
                      return (
                        <tr key={mb._id}>
                          <td style={{ ...tdBase, ...stickyNum, background: evenRow ? "#fdf8f4" : C_BG, color: C_MUTED, fontSize: 11, padding: selectionMode ? "4px 0" : undefined }}>
                            {selectionMode ? (
                              <div onClick={(e) => { e.stopPropagation(); toggleMember(mb._id); }} style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${selectedIds.has(mb._id) ? C_ACCENT : "#d4c0ac"}`, background: selectedIds.has(mb._id) ? C_ACCENT : "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", margin: "0 auto", flexShrink: 0 }}>
                                {selectedIds.has(mb._id) && <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                            ) : (displayIdx + 1)}
                          </td>
                          <td onClick={() => setMemberModal(mb)} style={{ ...tdBase, ...stickyName, background: evenRow ? "#fdf8f4" : C_BG, textAlign: "left", paddingLeft: 8, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                            {shortName(mb.name, mb.patronymic)}
                          </td>
                          {sortedEvents.map((ev, idx) => {
                            const att = ev.attendances.find((a) => a.memberId === mb._id);
                            const fine = att?.fine || 0;
                            const val = att ? att.basePrice + att.bonus - fine : null;
                            let cumIdx = 0, isGroupEnd = false;
                            for (const g of dateGroups) { cumIdx += g.count; if (idx === cumIdx - 1) { isGroupEnd = true; break; } if (idx < cumIdx) break; }
                            return (
                              <td key={ev._id} style={{ ...tdBase, position: "relative", overflow: "hidden", background: evenRow ? "#fdf8f4" : C_BG, fontWeight: val ? 600 : 400, color: val ? C_TEXT : "#d4c0ac", fontSize: 12, borderRight: isGroupEnd && idx < sortedEvents.length - 1 ? `1px solid ${C_SEP}` : undefined }}>
                                {fine > 0 && (<span style={{ position: "absolute", top: 10, right: -4, width: "400%", height: 6, background: "#ef4444", transformOrigin: "top right", transform: "rotate(45deg)", zIndex: 1 }}><span style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.25)", filter: "blur(3px)", transform: "rotate(12deg)" }} /></span>)}
                                {val !== null ? val.toLocaleString("ru-RU") : "—"}
                              </td>
                            );
                          })}
                          <td style={{ ...tdBase, background: evenRow ? "#f0e4d5" : "#f5ece3", fontWeight: 700, fontSize: 12, color: rowTotal > 0 ? C_TEXT : C_MUTED, borderLeft: `1px solid ${C_SEP}`, textAlign: "right", paddingRight: 8 }}>
                            {rowTotal > 0 ? rowTotal.toLocaleString("ru-RU") : "—"}
                          </td>
                        </tr>
                      );
                    };

                    const subTotalRow = (label: string, amount: number) => (
                      <tr>
                        <td colSpan={2} style={{ ...tdBase, position: "sticky", left: 0, zIndex: 2, minWidth: COL_NUM + COL_NAME, background: "#c9a87c", borderTop: `2px solid #b8945e`, borderBottom: "none", borderRight: "none", textAlign: "left", paddingLeft: 8, fontWeight: 700, fontSize: 13, color: "#fff8f0" }}>{label}</td>
                        {Array.from({ length: numEvCols }).map((_, i) => <td key={i} style={{ ...tdBase, background: "#c9a87c", borderTop: `2px solid #b8945e`, borderBottom: "none", borderRight: "none", borderLeft: "none" }} />)}
                        <td style={{ ...tdBase, background: "#c9a87c", borderTop: `2px solid #b8945e`, borderBottom: "none", fontWeight: 700, fontSize: 13, color: "#fff8f0", textAlign: "right", paddingRight: 8 }}>{amount.toLocaleString("ru-RU")}</td>
                      </tr>
                    );

                    return (
                      <>
                        <tbody>{singers.map((mb, i) => renderRow(mb, i))}</tbody>
                        {hasReaders && (
                          <tbody>
                            <tr>
                              <td colSpan={2 + numEvCols + 1} style={{ background: "#f5ece3", borderTop: "2px solid #d4c0ac", borderBottom: "2px solid #d4c0ac", padding: "4px 8px", textAlign: "left" }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#7d5e42", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Чтец</span>
                              </td>
                            </tr>
                            {readers.map((mb, i) => renderRow(mb, singers.length + i))}
                          </tbody>
                        )}
                        <tfoot>
                          <tr>
                            <td colSpan={2} style={{ ...tdBase, position: "sticky", left: 0, zIndex: 2, minWidth: COL_NUM + COL_NAME, background: "#a07850", borderTop: `2px solid #7d5e42`, borderBottom: "none", borderRight: "none", textAlign: "left", paddingLeft: 8, fontWeight: 700, fontSize: 15, color: "#ffffff" }}>
                              {hasReaders ? "Всего" : "Итого"}
                            </td>
                            {sortedEvents.map((ev) => <td key={ev._id} style={{ ...tdBase, background: "#a07850", borderTop: `2px solid #7d5e42`, borderBottom: "none", borderRight: "none", borderLeft: "none" }} />)}
                            <td style={{ ...tdBase, background: "#a07850", borderTop: `2px solid #7d5e42`, borderBottom: "none", fontWeight: 800, fontSize: 15, color: "#ffffff", textAlign: "right", paddingRight: 8 }}>{totalAmount.toLocaleString("ru-RU")}</td>
                          </tr>
                        </tfoot>
                      </>
                    );
                  })()}
                </table>
              ) : (
                /* ── Ведомость: №, ФИО, Итого ── */
                <table
                  style={{
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                    width: "100%",
                    fontFamily: "'Roboto Slab', serif",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ ...thBase, ...stickyNumH, textAlign: "center", verticalAlign: "middle", width: COL_NUM }}>№</th>
                      <th style={{ ...thBase, ...stickyNameH, textAlign: "left", paddingLeft: 8, verticalAlign: "middle" }}>ФИО</th>
                      <th style={{ ...thBase, textAlign: "right", paddingRight: 8, verticalAlign: "middle", fontWeight: 700, color: C_TEXT, width: 110, borderLeft: `1px solid ${C_SEP}` }}>Итого, руб.</th>
                    </tr>
                  </thead>
                  {(() => {
                    const singers = activeMembers.filter(mb => mb.role !== "reader");
                    const readers = activeMembers.filter(mb => mb.role === "reader");
                    const memberTotal = (mb: typeof activeMembers[0]) => sortedEvents.reduce((s, ev) => {
                      const att = ev.attendances.find((a) => a.memberId === mb._id);
                      return s + (att ? att.basePrice + att.bonus - (att.fine || 0) : 0);
                    }, 0);
                    const singerTotal = singers.reduce((s, mb) => s + memberTotal(mb), 0);
                    const readerTotal = readers.reduce((s, mb) => s + memberTotal(mb), 0);
                    const hasReaders = readers.length > 0;

                    const renderRow = (mb: typeof activeMembers[0], idx: number) => {
                      const rowTotal = memberTotal(mb);
                      const evenRow = idx % 2 === 1;
                      return (
                        <tr key={mb._id}>
                          <td style={{ ...tdBase, ...stickyNum, background: evenRow ? "#fdf8f4" : C_BG, color: C_MUTED, fontSize: 11, padding: selectionMode ? "4px 0" : undefined }}>
                            {selectionMode ? (
                              <div onClick={(e) => { e.stopPropagation(); toggleMember(mb._id); }} style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${selectedIds.has(mb._id) ? C_ACCENT : "#d4c0ac"}`, background: selectedIds.has(mb._id) ? C_ACCENT : "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", margin: "0 auto", flexShrink: 0 }}>
                                {selectedIds.has(mb._id) && <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                            ) : (idx + 1)}
                          </td>
                          <td onClick={() => setMemberModal(mb)} style={{ ...tdBase, ...stickyName, background: evenRow ? "#fdf8f4" : C_BG, textAlign: "left", paddingLeft: 8, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                            {shortName(mb.name, mb.patronymic)}
                          </td>
                          <td style={{ ...tdBase, background: evenRow ? "#f0e4d5" : "#f5ece3", fontWeight: 700, fontSize: 12, color: rowTotal > 0 ? C_TEXT : C_MUTED, borderLeft: `1px solid ${C_SEP}`, textAlign: "right", paddingRight: 8 }}>
                            {rowTotal > 0 ? rowTotal.toLocaleString("ru-RU") : "—"}
                          </td>
                        </tr>
                      );
                    };

                    return (
                      <>
                        <tbody>
                          {singers.map((mb, i) => renderRow(mb, i))}
                        </tbody>
                        {hasReaders && (
                          <>
                            <tbody>
                              <tr>
                                <td colSpan={2} style={{ ...tdBase, position: "sticky", left: 0, zIndex: 2, minWidth: COL_NUM + COL_NAME, background: "#c9a87c", borderTop: `2px solid #b8945e`, borderBottom: "none", borderRight: "none", textAlign: "left", paddingLeft: 8, fontWeight: 700, fontSize: 13, color: "#fff8f0" }}>
                                  Итого
                                </td>
                                <td style={{ ...tdBase, background: "#c9a87c", borderTop: `2px solid #b8945e`, borderBottom: "none", fontWeight: 700, fontSize: 13, color: "#fff8f0", textAlign: "right", paddingRight: 8 }}>
                                  {singerTotal.toLocaleString("ru-RU")}
                                </td>
                              </tr>
                            </tbody>
                            <tbody>
                              <tr>
                                <td colSpan={3} style={{ background: "#f5ece3", borderTop: "2px solid #d4c0ac", borderBottom: "2px solid #d4c0ac", padding: "4px 8px", textAlign: "left" }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: "#7d5e42", textTransform: "uppercase", letterSpacing: "0.1em" }}>Чтец</span>
                                </td>
                              </tr>
                              {readers.map((mb, i) => renderRow(mb, singers.length + i))}
                            </tbody>
                          </>
                        )}
                        <tfoot>
                          {hasReaders && (
                            <tr>
                              <td colSpan={2} style={{ ...tdBase, position: "sticky", left: 0, zIndex: 2, minWidth: COL_NUM + COL_NAME, background: "#c9a87c", borderTop: `1px solid #b8945e`, borderBottom: "none", borderRight: "none", textAlign: "left", paddingLeft: 8, fontWeight: 700, fontSize: 13, color: "#fff8f0" }}>
                                Итого
                              </td>
                              <td style={{ ...tdBase, background: "#c9a87c", borderTop: `1px solid #b8945e`, borderBottom: "none", fontWeight: 700, fontSize: 13, color: "#fff8f0", textAlign: "right", paddingRight: 8 }}>
                                {readerTotal.toLocaleString("ru-RU")}
                              </td>
                            </tr>
                          )}
                          <tr>
                            <td colSpan={2} style={{ ...tdBase, position: "sticky", left: 0, zIndex: 2, minWidth: COL_NUM + COL_NAME, background: "#a07850", borderTop: `2px solid #7d5e42`, borderBottom: "none", borderRight: "none", textAlign: "left", paddingLeft: 8, fontWeight: 700, fontSize: 15, color: "#ffffff" }}>
                              {hasReaders ? "Всего" : "Итого"}
                            </td>
                            <td style={{ ...tdBase, background: "#a07850", borderTop: `2px solid #7d5e42`, borderBottom: "none", fontWeight: 800, fontSize: 15, color: "#ffffff", textAlign: "right", paddingRight: 8 }}>
                              {totalAmount.toLocaleString("ru-RU")}
                            </td>
                          </tr>
                        </tfoot>
                      </>
                    );
                  })()}
                </table>
              )}
              </div>
            </div>
            </div>

          </>
        )}
      </div>

      {/* ── Модалка певчего ── */}
      {memberModal && (() => {
        const mbEvents = sortedEvents;
        const mbTotal = mbEvents.reduce((s, ev) => {
          const att = ev.attendances.find(a => a.memberId === memberModal._id);
          return s + (att ? att.basePrice + att.bonus - (att.fine || 0) : 0);
        }, 0);

        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
            style={{ background: "rgba(44,26,14,0.45)", backdropFilter: "blur(3px)" }}
            onClick={() => setMemberModal(null)}
          >
            <div
              className="w-full max-w-3xl rounded-2xl"
              style={{ background: "#fdf8f4", maxHeight: "88vh", display: "flex", flexDirection: "column" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Шапка + вкладки */}
              <div className="shrink-0">
                <div className="relative px-5 pt-5 pb-3" style={{ paddingRight: 52 }}>
                  <p className="text-xs text-warm-400 font-slab mb-0.5">Выходы певчего</p>
                  <h2 className="font-slab font-bold text-warm-900 text-lg leading-tight">
                    {memberModal.name}{memberModal.patronymic ? ` ${memberModal.patronymic}` : ""}
                  </h2>
                  <button onClick={() => setMemberModal(null)} className="absolute right-2 top-2 w-9 h-9 rounded-xl border border-warm-200 bg-white text-warm-500 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                <div style={{ display: "flex", background: C_HEAD_BG, borderTop: `1px solid ${C_BORDER}`, borderBottom: `1px solid ${C_BORDER}` }}>
                  {([{ id: "xlsx", label: "Табель" }, { id: "docx", label: "Ведомость" }] as const).map(tab => (
                    <button key={tab.id} onClick={() => setMemberActiveTab(tab.id)} style={{
                      padding: "8px 18px",
                      fontFamily: "'Roboto Slab', serif",
                      fontSize: 13, fontWeight: 600,
                      color: memberActiveTab === tab.id ? C_ACCENT : C_MUTED,
                      borderBottom: `2px solid ${memberActiveTab === tab.id ? C_ACCENT : "transparent"}`,
                      marginBottom: -1, background: "none", cursor: "pointer",
                    }}>{tab.label}</button>
                  ))}
                </div>
              </div>

              <div className="overflow-auto flex-1" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                {mbEvents.length === 0 ? (
                  <p className="text-center text-warm-400 text-sm py-8">Нет выходов за {monthLabel}</p>
                ) : memberActiveTab === "xlsx" ? (
                  <table style={{ borderCollapse: "collapse", tableLayout: "auto", fontFamily: "'Roboto Slab', serif" }}>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ ...thBase, ...stickyNumH, textAlign: "center", verticalAlign: "middle" }}>№</th>
                        <th rowSpan={2} style={{ ...thBase, ...stickyNameH, textAlign: "left", paddingLeft: 8, verticalAlign: "middle" }}>Певчий</th>
                        {dateGroups.map((g, gi) => (
                          <th key={g.date} colSpan={g.count} style={{ ...thBase, textAlign: "center", verticalAlign: "middle", fontSize: 16, fontWeight: 700, color: C_TEXT, paddingTop: 7, paddingBottom: 3, borderRight: gi < dateGroups.length - 1 ? `1px solid ${C_SEP}` : undefined }}>{g.label}</th>
                        ))}
                        <th rowSpan={2} style={{ ...thBase, textAlign: "center", fontWeight: 700, color: C_TEXT, verticalAlign: "middle", borderLeft: `1px solid ${C_SEP}` }}>Итого</th>
                      </tr>
                      <tr style={{ borderBottom: `1px solid #e5d9cc` }}>
                        {mbEvents.map((ev, idx) => {
                          let cumIdx = 0, isGroupEnd = false;
                          for (const g of dateGroups) { cumIdx += g.count; if (idx === cumIdx - 1) { isGroupEnd = true; break; } if (idx < cumIdx) break; }
                          return <th key={ev._id} style={{ ...thBase, fontSize: 10, color: C_MUTED, verticalAlign: "middle", padding: "2px 8px 5px", whiteSpace: "nowrap", borderRight: isGroupEnd && idx < mbEvents.length - 1 ? `1px solid ${C_SEP}` : undefined }}>{ev.eventType}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ ...tdBase, ...stickyNum, color: C_MUTED, fontSize: 11 }}>1</td>
                        <td style={{ ...tdBase, ...stickyName, textAlign: "left", paddingLeft: 8, fontWeight: 600, fontSize: 12 }}>{shortName(memberModal.name, memberModal.patronymic)}</td>
                        {mbEvents.map((ev, idx) => {
                          const att = ev.attendances.find(a => a.memberId === memberModal._id);
                          const mbFine = att?.fine || 0;
                          const val = att ? att.basePrice + att.bonus - mbFine : null;
                          let cumIdx = 0, isGroupEnd = false;
                          for (const g of dateGroups) { cumIdx += g.count; if (idx === cumIdx - 1) { isGroupEnd = true; break; } if (idx < cumIdx) break; }
                          return <td key={ev._id} style={{ ...tdBase, position: "relative", overflow: "hidden", fontWeight: val ? 600 : 400, color: val ? C_TEXT : "#d4c0ac", fontSize: 12, borderRight: isGroupEnd && idx < mbEvents.length - 1 ? `1px solid ${C_SEP}` : undefined }}>{mbFine > 0 && <span style={{ position: "absolute", top: 10, right: -4, width: "400%", height: 6, background: "#ef4444", transformOrigin: "top right", transform: "rotate(45deg)", zIndex: 1 }}><span style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.25)", filter: "blur(3px)", transform: "rotate(12deg)" }} /></span>}{val !== null ? val.toLocaleString("ru-RU") : "—"}</td>;
                        })}
                        <td style={{ ...tdBase, background: "#f5ece3", fontWeight: 700, fontSize: 12, color: mbTotal > 0 ? C_TEXT : C_MUTED, borderLeft: `1px solid ${C_SEP}`, textAlign: "right", paddingRight: 8 }}>{mbTotal > 0 ? mbTotal.toLocaleString("ru-RU") : "—"}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2} style={{ ...tdBase, position: "sticky", left: 0, zIndex: 2, minWidth: COL_NUM + COL_NAME, background: "#a07850", borderTop: `2px solid #7d5e42`, borderRight: "none", borderBottom: "none", textAlign: "left", paddingLeft: 8, fontWeight: 700, fontSize: 15, color: "#ffffff" }}>Итого</td>
                        {mbEvents.map(ev => <td key={ev._id} style={{ ...tdBase, background: "#a07850", borderTop: `2px solid #7d5e42`, borderBottom: "none", borderRight: "none", borderLeft: "none" }} />)}
                        <td style={{ ...tdBase, background: "#a07850", borderTop: `2px solid #7d5e42`, borderBottom: "none", fontWeight: 800, fontSize: 15, color: "#ffffff", textAlign: "right", paddingRight: 8 }}>{mbTotal.toLocaleString("ru-RU")}</td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <table style={{ borderCollapse: "collapse", tableLayout: "fixed", width: "100%", fontFamily: "'Roboto Slab', serif" }}>
                    <thead>
                      <tr>
                        <th style={{ ...thBase, ...stickyNumH, width: COL_NUM }}>№</th>
                        <th style={{ ...thBase, ...stickyNameH, paddingLeft: 8 }}>ФИО</th>
                        <th style={{ ...thBase, width: 110, borderLeft: `1px solid ${C_SEP}` }}>Итого, руб.</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ ...tdBase, ...stickyNum, color: C_MUTED, fontSize: 11 }}>1</td>
                        <td style={{ ...tdBase, ...stickyName, textAlign: "left", paddingLeft: 8, fontWeight: 600, fontSize: 12 }}>{shortName(memberModal.name, memberModal.patronymic)}</td>
                        <td style={{ ...tdBase, textAlign: "right", paddingRight: 8, fontWeight: mbTotal > 0 ? 600 : 400, color: mbTotal > 0 ? C_TEXT : "#d4c0ac", borderLeft: `1px solid ${C_SEP}` }}>{mbTotal > 0 ? mbTotal.toLocaleString("ru-RU") : "—"}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2} style={{ ...tdBase, position: "sticky", left: 0, zIndex: 2, background: "#a07850", borderTop: `2px solid #7d5e42`, borderBottom: "none", textAlign: "left", paddingLeft: 8, fontWeight: 700, fontSize: 15, color: "#ffffff" }}>Итого</td>
                        <td style={{ ...tdBase, background: "#a07850", borderTop: `2px solid #7d5e42`, borderBottom: "none", fontWeight: 800, fontSize: 15, color: "#ffffff", textAlign: "right", paddingRight: 8 }}>{mbTotal.toLocaleString("ru-RU")}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              <div className="px-4 pt-3 pb-4 shrink-0" style={{ borderTop: `1px solid ${C_BORDER}` }}>
                {memberActiveTab === "xlsx" ? (
                  <button onClick={handleMemberXlsx} disabled={dlMemberXlsx || mbTotal === 0} className="w-full h-11 rounded-xl border border-warm-200 bg-white text-warm-700 font-slab text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:bg-warm-50 transition-colors">
                    {dlMemberXlsx ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M12.25 2.83422C11.7896 2.75598 11.162 2.75005 10.0298 2.75005C8.11311 2.75005 6.75075 2.75163 5.71785 2.88987C4.70596 3.0253 4.12453 3.27933 3.7019 3.70195C3.27869 4.12516 3.02502 4.70481 2.88976 5.7109C2.75159 6.73856 2.75 8.09323 2.75 10.0001V14.0001C2.75 15.9069 2.75159 17.2615 2.88976 18.2892C3.02502 19.2953 3.27869 19.8749 3.7019 20.2981C4.12511 20.7214 4.70476 20.975 5.71085 21.1103C6.73851 21.2485 8.09318 21.2501 10 21.2501H14C15.9068 21.2501 17.2615 21.2485 18.2892 21.1103C19.2952 20.975 19.8749 20.7214 20.2981 20.2981C20.7213 19.8749 20.975 19.2953 21.1102 18.2892C21.2484 17.2615 21.25 15.9069 21.25 14.0001V13.5629C21.25 12.0269 21.2392 11.2988 21.0762 10.7501H17.9463C16.8135 10.7501 15.8877 10.7501 15.1569 10.6518C14.3929 10.5491 13.7306 10.3268 13.2019 9.79815C12.6732 9.26945 12.4509 8.60712 12.3482 7.84317C12.25 7.1123 12.25 6.18657 12.25 5.05374V2.83422ZM13.75 3.6095V5.00005C13.75 6.19976 13.7516 7.0241 13.8348 7.64329C13.9152 8.24091 14.059 8.53395 14.2626 8.73749C14.4661 8.94103 14.7591 9.08486 15.3568 9.16521C15.976 9.24846 16.8003 9.25005 18 9.25005H20.0195C19.723 8.9625 19.3432 8.61797 18.85 8.17407L14.8912 4.61117C14.4058 4.17433 14.0446 3.85187 13.75 3.6095ZM10.1755 1.25002C11.5601 1.24965 12.4546 1.24942 13.2779 1.56535C14.1012 1.88129 14.7632 2.47735 15.7873 3.39955C15.8226 3.43139 15.8584 3.46361 15.8947 3.49623L19.8534 7.05912C19.8956 7.09705 19.9372 7.1345 19.9783 7.17149C21.162 8.23614 21.9274 8.92458 22.3391 9.84902C22.7508 10.7734 22.7505 11.8029 22.75 13.3949C22.75 13.4502 22.75 13.5062 22.75 13.5629V14.0565C22.75 15.8942 22.75 17.3499 22.5969 18.4891C22.4392 19.6615 22.1071 20.6104 21.3588 21.3588C20.6104 22.1072 19.6614 22.4393 18.489 22.5969C17.3498 22.7501 15.8942 22.7501 14.0564 22.7501H9.94359C8.10583 22.7501 6.65019 22.7501 5.51098 22.5969C4.33856 22.4393 3.38961 22.1072 2.64124 21.3588C1.89288 20.6104 1.56076 19.6615 1.40314 18.4891C1.24997 17.3499 1.24998 15.8942 1.25 14.0565V9.94363C1.24998 8.10587 1.24997 6.65024 1.40314 5.51103C1.56076 4.33861 1.89288 3.38966 2.64124 2.64129C3.39019 1.89235 4.34232 1.56059 5.51887 1.40313C6.66283 1.25002 8.1257 1.25003 9.97352 1.25005L10.0298 1.25005C10.0789 1.25005 10.1275 1.25004 10.1755 1.25002Z" fill="currentColor"/><path fillRule="evenodd" clipRule="evenodd" d="M7.98705 19.0472C8.27554 19.3177 8.72446 19.3177 9.01296 19.0472L11.013 17.1722C11.3151 16.8889 11.3305 16.4143 11.0472 16.1121C10.7639 15.8099 10.2892 15.7946 9.98705 16.0779L9.25 16.7689V13.5001C9.25 13.0858 8.91421 12.7501 8.5 12.7501C8.08579 12.7501 7.75 13.0858 7.75 13.5001V16.7689L7.01296 16.0779C6.71077 15.7946 6.23615 15.8099 5.95285 16.1121C5.66955 16.4143 5.68486 16.8889 5.98705 17.1722L7.98705 19.0472Z" fill="currentColor"/></svg>}
                    Скачать табель .xlsx
                  </button>
                ) : (
                  <button onClick={handleMemberDocx} disabled={dlMemberDocx || mbTotal === 0} className="w-full h-11 rounded-xl border border-warm-200 bg-white text-warm-700 font-slab text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:bg-warm-50 transition-colors">
                    {dlMemberDocx ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M15.6111 1.5837C17.2678 1.34703 18.75 2.63255 18.75 4.30606V5.68256C19.9395 6.31131 20.75 7.56102 20.75 9.00004V19C20.75 21.0711 19.0711 22.75 17 22.75H7C4.92893 22.75 3.25 21.0711 3.25 19V5.00004C3.25 4.99074 3.25017 4.98148 3.2505 4.97227C3.25017 4.95788 3.25 4.94344 3.25 4.92897C3.25 4.02272 3.91638 3.25437 4.81353 3.12621L15.6111 1.5837ZM4.75 6.75004V19C4.75 20.2427 5.75736 21.25 7 21.25H17C18.2426 21.25 19.25 20.2427 19.25 19V9.00004C19.25 7.7574 18.2426 6.75004 17 6.75004H4.75ZM5.07107 5.25004H17.25V4.30606C17.25 3.54537 16.5763 2.96104 15.8232 3.06862L5.02566 4.61113C4.86749 4.63373 4.75 4.76919 4.75 4.92897C4.75 5.10629 4.89375 5.25004 5.07107 5.25004ZM7.25 12C7.25 11.5858 7.58579 11.25 8 11.25H16C16.4142 11.25 16.75 11.5858 16.75 12C16.75 12.4143 16.4142 12.75 16 12.75H8C7.58579 12.75 7.25 12.4143 7.25 12ZM7.25 15.5C7.25 15.0858 7.58579 14.75 8 14.75H13.5C13.9142 14.75 14.25 15.0858 14.25 15.5C14.25 15.9143 13.9142 16.25 13.5 16.25H8C7.58579 16.25 7.25 15.9143 7.25 15.5Z" fill="currentColor"/></svg>}
                    Скачать ведомость .docx
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Модалка группы ── */}
      {groupModal && (() => {
        const selectedMembers = activeMembers.filter(mb => snapshotIds.has(mb._id));
        const groupTotal = selectedMembers.reduce((sum, mb) =>
          sum + sortedEvents.reduce((s, ev) => {
            const att = ev.attendances.find(a => a.memberId === mb._id);
            return s + (att ? att.basePrice + att.bonus - (att.fine || 0) : 0);
          }, 0), 0);

        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
            style={{ background: "rgba(44,26,14,0.45)", backdropFilter: "blur(3px)" }}
            onClick={() => setGroupModal(false)}
          >
            <div
              className="w-full max-w-3xl rounded-2xl"
              style={{ background: "#fdf8f4", maxHeight: "88vh", display: "flex", flexDirection: "column" }}
              onClick={e => e.stopPropagation()}
            >
              {(() => {
                const choirLabel = session?.choirType === 'festive' ? 'ПРАЗДНИЧНОГО' : 'БУДНЕГО';
                const defaultXlsx = `ГРАФИК ПОСЕЩЕНИЯ ПЕВЧИХ ${choirLabel} ХОРА ЗА ${MONTHS_UPPER[m - 1]} ${y} Г.`;
                const defaultDocx = `ИТОГОВАЯ ВЕДОМОСТЬ ПЕВЧИХ ${choirLabel} ХОРА ${MONTHS_UPPER[m - 1]} ${y} Г.`;
                const isXlsx = groupActiveTab === "xlsx";
                const curTitle = isXlsx ? (groupXlsxTitle || defaultXlsx) : (groupDocxTitle || defaultDocx);
                return (
                  <div className="shrink-0">
                    {/* Кнопка закрытия */}
                    <div className="flex justify-end px-2 pt-2">
                      <button onClick={() => setGroupModal(false)} className="w-9 h-9 rounded-xl border border-warm-200 bg-white text-warm-500 flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </div>
                    {/* Заголовок */}
                    <div className="px-4 pb-3">
                      <div
                        key={groupActiveTab}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const v = e.currentTarget.textContent?.trim() || "";
                          if (isXlsx) setGroupXlsxTitle(v || defaultXlsx);
                          else setGroupDocxTitle(v || defaultDocx);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLElement).blur(); } }}
                        style={{
                          fontFamily: "'Roboto Slab', serif",
                          fontSize: 11,
                          fontWeight: 600,
                          color: C_MUTED,
                          outline: "none",
                          textAlign: "center",
                          cursor: "text",
                          letterSpacing: "0.06em",
                          lineHeight: 1.5,
                          wordBreak: "break-word",
                          textTransform: "uppercase",
                        }}
                      >
                        {curTitle}
                      </div>
                    </div>
                    {/* Вкладки */}
                    <div style={{ display: "flex", background: C_HEAD_BG, borderTop: `1px solid ${C_BORDER}`, borderBottom: `1px solid ${C_BORDER}` }}>
                      {([{ id: "xlsx", label: "Табель" }, { id: "docx", label: "Ведомость" }] as const).map(tab => (
                        <button key={tab.id} onClick={() => setGroupActiveTab(tab.id)} style={{
                          padding: "8px 18px",
                          fontFamily: "'Roboto Slab', serif",
                          fontSize: 13,
                          fontWeight: 600,
                          color: groupActiveTab === tab.id ? C_ACCENT : C_MUTED,
                          borderBottom: `2px solid ${groupActiveTab === tab.id ? C_ACCENT : "transparent"}`,
                          marginBottom: -1,
                          background: "none",
                          cursor: "pointer",
                        }}>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="overflow-auto flex-1" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                {groupActiveTab === "xlsx" ? (
                  <table style={{ borderCollapse: "collapse", tableLayout: "auto", fontFamily: "'Roboto Slab', serif" }}>
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ ...thBase, ...stickyNumH, textAlign: "center", verticalAlign: "middle" }}>№</th>
                        <th rowSpan={2} style={{ ...thBase, ...stickyNameH, textAlign: "left", paddingLeft: 8, verticalAlign: "middle" }}>Певчий</th>
                        {dateGroups.map((g, gi) => (
                          <th key={g.date} colSpan={g.count} style={{
                            ...thBase, textAlign: "center", verticalAlign: "middle",
                            fontSize: 16, fontWeight: 700, color: C_TEXT, paddingTop: 7, paddingBottom: 3,
                            borderRight: gi < dateGroups.length - 1 ? `1px solid ${C_SEP}` : undefined,
                          }}>{g.label}</th>
                        ))}
                        <th rowSpan={2} style={{ ...thBase, textAlign: "center", fontWeight: 700, color: C_TEXT, verticalAlign: "middle", borderLeft: `1px solid ${C_SEP}` }}>Итого</th>
                      </tr>
                      <tr style={{ borderBottom: `1px solid #e5d9cc` }}>
                        {sortedEvents.map((ev, idx) => {
                          let cumIdx = 0, isGroupEnd = false;
                          for (const g of dateGroups) { cumIdx += g.count; if (idx === cumIdx - 1) { isGroupEnd = true; break; } if (idx < cumIdx) break; }
                          return (
                            <th key={ev._id} style={{ ...thBase, fontSize: 10, color: C_MUTED, verticalAlign: "middle", padding: "2px 8px 5px", whiteSpace: "nowrap", borderRight: isGroupEnd && idx < sortedEvents.length - 1 ? `1px solid ${C_SEP}` : undefined }}>
                              {ev.eventType}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMembers.map((mb, mi) => {
                        const rowTotal = sortedEvents.reduce((s, ev) => { const att = ev.attendances.find(a => a.memberId === mb._id); return s + (att ? att.basePrice + att.bonus - (att.fine || 0) : 0); }, 0);
                        const evenRow = mi % 2 === 1;
                        return (
                          <tr key={mb._id}>
                            <td style={{ ...tdBase, ...stickyNum, background: evenRow ? "#fdf8f4" : C_BG, color: C_MUTED, fontSize: 11 }}>{mi + 1}</td>
                            <td style={{ ...tdBase, ...stickyName, background: evenRow ? "#fdf8f4" : C_BG, textAlign: "left", paddingLeft: 8, fontWeight: 600, fontSize: 12 }}>
                              {shortName(mb.name, mb.patronymic)}
                            </td>
                            {sortedEvents.map((ev, idx) => {
                              const att = ev.attendances.find(a => a.memberId === mb._id);
                              const val = att ? att.basePrice + att.bonus - (att.fine || 0) : null;
                              let cumIdx = 0, isGroupEnd = false;
                              for (const g of dateGroups) { cumIdx += g.count; if (idx === cumIdx - 1) { isGroupEnd = true; break; } if (idx < cumIdx) break; }
                              return (
                                <td key={ev._id} style={{ ...tdBase, background: evenRow ? "#fdf8f4" : C_BG, fontWeight: val ? 600 : 400, color: val ? C_TEXT : "#d4c0ac", fontSize: 12, borderRight: isGroupEnd && idx < sortedEvents.length - 1 ? `1px solid ${C_SEP}` : undefined }}>
                                  {val !== null ? val.toLocaleString("ru-RU") : "—"}
                                </td>
                              );
                            })}
                            <td style={{ ...tdBase, background: evenRow ? "#f0e4d5" : "#f5ece3", fontWeight: 700, fontSize: 12, color: rowTotal > 0 ? C_TEXT : C_MUTED, borderLeft: `1px solid ${C_SEP}`, textAlign: "right", paddingRight: 8 }}>
                              {rowTotal > 0 ? rowTotal.toLocaleString("ru-RU") : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2} style={{ ...tdBase, position: "sticky", left: 0, zIndex: 2, minWidth: COL_NUM + COL_NAME, background: "#a07850", borderTop: `2px solid #7d5e42`, borderRight: "none", borderBottom: "none", textAlign: "left", paddingLeft: 8, fontWeight: 700, fontSize: 15, color: "#ffffff" }}>Итого</td>
                        {sortedEvents.map(ev => <td key={ev._id} style={{ ...tdBase, background: "#a07850", borderTop: `2px solid #7d5e42`, borderBottom: "none", borderRight: "none", borderLeft: "none" }} />)}
                        <td style={{ ...tdBase, background: "#a07850", borderTop: `2px solid #7d5e42`, borderBottom: "none", fontWeight: 800, fontSize: 15, color: "#ffffff", textAlign: "right", paddingRight: 8 }}>
                          {groupTotal.toLocaleString("ru-RU")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <table style={{ borderCollapse: "collapse", tableLayout: "fixed", width: "100%", fontFamily: "'Roboto Slab', serif" }}>
                    <thead>
                      <tr>
                        <th style={{ ...thBase, ...stickyNumH, width: COL_NUM }}>№</th>
                        <th style={{ ...thBase, ...stickyNameH, paddingLeft: 8 }}>ФИО</th>
                        <th style={{ ...thBase, width: 110, borderLeft: `1px solid ${C_SEP}` }}>Итого, руб.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMembers.map((mb, mi) => {
                        const rowTotal = sortedEvents.reduce((s, ev) => { const att = ev.attendances.find(a => a.memberId === mb._id); return s + (att ? att.basePrice + att.bonus - (att.fine || 0) : 0); }, 0);
                        const evenRow = mi % 2 === 1;
                        return (
                          <tr key={mb._id}>
                            <td style={{ ...tdBase, ...stickyNum, background: evenRow ? "#fdf8f4" : C_BG, color: C_MUTED, fontSize: 11 }}>{mi + 1}</td>
                            <td style={{ ...tdBase, ...stickyName, background: evenRow ? "#fdf8f4" : C_BG, textAlign: "left", paddingLeft: 8, fontWeight: 600, fontSize: 12 }}>
                              {shortName(mb.name, mb.patronymic)}
                            </td>
                            <td style={{ ...tdBase, background: evenRow ? "#fdf8f4" : C_BG, textAlign: "right", paddingRight: 8, fontWeight: rowTotal > 0 ? 600 : 400, color: rowTotal > 0 ? C_TEXT : "#d4c0ac", borderLeft: `1px solid ${C_SEP}` }}>
                              {rowTotal > 0 ? rowTotal.toLocaleString("ru-RU") : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={2} style={{ ...tdBase, position: "sticky", left: 0, zIndex: 2, background: "#a07850", borderTop: `2px solid #7d5e42`, borderBottom: "none", textAlign: "left", paddingLeft: 8, fontWeight: 700, fontSize: 15, color: "#ffffff" }}>Итого</td>
                        <td style={{ ...tdBase, background: "#a07850", borderTop: `2px solid #7d5e42`, borderBottom: "none", fontWeight: 800, fontSize: 15, color: "#ffffff", textAlign: "right", paddingRight: 8 }}>
                          {groupTotal.toLocaleString("ru-RU")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              <div className="px-4 pt-3 pb-4 shrink-0" style={{ borderTop: `1px solid ${C_BORDER}` }}>
                {groupActiveTab === "xlsx" ? (
                  <button onClick={handleGroupXlsx} disabled={dlGroupXlsx} className="w-full h-11 rounded-xl border border-warm-200 bg-white text-warm-700 font-slab text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:bg-warm-50 transition-colors">
                    {dlGroupXlsx
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M12.25 2.83422C11.7896 2.75598 11.162 2.75005 10.0298 2.75005C8.11311 2.75005 6.75075 2.75163 5.71785 2.88987C4.70596 3.0253 4.12453 3.27933 3.7019 3.70195C3.27869 4.12516 3.02502 4.70481 2.88976 5.7109C2.75159 6.73856 2.75 8.09323 2.75 10.0001V14.0001C2.75 15.9069 2.75159 17.2615 2.88976 18.2892C3.02502 19.2953 3.27869 19.8749 3.7019 20.2981C4.12511 20.7214 4.70476 20.975 5.71085 21.1103C6.73851 21.2485 8.09318 21.2501 10 21.2501H14C15.9068 21.2501 17.2615 21.2485 18.2892 21.1103C19.2952 20.975 19.8749 20.7214 20.2981 20.2981C20.7213 19.8749 20.975 19.2953 21.1102 18.2892C21.2484 17.2615 21.25 15.9069 21.25 14.0001V13.5629C21.25 12.0269 21.2392 11.2988 21.0762 10.7501H17.9463C16.8135 10.7501 15.8877 10.7501 15.1569 10.6518C14.3929 10.5491 13.7306 10.3268 13.2019 9.79815C12.6732 9.26945 12.4509 8.60712 12.3482 7.84317C12.25 7.1123 12.25 6.18657 12.25 5.05374V2.83422ZM13.75 3.6095V5.00005C13.75 6.19976 13.7516 7.0241 13.8348 7.64329C13.9152 8.24091 14.059 8.53395 14.2626 8.73749C14.4661 8.94103 14.7591 9.08486 15.3568 9.16521C15.976 9.24846 16.8003 9.25005 18 9.25005H20.0195C19.723 8.9625 19.3432 8.61797 18.85 8.17407L14.8912 4.61117C14.4058 4.17433 14.0446 3.85187 13.75 3.6095ZM10.1755 1.25002C11.5601 1.24965 12.4546 1.24942 13.2779 1.56535C14.1012 1.88129 14.7632 2.47735 15.7873 3.39955C15.8226 3.43139 15.8584 3.46361 15.8947 3.49623L19.8534 7.05912C19.8956 7.09705 19.9372 7.1345 19.9783 7.17149C21.162 8.23614 21.9274 8.92458 22.3391 9.84902C22.7508 10.7734 22.7505 11.8029 22.75 13.3949C22.75 13.4502 22.75 13.5062 22.75 13.5629V14.0565C22.75 15.8942 22.75 17.3499 22.5969 18.4891C22.4392 19.6615 22.1071 20.6104 21.3588 21.3588C20.6104 22.1072 19.6614 22.4393 18.489 22.5969C17.3498 22.7501 15.8942 22.7501 14.0564 22.7501H9.94359C8.10583 22.7501 6.65019 22.7501 5.51098 22.5969C4.33856 22.4393 3.38961 22.1072 2.64124 21.3588C1.89288 20.6104 1.56076 19.6615 1.40314 18.4891C1.24997 17.3499 1.24998 15.8942 1.25 14.0565V9.94363C1.24998 8.10587 1.24997 6.65024 1.40314 5.51103C1.56076 4.33861 1.89288 3.38966 2.64124 2.64129C3.39019 1.89235 4.34232 1.56059 5.51887 1.40313C6.66283 1.25002 8.1257 1.25003 9.97352 1.25005L10.0298 1.25005C10.0789 1.25005 10.1275 1.25004 10.1755 1.25002Z" fill="currentColor"/><path fillRule="evenodd" clipRule="evenodd" d="M7.98705 19.0472C8.27554 19.3177 8.72446 19.3177 9.01296 19.0472L11.013 17.1722C11.3151 16.8889 11.3305 16.4143 11.0472 16.1121C10.7639 15.8099 10.2892 15.7946 9.98705 16.0779L9.25 16.7689V13.5001C9.25 13.0858 8.91421 12.7501 8.5 12.7501C8.08579 12.7501 7.75 13.0858 7.75 13.5001V16.7689L7.01296 16.0779C6.71077 15.7946 6.23615 15.8099 5.95285 16.1121C5.66955 16.4143 5.68486 16.8889 5.98705 17.1722L7.98705 19.0472Z" fill="currentColor"/></svg>}
                    Скачать табель .xlsx
                  </button>
                ) : (
                  <button onClick={handleGroupDocx} disabled={dlGroupDocx} className="w-full h-11 rounded-xl border border-warm-200 bg-white text-warm-700 font-slab text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:bg-warm-50 transition-colors">
                    {dlGroupDocx
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" d="M15.6111 1.5837C17.2678 1.34703 18.75 2.63255 18.75 4.30606V5.68256C19.9395 6.31131 20.75 7.56102 20.75 9.00004V19C20.75 21.0711 19.0711 22.75 17 22.75H7C4.92893 22.75 3.25 21.0711 3.25 19V5.00004C3.25 4.99074 3.25017 4.98148 3.2505 4.97227C3.25017 4.95788 3.25 4.94344 3.25 4.92897C3.25 4.02272 3.91638 3.25437 4.81353 3.12621L15.6111 1.5837ZM4.75 6.75004V19C4.75 20.2427 5.75736 21.25 7 21.25H17C18.2426 21.25 19.25 20.2427 19.25 19V9.00004C19.25 7.7574 18.2426 6.75004 17 6.75004H4.75ZM5.07107 5.25004H17.25V4.30606C17.25 3.54537 16.5763 2.96104 15.8232 3.06862L5.02566 4.61113C4.86749 4.63373 4.75 4.76919 4.75 4.92897C4.75 5.10629 4.89375 5.25004 5.07107 5.25004ZM7.25 12C7.25 11.5858 7.58579 11.25 8 11.25H16C16.4142 11.25 16.75 11.5858 16.75 12C16.75 12.4143 16.4142 12.75 16 12.75H8C7.58579 12.75 7.25 12.4143 7.25 12ZM7.25 15.5C7.25 15.0858 7.58579 14.75 8 14.75H13.5C13.9142 14.75 14.25 15.0858 14.25 15.5C14.25 15.9143 13.9142 16.25 13.5 16.25H8C7.58579 16.25 7.25 15.9143 7.25 15.5Z" fill="currentColor"/></svg>}
                    Скачать ведомость .docx
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
