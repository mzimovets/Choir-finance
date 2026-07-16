import { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { getSession } from '@/lib/auth'
import { db, dbFind } from '@/lib/db'
import type { ChoirEvent, Member } from '@/lib/types'
import { shortName } from '@/lib/nameFormat'

const MONTHS_UPPER = [
  'ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ',
  'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ',
]
const MONTHS_LOWER = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

function thin(): Partial<ExcelJS.Border> {
  return { style: 'thin', color: { argb: 'FF000000' } }
}

function allBorders(): Partial<ExcelJS.Borders> {
  const b = thin()
  return { top: b, left: b, bottom: b, right: b }
}

function localDateKey(isoStr: string): string {
  return isoStr.split('T')[0].split(' ')[0]
}

// Create UTC midnight so Excel serializes the correct date regardless of server timezone
function localDate(isoStr: string): Date {
  const [y, mo, d] = localDateKey(isoStr).split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d))
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const month = req.nextUrl.searchParams.get('month')
  if (!month) return Response.json({ error: 'month required' }, { status: 400 })
  if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: 'Invalid month' }, { status: 400 })
  const memberId = req.nextUrl.searchParams.get('memberId')
  const memberIdsParam = req.nextUrl.searchParams.get('memberIds')
  const titleOverride = req.nextUrl.searchParams.get('title')

  const [year, monthNum] = month.split('-').map(Number)
  const choirLabel = session.choirType === 'festive' ? 'праздничного' : 'буднего'

  const [events, members] = await Promise.all([
    dbFind<ChoirEvent>(db.events, {
      choirType: session.choirType,
      date: { $regex: new RegExp(`^${month}`) },
    }),
    dbFind<Member>(db.members, { choirType: session.choirType, isActive: true }),
  ])

  events.sort((a, b) => {
    const da = localDateKey(a.date), db2 = localDateKey(b.date)
    if (da !== db2) return da.localeCompare(db2)
    const oa = a.order ?? Infinity, ob = b.order ?? Infinity
    if (oa !== ob) return oa - ob
    return a.createdAt.localeCompare(b.createdAt)
  })
  members.sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  // Персональный табель для одного певчего — тот же формат, что основной
  if (memberId) {
    const member = members.find(m => m._id === memberId)
    if (!member) return Response.json({ error: 'Member not found' }, { status: 404 })

    const wb2 = new ExcelJS.Workbook()
    const ws = wb2.addWorksheet('Табель')

    const numEv = events.length
    const sumCol = 3 + numEv

    // Row 1: title
    ws.mergeCells(1, 3, 1, sumCol)
    const tc = ws.getCell(1, 3)
    tc.value = `ТАБЕЛЬ ${shortName(member.name, member.patronymic).toUpperCase()} — ${MONTHS_UPPER[monthNum - 1]} ${year} г.`
    tc.font = { bold: true, size: 11, name: 'Calibri' }
    tc.alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getRow(1).height = 20
    ws.getRow(2).height = 6

    // Rows 3-4: two-row header
    ws.mergeCells(3, 1, 4, 1)
    const nh = ws.getCell(3, 1)
    nh.value = '№ п/п'; nh.font = { bold: true, size: 11, name: 'Calibri' }
    nh.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; nh.border = allBorders()

    ws.getCell(3, 2).value = 'Дата'
    ws.getCell(3, 2).font = { bold: true, size: 11, name: 'Calibri' }
    ws.getCell(3, 2).alignment = { horizontal: 'center', vertical: 'middle' }
    ws.getCell(3, 2).border = allBorders()

    ws.getCell(4, 2).value = 'Фамилия и имя'
    ws.getCell(4, 2).font = { bold: true, size: 11, name: 'Calibri' }
    ws.getCell(4, 2).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    ws.getCell(4, 2).border = allBorders()

    ws.mergeCells(3, sumCol, 4, sumCol)
    const sh = ws.getCell(3, sumCol)
    sh.value = 'Итого:'; sh.font = { bold: true, size: 11, name: 'Calibri' }
    sh.alignment = { horizontal: 'center', vertical: 'middle' }; sh.border = allBorders()

    // Date groups row 3
    {
      let i = 0, col = 3
      while (i < events.length) {
        const key = localDateKey(events[i].date)
        const startCol = col
        while (i < events.length && localDateKey(events[i].date) === key) { i++; col++ }
        const endCol = col - 1
        if (startCol < endCol) {
          ws.mergeCells(3, startCol, 3, endCol)
          for (let c = startCol; c <= endCol; c++) {
            ws.getCell(3, c).border = { top: thin(), bottom: thin(), left: c === startCol ? thin() : undefined, right: c === endCol ? thin() : undefined }
          }
        } else {
          ws.getCell(3, startCol).border = allBorders()
        }
        const dc = ws.getCell(3, startCol)
        dc.value = localDate(events[startCol - 3].date); dc.numFmt = 'd"."m'
        dc.font = { bold: true, size: 11, name: 'Calibri' }
        dc.alignment = { horizontal: 'center', vertical: 'middle' }
      }
    }

    // Event types row 4
    events.forEach((ev, idx) => {
      const c = 3 + idx
      const cell = ws.getCell(4, c)
      cell.value = ev.eventType; cell.font = { bold: true, size: 10, name: 'Calibri' }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }; cell.border = allBorders()
      ws.getColumn(c).width = 10
    })
    ws.getColumn(1).width = 6.66; ws.getColumn(2).width = 13.66; ws.getColumn(sumCol).width = 12
    ws.getRow(3).height = 20; ws.getRow(4).height = 18

    const sumColFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDAE3F3' } }

    // Member row 5
    ws.getCell(5, 1).value = 1
    ws.getCell(5, 1).alignment = { horizontal: 'center', vertical: 'middle' }; ws.getCell(5, 1).border = allBorders()
    ws.getCell(5, 2).value = shortName(member.name, member.patronymic)
    ws.getCell(5, 2).alignment = { horizontal: 'left', vertical: 'middle' }; ws.getCell(5, 2).border = allBorders()
    const fineFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } }
    events.forEach((ev, evIdx) => {
      const c = 3 + evIdx
      const att = ev.attendances.find(a => a.memberId === memberId)
      if (att) {
        const fine = att.fine || 0
        const total = (att.basePrice || 0) + (att.bonus || 0) - fine
        const parts = [String(att.basePrice || 0), ...(att.bonus > 0 ? [`+${att.bonus}`] : []), ...(fine > 0 ? [`-${fine}`] : [])]
        if (att.bonus > 0 || fine > 0) ws.getCell(5, c).value = { formula: parts.join(''), result: total }
        else if (total > 0) ws.getCell(5, c).value = total
        if (fine > 0) ws.getCell(5, c).fill = fineFill
      }
      ws.getCell(5, c).alignment = { horizontal: 'center', vertical: 'middle' }; ws.getCell(5, c).border = allBorders()
    })
    if (numEv > 0) {
      ws.getCell(5, sumCol).value = { formula: `SUM(${ws.getColumn(3).letter}5:${ws.getColumn(2 + numEv).letter}5)` }
    }
    ws.getCell(5, sumCol).fill = sumColFill; ws.getCell(5, sumCol).font = { bold: true, size: 11, name: 'Calibri' }
    ws.getCell(5, sumCol).alignment = { horizontal: 'right', vertical: 'middle' }; ws.getCell(5, sumCol).border = allBorders()
    ws.getRow(5).height = 18

    // Total row 6
    const totalFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } }
    ws.mergeCells(6, 1, 6, 2)
    ws.getCell(6, 1).value = 'Итого:'; ws.getCell(6, 1).font = { bold: true, size: 13, name: 'Calibri' }
    ws.getCell(6, 1).alignment = { horizontal: 'left', vertical: 'middle' }
    ws.getCell(6, 1).fill = totalFill; ws.getCell(6, 1).border = allBorders()
    if (numEv > 0) ws.mergeCells(6, 3, 6, sumCol - 1)
    ws.getCell(6, 3).fill = totalFill; ws.getCell(6, 3).border = allBorders()
    const sumLtr = ws.getColumn(sumCol).letter
    ws.getCell(6, sumCol).value = { formula: `${sumLtr}5` }
    ws.getCell(6, sumCol).font = { bold: true, size: 13, name: 'Calibri' }
    ws.getCell(6, sumCol).alignment = { horizontal: 'right', vertical: 'middle' }
    ws.getCell(6, sumCol).fill = totalFill; ws.getCell(6, sumCol).border = allBorders()
    ws.getRow(6).height = 20

    const buf2 = await wb2.xlsx.writeBuffer()
    const fname2 = `Табель_${shortName(member.name, member.patronymic)}_${MONTHS_LOWER[monthNum - 1]}_${year}.xlsx`
    return new Response(buf2, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fname2)}`,
      },
    })
  }

  // Группа певчих
  if (memberIdsParam) {
    const ids = memberIdsParam.split(',').filter(Boolean)
    const grpMembers = members.filter(m => ids.includes(m._id))
    const wbG = new ExcelJS.Workbook()
    const wsG = wbG.addWorksheet('Табель')
    const numEv2 = events.length
    const sumColG = 3 + numEv2
    wsG.mergeCells(1, 3, 1, sumColG)
    const tcG = wsG.getCell(1, 3)
    tcG.value = titleOverride || `ГРАФИК ПОСЕЩЕНИЯ ПЕВЧИХ ${choirLabel.toUpperCase()} ХОРА ЗА ${MONTHS_UPPER[monthNum - 1]} ${year} г.`
    tcG.font = { bold: true, size: 11, name: 'Calibri' }; tcG.alignment = { horizontal: 'center', vertical: 'middle' }
    wsG.getRow(1).height = 20; wsG.getRow(2).height = 6
    wsG.mergeCells(3, 1, 4, 1)
    Object.assign(wsG.getCell(3, 1), { value: '№ п/п', font: { bold: true, size: 11, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: allBorders() })
    Object.assign(wsG.getCell(3, 2), { value: 'Дата', font: { bold: true, size: 11, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'middle' }, border: allBorders() })
    Object.assign(wsG.getCell(4, 2), { value: 'Фамилия и имя', font: { bold: true, size: 11, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }, border: allBorders() })
    wsG.mergeCells(3, sumColG, 4, sumColG)
    Object.assign(wsG.getCell(3, sumColG), { value: 'Итого:', font: { bold: true, size: 11, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'middle' }, border: allBorders() })
    { let i = 0, col = 3
      while (i < events.length) {
        const key = localDateKey(events[i].date); const startCol = col
        while (i < events.length && localDateKey(events[i].date) === key) { i++; col++ }
        const endCol = col - 1
        if (startCol < endCol) { wsG.mergeCells(3, startCol, 3, endCol); for (let c = startCol; c <= endCol; c++) wsG.getCell(3, c).border = { top: thin(), bottom: thin(), left: c === startCol ? thin() : undefined, right: c === endCol ? thin() : undefined } }
        else wsG.getCell(3, startCol).border = allBorders()
        Object.assign(wsG.getCell(3, startCol), { value: localDate(events[startCol - 3].date), numFmt: 'd"."m', font: { bold: true, size: 11, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'middle' } })
      }
    }
    events.forEach((ev, idx) => { const c = 3 + idx; Object.assign(wsG.getCell(4, c), { value: ev.eventType, font: { bold: true, size: 10, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'middle' }, border: allBorders() }); wsG.getColumn(c).width = 10 })
    wsG.getColumn(1).width = 6.66; wsG.getColumn(2).width = 13.66; wsG.getColumn(sumColG).width = 12
    wsG.getRow(3).height = 20; wsG.getRow(4).height = 18
    const sumFillG: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDAE3F3' } }
    const totFillG: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } }
    grpMembers.forEach((mb, mi) => {
      const rn = 5 + mi
      wsG.getCell(rn, 1).value = mi + 1; wsG.getCell(rn, 1).alignment = { horizontal: 'center', vertical: 'middle' }; wsG.getCell(rn, 1).border = allBorders()
      wsG.getCell(rn, 2).value = shortName(mb.name, mb.patronymic); wsG.getCell(rn, 2).alignment = { horizontal: 'left', vertical: 'middle' }; wsG.getCell(rn, 2).border = allBorders()
      const fineFillG: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } }
      events.forEach((ev, evIdx) => { const c = 3 + evIdx; const att = ev.attendances.find(a => a.memberId === mb._id); if (att) { const fine = att.fine || 0; const t = (att.basePrice || 0) + (att.bonus || 0) - fine; const parts = [String(att.basePrice || 0), ...(att.bonus > 0 ? [`+${att.bonus}`] : []), ...(fine > 0 ? [`-${fine}`] : [])]; wsG.getCell(rn, c).value = (att.bonus > 0 || fine > 0) ? { formula: parts.join(''), result: t } : t > 0 ? t : undefined; if (fine > 0) wsG.getCell(rn, c).fill = fineFillG } wsG.getCell(rn, c).alignment = { horizontal: 'center', vertical: 'middle' }; wsG.getCell(rn, c).border = allBorders() })
      if (numEv2 > 0) wsG.getCell(rn, sumColG).value = { formula: `SUM(${wsG.getColumn(3).letter}${rn}:${wsG.getColumn(2 + numEv2).letter}${rn})` }
      wsG.getCell(rn, sumColG).fill = sumFillG; wsG.getCell(rn, sumColG).font = { bold: true, size: 11, name: 'Calibri' }; wsG.getCell(rn, sumColG).alignment = { horizontal: 'right', vertical: 'middle' }; wsG.getCell(rn, sumColG).border = allBorders()
      wsG.getRow(rn).height = 18
    })
    const totRn = 5 + grpMembers.length
    wsG.mergeCells(totRn, 1, totRn, 2)
    Object.assign(wsG.getCell(totRn, 1), { value: 'Итого:', font: { bold: true, size: 13, name: 'Calibri' }, alignment: { horizontal: 'left', vertical: 'middle' }, fill: totFillG, border: allBorders() })
    if (numEv2 > 0) wsG.mergeCells(totRn, 3, totRn, sumColG - 1)
    wsG.getCell(totRn, 3).fill = totFillG; wsG.getCell(totRn, 3).border = allBorders()
    const sumLtrG = wsG.getColumn(sumColG).letter
    Object.assign(wsG.getCell(totRn, sumColG), { value: { formula: `SUM(${sumLtrG}5:${sumLtrG}${totRn - 1})` }, font: { bold: true, size: 13, name: 'Calibri' }, alignment: { horizontal: 'right', vertical: 'middle' }, fill: totFillG, border: allBorders() })
    wsG.getRow(totRn).height = 20
    const bufG = await wbG.xlsx.writeBuffer()
    const fnameG = `Табель_группа_${MONTHS_LOWER[monthNum - 1]}_${year}.xlsx`
    return new Response(bufG, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fnameG)}` } })
  }

  const wb = new ExcelJS.Workbook()
  const ws1 = wb.addWorksheet('Табель')

  const numEvents = events.length
  const sumColNum = 3 + numEvents  // column for "Итого"

  // ── Row 1: Title (starts from C1, columns A-B left blank) ────
  ws1.mergeCells(1, 3, 1, sumColNum)
  const titleCell = ws1.getCell(1, 3)
  titleCell.value = titleOverride || `ГРАФИК ПОСЕЩЕНИЯ ПЕВЧИХ ${choirLabel.toUpperCase()} ХОРА ЗА ${MONTHS_UPPER[monthNum - 1]} ${year} г.`
  titleCell.font = { bold: true, size: 11, name: 'Calibri' }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws1.getRow(1).height = 20

  // ── Row 2: Empty ──────────────────────────────────────────────
  ws1.getRow(2).height = 6

  // ── Rows 3-4: Two-row header ──────────────────────────────────

  // A3:A4 merged → "№ п/п"
  ws1.mergeCells(3, 1, 4, 1)
  const numHeaderCell = ws1.getCell(3, 1)
  numHeaderCell.value = '№ п/п'
  numHeaderCell.font = { bold: true, size: 11, name: 'Calibri' }
  numHeaderCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  numHeaderCell.border = allBorders()

  // B3 → "Дата"
  const dateHeaderCell = ws1.getCell(3, 2)
  dateHeaderCell.value = 'Дата'
  dateHeaderCell.font = { bold: true, size: 11, name: 'Calibri' }
  dateHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' }
  dateHeaderCell.border = allBorders()

  // B4 → "Фамилия и имя"
  const nameHeaderCell = ws1.getCell(4, 2)
  nameHeaderCell.value = 'Фамилия и имя'
  nameHeaderCell.font = { bold: true, size: 11, name: 'Calibri' }
  nameHeaderCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  nameHeaderCell.border = allBorders()

  // sumCol row3:row4 merged → "Итого:"
  ws1.mergeCells(3, sumColNum, 4, sumColNum)
  const sumHeaderCell = ws1.getCell(3, sumColNum)
  sumHeaderCell.value = 'Итого:'
  sumHeaderCell.font = { bold: true, size: 11, name: 'Calibri' }
  sumHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sumHeaderCell.border = allBorders()

  // ── Date row (row 3) with merged same-day cells ───────────────
  {
    let i = 0
    let col = 3
    while (i < events.length) {
      const key = localDateKey(events[i].date)
      const startCol = col
      while (i < events.length && localDateKey(events[i].date) === key) {
        i++
        col++
      }
      const endCol = col - 1

      if (startCol < endCol) {
        ws1.mergeCells(3, startCol, 3, endCol)
        // Set outer borders for merged range
        for (let c = startCol; c <= endCol; c++) {
          const cell = ws1.getCell(3, c)
          cell.border = {
            top: thin(),
            bottom: thin(),
            left: c === startCol ? thin() : undefined,
            right: c === endCol ? thin() : undefined,
          }
        }
      } else {
        ws1.getCell(3, startCol).border = allBorders()
      }

      const dateCell = ws1.getCell(3, startCol)
      dateCell.value = localDate(events[startCol - 3].date)
      dateCell.numFmt = 'd"."m'
      dateCell.font = { bold: true, size: 11, name: 'Calibri' }
      dateCell.alignment = { horizontal: 'center', vertical: 'middle' }
    }
  }

  // ── Event type row (row 4) ────────────────────────────────────
  events.forEach((ev, idx) => {
    const c = 3 + idx
    const cell = ws1.getCell(4, c)
    cell.value = ev.eventType
    cell.font = { bold: true, size: 10, name: 'Calibri' }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false }
    cell.border = allBorders()
    ws1.getColumn(c).width = 10
  })

  ws1.getColumn(1).width = 6.66
  ws1.getColumn(2).width = 13.66
  ws1.getColumn(sumColNum).width = 12
  ws1.getRow(3).height = 20
  ws1.getRow(4).height = 18

  // Freeze columns A-B and header rows 1-4
  ws1.views = [{ state: 'frozen', xSplit: 2, ySplit: 4, topLeftCell: 'C5', activeCell: 'C5' }]

  // Light blue fill for "Итого" column in singer rows (theme 4 blue #4472C4 with tint 0.8)
  const sumColFill: ExcelJS.Fill = {
    type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDAE3F3' },
  }
  // Light pink fill for total row
  const totalRowFill: ExcelJS.Fill = {
    type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' },
  }

  // ── Singer rows (start at row 5) ─────────────────────────────
  const singers = members.filter(m => m.role !== 'reader')
  const readers = members.filter(m => m.role === 'reader')
  const memberTabRow = new Map<string, number>()
  const fineFillWs1: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } }
  const sumColLetter = ws1.getColumn(sumColNum).letter

  function writeTabMemberRow(member: Member, rowNum: number, displayNum: number) {
    memberTabRow.set(member._id, rowNum)
    const row = ws1.getRow(rowNum)
    row.getCell(1).value = displayNum
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(1).border = allBorders()
    row.getCell(2).value = shortName(member.name, member.patronymic)
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' }
    row.getCell(2).border = allBorders()
    events.forEach((ev, evIdx) => {
      const c = 3 + evIdx
      const att = ev.attendances.find(a => a.memberId === member._id)
      if (att) {
        const fine = att.fine || 0
        const total = (att.basePrice || 0) + (att.bonus || 0) - fine
        const parts = [String(att.basePrice || 0), ...(att.bonus > 0 ? [`+${att.bonus}`] : []), ...(fine > 0 ? [`-${fine}`] : [])]
        if (att.bonus > 0 || fine > 0) row.getCell(c).value = { formula: parts.join(''), result: total }
        else if (total > 0) row.getCell(c).value = total
        if (fine > 0) row.getCell(c).fill = fineFillWs1
      }
      row.getCell(c).alignment = { horizontal: 'center', vertical: 'middle' }
      row.getCell(c).border = allBorders()
    })
    if (events.length > 0) {
      row.getCell(sumColNum).value = {
        formula: `SUM(${ws1.getColumn(3).letter}${rowNum}:${ws1.getColumn(2 + events.length).letter}${rowNum})`,
      }
    }
    row.getCell(sumColNum).fill = sumColFill
    row.getCell(sumColNum).font = { bold: true, size: 11, name: 'Calibri' }
    row.getCell(sumColNum).alignment = { horizontal: 'right', vertical: 'middle' }
    row.getCell(sumColNum).border = allBorders()
    row.height = 18
  }

  singers.forEach((member, mi) => writeTabMemberRow(member, 5 + mi, mi + 1))

  let readerStartRow = 5 + singers.length
  if (readers.length > 0) {
    const divRow = 5 + singers.length
    ws1.mergeCells(divRow, 1, divRow, sumColNum)
    ws1.getCell(divRow, 1).value = 'ЧТЕЦ'
    ws1.getCell(divRow, 1).font = { bold: true, size: 10, name: 'Calibri' }
    ws1.getCell(divRow, 1).alignment = { horizontal: 'left', vertical: 'middle' }
    ws1.getCell(divRow, 1).border = allBorders()
    ws1.getRow(divRow).height = 15
    readerStartRow = divRow + 1
    readers.forEach((member, ri) => writeTabMemberRow(member, readerStartRow + ri, singers.length + ri + 1))
  }

  const lastMemberRow = readers.length > 0 ? readerStartRow + readers.length - 1 : 4 + singers.length

  // ── Total row ─────────────────────────────────────────────────
  const totalRowNum = lastMemberRow + 1
  ws1.mergeCells(totalRowNum, 1, totalRowNum, 2)
  const totalLabelCell = ws1.getCell(totalRowNum, 1)
  totalLabelCell.value = 'Итого:'
  totalLabelCell.font = { bold: true, size: 13, name: 'Calibri' }
  totalLabelCell.alignment = { horizontal: 'left', vertical: 'middle' }
  totalLabelCell.fill = totalRowFill
  totalLabelCell.border = allBorders()
  if (events.length > 0) ws1.mergeCells(totalRowNum, 3, totalRowNum, sumColNum - 1)
  ws1.getCell(totalRowNum, 3).fill = totalRowFill
  ws1.getCell(totalRowNum, 3).border = allBorders()
  const totalSumCell = ws1.getCell(totalRowNum, sumColNum)
  totalSumCell.value = { formula: `SUM(${sumColLetter}5:${sumColLetter}${lastMemberRow})` }
  totalSumCell.font = { bold: true, size: 13, name: 'Calibri' }
  totalSumCell.alignment = { horizontal: 'right', vertical: 'middle' }
  totalSumCell.fill = totalRowFill
  totalSumCell.border = allBorders()
  ws1.getRow(totalRowNum).height = 20

  // ── Sheet 2: Ведомость ────────────────────────────────────────
  const ws2 = wb.addWorksheet('Ведомость')
  ws2.mergeCells(1, 1, 1, 3)
  ws2.getCell(1, 1).value = `Итоговая ведомость по вознаграждению ${choirLabel} хора ${MONTHS_LOWER[monthNum - 1]} ${year}г.`
  ws2.getCell(1, 1).font = { bold: true, size: 11, name: 'Calibri' }
  ws2.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' }
  ws2.getRow(1).height = 20

  ws2.getRow(2).values = ['№ п/п', 'ФИО', 'Итого, руб.']
  ws2.getRow(2).eachCell((cell) => {
    cell.font = { bold: true }
    cell.border = allBorders()
    cell.alignment = { horizontal: 'center' }
  })
  ws2.getColumn(1).width = 7
  ws2.getColumn(2).width = 50
  ws2.getColumn(3).width = 14

  const subTotFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC9A87C' } }

  singers.forEach((member, mi) => {
    const rowNum = 3 + mi
    ws2.getCell(rowNum, 1).value = mi + 1
    ws2.getCell(rowNum, 1).alignment = { horizontal: 'center', vertical: 'middle' }
    ws2.getCell(rowNum, 2).value = shortName(member.name, member.patronymic)
    ws2.getCell(rowNum, 2).alignment = { horizontal: 'left', vertical: 'middle' }
    ws2.getCell(rowNum, 3).value = { formula: `Табель!${sumColLetter}${memberTabRow.get(member._id)}` }
    ws2.getCell(rowNum, 3).numFmt = '#,##0'
    ws2.getCell(rowNum, 3).alignment = { horizontal: 'right', vertical: 'middle' }
    ;[1, 2, 3].forEach(c => ws2.getCell(rowNum, c).border = allBorders())
  })

  let ws2Cur = 3 + singers.length

  if (readers.length > 0) {
    // Singer subtotal
    const singerSubTotRow = ws2Cur
    ws2.mergeCells(singerSubTotRow, 1, singerSubTotRow, 2)
    ws2.getCell(singerSubTotRow, 1).value = 'Итого:'
    ws2.getCell(singerSubTotRow, 1).font = { bold: true, size: 11, name: 'Calibri' }
    ws2.getCell(singerSubTotRow, 1).alignment = { horizontal: 'left', vertical: 'middle' }
    ws2.getCell(singerSubTotRow, 3).value = { formula: `SUM(C3:C${singerSubTotRow - 1})` }
    ws2.getCell(singerSubTotRow, 3).font = { bold: true, size: 11, name: 'Calibri' }
    ws2.getCell(singerSubTotRow, 3).numFmt = '#,##0'
    ws2.getCell(singerSubTotRow, 3).alignment = { horizontal: 'right', vertical: 'middle' }
    ;[1, 2, 3].forEach(c => ws2.getCell(singerSubTotRow, c).border = allBorders())
    ws2.getRow(singerSubTotRow).height = 18
    ws2Cur++

    // Divider
    const ws2DivRow = ws2Cur
    ws2.mergeCells(ws2DivRow, 1, ws2DivRow, 3)
    ws2.getCell(ws2DivRow, 1).value = 'ЧТЕЦ'
    ws2.getCell(ws2DivRow, 1).font = { bold: true, size: 10, name: 'Calibri' }
    ws2.getCell(ws2DivRow, 1).alignment = { horizontal: 'left', vertical: 'middle' }
    ws2.getCell(ws2DivRow, 1).border = allBorders()
    ws2.getRow(ws2DivRow).height = 15
    ws2Cur++

    // Reader rows
    const ws2ReaderStart = ws2Cur
    readers.forEach((member, ri) => {
      const rowNum = ws2ReaderStart + ri
      ws2.getCell(rowNum, 1).value = singers.length + ri + 1
      ws2.getCell(rowNum, 1).alignment = { horizontal: 'center', vertical: 'middle' }
      ws2.getCell(rowNum, 2).value = shortName(member.name, member.patronymic)
      ws2.getCell(rowNum, 2).alignment = { horizontal: 'left', vertical: 'middle' }
      ws2.getCell(rowNum, 3).value = { formula: `Табель!${sumColLetter}${memberTabRow.get(member._id)}` }
      ws2.getCell(rowNum, 3).numFmt = '#,##0'
      ws2.getCell(rowNum, 3).alignment = { horizontal: 'right', vertical: 'middle' }
      ;[1, 2, 3].forEach(c => ws2.getCell(rowNum, c).border = allBorders())
    })
    ws2Cur += readers.length

    // Reader subtotal
    const readerSubTotRow = ws2Cur
    ws2.mergeCells(readerSubTotRow, 1, readerSubTotRow, 2)
    ws2.getCell(readerSubTotRow, 1).value = 'Итого:'
    ws2.getCell(readerSubTotRow, 1).font = { bold: true, size: 11, name: 'Calibri' }
    ws2.getCell(readerSubTotRow, 1).alignment = { horizontal: 'left', vertical: 'middle' }
    ws2.getCell(readerSubTotRow, 3).value = { formula: `SUM(C${ws2ReaderStart}:C${readerSubTotRow - 1})` }
    ws2.getCell(readerSubTotRow, 3).font = { bold: true, size: 11, name: 'Calibri' }
    ws2.getCell(readerSubTotRow, 3).numFmt = '#,##0'
    ws2.getCell(readerSubTotRow, 3).alignment = { horizontal: 'right', vertical: 'middle' }
    ;[1, 2, 3].forEach(c => ws2.getCell(readerSubTotRow, c).border = allBorders())
    ws2.getRow(readerSubTotRow).height = 18
    ws2Cur++

    // Grand total
    const grandTotRow = ws2Cur
    ws2.mergeCells(grandTotRow, 1, grandTotRow, 2)
    ws2.getCell(grandTotRow, 1).value = 'Всего:'
    ws2.getCell(grandTotRow, 1).font = { bold: true, size: 13, name: 'Calibri' }
    ws2.getCell(grandTotRow, 1).alignment = { horizontal: 'left', vertical: 'middle' }
    ws2.getCell(grandTotRow, 3).value = { formula: `C${singerSubTotRow}+C${readerSubTotRow}` }
    ws2.getCell(grandTotRow, 3).font = { bold: true, size: 13, name: 'Calibri' }
    ws2.getCell(grandTotRow, 3).numFmt = '#,##0'
    ws2.getCell(grandTotRow, 3).alignment = { horizontal: 'right', vertical: 'middle' }
    ;[1, 2, 3].forEach(c => ws2.getCell(grandTotRow, c).border = allBorders())
    ws2.getRow(grandTotRow).height = 20
  } else {
    // No readers: single total row
    const totalRow2Num = ws2Cur
    ws2.mergeCells(totalRow2Num, 1, totalRow2Num, 2)
    ws2.getCell(totalRow2Num, 1).value = 'Итого:'
    ws2.getCell(totalRow2Num, 1).font = { bold: true, size: 13, name: 'Calibri' }
    ws2.getCell(totalRow2Num, 1).alignment = { horizontal: 'left', vertical: 'middle' }
    ws2.getCell(totalRow2Num, 3).value = { formula: `SUM(C3:C${totalRow2Num - 1})` }
    ws2.getCell(totalRow2Num, 3).font = { bold: true, size: 13, name: 'Calibri' }
    ws2.getCell(totalRow2Num, 3).numFmt = '#,##0'
    ws2.getCell(totalRow2Num, 3).alignment = { horizontal: 'right', vertical: 'middle' }
    ;[1, 2, 3].forEach(c => ws2.getCell(totalRow2Num, c).border = allBorders())
    ws2.getRow(totalRow2Num).height = 20
  }

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `Табель_${choirLabel}_хора_${MONTHS_LOWER[monthNum - 1]}_${year}.xlsx`

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
