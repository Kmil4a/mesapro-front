import { ordersApi } from "../api/orders.api";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]!,
  );
}

export function printableOrder(data: Awaited<ReturnType<typeof ordersApi.dispatch>>) {
  const quantity = (value: string) =>
    new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(Number(value));
  const stations = data.stations
    .map(
      (station) => `
        <section class="station">
          <p>Pedido #${escapeHtml(data.orderCode)}</p>
          <h2>${escapeHtml(station.workstationName)}</h2>
          ${station.items
            .map(
              (item) => `
                <article>
                  <strong>${quantity(item.quantity)} × ${escapeHtml(item.productName)}</strong>
                  ${item.modifiers.length ? `<div class="detail">${item.modifiers.map(escapeHtml).join(" · ")}</div>` : ""}
                  ${item.notes ? `<div class="note">Nota: ${escapeHtml(item.notes)}</div>` : ""}
                </article>`,
            )
            .join("")}
        </section>`,
    )
    .join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Comanda ${escapeHtml(data.orderCode)}</title>
    <style>
      @page { size: 80mm auto; margin: 4mm; }
      * { box-sizing: border-box; }
      body { width: 72mm; margin: 0 auto; color: #111; font: 14px/1.35 Arial, sans-serif; }
      header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 8px; }
      h1 { font-size: 20px; margin: 0 0 5px; } p { margin: 3px 0; }
      h2 { font-size: 16px; text-transform: uppercase; border-bottom: 1px solid #111; padding-bottom: 4px; }
      .station { page-break-inside: avoid; } article { margin: 10px 0; page-break-inside: avoid; }
      .line { display:flex; justify-content:space-between; gap:5px; } .totals { border-top:1px dashed #333; margin-top:9px; padding-top:7px; }
      .detail, .note { margin: 3px 0 0 12px; } .note { font-weight: bold; }
      @media print { body { width: 72mm; } }
    </style></head><body>
      <header><h1>COMANDA #${escapeHtml(data.orderCode)}</h1><p>${escapeHtml(data.tableName)}</p>
      <p>${escapeHtml(data.waiterName)}</p><p>${new Date(data.createdAt).toLocaleString("es-CL")}</p></header>
      ${stations}<script>window.onafterprint=()=>window.close();setTimeout(()=>window.print(),250)</script>
    </body></html>`;
}
