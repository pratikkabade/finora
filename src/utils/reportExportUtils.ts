import type { Account, Category, Transaction } from '../types/finance.types';
import { intToHex } from './colorUtils';

interface ExportTransactionsOptions {
    transactions: Transaction[];
    accounts: Account[];
    categories: Category[];
    title: string;
    subtitle?: string;
    fileBaseName?: string;
}

interface ExportRow {
    date: string;
    title: string;
    account: string;
    accountColor?: number;
    category: string;
    categoryColor?: number;
    type: string;
    amount: string;
}

interface PdfColor {
    red: number;
    green: number;
    blue: number;
}

interface PdfTextOptions {
    text: string;
    x: number;
    y: number;
    fontSize: number;
    fontKey?: 'F1' | 'F2';
    color?: PdfColor;
}

interface PdfRoundedRectOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    fillColor?: PdfColor;
    strokeColor?: PdfColor;
    lineWidth?: number;
}

const WHITE: PdfColor = { red: 1, green: 1, blue: 1 };
const BLACK: PdfColor = { red: 0, green: 0, blue: 0 };
const SLATE_50: PdfColor = { red: 0.973, green: 0.980, blue: 0.988 };
const SLATE_200: PdfColor = { red: 0.886, green: 0.910, blue: 0.941 };
const SLATE_400: PdfColor = { red: 0.580, green: 0.639, blue: 0.722 };
const SLATE_500: PdfColor = { red: 0.392, green: 0.455, blue: 0.545 };
const SLATE_700: PdfColor = { red: 0.200, green: 0.275, blue: 0.369 };
const SLATE_900: PdfColor = { red: 0.059, green: 0.090, blue: 0.165 };
const GREEN_600: PdfColor = { red: 0.086, green: 0.478, blue: 0.235 };
const RED_600: PdfColor = { red: 0.863, green: 0.149, blue: 0.149 };

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN_X = 38;
const PAGE_MARGIN_BOTTOM = 44;
const CARD_TOP_Y = 648;
const CARD_WIDTH = 259;
const CARD_HEIGHT = 122;
const CARD_GAP_X = 18;
const CARD_GAP_Y = 16;
const CARDS_PER_ROW = 2;
const ROWS_PER_PAGE = 4;
const CARDS_PER_PAGE = CARDS_PER_ROW * ROWS_PER_PAGE;

const getTransactionTimestamp = (transaction: Transaction) => {
    return transaction.dateTime || transaction.dueDate || 0;
};

const formatTransactionDate = (timestamp: number) => {
    if (!timestamp) {
        return 'No date';
    }

    return new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const formatTransactionAmount = (transaction: Transaction) => {
    const formattedAmount = transaction.amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    if (transaction.type === 'INCOME') {
        return `+Rs ${formattedAmount}`;
    }

    if (transaction.type === 'EXPENSE') {
        return `-Rs ${formattedAmount}`;
    }

    return `Rs ${formattedAmount}`;
};

const slugify = (value: string) => {
    const normalizedValue = value.trim().toLowerCase();
    const slug = normalizedValue
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return slug || 'transactions-export';
};

const escapeHtml = (value: string) => {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

const sanitizePdfText = (value: string) => {
    return value
        .normalize('NFKD')
        .replace(/[^\x20-\x7E]/g, '?');
};

const escapePdfText = (value: string) => {
    return sanitizePdfText(value)
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)');
};

const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const buildExportRows = (transactions: Transaction[], accounts: Account[], categories: Category[]): ExportRow[] => {
    return transactions.map((transaction) => {
        const account = accounts.find((item) => item.id === transaction.accountId);
        const category = categories.find((item) => item.id === transaction.categoryId);

        return {
            date: formatTransactionDate(getTransactionTimestamp(transaction)),
            title: transaction.title || 'No title',
            account: account?.name || 'Unknown account',
            accountColor: account?.color,
            category: category?.name || 'Uncategorized',
            categoryColor: category?.color,
            type: transaction.type,
            amount: formatTransactionAmount(transaction),
        };
    });
};

const getDownloadBaseName = (fileBaseName?: string, fallbackTitle?: string) => {
    const rawValue = fileBaseName || fallbackTitle || 'transactions-export';
    const dateStamp = new Date().toISOString().split('T')[0];
    return `${slugify(rawValue)}-${dateStamp}`;
};

const hexToPdfColor = (hex: string): PdfColor => {
    const normalized = hex.replace('#', '');
    const red = parseInt(normalized.slice(0, 2), 16) / 255;
    const green = parseInt(normalized.slice(2, 4), 16) / 255;
    const blue = parseInt(normalized.slice(4, 6), 16) / 255;

    return { red, green, blue };
};

const getPdfColorFromInt = (color?: number, fallbackHex = '#94A3B8') => {
    if (typeof color !== 'number') {
        return hexToPdfColor(fallbackHex);
    }

    return hexToPdfColor(intToHex(color));
};

const mixPdfColors = (source: PdfColor, target: PdfColor, ratio: number): PdfColor => {
    const clampedRatio = Math.max(0, Math.min(1, ratio));

    return {
        red: (source.red * (1 - clampedRatio)) + (target.red * clampedRatio),
        green: (source.green * (1 - clampedRatio)) + (target.green * clampedRatio),
        blue: (source.blue * (1 - clampedRatio)) + (target.blue * clampedRatio),
    };
};

const darkenPdfColor = (color: PdfColor, amount: number) => {
    return mixPdfColors(color, BLACK, amount);
};

const pdfColorString = (color: PdfColor) => {
    return `${color.red.toFixed(3)} ${color.green.toFixed(3)} ${color.blue.toFixed(3)}`;
};

const estimateTextWidth = (text: string, fontSize: number, fontKey: 'F1' | 'F2' = 'F1') => {
    const widthMultiplier = fontKey === 'F2' ? 0.58 : 0.52;
    return sanitizePdfText(text).length * fontSize * widthMultiplier;
};

const truncateTextToWidth = (text: string, maxWidth: number, fontSize: number, fontKey: 'F1' | 'F2' = 'F1') => {
    const sanitizedText = sanitizePdfText(text);

    if (estimateTextWidth(sanitizedText, fontSize, fontKey) <= maxWidth) {
        return sanitizedText;
    }

    const ellipsis = '...';
    let candidate = sanitizedText;

    while (candidate.length > 0 && estimateTextWidth(`${candidate}${ellipsis}`, fontSize, fontKey) > maxWidth) {
        candidate = candidate.slice(0, -1);
    }

    return candidate ? `${candidate}${ellipsis}` : ellipsis;
};

const wrapTextToWidth = (
    text: string,
    maxWidth: number,
    fontSize: number,
    maxLines: number,
    fontKey: 'F1' | 'F2' = 'F1',
) => {
    const sanitizedText = sanitizePdfText(text).replace(/\s+/g, ' ').trim();

    if (!sanitizedText) {
        return [''];
    }

    const words = sanitizedText.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;

        if (estimateTextWidth(nextLine, fontSize, fontKey) <= maxWidth) {
            currentLine = nextLine;
            return;
        }

        if (!currentLine) {
            lines.push(truncateTextToWidth(word, maxWidth, fontSize, fontKey));
            return;
        }

        lines.push(currentLine);
        currentLine = word;
    });

    if (currentLine) {
        lines.push(currentLine);
    }

    if (lines.length <= maxLines) {
        return lines;
    }

    const limitedLines = lines.slice(0, maxLines);
    limitedLines[maxLines - 1] = truncateTextToWidth(limitedLines[maxLines - 1], maxWidth, fontSize, fontKey);
    return limitedLines;
};

const buildRoundedRectPath = (x: number, y: number, width: number, height: number, radius: number) => {
    const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
    const curve = safeRadius * 0.5522847498;

    return [
        `${(x + safeRadius).toFixed(2)} ${y.toFixed(2)} m`,
        `${(x + width - safeRadius).toFixed(2)} ${y.toFixed(2)} l`,
        `${(x + width - safeRadius + curve).toFixed(2)} ${y.toFixed(2)} ${(x + width).toFixed(2)} ${(y + safeRadius - curve).toFixed(2)} ${(x + width).toFixed(2)} ${(y + safeRadius).toFixed(2)} c`,
        `${(x + width).toFixed(2)} ${(y + height - safeRadius).toFixed(2)} l`,
        `${(x + width).toFixed(2)} ${(y + height - safeRadius + curve).toFixed(2)} ${(x + width - safeRadius + curve).toFixed(2)} ${(y + height).toFixed(2)} ${(x + width - safeRadius).toFixed(2)} ${(y + height).toFixed(2)} c`,
        `${(x + safeRadius).toFixed(2)} ${(y + height).toFixed(2)} l`,
        `${(x + safeRadius - curve).toFixed(2)} ${(y + height).toFixed(2)} ${x.toFixed(2)} ${(y + height - safeRadius + curve).toFixed(2)} ${x.toFixed(2)} ${(y + height - safeRadius).toFixed(2)} c`,
        `${x.toFixed(2)} ${(y + safeRadius).toFixed(2)} l`,
        `${x.toFixed(2)} ${(y + safeRadius - curve).toFixed(2)} ${(x + safeRadius - curve).toFixed(2)} ${y.toFixed(2)} ${(x + safeRadius).toFixed(2)} ${y.toFixed(2)} c`,
    ].join('\n');
};

const drawRoundedRect = ({
    x,
    y,
    width,
    height,
    radius,
    fillColor,
    strokeColor,
    lineWidth = 1,
}: PdfRoundedRectOptions) => {
    const commands: string[] = [];

    if (fillColor) {
        commands.push(`${pdfColorString(fillColor)} rg`);
    }

    if (strokeColor) {
        commands.push(`${pdfColorString(strokeColor)} RG`);
        commands.push(`${lineWidth.toFixed(2)} w`);
    }

    commands.push(buildRoundedRectPath(x, y, width, height, radius));

    if (fillColor && strokeColor) {
        commands.push('h B');
    } else if (fillColor) {
        commands.push('h f');
    } else {
        commands.push('h S');
    }

    return commands.join('\n');
};

const drawText = ({
    text,
    x,
    y,
    fontSize,
    fontKey = 'F1',
    color = SLATE_900,
}: PdfTextOptions) => {
    return [
        'BT',
        `/${fontKey} ${fontSize} Tf`,
        `${pdfColorString(color)} rg`,
        `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
        `(${escapePdfText(text)}) Tj`,
        'ET',
    ].join('\n');
};

const drawChip = (label: string, color: PdfColor, x: number, y: number, maxWidth: number) => {
    const chipHeight = 18;
    const labelText = truncateTextToWidth(label, maxWidth - 16, 8.5, 'F1');
    const chipWidth = Math.max(72, Math.min(maxWidth, estimateTextWidth(labelText, 8.5, 'F1') + 16));
    const fillColor = mixPdfColors(color, WHITE, 0.84);
    const strokeColor = mixPdfColors(color, WHITE, 0.24);
    const textColor = darkenPdfColor(color, 0.16);

    return [
        drawRoundedRect({
            x,
            y,
            width: chipWidth,
            height: chipHeight,
            radius: chipHeight / 2,
            fillColor,
            strokeColor,
            lineWidth: 0.9,
        }),
        drawText({
            text: labelText,
            x: x + 8,
            y: y + 5.2,
            fontSize: 8.5,
            color: textColor,
        }),
    ].join('\n');
};

const getTypeColor = (type: string) => {
    if (type === 'INCOME') {
        return GREEN_600;
    }

    if (type === 'EXPENSE') {
        return RED_600;
    }

    return SLATE_700;
};

const drawTransactionCard = (row: ExportRow, x: number, y: number, width: number, height: number) => {
    const commands: string[] = [];
    const cardShadowColor = mixPdfColors(SLATE_400, WHITE, 0.72);
    const cardStrokeColor = mixPdfColors(SLATE_200, WHITE, 0.08);
    const amountColor = getTypeColor(row.type);
    const badgeFill = mixPdfColors(amountColor, WHITE, 0.84);
    const badgeStroke = mixPdfColors(amountColor, WHITE, 0.24);
    const badgeText = darkenPdfColor(amountColor, 0.14);
    const titleLines = wrapTextToWidth(row.title, width - 128, 12, 2, 'F2');
    const amountText = truncateTextToWidth(row.amount, 96, 14, 'F2');
    const amountWidth = estimateTextWidth(amountText, 14, 'F2');
    const amountX = x + width - 16 - amountWidth;
    const badgeTextWidth = estimateTextWidth(row.type, 8.5, 'F2');
    const badgeWidth = Math.max(58, badgeTextWidth + 18);
    const badgeX = x + width - 16 - badgeWidth;
    const chipMaxWidth = width - 32;
    const accountColor = getPdfColorFromInt(row.accountColor, '#0EA5E9');
    const categoryColor = getPdfColorFromInt(row.categoryColor, '#14B8A6');

    commands.push(drawRoundedRect({
        x: x + 2,
        y: y - 3,
        width,
        height,
        radius: 18,
        fillColor: cardShadowColor,
    }));

    commands.push(drawRoundedRect({
        x,
        y,
        width,
        height,
        radius: 18,
        fillColor: WHITE,
        strokeColor: cardStrokeColor,
        lineWidth: 1,
    }));

    titleLines.forEach((line, index) => {
        commands.push(drawText({
            text: line,
            x: x + 16,
            y: y + height - 26 - (index * 14),
            fontSize: index === 0 ? 12 : 11.5,
            fontKey: 'F2',
            color: SLATE_900,
        }));
    });

    commands.push(drawText({
        text: row.date,
        x: x + 16,
        y: y + height - 60,
        fontSize: 8.8,
        color: SLATE_500,
    }));

    commands.push(drawText({
        text: amountText,
        x: Math.max(x + width - 112, amountX),
        y: y + height - 28,
        fontSize: 14,
        fontKey: 'F2',
        color: amountColor,
    }));

    commands.push(drawRoundedRect({
        x: badgeX,
        y: y + height - 58,
        width: badgeWidth,
        height: 18,
        radius: 9,
        fillColor: badgeFill,
        strokeColor: badgeStroke,
        lineWidth: 0.9,
    }));

    commands.push(drawText({
        text: row.type,
        x: badgeX + 8,
        y: y + height - 52.7,
        fontSize: 8.5,
        fontKey: 'F2',
        color: badgeText,
    }));

    commands.push(drawChip(row.account, accountColor, x + 16, y + 30, chipMaxWidth));
    commands.push(drawChip(row.category, categoryColor, x + 16, y + 8, chipMaxWidth));

    return commands.join('\n');
};

const createPdfBlob = (pageContentStreams: string[]) => {
    const regularFontObjectNumber = 3;
    const boldFontObjectNumber = 4;
    const pageObjects = pageContentStreams.map((contentStream, index) => {
        const pageObjectNumber = 5 + (index * 2);
        const contentObjectNumber = pageObjectNumber + 1;

        return {
            pageObjectNumber,
            contentObjectNumber,
            contentStream,
        };
    });

    const pageReferences = pageObjects.map((page) => `${page.pageObjectNumber} 0 R`).join(' ');
    const objects = new Map<number, string>();

    objects.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
    objects.set(2, `<< /Type /Pages /Count ${pageObjects.length} /Kids [${pageReferences}] >>`);
    objects.set(regularFontObjectNumber, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    objects.set(boldFontObjectNumber, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    pageObjects.forEach((page) => {
        objects.set(
            page.pageObjectNumber,
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontObjectNumber} 0 R /F2 ${boldFontObjectNumber} 0 R >> >> /Contents ${page.contentObjectNumber} 0 R >>`,
        );
        objects.set(
            page.contentObjectNumber,
            `<< /Length ${page.contentStream.length} >>\nstream\n${page.contentStream}\nendstream`,
        );
    });

    const maxObjectNumber = Math.max(...Array.from(objects.keys()));
    let pdfContent = '%PDF-1.4\n';
    const offsets: number[] = [0];

    for (let objectNumber = 1; objectNumber <= maxObjectNumber; objectNumber += 1) {
        const objectContent = objects.get(objectNumber);

        if (!objectContent) {
            continue;
        }

        offsets[objectNumber] = pdfContent.length;
        pdfContent += `${objectNumber} 0 obj\n${objectContent}\nendobj\n`;
    }

    const xrefOffset = pdfContent.length;
    pdfContent += `xref\n0 ${maxObjectNumber + 1}\n`;
    pdfContent += '0000000000 65535 f \n';

    for (let objectNumber = 1; objectNumber <= maxObjectNumber; objectNumber += 1) {
        const offset = offsets[objectNumber] || 0;
        pdfContent += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    }

    pdfContent += `trailer\n<< /Size ${maxObjectNumber + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return new Blob([pdfContent], { type: 'application/pdf' });
};

const buildPdfCardPage = (rows: ExportRow[], title: string, subtitle: string, pageIndex: number, pageCount: number) => {
    const commands: string[] = [];
    const titleText = truncateTextToWidth(title, 520, 18, 'F2');
    const subtitleText = truncateTextToWidth(subtitle, 520, 10, 'F1');
    const generatedText = truncateTextToWidth(`Exported: ${new Date().toLocaleString('en-IN')} | Page ${pageIndex + 1} of ${pageCount}`, 520, 9, 'F1');

    commands.push(drawText({
        text: titleText,
        x: PAGE_MARGIN_X,
        y: 748,
        fontSize: 18,
        fontKey: 'F2',
        color: SLATE_900,
    }));

    commands.push(drawText({
        text: subtitleText,
        x: PAGE_MARGIN_X,
        y: 726,
        fontSize: 10,
        color: SLATE_700,
    }));

    commands.push(drawText({
        text: generatedText,
        x: PAGE_MARGIN_X,
        y: 710,
        fontSize: 9,
        color: SLATE_500,
    }));

    if (rows.length === 0) {
        commands.push(drawRoundedRect({
            x: PAGE_MARGIN_X,
            y: 586,
            width: PAGE_WIDTH - (PAGE_MARGIN_X * 2),
            height: 74,
            radius: 20,
            fillColor: SLATE_50,
            strokeColor: SLATE_200,
            lineWidth: 1,
        }));

        commands.push(drawText({
            text: 'No transactions available for export.',
            x: PAGE_MARGIN_X + 20,
            y: 626,
            fontSize: 12,
            fontKey: 'F2',
            color: SLATE_900,
        }));

        commands.push(drawText({
            text: 'Choose a report category selection and try the export again.',
            x: PAGE_MARGIN_X + 20,
            y: 606,
            fontSize: 10,
            color: SLATE_500,
        }));

        return commands.join('\n');
    }

    rows.forEach((row, index) => {
        const rowIndex = Math.floor(index / CARDS_PER_ROW);
        const columnIndex = index % CARDS_PER_ROW;
        const x = PAGE_MARGIN_X + (columnIndex * (CARD_WIDTH + CARD_GAP_X));
        const y = CARD_TOP_Y - CARD_HEIGHT - (rowIndex * (CARD_HEIGHT + CARD_GAP_Y));

        if (y < PAGE_MARGIN_BOTTOM) {
            return;
        }

        commands.push(drawTransactionCard(row, x, y, CARD_WIDTH, CARD_HEIGHT));
    });

    return commands.join('\n');
};

export const exportTransactionsToExcel = ({
    transactions,
    accounts,
    categories,
    title,
    subtitle,
    fileBaseName,
}: ExportTransactionsOptions) => {
    const rows = buildExportRows(transactions, accounts, categories);
    const bodyRows = rows.length > 0
        ? rows.map((row) => {
            const amountColor = row.type === 'INCOME' ? '#15803d' : row.type === 'EXPENSE' ? '#dc2626' : '#334155';

            return `
                <tr>
                    <td>${escapeHtml(row.date)}</td>
                    <td>${escapeHtml(row.title)}</td>
                    <td>${escapeHtml(row.account)}</td>
                    <td>${escapeHtml(row.category)}</td>
                    <td>${escapeHtml(row.type)}</td>
                    <td style="color:${amountColor};font-weight:700;text-align:right;">${escapeHtml(row.amount)}</td>
                </tr>
            `;
        }).join('')
        : `
            <tr>
                <td colspan="6">No transactions available for export.</td>
            </tr>
        `;

    const workbookMarkup = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8" />
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #dbe1ea; padding: 8px 10px; font-size: 12px; }
                    th { background: #eff6ff; color: #0f172a; font-weight: 700; text-align: left; }
                    .title { font-size: 18px; font-weight: 700; border: none; padding: 0 0 10px 0; }
                    .subtitle { font-size: 12px; color: #475569; border: none; padding: 0 0 14px 0; }
                    .spacer { border: none; height: 8px; }
                </style>
            </head>
            <body>
                <table>
                    <tr><td class="title" colspan="6">${escapeHtml(title)}</td></tr>
                    <tr><td class="subtitle" colspan="6">${escapeHtml(subtitle || `${transactions.length} selected transactions`)}</td></tr>
                    <tr><td class="spacer" colspan="6"></td></tr>
                    <tr>
                        <th>Date</th>
                        <th>Title</th>
                        <th>Account</th>
                        <th>Category</th>
                        <th>Type</th>
                        <th>Amount</th>
                    </tr>
                    ${bodyRows}
                </table>
            </body>
        </html>
    `;

    const blob = new Blob([`\uFEFF${workbookMarkup}`], {
        type: 'application/vnd.ms-excel;charset=utf-8;',
    });

    downloadBlob(blob, `${getDownloadBaseName(fileBaseName, title)}.xls`);
};

export const exportTransactionsToPdf = ({
    transactions,
    accounts,
    categories,
    title,
    subtitle,
    fileBaseName,
}: ExportTransactionsOptions) => {
    const rows = buildExportRows(transactions, accounts, categories);
    const effectiveSubtitle = subtitle || `${transactions.length} selected transactions`;
    const pageChunks: ExportRow[][] = [];

    for (let index = 0; index < rows.length; index += CARDS_PER_PAGE) {
        pageChunks.push(rows.slice(index, index + CARDS_PER_PAGE));
    }

    if (pageChunks.length === 0) {
        pageChunks.push([]);
    }

    const pageContentStreams = pageChunks.map((chunk, index) => {
        return buildPdfCardPage(chunk, title, effectiveSubtitle, index, pageChunks.length);
    });

    const blob = createPdfBlob(pageContentStreams);
    downloadBlob(blob, `${getDownloadBaseName(fileBaseName, title)}.pdf`);
};
