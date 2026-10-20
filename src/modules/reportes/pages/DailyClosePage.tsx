import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useLocation } from "../../../context/LocationContext";
import {
  reportsApi,
  type DailyCloseReport,
  type ProductRankingReport,
} from "../api/reports.api";

const input =
  "rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function money(value: number | string | null | undefined, currency = "CLP") {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

const methodLabel: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};
const statusLabel: Record<string, string> = {
  OPEN: "Abierta",
  PARTIALLY_PAID: "Pago parcial",
  PAID: "Pagada",
  UNPAID: "Sin pago",
  VOID: "Anulada",
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
  REVERSED: "Revertido",
};

export default function DailyClosePage() {
  const {
    locationId,
    locations,
    setLocationId,
    loading: locationsLoading,
  } = useLocation();
  const [date, setDate] = useState(today);
  const [report, setReport] = useState<DailyCloseReport | null>(null);
  const [ranking, setRanking] = useState<ProductRankingReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!locationId || !date) {
      setReport(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [daily, products] = await Promise.all([
        reportsApi.dailyClose(locationId, date),
        reportsApi.productRanking(locationId, date),
      ]);
      setReport(daily);
      setRanking(products);
    } catch (err) {
      setReport(null);
      setRanking(null);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar el reporte.",
      );
    } finally {
      setLoading(false);
    }
  }, [locationId, date]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const currency = report?.location.currency ?? "CLP";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cierre diario</h1>
          <p className="text-sm text-slate-500">
            Ventas emitidas, pagos recibidos y conciliación de caja por
            sucursal.
          </p>
        </div>
        <button
          className={button}
          disabled={loading || !locationId}
          onClick={() => void refresh()}
        >
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border bg-white p-4">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sucursal
          <select
            className={input}
            value={locationId}
            disabled={locationsLoading}
            onChange={(event) => setLocationId(event.target.value)}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Día del reporte
          <input
            className={input}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        {report && (
          <p className="self-end pb-2 text-xs text-slate-500">
            Zona horaria: {report.timeZone}
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {loading ? (
        <div className="rounded-xl border bg-white p-10 text-center text-slate-500">
          Generando reporte...
        </div>
      ) : report ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Summary
              label="Ventas emitidas"
              value={money(report.bills.total, currency)}
              detail={`${report.bills.count} cuentas creadas`}
            />
            <Summary
              label="Descuentos"
              value={money(report.bills.discounts, currency)}
              detail={`Subtotal ${money(report.bills.subtotal, currency)}`}
            />
            <Summary
              label="Propinas"
              value={money(report.bills.tips, currency)}
              detail="Separadas del subtotal de ventas"
            />
            <Summary
              label="Cobros confirmados"
              value={money(report.payments.confirmedTotal, currency)}
              detail="Bruto por fecha de confirmación"
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-4 font-semibold">Cuentas emitidas ese día</h2>
              <div className="mb-4 divide-y">
                {report.bills.byStatus.map((item) => (
                  <Row
                    key={item.status}
                    label={statusLabel[item.status] ?? item.status}
                    value={`${item.count}`}
                  />
                ))}
                {report.bills.byStatus.length === 0 && (
                  <p className="py-3 text-sm text-slate-500">
                    No se emitieron cuentas.
                  </p>
                )}
              </div>
              <Row
                label="Subtotal"
                value={money(report.bills.subtotal, currency)}
              />
              <Row
                label="Descuentos"
                value={`− ${money(report.bills.discounts, currency)}`}
              />
              <Row
                label="Propinas"
                value={money(report.bills.tips, currency)}
              />
              <Row
                label="Total de cuentas"
                value={money(report.bills.total, currency)}
                strong
              />
            </div>

            <div className="rounded-xl border bg-white p-5">
              <h2 className="mb-1 font-semibold">Pagos por método</h2>
              <p className="mb-4 text-xs text-slate-500">
                Solo pagos confirmados en la fecha seleccionada.
              </p>
              <div className="divide-y">
                {report.payments.confirmedByMethod.map((item) => (
                  <Row
                    key={item.method}
                    label={`${methodLabel[item.method] ?? item.method} · ${item.count} pagos`}
                    value={money(item.amount, currency)}
                  />
                ))}
                {report.payments.confirmedByMethod.length === 0 && (
                  <p className="py-3 text-sm text-slate-500">
                    No se confirmaron pagos.
                  </p>
                )}
              </div>
              <div className="mt-3 border-t pt-3">
                <Row
                  label="Reversas del día"
                  value={`− ${money(report.payments.reversedTotal, currency)}`}
                />
                <Row
                  label="Cobros netos del día"
                  value={money(report.payments.netConfirmedTotal, currency)}
                  strong
                />
                {report.payments.reversedByMethod.map((item) => (
                  <Row
                    key={`reversed-${item.method}`}
                    label={`${methodLabel[item.method] ?? item.method} · ${item.count} reversas`}
                    value={`− ${money(item.amount, currency)}`}
                  />
                ))}
              </div>
              <h3 className="mb-2 mt-6 text-sm font-semibold">
                Pagos registrados ese día · estado actual
              </h3>
              <div className="divide-y">
                {report.payments.registeredByStatus.map((item) => (
                  <Row
                    key={`${item.method}-${item.status}`}
                    label={`${methodLabel[item.method] ?? item.method} · ${statusLabel[item.status] ?? item.status} · ${item.count}`}
                    value={money(item.amount, currency)}
                  />
                ))}
                {report.payments.registeredByStatus.length === 0 && (
                  <p className="py-3 text-sm text-slate-500">
                    No se registraron pagos.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-5">
            <h2 className="mb-1 font-semibold">Conciliación de caja</h2>
            <p className="mb-4 text-xs text-slate-500">
              Sesiones cerradas en la fecha. Diferencia = efectivo contado menos
              esperado.
            </p>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Summary
                label="Cajas cerradas"
                value={`${report.cash.closedCount}`}
              />
              <Summary
                label="Efectivo esperado"
                value={money(report.cash.expectedTotal, currency)}
              />
              <Summary
                label="Efectivo contado"
                value={money(report.cash.countedTotal, currency)}
              />
              <Summary
                label="Diferencia total"
                value={money(report.cash.differenceTotal, currency)}
              />
            </div>
            {report.cash.closedSessions.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                No se cerraron sesiones de caja ese día.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Cierre</th>
                      <th className="py-2">Responsable</th>
                      <th className="py-2">Esperado</th>
                      <th className="py-2">Contado</th>
                      <th className="py-2">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.cash.closedSessions.map((session) => (
                      <tr key={session.id}>
                        <td className="py-3">
                          {session.closedAt
                            ? new Date(session.closedAt).toLocaleString("es-CL")
                            : "—"}
                        </td>
                        <td className="py-3">
                          {session.closer
                            ? `${session.closer.firstName} ${session.closer.lastName}`
                            : "—"}
                        </td>
                        <td className="py-3">
                          {money(session.expectedAmount, currency)}
                        </td>
                        <td className="py-3">
                          {money(session.closingAmount, currency)}
                        </td>
                        <td className="py-3">
                          {money(session.difference, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="rounded-xl border bg-white p-5">
            <h2 className="font-semibold">Productos más vendidos</h2>
            <p className="mb-4 mt-1 text-xs text-slate-500">
              Unidades de productos en pedidos cerrados y pagados durante el
              día. Los ítems cancelados quedan excluidos.
            </p>
            {!ranking?.ranking.length ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                No hay productos vendidos en cuentas pagadas para este día.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">#</th>
                      <th className="py-2">Producto</th>
                      <th className="py-2">Unidades</th>
                      <th className="py-2">Líneas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ranking.ranking.map((product, index) => (
                      <tr key={product.productId}>
                        <td className="py-3">{index + 1}</td>
                        <td className="py-3 font-medium">
                          {product.productName}
                        </td>
                        <td className="py-3">
                          {new Intl.NumberFormat("es-CL", {
                            maximumFractionDigits: 3,
                          }).format(product.unitsSold)}
                        </td>
                        <td className="py-3">{product.orderLines}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Los combos aún no se incluyen en el ranking, porque todavía no se
              venden como líneas de pedido.
            </p>
          </section>
          <p className="text-xs text-slate-500">
            Las cuentas se agrupan por fecha de emisión; los pagos por fecha de
            registro y de confirmación; y las cajas por fecha de cierre. Los
            pagos registrados se muestran con su estado actual.
          </p>
        </>
      ) : null}
    </div>
  );
}

function Summary({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 py-2 text-sm ${strong ? "font-semibold text-slate-900" : "text-slate-600"}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
