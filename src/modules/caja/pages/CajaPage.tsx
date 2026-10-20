import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  CircleDollarSign,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { ApiRequestError } from "../../../api/client";
import { Link } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import { useLocation } from "../../../context/LocationContext";
import { useAppDialog } from "../../../components/ui/AppDialog";
import {
  cashApi,
  type CashHandover,
  type CashSession,
  type LocationPaymentRecord,
} from "../api/cash.api";

const money = (value: number | string) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";
const primary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Ocurrió un error inesperado";

export default function CajaPage() {
  const { confirm } = useAppDialog();
  const { user } = useAuth();
  const {
    locationId,
    locations,
    setLocationId,
    loading: locationsLoading,
  } = useLocation();
  const [session, setSession] = useState<CashSession | null>(null);
  const [handovers, setHandovers] = useState<CashHandover[]>([]);
  const [payments, setPayments] = useState<LocationPaymentRecord[]>([]);
  const [openingAmount, setOpeningAmount] = useState("0");
  const [closingAmount, setClosingAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const closingAmountDirty = useRef(false);

  const canReceiveCash = ["OWNER", "ADMIN", "CASHIER"].includes(
    user?.role ?? "",
  );

  const expectedAmount = useMemo(() => {
    if (!session) return 0;
    return session.movements.reduce(
      (balance, movement) => {
        const amount = Number(movement.amount) || 0;
        return ["WITHDRAWAL", "REFUND"].includes(movement.type)
          ? balance - amount
          : balance + amount;
      },
      Number(session.openingAmount) || 0,
    );
  }, [session]);
  const directSales =
    session?.movements.filter((movement) => movement.type === "SALE") ?? [];
  const directSaleReferences = new Set(
    directSales.map((movement) => movement.reference).filter(Boolean),
  );
  const directRefunds =
    session?.movements.filter(
      (movement) =>
        movement.type === "REFUND" &&
        movement.reference &&
        directSaleReferences.has(movement.reference),
    ) ?? [];
  const directSalesTotal = directSales.reduce(
    (sum, movement) => sum + Number(movement.amount || 0),
    0,
  ) - directRefunds.reduce((sum, movement) => sum + Number(movement.amount || 0), 0);

  const refresh = useCallback(async ({ background = false } = {}) => {
    if (!locationId) {
      setSession(null);
      setHandovers([]);
      setPayments([]);
      return;
    }

    if (!background) {
      setLoading(true);
    }
    setError("");
    const results = await Promise.allSettled([
      cashApi.paymentHistory(locationId),
      cashApi.current(locationId),
    ]);
    const [historyResult, sessionResult] = results;
    if (historyResult.status === "fulfilled") {
      setPayments(historyResult.value);
    } else {
      if (!background) setPayments([]);
      setError(message(historyResult.reason));
    }

    if (sessionResult.status === "fulfilled") {
      const active = sessionResult.value;
      setSession(active);
      if (!closingAmountDirty.current) {
        setClosingAmount(String(expectedFrom(active)));
      }
      try {
        setHandovers(await cashApi.handovers(active.id));
      } catch (err) {
        setHandovers([]);
        setError(message(err));
      }
    } else {
      const err = sessionResult.reason;
      if (err instanceof ApiRequestError && err.statusCode === 404) {
        setSession(null);
        setHandovers([]);
        closingAmountDirty.current = false;
      } else {
        if (!background) {
          setSession(null);
          setHandovers([]);
        }
        setError(message(err));
      }
    }
    if (
      historyResult.status === "fulfilled" &&
      (sessionResult.status === "fulfilled" ||
        (sessionResult.reason instanceof ApiRequestError &&
          sessionResult.reason.statusCode === 404))
    ) {
      setLastUpdated(new Date());
    }
    if (!background) setLoading(false);
  }, [locationId]);

  useEffect(() => {
    closingAmountDirty.current = false;
  }, [locationId]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !busy) {
        void refresh({ background: true });
      }
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [refresh, busy]);

  async function openSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!locationId) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await cashApi.open(locationId, Number(openingAmount));
      closingAmountDirty.current = false;
      await refresh();
      setSuccess("Caja abierta.");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmHandover(handover: CashHandover) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await cashApi.confirmHandover(handover.id);
      await refresh();
      setSuccess(
        `Entrega de ${money(handover.amount)} recibida y registrada en caja.`,
      );
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function closeSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    if (
      !(await confirm({
        title: "Cerrar caja",
        description: `El efectivo esperado es ${money(expectedAmount)} y el monto contado es ${money(closingAmount)}. Al cerrar se guardará la diferencia y la sesión no podrá recibir más movimientos.`,
        confirmLabel: "Cerrar sesión",
        tone: "danger",
      }))
    )
      return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const closed = await cashApi.close(session.id, Number(closingAmount));
      closingAmountDirty.current = false;
      setSession(null);
      setHandovers([]);
      setSuccess(
        `Caja cerrada. Monto esperado: ${money(closed.expectedAmount ?? 0)}. Diferencia: ${money(closed.difference ?? 0)}.`,
      );
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Caja</h1>
          <p className="text-sm text-slate-500">
            Apertura, recepción de efectivo y cierre de caja
          </p>
          <p className="mt-1 text-xs text-slate-500" aria-live="polite">
            {lastUpdated
              ? `Actualizado ${lastUpdated.toLocaleTimeString("es-CL")} · sincronización automática cada 15 s`
              : "Sincronizando caja..."}
          </p>
        </div>
        <button
          className={secondary}
          disabled={loading || !locationId}
          onClick={() => void refresh()}
        >
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sucursal
        </label>
        <select
          className={`${input} max-w-sm`}
          value={locationId}
          disabled={locationsLoading}
          onChange={(event) => setLocationId(event.target.value)}
        >
          {locations.length === 0 && <option value="">Sin sucursales</option>}
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-xl bg-green-50 p-4 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border bg-white p-10 text-center text-slate-500">
          Cargando caja...
        </div>
      ) : !session ? (
        <form
          onSubmit={(event) => void openSession(event)}
          className="max-w-xl space-y-4 rounded-xl border bg-white p-5"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <Wallet />
            </div>
            <div>
              <h2 className="font-semibold">No hay una caja abierta</h2>
              <p className="text-sm text-slate-500">
                Ingresa el efectivo inicial para recibir pagos en efectivo.
              </p>
            </div>
          </div>
          <label className="block text-sm font-medium">
            Monto inicial
            <input
              className={`${input} mt-1`}
              type="number"
              min="0"
              step="1"
              required
              value={openingAmount}
              onChange={(event) => setOpeningAmount(event.target.value)}
            />
          </label>
          <button
            className={primary}
            disabled={busy || !locationId}
            type="submit"
          >
            <CircleDollarSign size={17} /> {busy ? "Abriendo..." : "Abrir caja"}
          </button>
        </form>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Summary
              label="Efectivo inicial"
              amount={money(session.openingAmount)}
            />
            <Summary label="Monto esperado" amount={money(expectedAmount)} />
            <Summary
              label="Ventas directas netas"
              amount={money(directSalesTotal)}
            />
            <Summary
              label="Entregas pendientes"
              amount={String(
                handovers.filter((item) => item.status === "PENDING").length,
              )}
            />
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5">
            <div className="mb-3">
              <h2 className="font-semibold text-slate-900">
                Ventas directas a caja
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Estos pagos en efectivo se registran directamente como ingreso
                de caja, sin una entrega de mesero. También forman parte del
                monto esperado.
              </p>
            </div>
            {directSales.length === 0 ? (
              <p className="rounded-lg bg-white/80 p-4 text-sm text-slate-500">
                No hay ventas directas registradas en esta sesión.
              </p>
            ) : (
              <div className="divide-y divide-amber-200 rounded-lg bg-white/80 px-4">
                {directSales.map((movement) => {
                  const linkedOrders =
                    movement.directPayment?.bill.orders.map(
                      ({ order }) => order,
                    ) ?? [];
                  return (
                    <div
                      key={movement.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {money(movement.amount)} · Efectivo recibido
                          directamente
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {linkedOrders.length > 0
                            ? linkedOrders.map((order) => (
                                <span
                                  key={order.id}
                                  className="mr-3 inline-block"
                                >
                                  <Link
                                    to={`/pedidos?order=${encodeURIComponent(order.id)}`}
                                    className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900"
                                  >
                                    Pedido #{order.id.slice(-6).toUpperCase()}
                                  </Link>
                                  {` · ${order.type === "DINE_IN" ? (order.tableSession?.table.name ?? "Mesa") : `Para llevar${order.customerName ? ` · ${order.customerName}` : ""}`}`}
                                </span>
                              ))
                            : `Pago ${movement.reference?.slice(-6).toUpperCase() ?? ""}`}
                          {movement.directPayment?.bill &&
                            ` · Cuenta #${movement.directPayment.bill.id.slice(-6).toUpperCase()}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(movement.createdAt).toLocaleString("es-CL")}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${movement.directPayment?.status === "REVERSED" ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}
                      >
                        {movement.directPayment?.status === "REVERSED"
                          ? "Pago revertido · devolución registrada"
                          : "Incluido en el esperado"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-white p-5">
            <h2 className="mb-1 font-semibold">
              Entregas de efectivo de meseros
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Confirma cada entrega recibida. Solo al confirmarla se suma al
              saldo de caja.
            </p>
            {handovers.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                No hay entregas asociadas a esta sesión.
              </p>
            ) : (
              <div className="divide-y">
                {handovers.map((handover) => (
                  <div
                    key={handover.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-medium">
                        {money(handover.amount)} ·{" "}
                        {handover.waiter
                          ? `${handover.waiter.firstName} ${handover.waiter.lastName}`
                          : "Mesero"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(handover.createdAt).toLocaleString("es-CL")} ·{" "}
                        {handover.status === "PENDING"
                          ? "Pendiente"
                          : handover.status === "CONFIRMED"
                            ? "Recibida"
                            : handover.status === "CANCELLED"
                              ? "Cancelada por reversa del pago"
                              : "Rechazada"}
                      </p>
                    </div>
                    {handover.status === "PENDING" && (
                      <button
                        className={primary}
                        disabled={busy || !canReceiveCash}
                        onClick={() => void confirmHandover(handover)}
                      >
                        <CheckCircle2 size={16} /> Confirmar recepción
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!canReceiveCash && (
              <p className="mt-3 text-xs text-amber-700">
                Un usuario de caja, administrador o propietario debe confirmar
                estas entregas.
              </p>
            )}
          </section>

          <form
            onSubmit={(event) => void closeSession(event)}
            className="max-w-xl space-y-4 rounded-xl border bg-white p-5"
          >
            <h2 className="font-semibold">Cerrar caja</h2>
            <p className="text-sm text-slate-500">
              Cuenta el efectivo físico e ingresa el monto real. El sistema
              compara el conteo con los movimientos registrados.
            </p>
            <label className="block text-sm font-medium">
              Monto contado
              <input
                className={`${input} mt-1`}
                type="number"
                min="0"
                step="1"
                required
                value={closingAmount}
                onChange={(event) => {
                  closingAmountDirty.current = true;
                  setClosingAmount(event.target.value);
                }}
              />
            </label>
            <button className={secondary} disabled={busy} type="submit">
              {busy ? "Cerrando..." : "Cerrar sesión de caja"}
            </button>
          </form>
        </>
      )}

      {!loading && (
        <section className="rounded-xl border bg-white p-5">
          <h2 className="mb-1 font-semibold">Pagos registrados</h2>
          <p className="mb-4 text-sm text-slate-500">
            El historial incluye todos los métodos. Solo el efectivo recibido y
            confirmado por caja aumenta el monto esperado; tarjeta y
            transferencia no representan efectivo físico.
          </p>
          {payments.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
              No hay pagos registrados para esta sucursal.
            </p>
          ) : (
            <div className="divide-y">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {money(payment.amount)} · {methodLabel(payment.method)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Cuenta {payment.billId.slice(0, 8)} ·{" "}
                      {new Date(payment.createdAt).toLocaleString("es-CL")}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {paymentStatusLabel(payment)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function methodLabel(method: LocationPaymentRecord["method"]) {
  return method === "CASH"
    ? "Efectivo"
    : method === "CARD"
      ? "Tarjeta"
      : "Transferencia";
}

function paymentStatusLabel(payment: LocationPaymentRecord) {
  if (payment.status === "REVERSED") return "Revertido";
  if (payment.status === "PENDING") return "Pendiente de confirmación";
  if (payment.status === "REJECTED") return "Rechazado";
  if (payment.status === "CANCELLED") return "Cancelado";
  if (payment.method !== "CASH") return "Confirmado · no suma al efectivo";
  if (payment.cashHandover?.status === "CONFIRMED") return "Recibido en caja";
  if (payment.cashHandover?.status === "PENDING")
    return "Confirmado · recepción pendiente";
  return "Confirmado · sin entrega de efectivo";
}

function expectedFrom(session: CashSession) {
  return session.movements.reduce(
    (balance, movement) => {
      const amount = Number(movement.amount) || 0;
      return ["WITHDRAWAL", "REFUND"].includes(movement.type)
        ? balance - amount
        : balance + amount;
    },
    Number(session.openingAmount) || 0,
  );
}

function Summary({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{amount}</p>
    </div>
  );
}
