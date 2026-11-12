import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ClipboardList,
  Clock3,
  CreditCard,
  Package,
  RefreshCw,
  ShoppingBag,
  Table2,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { hasModuleAccess } from "../auth/moduleAccess";
import { useLocation } from "../context/LocationContext";
import {
  dashboardApi,
  type DashboardData,
  type DashboardPeriod,
} from "../modules/dashboard/dashboard.api";

const stateLabels: Record<string, string> = {
  DRAFT: "Sin imprimir",
  SENT: "Impreso · por entregar",
  IN_PROGRESS: "En preparación",
  READY: "Listo para entregar",
  DELIVERED: "Entregado · por cerrar",
};
const methodNames: Record<string, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};
const number = (value: number) =>
  new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(value);
const shortDate = (date: string) =>
  new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
const age = (minutes: number) =>
  minutes < 60
    ? `${minutes} min`
    : minutes < 1440
      ? `${Math.floor(minutes / 60)} h ${minutes % 60} min`
      : `${Math.floor(minutes / 1440)} d ${Math.floor((minutes % 1440) / 60)} h`;
const panel = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  children,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <article className={panel}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-3 break-words text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {children}
        <span>{detail}</span>
      </div>
    </article>
  );
}

function PanelTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function Tables({ tables }: { tables: DashboardData["tables"] }) {
  const rows = [
    { label: "Disponibles", count: tables.available, color: "bg-emerald-500" },
    { label: "Ocupadas", count: tables.occupied, color: "bg-indigo-500" },
    { label: "Reservadas", count: tables.reserved, color: "bg-amber-400" },
    {
      label: "Fuera de servicio",
      count: tables.outOfService,
      color: "bg-slate-300",
    },
  ];
  return (
    <section className={panel}>
      <PanelTitle
        title="Ocupación de mesas"
        subtitle="Estado actual de la sucursal"
      >
        <Table2 size={19} className="text-slate-400" />
      </PanelTitle>
      <div className="flex items-end gap-2">
        <strong className="text-4xl tracking-tight text-slate-900">
          {tables.total
            ? Math.round((tables.occupied / tables.total) * 100)
            : 0}
          %
        </strong>
        <span className="pb-1 text-sm text-slate-500">ocupadas</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {tables.occupied} de {tables.total} mesas activas
      </p>
      <div
        className="my-5 flex h-3 overflow-hidden rounded-full bg-slate-100"
        aria-hidden="true"
      >
        {rows.map((row) => (
          <span
            key={row.label}
            className={row.color}
            style={{
              width: `${tables.total ? (row.count / tables.total) * 100 : 0}%`,
            }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-xs">
            <span className={`h-2 w-2 shrink-0 rounded-full ${row.color}`} />
            <span className="flex-1 text-slate-500">{row.label}</span>
            <strong>{row.count}</strong>
          </div>
        ))}
      </div>
      <Link
        to="/mesas"
        className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"
      >
        Administrar mesas <ArrowRight size={13} />
      </Link>
    </section>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const {
    locationId,
    locations,
    setLocationId,
    loading: locationsLoading,
    error: locationError,
  } = useLocation();
  const [period, setPeriod] = useState<DashboardPeriod>("7d");
  const [chartMetric, setChartMetric] = useState<"sales" | "orders">("sales");
  const query = useQuery({
    queryKey: ["dashboard", user?.membershipId, user?.role, locationId, period],
    queryFn: ({ signal }) => dashboardApi.overview(locationId, period, signal),
    enabled: !!locationId && !locationsLoading,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
  const data = query.data;
  const finance = data?.finance;
  const metric = finance ? chartMetric : "orders";
  const money = (value: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: data?.location.currency ?? "CLP",
      maximumFractionDigits: 0,
    }).format(value);
  const alerts = data
    ? [
        {
          count: data.live.pendingPayments,
          label: "Pagos por confirmar",
          detail: "Revisa antes de registrar otro pago",
          href: "/pedidos",
          icon: CreditCard,
        },
        {
          count: data.live.paidTakeaway,
          label: "Pagados por retirar",
          detail: "Ventas para llevar sin entrega completa",
          href: "/pedidos",
          icon: ShoppingBag,
        },
        {
          count: data.live.cancellationRequests,
          label: "Anulaciones solicitadas",
          detail: "Productos que requieren revisión",
          href: "/pedidos",
          icon: ClipboardList,
        },
        {
          count: data.live.invalidProducts ?? 0,
          label: "Productos sin estación válida",
          detail: "Revisa la configuración del catálogo",
          href: "/productos",
          icon: Package,
        },
      ].filter((alert) => alert.count > 0)
    : [];
  const links = [
    { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
    { to: "/mesas", label: "Mesas", icon: Table2 },
    { to: "/caja", label: "Caja", icon: Wallet },
    { to: "/reportes", label: "Reportes", icon: TrendingUp },
  ].filter((link) => hasModuleAccess(link.to, user?.role));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-16">
      <section className="overflow-hidden rounded-2xl bg-slate-900 p-6 text-white lg:p-7">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">
              MesaPro · Vista general
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Resumen del negocio
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Hola, {user?.firstName}.{" "}
              {user?.role === "WAITER"
                ? "Revisa tus pedidos y pendientes de atención."
                : "Tus indicadores y pendientes, en un solo lugar."}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-40 flex-1 sm:min-w-48">
              <label
                htmlFor="dashboard-location"
                className="mb-1.5 block text-xs text-slate-300"
              >
                Sucursal
              </label>
              <select
                id="dashboard-location"
                value={locationId}
                disabled={locationsLoading || !locations.length}
                onChange={(event) => setLocationId(event.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {!locations.length && <option value="">Sin sucursales</option>}
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={query.isFetching || !locationId}
              onClick={() => void query.refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2.5 text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={query.isFetching ? "animate-spin" : ""}
              />
              Actualizar
            </button>
          </div>
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-xl border border-slate-200 bg-white p-1"
          aria-label="Período del dashboard"
        >
          {(
            [
              ["today", "Hoy"],
              ["7d", "7 días"],
              ["30d", "30 días"],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setPeriod(value)}
              aria-pressed={period === value}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${period === value ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {data
            ? `${shortDate(data.period.from)} – ${shortDate(data.period.to)} · ${data.location.timezone} · Actualizado ${new Date(data.updatedAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: data.location.timezone })}`
            : "Información por sucursal"}
        </p>
      </div>
      {(query.error || locationError) && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {locationError ||
            (query.error instanceof Error
              ? query.error.message
              : "No se pudo cargar el dashboard.")}
          {data &&
            " Se conserva la última consulta; usa Actualizar para reintentar."}
        </div>
      )}
      {!locationId && !locationsLoading && (
        <div className={`${panel} py-12 text-center text-slate-500`}>
          No hay una sucursal disponible para mostrar indicadores.
        </div>
      )}
      {(locationsLoading || (query.isLoading && !!locationId)) && (
        <div
          role="status"
          aria-label="Cargando dashboard"
          className="space-y-5"
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      )}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {finance ? (
              <>
                <Metric
                  label="Ventas netas"
                  value={money(finance.sales)}
                  detail="vs. período anterior"
                  icon={TrendingUp}
                >
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${finance.change === null ? "bg-slate-100 text-slate-500" : finance.change >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                  >
                    {finance.change === null ? (
                      "Sin base previa"
                    ) : (
                      <>
                        {finance.change >= 0 ? (
                          <ArrowUpRight size={12} />
                        ) : (
                          <ArrowDownLeft size={12} />
                        )}
                        {number(Math.abs(finance.change))}%
                      </>
                    )}
                  </span>
                </Metric>
                <Metric
                  label="Cobros netos"
                  value={money(finance.collections)}
                  detail="Pagos confirmados menos reversas"
                  icon={Wallet}
                />
                <Metric
                  label="Ticket promedio"
                  value={money(finance.averageTicket)}
                  detail={`${finance.tickets} cuentas pagadas en el período`}
                  icon={CreditCard}
                />
                <Metric
                  label="Cuentas por cobrar"
                  value={money(finance.outstanding)}
                  detail={`${finance.outstandingBills} cuentas con saldo · actual`}
                  icon={Clock3}
                />
              </>
            ) : (
              <>
                <Metric
                  label={
                    data.scope === "own"
                      ? "Mis pedidos del período"
                      : "Pedidos del período"
                  }
                  value={number(data.orders.total)}
                  detail={`${data.orders.cancelled} cancelados`}
                  icon={ClipboardList}
                />
                <Metric
                  label="Pedidos activos"
                  value={number(data.live.active)}
                  detail="Pendientes de finalizar · actual"
                  icon={Clock3}
                />
                <Metric
                  label="Pagados por retirar"
                  value={number(data.live.paidTakeaway)}
                  detail="Para llevar · actual"
                  icon={ShoppingBag}
                />
                <Metric
                  label={
                    data.scope === "own"
                      ? "Mis mesas abiertas"
                      : "Mesas abiertas"
                  }
                  value={number(data.live.openSessions)}
                  detail="Sesiones abiertas o en cierre"
                  icon={Table2}
                />
              </>
            )}
          </div>
          {alerts.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {alerts.map(({ href, label, count, detail, icon: Icon }) => (
                <Link
                  to={href}
                  key={label}
                  className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 transition hover:border-amber-400"
                >
                  <Icon size={18} className="mt-0.5 shrink-0 text-amber-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-amber-950">
                      {count} {label.toLowerCase()}
                    </p>
                    <p className="mt-1 text-xs text-amber-800">{detail}</p>
                  </div>
                  <ArrowUpRight size={14} className="text-amber-700" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 size={17} />
              Sin alertas pendientes para tu vista en este momento.
            </div>
          )}
          <div className="grid gap-5 xl:grid-cols-3">
            <section className={`${panel} xl:col-span-2`}>
              <PanelTitle
                title={
                  metric === "sales"
                    ? "Evolución de ventas"
                    : "Evolución de pedidos"
                }
                subtitle={
                  metric === "sales"
                    ? "Ventas netas de cuentas pagadas, por fecha de emisión"
                    : "Pedidos creados por día, incluidos los cancelados"
                }
              >
                {finance && (
                  <div className="flex rounded-lg bg-slate-100 p-1">
                    {(
                      [
                        ["sales", "Ventas"],
                        ["orders", "Pedidos"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        onClick={() => setChartMetric(value)}
                        aria-pressed={metric === value}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium ${metric === value ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </PanelTitle>
              <div
                className="h-64 min-w-0"
                role="img"
                aria-label={`${metric === "sales" ? "Ventas netas" : "Pedidos"} entre ${data.period.from} y ${data.period.to}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.timeline}
                    margin={{ top: 10, right: 12, bottom: 0, left: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 4"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={shortDate}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      minTickGap={30}
                    />
                    <YAxis
                      width={65}
                      tickFormatter={(value) =>
                        metric === "sales" && Math.abs(Number(value)) >= 1000
                          ? `${number(Number(value) / 1000)} mil`
                          : number(Number(value))
                      }
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      labelFormatter={(value) => shortDate(String(value))}
                      formatter={(value) => [
                        metric === "sales"
                          ? money(Number(value))
                          : number(Number(value)),
                        metric === "sales" ? "Ventas netas" : "Pedidos",
                      ]}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={metric}
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      fill="#eef2ff"
                      dot={data.timeline.length === 1}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-lg font-bold">
                    {number(data.orders.total)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Pedidos creados</p>
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {number(data.orders.takeaway)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Para llevar</p>
                </div>
                <div>
                  <p className="text-lg font-bold">
                    {number(data.orders.dineIn)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">En mesa</p>
                </div>
              </div>
            </section>
            <Tables tables={data.tables} />
          </div>
          <div
            className={`grid gap-5 ${finance ? "xl:grid-cols-3" : data.cash ? "xl:grid-cols-2" : ""}`}
          >
            {finance && (
              <section className={panel}>
                <PanelTitle
                  title="Productos más vendidos"
                  subtitle="Unidades en pedidos con cuenta pagada del período"
                />
                <div className="space-y-4">
                  {finance.topProducts.length ? (
                    finance.topProducts.map((product, index) => (
                      <div key={product.id}>
                        <div className="mb-2 flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-400">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <p
                            className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700"
                            title={product.name}
                          >
                            {product.name}
                          </p>
                          <strong className="text-sm text-slate-900">
                            {number(product.units)}{" "}
                            <span className="text-xs font-normal text-slate-400">
                              ud.
                            </span>
                          </strong>
                        </div>
                        <div className="ml-7 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{
                              width: `${Math.max(0, (product.units / (finance.topProducts[0].units || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm text-slate-400">
                      Aún no hay productos vendidos en este período.
                    </p>
                  )}
                </div>
              </section>
            )}
            <section className={panel}>
              <PanelTitle
                title="Operación en curso"
                subtitle={
                  data.scope === "own"
                    ? "Solo tus pedidos · estado actual"
                    : "Todos los pedidos activos de la sucursal"
                }
              />
              <div className="space-y-3">
                {[
                  {
                    label: "Pendientes de imprimir",
                    value: data.live.drafts,
                    color: "bg-slate-400",
                  },
                  {
                    label: "Impresos / por entregar",
                    value: data.live.awaitingDelivery,
                    color: "bg-indigo-500",
                  },
                  {
                    label: "Entregados por cerrar",
                    value: data.live.delivered,
                    color: "bg-emerald-500",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"
                  >
                    <span className="flex items-center gap-2 text-sm text-slate-600">
                      <span className={`h-2 w-2 rounded-full ${row.color}`} />
                      {row.label}
                    </span>
                    <strong className="text-lg">{row.value}</strong>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
                <span className="text-slate-500">Cancelados en el período</span>
                <strong>
                  {data.orders.cancelled}{" "}
                  <span className="font-normal text-slate-400">
                    (
                    {data.orders.total
                      ? Math.round(
                          (data.orders.cancelled / data.orders.total) * 100,
                        )
                      : 0}
                    %)
                  </span>
                </strong>
              </div>
            </section>
            {data.cash && (
              <section className={panel}>
                <PanelTitle
                  title="Caja actual"
                  subtitle="Valores de la sesión, fuera del filtro de fechas"
                >
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${data.cash.open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {data.cash.open ? "Abierta" : "Cerrada"}
                  </span>
                </PanelTitle>
                <p className="text-xs text-slate-500">
                  Efectivo esperado en caja
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight">
                  {data.cash.open ? money(data.cash.expected) : "—"}
                </p>
                <p className="mt-2 min-h-8 text-xs text-slate-500">
                  {data.cash.open
                    ? `Apertura por ${data.cash.opener}`
                    : "Abre una sesión para registrar movimientos de efectivo."}
                </p>
                <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm">
                  <p className="font-medium text-amber-900">
                    {data.cash.pendingHandovers} entregas de efectivo pendientes
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    {money(data.cash.pendingHandoverAmount)} por recibir; no se
                    incluyen en el efectivo esperado.
                  </p>
                </div>
                <Link
                  to="/caja"
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"
                >
                  Ir a caja <ArrowRight size={13} />
                </Link>
              </section>
            )}
          </div>
          {finance && (
            <section className={panel}>
              <PanelTitle
                title="Cobros y ajustes"
                subtitle="Pagos por fecha de confirmación y reversas por fecha de reversión"
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-3">
                  {finance.methods.map((method) => (
                    <div
                      key={method.method}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                    >
                      <span className="rounded-lg bg-white p-2 text-slate-500">
                        {method.method === "CARD" ? (
                          <CreditCard size={18} />
                        ) : (
                          <Banknote size={18} />
                        )}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {methodNames[method.method] ?? method.method}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {method.count} pagos · {money(method.reversed)}{" "}
                          revertidos
                        </p>
                      </div>
                      <strong
                        className={`text-sm ${method.net < 0 ? "text-rose-600" : "text-slate-900"}`}
                      >
                        {money(method.net)}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Propinas",
                      value: finance.tips,
                      hint: "En cuentas pagadas del período",
                    },
                    {
                      label: "Descuentos",
                      value: finance.discounts,
                      hint: "En cuentas pagadas del período",
                    },
                    {
                      label: "Reversas",
                      value: finance.reversals,
                      hint: "Pagos revertidos en el período",
                    },
                    {
                      label: "Período anterior",
                      value: finance.previousSales,
                      hint: "Ventas netas para comparar",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-slate-100 p-4"
                    >
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <p className="mt-2 text-xl font-semibold">
                        {money(item.value)}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        {item.hint}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
          <section className={`${panel} overflow-hidden`}>
            <PanelTitle
              title="Pedidos que requieren seguimiento"
              subtitle="Los ocho más antiguos aún sin cerrar. La antigüedad cuenta desde su creación."
            >
              <Link
                to="/pedidos"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"
              >
                Ver todos <ArrowRight size={13} />
              </Link>
            </PanelTitle>
            {data.attentionOrders.length ? (
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      {[
                        "Pedido",
                        "Mesa / cliente",
                        "Estado",
                        "Antigüedad",
                        "",
                      ].map((label, index) => (
                        <th
                          key={index}
                          scope="col"
                          className="whitespace-nowrap px-5 py-3 font-semibold"
                        >
                          {label || <span className="sr-only">Acción</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.attentionOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            #{order.code}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {order.type === "TAKEAWAY"
                              ? "Para llevar"
                              : "En mesa"}
                          </p>
                        </td>
                        <td
                          className="max-w-52 truncate px-5 py-4 text-slate-600"
                          title={order.label}
                        >
                          {order.label}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                            {stateLabels[order.status] ?? order.status}
                          </span>
                          {order.paid && (
                            <span className="ml-2 text-xs font-medium text-emerald-600">
                              Pagado
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs ${order.ageMinutes >= 30 ? "text-amber-700" : "text-slate-500"}`}
                          >
                            <Clock3 size={13} />
                            {age(order.ageMinutes)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`/pedidos?order=${order.id}`}
                            aria-label={`Abrir pedido ${order.code}`}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto text-emerald-500" size={28} />
                <p className="mt-3 text-sm text-slate-500">
                  No hay pedidos pendientes de finalizar.
                </p>
              </div>
            )}
          </section>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-slate-400">Accesos rápidos</span>
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                to={to}
                key={to}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
              >
                <Icon size={14} />
                {label}
                <ArrowUpRight size={12} />
              </Link>
            ))}
          </div>
          <details className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            <summary className="cursor-pointer font-medium">
              Cómo se calculan los indicadores
            </summary>
            <div className="mt-3 space-y-2 leading-relaxed">
              <p>
                Ventas netas: subtotal menos descuentos de cuentas pagadas
                emitidas en el período, sin propinas. Ticket promedio: ventas
                netas divididas por cuentas pagadas.
              </p>
              <p>
                Cobros netos: pagos confirmados en el período menos pagos
                revertidos en el período, incluidas las propinas. Pueden diferir
                de las ventas por las fechas de emisión y pago.
              </p>
              <p>
                Mesas, caja, cuentas por cobrar y pendientes muestran el estado
                actual, aunque selecciones otro período. La comparación utiliza
                los {data.period.days} días anteriores completos; el período
                actual incluye el día de hoy en curso.
              </p>
              <p>
                Los importes representan ventas y cobros, no utilidad: no se
                descuentan costos ni gastos del negocio.
                {data.scope === "own"
                  ? " Los pedidos mostrados corresponden solo a tu asignación."
                  : ""}
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
