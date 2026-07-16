import { NextRequest } from 'next/server'
import {
  Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun,
  WidthType, AlignmentType, BorderStyle, ShadingType, HeightRule,
  TableLayoutType,
} from 'docx'
import { getSession } from '@/lib/auth'
import { db, dbFind } from '@/lib/db'
import type { ChoirEvent, Member } from '@/lib/types'
import { shortName } from '@/lib/nameFormat'

const MONTHS_LOWER = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: 'auto' }
}

function thinBorder() {
  return { style: BorderStyle.SINGLE, size: 4, color: '000000' }
}

function allBorders() {
  const b = thinBorder()
  return { top: b, bottom: b, left: b, right: b }
}

function numFmt(n: number): string {
  return n === 0 ? '0' : n.toLocaleString('ru-RU')
}

const CELL_MARGINS = { top: 40, bottom: 40, left: 100, right: 100 }

function cell(
  text: string,
  opts: {
    bold?: boolean
    size?: number
    align?: (typeof AlignmentType)[keyof typeof AlignmentType]
    width?: number
    shading?: string
    borders?: ReturnType<typeof allBorders>
    colspan?: number
  } = {},
): TableCell {
  return new TableCell({
    columnSpan: opts.colspan,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.shading ? { type: ShadingType.SOLID, color: opts.shading } : undefined,
    borders: opts.borders ?? allBorders(),
    margins: CELL_MARGINS,
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.CENTER,
        children: [
          new TextRun({
            text,
            bold: opts.bold ?? false,
            size: (opts.size ?? 11) * 2,
            font: 'Calibri',
          }),
        ],
      }),
    ],
  })
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

  members.sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  // Персональная ведомость для одного певчего — тот же формат что основная ведомость
  if (memberId) {
    const member = members.find(m => m._id === memberId)
    if (!member) return Response.json({ error: 'Member not found' }, { status: 404 })

    const mbTotal = events.reduce((s, ev) => {
      const att = ev.attendances.find(a => a.memberId === memberId)
      return s + (att ? att.basePrice + att.bonus : 0)
    }, 0)

    const W_NUM  = 700
    const W_NAME = 4500
    const W_SUM  = 1800
    const W_TOTAL = W_NUM + W_NAME + W_SUM

    const mbRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        height: { value: 320, rule: HeightRule.ATLEAST },
        children: [
          cell('№ п/п',       { bold: true, align: AlignmentType.CENTER, width: W_NUM  }),
          cell('ФИО',         { bold: true, align: AlignmentType.CENTER, width: W_NAME }),
          cell('Итого, руб.', { bold: true, align: AlignmentType.CENTER, width: W_SUM  }),
        ],
      }),
      new TableRow({
        height: { value: 280, rule: HeightRule.ATLEAST },
        children: [
          cell('1',                                          { align: AlignmentType.CENTER, width: W_NUM  }),
          cell(shortName(member.name, member.patronymic),    { align: AlignmentType.LEFT,   width: W_NAME }),
          cell(numFmt(mbTotal),                              { align: AlignmentType.RIGHT,  width: W_SUM  }),
        ],
      }),
      new TableRow({
        height: { value: 320, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            columnSpan: 2,
            shading: { type: ShadingType.SOLID, color: 'D9D9D9' },
            borders: allBorders(),
            margins: CELL_MARGINS,
            children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'Итого:', bold: true, size: 26, font: 'Calibri' })] })],
          }),
          cell(numFmt(mbTotal), { bold: true, size: 13, align: AlignmentType.RIGHT, width: W_SUM, shading: 'D9D9D9' }),
        ],
      }),
    ]

    const mbDoc = new Document({
      sections: [{
        properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `Итоговая ведомость по вознаграждению певчего ${shortName(member.name, member.patronymic)} — ${MONTHS_LOWER[monthNum - 1]} ${year}г.`, bold: true, size: 24, font: 'Calibri' })],
            spacing: { after: 200 },
          }),
          new Table({ layout: TableLayoutType.FIXED, width: { size: W_TOTAL, type: WidthType.DXA }, alignment: AlignmentType.CENTER, rows: mbRows }),
        ],
      }],
    })

    const mbBuf = await Packer.toBuffer(mbDoc)
    const mbFname = `Ведомость_${shortName(member.name, member.patronymic)}_${MONTHS_LOWER[monthNum - 1]}_${year}.docx`
    return new Response(mbBuf as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(mbFname)}`,
      },
    })
  }

  // Группа певчих
  if (memberIdsParam) {
    const ids = memberIdsParam.split(',').filter(Boolean)
    const grpMembers = members.filter(m => ids.includes(m._id))
    const W_NG = 700, W_NAG = 4500, W_SG = 1800, W_TG = W_NG + W_NAG + W_SG
    const grpTotal = grpMembers.reduce((s, m) => s + events.reduce((ss, ev) => { const att = ev.attendances.find(a => a.memberId === m._id); return ss + (att ? att.basePrice + att.bonus : 0) }, 0), 0)
    const grpRows: TableRow[] = [
      new TableRow({ tableHeader: true, height: { value: 320, rule: HeightRule.ATLEAST }, children: [cell('№ п/п', { bold: true, align: AlignmentType.CENTER, width: W_NG }), cell('ФИО', { bold: true, align: AlignmentType.CENTER, width: W_NAG }), cell('Итого, руб.', { bold: true, align: AlignmentType.CENTER, width: W_SG })] }),
      ...grpMembers.map((m, i) => new TableRow({ height: { value: 280, rule: HeightRule.ATLEAST }, children: [cell(String(i + 1), { align: AlignmentType.CENTER, width: W_NG }), cell(shortName(m.name, m.patronymic), { align: AlignmentType.LEFT, width: W_NAG }), cell(numFmt(events.reduce((ss, ev) => { const att = ev.attendances.find(a => a.memberId === m._id); return ss + (att ? att.basePrice + att.bonus : 0) }, 0)), { align: AlignmentType.RIGHT, width: W_SG })] })),
      new TableRow({ height: { value: 320, rule: HeightRule.ATLEAST }, children: [new TableCell({ columnSpan: 2, shading: { type: ShadingType.SOLID, color: 'D9D9D9' }, borders: allBorders(), margins: CELL_MARGINS, children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'Итого:', bold: true, size: 26, font: 'Calibri' })] })] }), cell(numFmt(grpTotal), { bold: true, size: 13, align: AlignmentType.RIGHT, width: W_SG, shading: 'D9D9D9' })] }),
    ]
    const grpDoc = new Document({ sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: titleOverride || `Ведомость — ${MONTHS_LOWER[monthNum - 1]} ${year}г.`, bold: true, size: 24, font: 'Calibri' })], spacing: { after: 200 } }), new Table({ layout: TableLayoutType.FIXED, width: { size: W_TG, type: WidthType.DXA }, alignment: AlignmentType.CENTER, rows: grpRows })] }] })
    const grpBuf = await Packer.toBuffer(grpDoc)
    const grpFname = `Ведомость_группа_${MONTHS_LOWER[monthNum - 1]}_${year}.docx`
    return new Response(grpBuf as unknown as BodyInit, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(grpFname)}` } })
  }

  // Сумма по певчему = сумма всех его выходов за месяц
  function memberTotal(member: Member): number {
    return events.reduce((s, ev) => {
      const att = ev.attendances.find((a) => a.memberId === member._id)
      return s + (att ? (att.basePrice || 0) + (att.bonus || 0) : 0)
    }, 0)
  }

  const singers = members.filter(m => m.role !== 'reader')
  const readers = members.filter(m => m.role === 'reader')
  const singerTotal = singers.reduce((s, m) => s + memberTotal(m), 0)
  const readerTotal = readers.reduce((s, m) => s + memberTotal(m), 0)
  const grandTotal = singerTotal + readerTotal

  // Ширины колонок в DXA (1440 DXA = 1 дюйм)
  const W_NUM  = 700   // №
  const W_NAME = 4500  // ФИО
  const W_SUM  = 1800  // Итого, руб.
  const W_TOTAL = W_NUM + W_NAME + W_SUM

  const headerShading = 'FFFFFF'
  const totalShading  = 'D9D9D9'

  const rows: TableRow[] = []

  // ── Строка заголовка колонок ─────────────────────────────────
  rows.push(new TableRow({
    tableHeader: true,
    height: { value: 320, rule: HeightRule.ATLEAST },
    children: [
      cell('№ п/п',     { bold: true, align: AlignmentType.CENTER, width: W_NUM,  shading: headerShading }),
      cell('ФИО',       { bold: true, align: AlignmentType.CENTER, width: W_NAME, shading: headerShading }),
      cell('Итого, руб.', { bold: true, align: AlignmentType.CENTER, width: W_SUM,  shading: headerShading }),
    ],
  }))

  // ── Строки певчих ────────────────────────────────────────────
  singers.forEach((member, mi) => {
    rows.push(new TableRow({
      height: { value: 280, rule: HeightRule.ATLEAST },
      children: [
        cell(String(mi + 1),                           { align: AlignmentType.CENTER, width: W_NUM  }),
        cell(shortName(member.name, member.patronymic), { align: AlignmentType.LEFT,   width: W_NAME }),
        cell(numFmt(memberTotal(member)),               { align: AlignmentType.RIGHT,  width: W_SUM  }),
      ],
    }))
  })

  if (readers.length > 0) {
    // ── Итого певчих ─────────────────────────────────────────────
    rows.push(new TableRow({
      height: { value: 320, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({
          columnSpan: 2,
          borders: allBorders(),
          margins: CELL_MARGINS,
          children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'Итого:', bold: true, size: 26, font: 'Calibri' })] })],
        }),
        cell(numFmt(singerTotal), { bold: true, size: 13, align: AlignmentType.RIGHT, width: W_SUM }),
      ],
    }))

    // ── Разделитель ЧТЕЦ ─────────────────────────────────────────
    rows.push(new TableRow({
      height: { value: 260, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({
          columnSpan: 3,
          borders: allBorders(),
          margins: CELL_MARGINS,
          children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'ЧТЕЦ', bold: true, size: 20, font: 'Calibri' })] })],
        }),
      ],
    }))

    // ── Строки чтецов ────────────────────────────────────────────
    readers.forEach((member, ri) => {
      rows.push(new TableRow({
        height: { value: 280, rule: HeightRule.ATLEAST },
        children: [
          cell(String(singers.length + ri + 1),          { align: AlignmentType.CENTER, width: W_NUM  }),
          cell(shortName(member.name, member.patronymic), { align: AlignmentType.LEFT,   width: W_NAME }),
          cell(numFmt(memberTotal(member)),               { align: AlignmentType.RIGHT,  width: W_SUM  }),
        ],
      }))
    })

    // ── Итого чтецов ─────────────────────────────────────────────
    rows.push(new TableRow({
      height: { value: 320, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({
          columnSpan: 2,
          borders: allBorders(),
          margins: CELL_MARGINS,
          children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'Итого:', bold: true, size: 26, font: 'Calibri' })] })],
        }),
        cell(numFmt(readerTotal), { bold: true, size: 13, align: AlignmentType.RIGHT, width: W_SUM }),
      ],
    }))

    // ── Всего ────────────────────────────────────────────────────
    rows.push(new TableRow({
      height: { value: 320, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({
          columnSpan: 2,
          shading: { type: ShadingType.SOLID, color: totalShading },
          borders: allBorders(),
          margins: CELL_MARGINS,
          children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'Всего:', bold: true, size: 26, font: 'Calibri' })] })],
        }),
        cell(numFmt(grandTotal), { bold: true, size: 13, align: AlignmentType.RIGHT, width: W_SUM, shading: totalShading }),
      ],
    }))
  } else {
    // ── Итоговая строка (без чтецов) ─────────────────────────────
    rows.push(new TableRow({
      height: { value: 320, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({
          columnSpan: 2,
          shading: { type: ShadingType.SOLID, color: totalShading },
          borders: allBorders(),
          margins: CELL_MARGINS,
          children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'Итого:', bold: true, size: 26, font: 'Calibri' })] })],
        }),
        cell(numFmt(grandTotal), { bold: true, size: 13, align: AlignmentType.RIGHT, width: W_SUM, shading: totalShading }),
      ],
    }))
  }

  const table = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: W_TOTAL, type: WidthType.DXA },
    alignment: AlignmentType.CENTER,
    rows,
  })

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: titleOverride || `Итоговая ведомость по вознаграждению ${choirLabel} хора ${MONTHS_LOWER[monthNum - 1]} ${year}г.`,
              bold: true,
              size: 24,
              font: 'Calibri',
            }),
          ],
          spacing: { after: 200 },
        }),
        table,
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const filename = `Ведомость_${choirLabel}_хора_${MONTHS_LOWER[monthNum - 1]}_${year}.docx`

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
