import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// ─── CSV ──────────────────────────────────────────────────────────────────────

function escapeCsv(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvString(headers: string[], rows: Record<string, unknown>[], keys: string[]): string {
  const lines: string[] = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(keys.map((k) => escapeCsv(row[k])).join(','));
  }
  return lines.join('\r\n');
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export async function buildExcelBuffer(
  headers: string[],
  rows: Record<string, unknown>[],
  keys: string[],
  sheetName: string = 'Report'
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BPCL Campaign Admin';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName);

  // Header row style
  sheet.columns = headers.map((h, i) => ({
    header: h,
    key: keys[i],
    width: Math.max(h.length + 4, 16),
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003087' } };
  headerRow.alignment = { horizontal: 'center' };
  headerRow.height = 22;

  // Data rows
  for (const row of rows) {
    sheet.addRow(keys.map((k) => row[k]));
  }

  // Alternate row shading
  for (let i = 2; i <= rows.length + 1; i++) {
    const r = sheet.getRow(i);
    if (i % 2 === 0) {
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4FF' } };
    }
    r.alignment = { horizontal: 'left' };
  }

  // Borders on all cells
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export function buildPdfBuffer(
  title: string,
  headers: string[],
  rows: Record<string, unknown>[],
  keys: string[],
  meta: { generatedBy?: string; filters?: string; rowCount?: number } = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 36;
    const contentWidth = pageWidth - margin * 2;

    // ── Header banner
    doc.rect(0, 0, pageWidth, 58).fill('#003087');
    doc.fillColor('#FFBF00').fontSize(16).font('Helvetica-Bold')
      .text('BPCL BIG REWARDS', margin, 14, { align: 'left' });
    doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica')
      .text(title, margin, 34, { align: 'left' });
    doc.fillColor('#FFFFFF').fontSize(8)
      .text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST  |  By: ${meta.generatedBy || 'Admin'}`, margin, 46, { align: 'right', width: contentWidth });

    // Confidential watermark
    doc.save();
    doc.rotate(45, { origin: [pageWidth / 2, pageHeight / 2] });
    doc.fillColor('#003087').opacity(0.04).fontSize(72).font('Helvetica-Bold')
      .text('CONFIDENTIAL', 0, pageHeight / 2 - 36, { align: 'center', width: pageWidth });
    doc.restore();

    let y = 72;

    // Meta row
    if (meta.filters) {
      doc.fillColor('#444444').fontSize(7.5).font('Helvetica')
        .text(`Filters: ${meta.filters}   |   Records: ${meta.rowCount ?? rows.length}`, margin, y);
      y += 16;
    }

    // Table
    const colWidth = Math.floor(contentWidth / headers.length);
    const rowHeight = 18;
    const headerHeight = 22;

    // Column header
    doc.rect(margin, y, contentWidth, headerHeight).fill('#003087');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7);
    headers.forEach((h, i) => {
      doc.text(h, margin + i * colWidth + 3, y + 6, { width: colWidth - 6, ellipsis: true, lineBreak: false });
    });
    y += headerHeight;

    // Data rows
    doc.font('Helvetica').fontSize(6.5);
    rows.forEach((row, ri) => {
      if (y + rowHeight > pageHeight - margin) {
        doc.addPage({ margin: 36, size: 'A4', layout: 'landscape' });
        y = margin;
        // Repeat header
        doc.rect(margin, y, contentWidth, headerHeight).fill('#003087');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7);
        headers.forEach((h, i) => {
          doc.text(h, margin + i * colWidth + 3, y + 6, { width: colWidth - 6, ellipsis: true, lineBreak: false });
        });
        y += headerHeight;
        doc.font('Helvetica').fontSize(6.5);
      }

      const bg = ri % 2 === 0 ? '#F0F4FF' : '#FFFFFF';
      doc.rect(margin, y, contentWidth, rowHeight).fill(bg);
      doc.fillColor('#222222');
      keys.forEach((k, i) => {
        const val = row[k] === null || row[k] === undefined ? '' : String(row[k]);
        doc.text(val, margin + i * colWidth + 3, y + 5, { width: colWidth - 6, ellipsis: true, lineBreak: false });
      });

      // Row border
      doc.rect(margin, y, contentWidth, rowHeight).stroke('#DDDDDD');
      y += rowHeight;
    });

    // Footer
    const range = doc.bufferedPageRange();
    for (let p = range.start; p < range.start + range.count; p++) {
      doc.switchToPage(p);
      doc.fillColor('#888888').fontSize(7).font('Helvetica')
        .text(`BPCL Campaign Platform — CONFIDENTIAL  |  Page ${p + 1} of ${range.count}`, margin, pageHeight - 20, { align: 'center', width: contentWidth });
    }

    doc.end();
  });
}


// Re-export column config for server-side use
export { REPORT_COLUMNS } from './report-columns';
