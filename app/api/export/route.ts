import { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import type { ChoirEvent, Member } from '@/lib/types'

const MONTHS_RU = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

function allBorders(): Partial<ExcelJS.Borders> {
  const b: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF000000' } }
  return { top: b, left: b, bottom: b, right: b }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const month = req.nextUrl.searchParams.get('month')
  if (!month) return Response.json({ error: 'month required' }, { status: 400 })

  const [year, monthNum] = month.split('-').map(Number)
  const monthName = MONTHS_RU[monthNum - 1]
  const choirLabel = session.choirType === 'festive' ? 'праздничного' : 'буднего'

  const [events, members] = await Promise.all([
    new Promise<ChoirEvent[]>((res) =>
      db.events.find(
        { choirType: session.choirType, date: { $regex: new RegExp(`^${month}`) } },
        (err, docs) => res(err ? [] : (docs as unknown as ChoirEvent[]))
      )
    ),
    new Promise<Member[]>((res) =>
      db.members.find(
        { choirType: session.choirType, isActive: true },
        (err, docs) => res(err ? [] : (docs as unknown as Member[]))
      )
    ),
  ])

  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.createdAt.localeCompare(b.createdAt)
  })
  members.sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  const wb = new ExcelJS.Workbook()
  const ws1 = wb.addWorksheet('Табель')

  const totalCols = 2 + events.length + 1
  ws1.mergeCells(1, 1, 1, totalCols)
  const titleCell = ws1.getCell(1, 1)
  titleCell.value = `ГРАФИК ПОСЕЩЕНИЯ ПЕВЧИХ ${choirLabel.toUpperCase()} ХОРА ЗА ${monthName.toUpperCase()} ${year} г.`
  titleCell.font = { bold: true, size: 12 }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws1.getRow(1).height = 20

  const dateRow = ws1.getRow(2)
  const typeRow = ws1.getRow(3)
  dateRow.getCell(1).value = '№ п/п'
  dateRow.getCell(2).value = 'Дата'
  typeRow.getCell(2).value = 'Фамилия и имя'

  events.forEach((ev, i) => {
    const col = 3 + i
    const [, , day] = ev.date.split('-').map(Number)
    dateRow.getCell(col).value = new Date(ev.date + 'T00:00:00')
    dateRow.getCell(col).numFmt = 'd'
    typeRow.getCell(col).value = ev.eventType
    typeRow.getCell(col).alignment = { horizontal: 'center', wrapText: true }
    ws1.getColumn(col).width = 9
  })

  const sumCol = 3 + events.length
  dateRow.getCell(sumCol).value = 'Итого:'
  dateRow.getCell(sumCol).font = { bold: true }
  ws1.getColumn(sumCol).width = 12

  ;[dateRow, typeRow].forEach((row) => {
    row.eachCell((cell) => {
      cell.font = { ...(cell.font || {}), bold: true }
      cell.border = allBorders()
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    })
  })

  ws1.getColumn(1).width = 6
  ws1.getColumn(2).width = 22
  ws1.getRow(2).height = 22
  ws1.getRow(3).height = 40

  const memberIdSet = new Set(members.map((m) => m._id))

  members.forEach((member, mi) => {
    const rowNum = 4 + mi
    const row = ws1.getRow(rowNum)
    row.getCell(1).value = mi + 1
    row.getCell(2).value = member.name

    events.forEach((ev, i) => {
      const col = 3 + i
      const att = ev.attendances.find((a) => memberIdSet.has(a.memberId) && a.memberId === member._id)

      if (att) {
        const total = (att.basePrice || 0) + (att.bonus || 0)
        if (att.bonus > 0) {
          row.getCell(col).value = { formula: `${att.basePrice}+${att.bonus}`, result: total }
        } else if (total > 0) {
          row.getCell(col).value = total
        }
      }

      row.getCell(col).alignment = { horizontal: 'center' }
      row.getCell(col).border = allBorders()
    })

    if (events.length > 0) {
      const firstCol = ws1.getColumn(3).letter
      const lastCol = ws1.getColumn(2 + events.length).letter
      row.getCell(sumCol).value = { formula: `SUM(${firstCol}${rowNum}:${lastCol}${rowNum})` }
    }
    row.getCell(sumCol).font = { bold: true }
    row.getCell(sumCol).border = allBorders()
    row.getCell(1).border = allBorders()
    row.getCell(2).border = allBorders()
    row.getCell(1).alignment = { horizontal: 'center' }
    row.height = 18
  })

  const totalRowNum = 4 + members.length
  const totalRow = ws1.getRow(totalRowNum)
  totalRow.getCell(2).value = 'Итого:'
  totalRow.getCell(2).font = { bold: true }
  const sumColLetter = ws1.getColumn(sumCol).letter
  totalRow.getCell(sumCol).value = {
    formula: `SUM(${sumColLetter}4:${sumColLetter}${totalRowNum - 1})`,
  }
  totalRow.getCell(sumCol).font = { bold: true }
  totalRow.getCell(sumCol).border = allBorders()
  totalRow.getCell(2).border = allBorders()

  // Sheet 2: summary
  const ws2 = wb.addWorksheet('Ведомость')
  ws2.mergeCells(1, 1, 1, 3)
  ws2.getCell(1, 1).value = `Итоговая ведомость по вознаграждению ${choirLabel} хора ${monthName} ${year}г.`
  ws2.getCell(1, 1).font = { bold: true, size: 11 }
  ws2.getCell(1, 1).alignment = { horizontal: 'center' }

  ws2.getRow(2).values = ['№ п/п', 'ФИО', 'Итого, руб.']
  ws2.getRow(2).eachCell((cell) => {
    cell.font = { bold: true }
    cell.border = allBorders()
    cell.alignment = { horizontal: 'center' }
  })
  ws2.getColumn(1).width = 7
  ws2.getColumn(2).width = 24
  ws2.getColumn(3).width = 14

  members.forEach((member, mi) => {
    const rowNum = 3 + mi
    const sheet1Row = 4 + mi
    ws2.getCell(rowNum, 1).value = mi + 1
    ws2.getCell(rowNum, 2).value = member.name
    ws2.getCell(rowNum, 3).value = { formula: `Табель!${sumColLetter}${sheet1Row}` }
    ws2.getCell(rowNum, 3).numFmt = '#,##0'
    ;[1, 2, 3].forEach((c) => {
      ws2.getCell(rowNum, c).border = allBorders()
      ws2.getCell(rowNum, c).alignment = { horizontal: c === 2 ? 'left' : 'center' }
    })
  })

  const totalRow2Num = 3 + members.length
  ws2.getCell(totalRow2Num, 2).value = 'Итого:'
  ws2.getCell(totalRow2Num, 2).font = { bold: true }
  ws2.getCell(totalRow2Num, 3).value = { formula: `SUM(C3:C${totalRow2Num - 1})` }
  ws2.getCell(totalRow2Num, 3).font = { bold: true }
  ws2.getCell(totalRow2Num, 3).numFmt = '#,##0'
  ;[2, 3].forEach((c) => (ws2.getCell(totalRow2Num, c).border = allBorders()))

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `Табель_${choirLabel}_хора_${monthName}_${year}.xlsx`

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
