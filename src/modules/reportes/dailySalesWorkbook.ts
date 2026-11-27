import ExcelJS from "exceljs";
import type { DailySalesReport } from "./api/reports.api";

const paymentMethods = [
  ["CASH", "Efectivo"],
  ["CARD", "Tarjeta"],
  ["TRANSFER", "Transferencia"],
] as const;

const billStatus: Record<string, string> = {
  OPEN: "Abierta",
  PARTIALLY_PAID: "Pago parcial",
  PAID: "Pagada",
  UNPAID: "Sin pago",
};

const orderType: Record<string, string> = {
  DINE_IN: "Mesa",
  TAKEAWAY: "Para llevar",
};

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

export async function buildDailySalesWorkbook(report: DailySalesReport) {
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet("Resumen");
  const currencyDigits = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: report.location.currency,
  }).resolvedOptions().maximumFractionDigits ?? 2;
  const moneyFormat = currencyDigits ? `#,##0.${"0".repeat(currencyDigits)}` : "#,##0";
  summary.columns = [
    { header: "Concepto", width: 40 },
    { header: "Valor", width: 24 },
  ];
  summary.addRows([
    ["Fecha", report.date],
    ["Sucursal", report.location.name],
    ["Zona horaria", report.timeZone],
    ["Moneda", report.location.currency],
    ["Cantidad de ventas", report.totals.count],
  ]);
  const summaryAmounts: Array<[string, number | string]> = [
    ["Subtotal de ventas emitidas", report.totals.subtotal],
    ["Descuentos", report.totals.discounts],
    ["Propinas", report.totals.tips],
    ["Total de ventas emitidas", report.totals.total],
    ["Cobros confirmados del día", report.payments.confirmedTotal],
    ["Devoluciones del día", report.payments.reversedTotal],
    ["Cobros netos del día", report.payments.netConfirmedTotal],
  ];
  for (const [method, label] of paymentMethods) {
    const confirmed = report.payments.confirmedByMethod.find((item) => item.method === method);
    const reversed = report.payments.reversedByMethod.find((item) => item.method === method);
    summaryAmounts.push(
      [`Cobrado en ${label.toLowerCase()}`, confirmed?.amount ?? 0],
      [`Devuelto en ${label.toLowerCase()}`, reversed?.amount ?? 0],
    );
  }
  for (const [label, amount] of summaryAmounts) {
    summary.addRow([label, Number(amount)]).getCell(2).numFmt = moneyFormat;
  }
  summary.addRow([]);
  summary.addRow(["Ventas por fecha de emisión. Cobros y devoluciones por fecha de confirmación o reversa."]);
  summary.addRow(["Detalle de cuentas emitidas, con pagos vigentes y saldo al momento de descargar."]);
  for (const number of [summary.rowCount - 1, summary.rowCount]) {
    summary.mergeCells(number, 1, number, 2);
    summary.getRow(number).alignment = { wrapText: true };
    summary.getRow(number).height = 32;
  }
  styleHeader(summary);

  const detail = workbook.addWorksheet("Detalle");
  detail.columns = [
    { header: "Hora de emisión", width: 18 },
    { header: "Cuenta", width: 40 },
    { header: "Pedidos", width: 44 },
    { header: "Tipo de venta", width: 22 },
    { header: "Estado", width: 17 },
    ...["Total", "Efectivo", "Tarjeta", "Transferencia", "Cobrado", "Saldo pendiente"]
      .map((header) => ({ header, width: 18, style: { numFmt: moneyFormat } })),
  ];
  const time = new Intl.DateTimeFormat("es-CL", {
    timeZone: report.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (const sale of report.sales) {
    detail.addRow([
      time.format(new Date(sale.createdAt)),
      sale.id,
      sale.orderIds.join(", "),
      sale.orderTypes.map((type) => orderType[type] ?? type).join(", "),
      billStatus[sale.status] ?? sale.status,
      Number(sale.total),
      ...paymentMethods.map(([method]) => Number(sale.paidByMethod[method])),
      Number(sale.paid),
      Number(sale.balance),
    ]);
  }
  detail.autoFilter = { from: "A1", to: "K1" };
  styleHeader(detail);
  return workbook.xlsx.writeBuffer();
}

export async function downloadDailySales(report: DailySalesReport) {
  const workbook = await buildDailySalesWorkbook(report);
  const file = new Blob([new Uint8Array(workbook)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  const location = report.location.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  link.href = url;
  link.download = `${location || "Sucursal"}_ventas_${report.date}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
