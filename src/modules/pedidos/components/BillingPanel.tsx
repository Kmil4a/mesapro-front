import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { CheckCircle2, ExternalLink, ReceiptText } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import { useAppDialog } from "../../../components/ui/AppDialog";
import {
  billingApi,
  type Bill,
  type Payment,
  type PaymentMethod,
} from "../api/billing.api";
import type { OrderStatus } from "../types";

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

const paymentMethodLabel: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

const paymentStatusLabel = {
  PENDING: "Pendiente de confirmación",
  CONFIRMED: "Confirmado",
  REJECTED: "Rechazado",
  CANCELLED: "Cancelado",
  REVERSED: "Revertido",
} as const;

interface Props {
  orderId: string;
  locationId: string;
  orderStatus: OrderStatus;
  onOrderUpdated: () => Promise<void>;
}

export default function BillingPanel({
  orderId,
  locationId,
  orderStatus,
  onOrderUpdated,
}: Props) {
  const { user } = useAuth();
  const { confirm, input: askInput } = useAppDialog();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CARD");
  const [amount, setAmount] = useState("");
  const [tipAmount, setTipAmount] = useState("0");

  const refreshBill = useCallback(async () => {
    const bills = await billingApi.list(locationId);
    const existing = bills.find((candidate) =>
      candidate.orders.some((link) => link.orderId === orderId),
    );
    const detailed = existing ? await billingApi.get(existing.id) : null;
    setBill(detailed);
    if (detailed) {
      setTipAmount(String(Number(detailed.tipAmount) || 0));
      const confirmed = confirmedTotal(detailed.payments);
      setAmount(String(Math.max(0, Number(detailed.total) - confirmed)));
    }
    return detailed;
  }, [locationId, orderId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setBill(null);
    setError("");
    refreshBill()
      .catch((err: unknown) => {
        if (active) setError(errorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshBill]);

  const paidTotal = useMemo(() => confirmedTotal(bill?.payments ?? []), [bill]);
  const remaining = bill ? Math.max(0, Number(bill.total) - paidTotal) : 0;
  const hasConfirmedPayment =
    bill?.payments.some((p) => p.status === "CONFIRMED") ?? false;
  const hasPendingPayment =
    bill?.payments.some((p) => p.status === "PENDING") ?? false;

  async function requestBill() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const created = await billingApi.create([orderId]);
      const detailed = await billingApi.get(created.id);
      setBill(detailed);
      setTipAmount(String(Number(detailed.tipAmount) || 0));
      setAmount(String(Number(detailed.total)));
      setNotice("Cuenta generada desde los precios registrados en el pedido.");
    } catch (err) {
      setError(errorMessage(err));
      await refreshBill().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  async function saveTip() {
    if (!bill) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await billingApi.updateTip(bill.id, Number(tipAmount));
      const detailed = await billingApi.get(updated.id);
      setBill(detailed);
      setAmount(String(Math.max(0, Number(detailed.total) - paidTotal)));
      setNotice(
        "Propina actualizada. El total fue recalculado por el servidor.",
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmPending(payment: Payment) {
    if (!bill) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await billingApi.updatePaymentStatus(bill.id, payment.id, "CONFIRMED");
      const updated = await refreshBill();
      if (updated?.status === "PAID") {
        setNotice("Cuenta pagada. El pedido quedó cerrado.");
        await onOrderUpdated();
      } else if (payment.method === "CASH") {
        setNotice(
          "Pago confirmado. La entrega de efectivo quedó pendiente de recepción en Caja.",
        );
      } else {
        setNotice("Pago confirmado.");
      }
    } catch (err) {
      setError(errorMessage(err));
      await refreshBill().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  async function cancelPending(payment: Payment) {
    if (!bill) return;
    if (
      !(await confirm({
        title: "Cancelar pago pendiente",
        description:
          "El pago no quedará confirmado y su monto volverá a estar disponible en el saldo de la cuenta.",
        confirmLabel: "Cancelar pago",
        tone: "danger",
      }))
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await billingApi.updatePaymentStatus(bill.id, payment.id, "CANCELLED");
      await refreshBill();
      setNotice(
        "Pago pendiente cancelado. El saldo volvió a estar disponible.",
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function reversePayment(payment: Payment) {
    if (!bill) return;
    const reason = await askInput({
      title: "Revertir pago",
      description:
        "La reversa quedará registrada y actualizará el saldo de la cuenta y la conciliación de efectivo.",
      label: "Motivo de la reversa",
      placeholder: "Describe por qué se revierte este pago",
      required: true,
      multiline: true,
      confirmLabel: "Revertir pago",
      tone: "danger",
    });
    if (!reason?.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await billingApi.reversePayment(bill.id, payment.id, reason.trim());
      await refreshBill();
      setNotice(
        "Pago revertido. La cuenta y la conciliación de efectivo fueron actualizadas.",
      );
    } catch (err) {
      setError(errorMessage(err));
      await refreshBill().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  async function registerPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bill || Number(amount) <= 0) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const key = `mesa-pro:payment:${bill.id}:${method}:${Number(amount)}`;
      const idempotencyKey = sessionStorage.getItem(key) ?? crypto.randomUUID();
      sessionStorage.setItem(key, idempotencyKey);
      const { payment } = await billingApi.createPayment(
        bill.id,
        method,
        Number(amount),
        idempotencyKey,
      );
      sessionStorage.removeItem(key);
      await refreshBill();
      await confirmPending(payment);
    } catch (err) {
      setError(errorMessage(err));
      await refreshBill().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">
        Cargando cuenta...
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border bg-white p-5">
      <h3 className="flex items-center gap-2 font-semibold">
        <ReceiptText size={18} /> Cuenta y pago
      </h3>
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
        </div>
      )}

      {!bill ? (
        <>
          <p className="text-sm text-slate-600">
            El pedido ya fue entregado. Puedes generar su cuenta para cobrar.
          </p>
          <button
            className={primary}
            disabled={busy || orderStatus !== "DELIVERED"}
            onClick={() => void requestBill()}
          >
            <ReceiptText size={16} />{" "}
            {busy ? "Generando cuenta..." : "Solicitar cuenta"}
          </button>
        </>
      ) : (
        <>
          <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
            <MoneyRow label="Subtotal" value={money(bill.subtotal)} />
            <MoneyRow
              label="Descuentos"
              value={`− ${money(bill.discountTotal)}`}
            />
            <MoneyRow label="Propina" value={money(bill.tipAmount)} />
            <MoneyRow label="Total cuenta" value={money(bill.total)} strong />
            <MoneyRow label="Pagado" value={money(paidTotal)} />
            <MoneyRow label="Saldo pendiente" value={money(remaining)} strong />
            <p className="pt-1 text-xs text-slate-500">
              El total definitivo lo calcula el servidor.
            </p>
          </div>

          {bill.status !== "PAID" && bill.status !== "VOID" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Propina opcional
                <input
                  className={`${input} mt-1`}
                  type="number"
                  min="0"
                  step="1"
                  value={tipAmount}
                  disabled={busy || hasConfirmedPayment}
                  onChange={(event) => setTipAmount(event.target.value)}
                />
              </label>
              <button
                className={secondary}
                disabled={
                  busy ||
                  hasConfirmedPayment ||
                  hasPendingPayment ||
                  Number(tipAmount) === Number(bill.tipAmount)
                }
                onClick={() => void saveTip()}
              >
                Actualizar propina
              </button>
              {(hasConfirmedPayment || hasPendingPayment) && (
                <p className="text-xs text-slate-500">
                  La propina se bloquea mientras haya pagos registrados o
                  pendientes.
                </p>
              )}
            </div>
          )}

          {bill.payments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Pagos registrados</h4>
              {bill.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {paymentMethodLabel[payment.method]} ·{" "}
                      {money(payment.amount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {paymentStatusLabel[payment.status]}
                    </p>
                    {payment.status === "REVERSED" && payment.reversedAt && (
                      <p className="mt-1 text-xs text-red-700">
                        Revertido{" "}
                        {new Date(payment.reversedAt).toLocaleString("es-CL")}
                        {payment.reversalReason
                          ? ` · ${payment.reversalReason}`
                          : ""}
                      </p>
                    )}
                  </div>
                  {payment.status === "PENDING" && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className={secondary}
                        disabled={busy}
                        onClick={() => void confirmPending(payment)}
                      >
                        <CheckCircle2 size={15} /> Confirmar pago
                      </button>
                      <button
                        className="rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void cancelPending(payment)}
                      >
                        Cancelar
                      </button>
                      {payment.method === "CASH" && (
                        <Link
                          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                          to="/caja"
                        >
                          Ir a Caja <ExternalLink size={14} />
                        </Link>
                      )}
                    </div>
                  )}
                  {payment.status === "CONFIRMED" &&
                    ["OWNER", "ADMIN", "MANAGER", "CASHIER"].includes(
                      user?.role ?? "",
                    ) && (
                      <button
                        className="rounded-xl px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void reversePayment(payment)}
                      >
                        Revertir con motivo
                      </button>
                    )}
                </div>
              ))}
            </div>
          )}

          {bill.status === "PAID" ? (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              Cuenta pagada y pedido cerrado.
            </div>
          ) : bill.status === "VOID" ? (
            <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
              Esta cuenta fue anulada.
            </div>
          ) : remaining > 0 && !hasPendingPayment ? (
            <form
              onSubmit={(event) => void registerPayment(event)}
              className="space-y-3"
            >
              <h4 className="text-sm font-semibold">Registrar pago</h4>
              <label className="block text-sm font-medium">
                Método
                <select
                  className={`${input} mt-1`}
                  value={method}
                  disabled={busy}
                  onChange={(event) =>
                    setMethod(event.target.value as PaymentMethod)
                  }
                >
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="TRANSFER">Transferencia</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Monto (saldo: {money(remaining)})
                <input
                  className={`${input} mt-1`}
                  type="number"
                  min="1"
                  max={remaining}
                  step="1"
                  required
                  value={amount}
                  disabled={busy}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
              {method === "CASH" && (
                <p className="text-xs text-amber-800">
                  El efectivo requiere una sesión de caja abierta. Después de
                  confirmar el pago, caja debe confirmar la recepción del
                  dinero.
                </p>
              )}
              <button
                className={`${primary} w-full`}
                disabled={
                  busy || Number(amount) <= 0 || Number(amount) > remaining
                }
                type="submit"
              >
                {busy
                  ? "Registrando..."
                  : `Registrar ${paymentMethodLabel[method].toLowerCase()}`}
              </button>
              {method === "CASH" && (
                <Link
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                  to="/caja"
                >
                  Abrir o revisar Caja <ExternalLink size={14} />
                </Link>
              )}
            </form>
          ) : hasPendingPayment ? (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Confirma el pago pendiente antes de registrar otro. Así evitamos
              dejar pagos duplicados en espera.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

function confirmedTotal(payments: Payment[]) {
  return payments
    .filter((payment) => payment.status === "CONFIRMED")
    .reduce((total, payment) => total + Number(payment.amount), 0);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}

function MoneyRow({
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
      className={`flex justify-between gap-4 ${strong ? "font-semibold text-slate-900" : "text-slate-600"}`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
