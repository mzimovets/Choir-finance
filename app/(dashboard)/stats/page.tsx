"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
} from "@heroui/react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSession } from "@/hooks/useSession";
import { PageHeader } from "@/components/PageHeader";
import type { ChoirEvent, Member } from "@/lib/types";
import { plural, SINGER } from "@/lib/plural";
import { shortName } from "@/lib/nameFormat";
import { IconEmpty } from "@/components/IconEmpty";
import { MonthPicker, IconCalendar } from "@/components/MonthPicker";
import { onDataChanged } from "@/lib/dataSignal";

const MONTHS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** «6 июня · Суббота» */
function formatRowDate(dateStr: string): string {
  const dt = new Date(dateStr + "T00:00:00");
  const date = dt.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const weekday = dt.toLocaleDateString("ru-RU", { weekday: "long" });
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${date} · ${weekdayCap}`;
}

/* ── Canvas PNG-генератор ─────────────────────────────────────────────── */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  tl: number, tr: number, br: number, bl: number,
) {
  ctx.moveTo(x + tl, y)
  ctx.lineTo(x + w - tr, y)
  ctx.arcTo(x + w, y, x + w, y + tr, tr)
  ctx.lineTo(x + w, y + h - br)
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br)
  ctx.lineTo(x + bl, y + h)
  ctx.arcTo(x, y + h, x, y + h - bl, bl)
  ctx.lineTo(x, y + tl)
  ctx.arcTo(x, y, x + tl, y, tl)
}

async function downloadMemberPng(
  stat: { member: { name: string; patronymic?: string }; events: number; total: number; rows: { date: string; eventType: string; basePrice: number; bonus: number }[] },
  monthLabel: string,
  memberShortName: string,
) {
  await document.fonts.ready

  const SCALE = 2
  const W = 540
  const HEADER_H = 86
  const ROW_H = 48
  const TOTAL_H = 54
  const EDGE = 20       // margin from canvas edge
  const IP = 24        // inner horizontal padding inside card

  const sorted = [...stat.rows].sort((a, b) => a.date.localeCompare(b.date))
  const CARD_H = HEADER_H + sorted.length * ROW_H + 1 + TOTAL_H
  const H = EDGE * 2 + CARD_H

  const canvas = document.createElement("canvas")
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext("2d")!
  ctx.scale(SCALE, SCALE)
  ctx.textBaseline = "middle"

  // Background
  ctx.fillStyle = "#F7F4F1"
  ctx.fillRect(0, 0, W, H)

  // Card shadow
  ctx.save()
  ctx.shadowColor = "rgba(100, 60, 20, 0.14)"
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 4
  ctx.beginPath()
  roundRectPath(ctx, EDGE, EDGE, W - EDGE * 2, CARD_H, 20, 20, 20, 20)
  ctx.closePath()
  ctx.fillStyle = "#ffffff"
  ctx.fill()
  ctx.restore()

  // Header gradient
  const grad = ctx.createLinearGradient(EDGE, 0, W - EDGE, 0)
  grad.addColorStop(0, "#bd9673")
  grad.addColorStop(1, "#7d5e42")
  ctx.save()
  ctx.beginPath()
  roundRectPath(ctx, EDGE, EDGE, W - EDGE * 2, HEADER_H, 20, 20, 0, 0)
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()
  ctx.restore()

  // Header — name
  ctx.font = `700 19px "Roboto Slab", Georgia, serif`
  ctx.fillStyle = "#ffffff"
  ctx.textAlign = "left"
  ctx.fillText(memberShortName, EDGE + IP, EDGE + 30)

  // Header — month
  ctx.font = `400 12px "Roboto Slab", Georgia, serif`
  ctx.fillStyle = "rgba(255,255,255,0.72)"
  ctx.fillText(monthLabel, EDGE + IP, EDGE + 56)

  // Header — total (right)
  ctx.textAlign = "right"
  ctx.font = `700 22px "Roboto Slab", Georgia, serif`
  ctx.fillStyle = "#ffffff"
  ctx.fillText(`${stat.total.toLocaleString("ru-RU")} ₽`, W - EDGE - IP, EDGE + 30)

  const evWord = stat.events === 1 ? "выход" : stat.events < 5 ? "выхода" : "выходов"
  ctx.font = `400 12px "Roboto Slab", Georgia, serif`
  ctx.fillStyle = "rgba(255,255,255,0.7)"
  ctx.fillText(`${stat.events} ${evWord}`, W - EDGE - IP, EDGE + 56)

  // Rows
  const rowsY = EDGE + HEADER_H
  sorted.forEach((r, i) => {
    const ry = rowsY + i * ROW_H
    // Alternating bg
    if (i % 2 === 1) {
      ctx.fillStyle = "#fdf8f4"
      ctx.fillRect(EDGE, ry, W - EDGE * 2, ROW_H)
    }
    // Divider
    if (i > 0) {
      ctx.fillStyle = "#f0e8df"
      ctx.fillRect(EDGE + IP, ry, W - EDGE * 2 - IP * 2, 1)
    }

    const cy2 = ry + ROW_H / 2

    // Date + weekday
    const dt = new Date(r.date + "T00:00:00")
    const dateStr = dt.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
    const weekday = dt.toLocaleDateString("ru-RU", { weekday: "long" })
    const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1)
    ctx.textAlign = "left"
    ctx.font = `400 12px "Roboto Slab", Georgia, serif`
    ctx.fillStyle = "#9b7653"
    ctx.fillText(`${dateStr} · ${weekdayCap}`, EDGE + IP, cy2)

    // Event type (center area)
    ctx.textAlign = "center"
    ctx.font = `600 13px "Roboto Slab", Georgia, serif`
    ctx.fillStyle = "#2c1a0e"
    ctx.fillText(r.eventType, EDGE + (W - EDGE * 2) * 0.68, cy2)

    // Sum
    const sum = r.basePrice + r.bonus
    ctx.textAlign = "right"
    ctx.font = `700 13px "Roboto Slab", Georgia, serif`
    ctx.fillStyle = "#2c1a0e"
    ctx.fillText(`${sum.toLocaleString("ru-RU")} ₽`, W - EDGE - IP, cy2)
    if (r.bonus > 0) {
      ctx.font = `400 11px "Roboto Slab", Georgia, serif`
      ctx.fillStyle = "#3d9e4f"
      ctx.fillText(`+${r.bonus.toLocaleString("ru-RU")}`, W - EDGE - IP - ctx.measureText(`${sum.toLocaleString("ru-RU")} ₽  `).width, cy2)
    }
  })

  // Separator before total
  const sepY = rowsY + sorted.length * ROW_H
  ctx.fillStyle = "#d4b896"
  ctx.fillRect(EDGE, sepY, W - EDGE * 2, 1)

  // Total row (rounded bottom corners)
  const totalY = sepY + 1
  ctx.save()
  ctx.beginPath()
  roundRectPath(ctx, EDGE, totalY, W - EDGE * 2, TOTAL_H, 0, 0, 20, 20)
  ctx.closePath()
  ctx.fillStyle = "#ddc8ae"
  ctx.fill()
  ctx.restore()

  const totalCY = totalY + TOTAL_H / 2
  ctx.textAlign = "left"
  ctx.font = `700 15px "Roboto Slab", Georgia, serif`
  ctx.fillStyle = "#2c1a0e"
  ctx.fillText("Итого", EDGE + IP, totalCY)

  ctx.textAlign = "right"
  ctx.font = `700 17px "Roboto Slab", Georgia, serif`
  ctx.fillStyle = "#2c1a0e"
  ctx.fillText(`${stat.total.toLocaleString("ru-RU")} ₽`, W - EDGE - IP, totalCY)

  // Download
  const link = document.createElement("a")
  link.download = `${memberShortName} — ${monthLabel}.png`
  link.href = canvas.toDataURL("image/png")
  link.click()
}

interface MemberStat {
  member: Member;
  events: number;
  total: number;
  rows: { date: string; eventType: string; basePrice: number; bonus: number }[];
}

export default function StatsPage() {
  const { session } = useSession();
  const [month, setMonth] = useState(currentMonthStr);
  const [stats, setStats] = useState<MemberStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MemberStat | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const calBtnRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [evRes, mbRes] = await Promise.all([
      fetch(`/api/events?month=${month}`),
      fetch("/api/members"),
    ]);
    const events: ChoirEvent[] = evRes.ok ? await evRes.json() : [];
    const mbs: Member[] = mbRes.ok ? await mbRes.json() : [];

    const map = new Map<string, MemberStat>();
    mbs.forEach((m) =>
      map.set(m._id, { member: m, events: 0, total: 0, rows: [] }),
    );

    events.forEach((ev) => {
      ev.attendances.forEach((a) => {
        if (!map.has(a.memberId)) return;
        const s = map.get(a.memberId)!;
        s.events++;
        s.total += a.basePrice + a.bonus;
        s.rows.push({
          date: ev.date,
          eventType: ev.eventType,
          basePrice: a.basePrice,
          bonus: a.bonus,
        });
      });
    });

    const sorted = [...map.values()].sort((a, b) => a.member.name.localeCompare(b.member.name, 'ru'));
    setStats(sorted);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => onDataChanged(load), [load]);

  // ✅ Исправлен баг: toISOString использует UTC, что сдвигает месяц в UTC+X
  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function openDetail(s: MemberStat) {
    setSelected(s);
    setDrawerOpen(true);
  }

  const [y, mo] = month.split("-").map(Number);
  const monthLabel = `${MONTHS_RU[mo - 1]} ${y}`;
  const readers = stats.filter((s) => s.member.role === "reader");
  const singers = stats.filter((s) => s.member.role !== "reader");
  const singerTotal = singers.reduce((s, r) => s + r.total, 0);
  const readerTotal = readers.reduce((s, r) => s + r.total, 0);
  const grandTotal = stats.reduce((s, r) => s + r.total, 0);
  const hasReaders = readers.length > 0;

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Итоги"
        subtitle={loading ? "" : monthLabel}
        right={
          <div className="relative flex items-center gap-1">
            <button
              onClick={() => changeMonth(-1)}
              className="w-10 h-10 rounded-xl border border-warm-200 bg-white text-warm-700 flex items-center justify-center active:bg-warm-50 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ transform: 'scaleX(-1)' }}>
                <path fillRule="evenodd" clipRule="evenodd" d="M13.9697 6.46967C14.2626 6.17678 14.7374 6.17678 15.0303 6.46967L20.0303 11.4697C20.3232 11.7626 20.3232 12.2374 20.0303 12.5303L15.0303 17.5303C14.7374 17.8232 14.2626 17.8232 13.9697 17.5303C13.6768 17.2374 13.6768 16.7626 13.9697 16.4697L17.6893 12.75L9.5 12.75C8.78668 12.75 7.70002 12.9702 6.81323 13.6087C5.96468 14.2196 5.25 15.2444 5.25 17C5.25 17.4142 4.91421 17.75 4.5 17.75C4.08579 17.75 3.75 17.4142 3.75 17C3.75 14.7556 4.70198 13.2804 5.93677 12.3913C7.13332 11.5298 8.54665 11.25 9.5 11.25L17.6893 11.25L13.9697 7.53033C13.6768 7.23744 13.6768 6.76256 13.9697 6.46967Z" fill="currentColor"/>
              </svg>
            </button>
            <button
              ref={calBtnRef}
              onClick={() => setCalOpen((v) => !v)}
              className="w-10 h-10 rounded-xl border border-warm-200 bg-white flex items-center justify-center active:bg-warm-50 transition-colors"
            >
              <IconCalendar />
            </button>
            <button
              onClick={() => changeMonth(1)}
              className="w-10 h-10 rounded-xl border border-warm-200 bg-white text-warm-700 flex items-center justify-center active:bg-warm-50 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M13.9697 6.46967C14.2626 6.17678 14.7374 6.17678 15.0303 6.46967L20.0303 11.4697C20.3232 11.7626 20.3232 12.2374 20.0303 12.5303L15.0303 17.5303C14.7374 17.8232 14.2626 17.8232 13.9697 17.5303C13.6768 17.2374 13.6768 16.7626 13.9697 16.4697L17.6893 12.75L9.5 12.75C8.78668 12.75 7.70002 12.9702 6.81323 13.6087C5.96468 14.2196 5.25 15.2444 5.25 17C5.25 17.4142 4.91421 17.75 4.5 17.75C4.08579 17.75 3.75 17.4142 3.75 17C3.75 14.7556 4.70198 13.2804 5.93677 12.3913C7.13332 11.5298 8.54665 11.25 9.5 11.25L17.6893 11.25L13.9697 7.53033C13.6768 7.23744 13.6768 6.76256 13.9697 6.46967Z" fill="currentColor"/>
              </svg>
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

      <div className="px-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" color="#9b7653" />
          </div>
        ) : stats.length === 0 ? (
          <div className="mx-2 warm-card p-8 text-center">
            <div className="flex justify-center mb-3 text-warm-300">
              <IconEmpty />
            </div>
            <p className="font-semibold text-warm-700">Нет данных</p>
            <p className="text-sm text-warm-400 mt-1">
              За {monthLabel} записей не найдено
            </p>
          </div>
        ) : (
          <div className="warm-card overflow-hidden mx-2">
            <table className="warm-table">
              <thead>
                <tr>
                  <th className="text-left">Певчий</th>
                  <th className="text-center w-16">Выходы</th>
                  <th className="text-center">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {singers.map((s) => (
                  <tr
                    key={s.member._id}
                    onClick={() => openDetail(s)}
                    className="cursor-pointer active:bg-warm-50"
                  >
                    <td>
                      <span className="font-semibold text-warm-900">
                        {shortName(s.member.name, s.member.patronymic)}
                      </span>
                    </td>
                    <td className="text-center tabular-nums text-warm-500 text-sm">
                      {s.events > 0 ? s.events : "—"}
                    </td>
                    <td className="text-center tabular-nums font-semibold text-warm-800">
                      {s.total > 0
                        ? `${s.total.toLocaleString("ru-RU")} ₽`
                        : "—"}
                    </td>
                  </tr>
                ))}


                {/* Разделитель + чтецы */}
                {hasReaders && (
                  <>
                    <tr className="no-hover">
                      <td
                        colSpan={3}
                        style={{
                          background: "#f5ece3",
                          borderTop: "2px solid #d4c0ac",
                          borderBottom: "2px solid #d4c0ac",
                          padding: "4px 14px",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#7d5e42", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                          Чтец
                        </span>
                      </td>
                    </tr>
                    {readers.map((s) => (
                      <tr
                        key={s.member._id}
                        onClick={() => openDetail(s)}
                        className="cursor-pointer active:bg-warm-50"
                      >
                        <td>
                          <span className="font-semibold text-warm-900">
                            {shortName(s.member.name, s.member.patronymic)}
                          </span>
                        </td>
                        <td className="text-center tabular-nums text-warm-500 text-sm">
                          {s.events > 0 ? s.events : "—"}
                        </td>
                        <td className="text-center tabular-nums font-semibold text-warm-800">
                          {s.total > 0
                            ? `${s.total.toLocaleString("ru-RU")} ₽`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
              <tfoot>
                <tr className="table-total-grand no-hover border-t border-warm-300" style={{ background: "#a07850" }}>
                  <td className="font-bold text-base py-3" style={{ color: "#ffffff" }}>
                    Итого
                  </td>
                  <td />
                  <td className="text-center font-bold tabular-nums text-base py-3" style={{ color: "#ffffff" }}>
                    {grandTotal.toLocaleString("ru-RU")} ₽
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Drawer с деталями певчего */}
      <Drawer
        isOpen={drawerOpen}
        onOpenChange={(open) => {
          if (!open) setDrawerOpen(false);
        }}
        placement="bottom"
        scrollBehavior="inside"
        classNames={{
          base: "bg-white rounded-t-2xl max-h-[80dvh] flex flex-col overflow-hidden shadow-[0_-8px_40px_rgba(0,0,0,0.15)]",
          header: "border-b border-warm-200 px-4 pt-2 pb-3 shrink-0",
          body: "overflow-y-auto px-0 py-0",
          closeButton: "hidden",
        }}
      >
        <DrawerContent>
          {(close) => (
            <>
              <DrawerHeader className="flex-col gap-0">
                {/* Ручка */}
                <div className="flex justify-center pt-1 pb-2 w-full">
                  <div className="w-10 h-1 rounded-full bg-warm-300" />
                </div>
                <div className="flex items-center justify-between w-full">
                  <div>
                    <p className="text-base font-bold text-warm-900">
                      {selected?.member.name}
                    </p>
                    <p className="text-xs text-warm-400 mt-0.5">{monthLabel}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Кнопки копирования и PNG */}
                    {selected && selected.rows.length > 0 && (
                      <>
                        {/* Кнопка копирования */}
                        <button
                          onClick={() => {
                            if (!selected) return
                            const lines = [...selected.rows]
                              .sort((a, b) => a.date.localeCompare(b.date))
                              .map((r) => {
                                const sum = r.basePrice + r.bonus
                                return `${formatRowDate(r.date)} — ${r.eventType}: ${sum.toLocaleString("ru-RU")} ₽`
                              })
                            const text = [
                              `${selected.member.name} · ${monthLabel}`,
                              "",
                              ...lines,
                              "",
                              `Итого: ${selected.total.toLocaleString("ru-RU")} ₽`,
                            ].join("\n")
                            navigator.clipboard?.writeText(text)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          }}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            copied ? "bg-green-100 text-green-600" : "bg-warm-100 text-warm-600 active:bg-warm-200"
                          }`}
                          title="Скопировать"
                        >
                          {copied ? (
                            /* Палец вверх */
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                              <path fillRule="evenodd" clipRule="evenodd" d="M12.4382 2.77841C12.2931 2.73181 12.1345 2.74311 11.9998 2.80804C11.8523 2.87913 11.7548 3.0032 11.7197 3.13821L11.244 4.97206C11.0777 5.61339 10.8354 6.23198 10.5235 6.81599C10.0392 7.72267 9.30632 8.42 8.62647 9.00585L7.18773 10.2456C6.96475 10.4378 6.8474 10.7258 6.87282 11.0198L7.68498 20.4125C7.72601 20.887 8.12244 21.25 8.59635 21.25H13.245C16.3813 21.25 19.0238 19.0677 19.5306 16.1371L20.2361 12.0574C20.3332 11.4959 19.9014 10.9842 19.3348 10.9842H14.1537C13.1766 10.9842 12.4344 10.1076 12.5921 9.14471L13.2548 5.10015C13.3456 4.54613 13.3197 3.97923 13.1787 3.43584C13.1072 3.16009 12.8896 2.92342 12.5832 2.82498L12.4382 2.77841ZM11.3486 1.45674C11.8312 1.2242 12.3873 1.18654 12.897 1.35029L13.042 1.39686C13.819 1.64648 14.4252 2.26719 14.6307 3.0592C14.8241 3.80477 14.8596 4.58256 14.7351 5.34268L14.0724 9.38724C14.0639 9.439 14.1038 9.4842 14.1537 9.4842H19.3348C20.8341 9.4842 21.9695 10.8365 21.7142 12.313L21.0087 16.3928C20.3708 20.081 17.0712 22.75 13.245 22.75H8.59635C7.3427 22.75 6.29852 21.7902 6.19056 20.5417L5.3784 11.149C5.31149 10.3753 5.62022 9.61631 6.20855 9.10933L7.64729 7.86954C8.3025 7.30492 8.85404 6.75767 9.20042 6.10924C9.45699 5.62892 9.65573 5.12107 9.79208 4.59542L10.2678 2.76157C10.417 2.18627 10.8166 1.71309 11.3486 1.45674ZM2.96767 9.4849C3.36893 9.46758 3.71261 9.76945 3.74721 10.1696L4.71881 21.4061C4.78122 22.1279 4.21268 22.75 3.48671 22.75C2.80289 22.75 2.25 22.1953 2.25 21.5127V10.2342C2.25 9.83256 2.5664 9.50221 2.96767 9.4849Z" fill="currentColor"/>
                            </svg>
                          ) : (
                            /* Иконка копирования */
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                              <path fillRule="evenodd" clipRule="evenodd" d="M15 1.25H10.9436C9.10583 1.24998 7.65019 1.24997 6.51098 1.40314C5.33856 1.56076 4.38961 1.89288 3.64124 2.64124C2.89288 3.38961 2.56076 4.33856 2.40314 5.51098C2.24997 6.65019 2.24998 8.10582 2.25 9.94357V16C2.25 17.8722 3.62205 19.424 5.41551 19.7047C5.55348 20.4687 5.81753 21.1208 6.34835 21.6517C6.95027 22.2536 7.70814 22.5125 8.60825 22.6335C9.47522 22.75 10.5775 22.75 11.9451 22.75H15.0549C16.4225 22.75 17.5248 22.75 18.3918 22.6335C19.2919 22.5125 20.0497 22.2536 20.6517 21.6517C21.2536 21.0497 21.5125 20.2919 21.6335 19.3918C21.75 18.5248 21.75 17.4225 21.75 16.0549V10.9451C21.75 9.57754 21.75 8.47522 21.6335 7.60825C21.5125 6.70814 21.2536 5.95027 20.6517 5.34835C20.1208 4.81753 19.4687 4.55348 18.7047 4.41551C18.424 2.62205 16.8722 1.25 15 1.25ZM17.1293 4.27117C16.8265 3.38623 15.9876 2.75 15 2.75H11C9.09318 2.75 7.73851 2.75159 6.71085 2.88976C5.70476 3.02502 5.12511 3.27869 4.7019 3.7019C4.27869 4.12511 4.02502 4.70476 3.88976 5.71085C3.75159 6.73851 3.75 8.09318 3.75 10V16C3.75 16.9876 4.38624 17.8265 5.27117 18.1293C5.24998 17.5194 5.24999 16.8297 5.25 16.0549V10.9451C5.24998 9.57754 5.24996 8.47522 5.36652 7.60825C5.48754 6.70814 5.74643 5.95027 6.34835 5.34835C6.95027 4.74643 7.70814 4.48754 8.60825 4.36652C9.47522 4.24996 10.5775 4.24998 11.9451 4.25H15.0549C15.8297 4.24999 16.5194 4.24998 17.1293 4.27117ZM7.40901 6.40901C7.68577 6.13225 8.07435 5.9518 8.80812 5.85315C9.56347 5.75159 10.5646 5.75 12 5.75H15C16.4354 5.75 17.4365 5.75159 18.1919 5.85315C18.9257 5.9518 19.3142 6.13225 19.591 6.40901C19.8678 6.68577 20.0482 7.07435 20.1469 7.80812C20.2484 8.56347 20.25 9.56458 20.25 11V16C20.25 17.4354 20.2484 18.4365 20.1469 19.1919C20.0482 19.9257 19.8678 20.3142 19.591 20.591C19.3142 20.8678 18.9257 21.0482 18.1919 21.1469C17.4365 21.2484 16.4354 21.25 15 21.25H12C10.5646 21.25 9.56347 21.2484 8.80812 21.1469C8.07435 21.0482 7.68577 20.8678 7.40901 20.591C7.13225 20.3142 6.9518 19.9257 6.85315 19.1919C6.75159 18.4365 6.75 17.4354 6.75 16V11C6.75 9.56458 6.75159 8.56347 6.85315 7.80812C6.9518 7.07435 7.13225 6.68577 7.40901 6.40901Z" fill="currentColor"/>
                            </svg>
                          )}
                        </button>

                        {/* Кнопка PNG */}
                        <button
                          onClick={async () => {
                            if (!selected || downloading) return
                            setDownloading(true)
                            try {
                              await downloadMemberPng(
                                selected,
                                monthLabel,
                                shortName(selected.member.name, selected.member.patronymic),
                              )
                            } finally {
                              setDownloading(false)
                            }
                          }}
                          disabled={downloading}
                          className="w-8 h-8 rounded-xl bg-warm-100 text-warm-600 flex items-center justify-center active:bg-warm-200 shrink-0 disabled:opacity-50"
                          title="Скачать PNG"
                        >
                          {downloading ? (
                            <LoadingSpinner size="sm" color="#9b7653" />
                          ) : (
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                              <path fillRule="evenodd" clipRule="evenodd" d="M12 2.25C12.4142 2.25 12.75 2.58579 12.75 3V13.1893L15.4697 10.4697C15.7626 10.1768 16.2374 10.1768 16.5303 10.4697C16.8232 10.7626 16.8232 11.2374 16.5303 11.5303L12.5303 15.5303C12.2374 15.8232 11.7626 15.8232 11.4697 15.5303L7.46967 11.5303C7.17678 11.2374 7.17678 10.7626 7.46967 10.4697C7.76256 10.1768 8.23744 10.1768 8.53033 10.4697L11.25 13.1893V3C11.25 2.58579 11.5858 2.25 12 2.25ZM3.25 15C3.25 14.5858 3.58579 14.25 4 14.25C4.41421 14.25 4.75 14.5858 4.75 15V17C4.75 18.2426 5.75736 19.25 7 19.25H17C18.2426 19.25 19.25 18.2426 19.25 17V15C19.25 14.5858 19.5858 14.25 20 14.25C20.4142 14.25 20.75 14.5858 20.75 15V17C20.75 19.0711 19.0711 20.75 17 20.75H7C4.92893 20.75 3.25 19.0711 3.25 17V15Z" fill="currentColor"/>
                            </svg>
                          )}
                        </button>
                      </>
                    )}
                    <div className="text-right">
                      <p className="text-lg font-bold text-warm-800 tabular-nums">
                        {selected?.total.toLocaleString("ru-RU")} ₽
                      </p>
                      <p className="text-xs text-warm-400">
                        {selected?.events ?? 0}{" "}
                        {plural(selected?.events ?? 0, [
                          "выход",
                          "выхода",
                          "выходов",
                        ])}
                      </p>
                    </div>
                  </div>
                </div>
              </DrawerHeader>
              <DrawerBody>
                {selected && selected.rows.length > 0 ? (
                  <table className="warm-table">
                    <thead>
                      <tr>
                        <th className="text-left">Дата</th>
                        <th className="text-center">Тип</th>
                        <th className="text-right">Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...selected.rows]
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((r, i) => {
                          const [, , d] = r.date.split("-").map(Number);
                          return (
                            <tr key={i}>
                              <td className="text-warm-500 text-xs tabular-nums whitespace-nowrap">
                                {d}{" "}
                                {MONTHS_RU[mo - 1].toLowerCase().slice(0, 3)}
                              </td>
                              <td className="text-center font-medium text-warm-700 text-xs">
                                {r.eventType}
                              </td>
                              <td className="text-right tabular-nums font-medium text-warm-800">
                                {r.basePrice.toLocaleString("ru-RU")}
                                {r.bonus > 0 && (
                                  <span className="text-green-600 ml-1">
                                    +{r.bonus.toLocaleString("ru-RU")}
                                  </span>
                                )}{" "}
                                ₽
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-warm-100">
                        <td
                          colSpan={2}
                          className="font-bold text-warm-900 text-sm"
                        >
                          Итого
                        </td>
                        <td className="text-right font-bold text-warm-900 tabular-nums">
                          {selected.total.toLocaleString("ru-RU")} ₽
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <div className="py-8 flex flex-col items-center gap-2 text-warm-400">
                    <IconEmpty className="text-warm-200" />
                    <span className="text-sm">Выходов нет</span>
                  </div>
                )}
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
