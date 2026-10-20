import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  ArrowLeft,
  Trash2,
  Send,
  X,
  ClipboardList,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../../auth/AuthContext";
import { useAppDialog } from "../../../components/ui/AppDialog";
import { useLocation } from "../../../context/LocationContext";
import { tableSessionsApi } from "../../mesas/api/tableSessions.api";
import type { TableSession } from "../../mesas/types";
import { ordersApi, orderCatalogApi } from "../api/orders.api";
import type {
  Order,
  OrderStatus,
  OrderType,
  Product,
  Category,
  Modifier,
  ModifierGroup,
  OrderItem,
} from "../types";
import BillingPanel from "../components/BillingPanel";

const money = (n: number | string) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Ocurrió un error inesperado";

const statusLabel: Record<OrderStatus, string> = {
  DRAFT: "Pendiente de impresión",
  SENT: "Impreso · pendiente de entrega",
  IN_PROGRESS: "Impreso · pendiente de entrega",
  READY: "Entregado",
  DELIVERED: "Entregado",
  CLOSED: "Cerrado",
  CANCELLED: "Cancelado",
};

const statusStyle: Record<OrderStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  READY: "bg-emerald-100 text-emerald-700",
  DELIVERED: "bg-indigo-100 text-indigo-700",
  CLOSED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
};

function orderCode(id: string) {
  return id.slice(-6).toUpperCase();
}

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

function printableOrder(data: Awaited<ReturnType<typeof ordersApi.dispatch>>) {
  const quantity = (value: string) =>
    new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(Number(value));
  const stations = data.stations
    .map(
      (station) => `
        <section class="station">
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
      .detail, .note { margin: 3px 0 0 12px; } .note { font-weight: bold; }
      @media print { body { width: 72mm; } }
    </style></head><body>
      <header><h1>COMANDA #${escapeHtml(data.orderCode)}</h1><p>${escapeHtml(data.tableName)}</p>
      <p>${escapeHtml(data.waiterName)}</p><p>${new Date(data.createdAt).toLocaleString("es-CL")}</p></header>
      ${stations}<script>window.onafterprint=()=>window.close();setTimeout(()=>window.print(),250)</script>
    </body></html>`;
}

function currentBill(order: Order) {
  return order.billOrders
    ?.map(({ bill }) => bill)
    .find((bill) => bill.status !== "VOID");
}

function directCashTotal(order: Order) {
  return (currentBill(order)?.payments ?? [])
    .filter(
      (payment) =>
        payment.method === "CASH" &&
        payment.status === "CONFIRMED" &&
        !payment.cashHandover,
    )
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
}

const itemStatusLabel: Record<string, string> = {
  PENDING: "Sin imprimir",
  SENT: "Impreso · pendiente de entrega",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";
const primary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export default function OrdersPage() {
  const { user } = useAuth();
  const { confirm, input: askInput } = useAppDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    locationId,
    locations,
    setLocationId,
    loading: locationLoading,
  } = useLocation();
  const [orders, setOrders] = useState<Order[]>([]),
    [sessions, setSessions] = useState<TableSession[]>([]);
  const [products, setProducts] = useState<Product[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [modifiers, setModifiers] = useState<Modifier[]>([]),
    [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(false),
    [dataLoaded, setDataLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null),
    [detail, setDetail] = useState<Order | null>(null);
  const [showCreate, setShowCreate] = useState(false),
    [newType, setNewType] = useState<OrderType>("DINE_IN"),
    [sessionId, setSessionId] = useState(""),
    [customerName, setCustomerName] = useState(""),
    [orderNotes, setOrderNotes] = useState("");
  const [filter, setFilter] = useState("ACTIVE"),
    [search, setSearch] = useState(""),
    [productSearch, setProductSearch] = useState(""),
    [categoryId, setCategoryId] = useState("");
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null),
    [chosenProduct, setChosenProduct] = useState<Product | null>(null),
    [qty, setQty] = useState(1),
    [itemNotes, setItemNotes] = useState(""),
    [modifierIds, setModifierIds] = useState<string[]>([]);
  const [readyStations, setReadyStations] = useState<Record<string, boolean>>(
    {},
  );

  const load = useCallback(async (id: string) => {
    const [os, ss, ps, cs, ms, gs] = await Promise.all([
      ordersApi.list(id),
      tableSessionsApi.getOpenByLocation(id),
      orderCatalogApi.products(id),
      orderCatalogApi.categories(id),
      orderCatalogApi.modifiers(),
      orderCatalogApi.groups(id),
    ]);
    return { os, ss, ps, cs, ms, gs };
  }, []);

  useEffect(() => {
    let live = true;
    setOrders([]);
    setSessions([]);
    setProducts([]);
    setCategories([]);
    setModifiers([]);
    setGroups([]);
    setSelectedId(null);
    setDetail(null);
    setError("");
    setSuccess("");
    setDataLoaded(false);
    if (!locationId) {
      setLoading(false);
      setDataLoaded(true);
      return;
    }
    setLoading(true);
    load(locationId)
      .then((v) => {
        if (live) {
          setOrders(v.os);
          setSessions(v.ss);
          setProducts(v.ps);
          setCategories(v.cs);
          setModifiers(v.ms);
          setGroups(v.gs);
        }
      })
      .catch((e) => {
        if (live) setError(message(e));
      })
      .finally(() => {
        if (live) {
          setLoading(false);
          setDataLoaded(true);
        }
      });
    return () => {
      live = false;
    };
  }, [locationId, load]);

  useEffect(() => {
    const requestedOrderId = searchParams.get("order");
    if (
      !requestedOrderId ||
      !orders.some((order) => order.id === requestedOrderId)
    )
      return;
    setSelectedId(requestedOrderId);
    setFilter("ALL");
    setSearchParams({}, { replace: true });
  }, [orders, searchParams, setSearchParams]);

  useEffect(() => {
    if (searchParams.get("new") !== "order" || loading || !dataLoaded) return;

    const requestedSessionId = searchParams.get("session");
    const session = sessions.find((candidate) => candidate.id === requestedSessionId);
    if (!session || session.waiterId !== user?.userId) {
      setError("La mesa ya no está asignada a tu usuario. Actualiza las mesas o solicita la asignación al responsable.");
      setSearchParams({}, { replace: true });
      return;
    }

    const existingOrder = orders.find(
      (order) =>
        order.tableSessionId === session.id &&
        !["CLOSED", "CANCELLED"].includes(order.status),
    );
    if (existingOrder) {
      setSelectedId(existingOrder.id);
      setFilter("ALL");
      setSearch("");
      setSearchParams({}, { replace: true });
      return;
    }

    setNewType("DINE_IN");
    setSessionId(session.id);
    setCustomerName("");
    setOrderNotes("");
    setShowCreate(true);
    setFilter("ACTIVE");
    setSearch("");
    setSearchParams({}, { replace: true });
  }, [dataLoaded, loading, orders, searchParams, sessions, setSearchParams, user?.userId]);

  useEffect(() => {
    let live = true;
    if (!selectedId) {
      setDetail(null);
      return;
    }
    ordersApi
      .get(selectedId)
      .then((v) => {
        if (live) setDetail(v);
      })
      .catch((e) => {
        if (live) setError(message(e));
      });
    return () => {
      live = false;
    };
  }, [selectedId]);

  const refresh = async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const v = await load(locationId);
      setOrders(v.os);
      setSessions(v.ss);
      setProducts(v.ps);
      setCategories(v.cs);
      setModifiers(v.ms);
      setGroups(v.gs);
      if (selectedId) setDetail(await ordersApi.get(selectedId));
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  };

  const run = async (
    action: () => Promise<unknown>,
    done: string,
    closeEditor = false,
  ) => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await action();
      if (closeEditor) {
        setChosenProduct(null);
        setEditingItem(null);
      }
      await refresh();
      setSuccess(done);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const currentSession = sessions.find((s) => s.id === sessionId);
  const ownSessions = sessions.filter((s) => s.waiterId === user?.userId);

  const visibleOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (filter === "ACTIVE" && ["CLOSED", "CANCELLED"].includes(o.status))
          return false;
        if (filter === "DRAFT" && o.status !== "DRAFT") return false;
        if (filter === "DELIVERED" && !["READY", "DELIVERED"].includes(o.status)) return false;
        if (filter === "PAID" && currentBill(o)?.status !== "PAID")
          return false;
        if (
          filter === "FINISHED" &&
          !["CLOSED", "CANCELLED"].includes(o.status)
        )
          return false;
        const label =
          `${o.customerName || ""} ${o.tableSession?.table?.name || ""} ${o.id} ${orderCode(o.id)} ${o.waiter?.firstName || ""} ${currentBill(o)?.id ?? ""} ${(currentBill(o)?.payments ?? []).map((payment) => payment.id).join(" ")}`.toLowerCase();
        return label.includes(search.toLowerCase());
      }),
    [orders, filter, search],
  );

  const itemTotal = (item: OrderItem) =>
    item.status === "CANCELLED"
      ? 0
      : (Number(item.unitPrice) +
          (item.modifiers || []).reduce(
            (sum, m) => sum + Number(m.priceDelta),
            0,
          )) *
        Number(item.quantity);
  const total = (detail?.items || []).reduce(
    (sum, item) => sum + itemTotal(item),
    0,
  );
  const billableOrders = useMemo(() => {
    if (!detail || detail.status !== "DELIVERED") return [];
    const candidates =
      detail.type === "DINE_IN" && detail.tableSessionId
        ? orders.filter(
            (order) => order.tableSessionId === detail.tableSessionId,
          )
        : orders.filter((order) => order.id === detail.id);

    return candidates
      .filter(
        (order) =>
          order.status === "DELIVERED" &&
          (order.billOrders?.length ?? 0) === 0 &&
          (user?.role !== "WAITER" || order.waiterId === user.userId),
      )
      .map((order) => ({
        id: order.id,
        label: `${order.type === "DINE_IN" ? order.tableSession?.table?.name ?? "Mesa" : `Para llevar${order.customerName ? ` · ${order.customerName}` : ""}`} · Pedido #${orderCode(order.id)}`,
        total: order.items.reduce((sum, item) => sum + itemTotal(item), 0),
      }));
  }, [detail, orders, user?.role, user?.userId]);
  const canOperateOrder =
    !!detail &&
    !!user &&
    ["OWNER", "ADMIN", "MANAGER", "WAITER"].includes(user.role) &&
    (user.role !== "WAITER" || detail.waiterId === user.userId);
  const canAddProducts =
    !!detail &&
    canOperateOrder &&
    !currentBill(detail) &&
    !["CLOSED", "CANCELLED"].includes(detail.status) &&
    (detail.type === "DINE_IN"
      ? sessions.some(
          (session) =>
            session.id === detail.tableSessionId && session.status === "OPEN",
        )
      : detail.status === "DRAFT");

  const filteredProducts = products.filter(
    (p) =>
      (!categoryId || p.categoryId === categoryId) &&
      `${p.name} ${p.description || ""}`
        .toLowerCase()
        .includes(productSearch.toLowerCase()),
  );

  const productModifiers = modifiers.filter(
    (m) =>
      m.active &&
      m.productId === chosenProduct?.id &&
      groups.some(
        (g) =>
          g.id === m.groupId &&
          g.locationId === locationId &&
          g.status !== "INACTIVE",
      ),
  );

  const groupedModifiers = groups.filter((g) =>
    productModifiers.some((m) => m.groupId === g.id),
  );

  const chooseProduct = async (p: Product, item: OrderItem | null = null) => {
    setChosenProduct(p);
    setEditingItem(item);
    setQty(Number(item?.quantity) || 1);
    setItemNotes(item?.notes || "");
    setModifierIds((item?.modifiers || []).map((m) => m.modifierId));
    setReadyStations({});
    try {
      const stations = await orderCatalogApi.workstations(p.id);
      setReadyStations({
        [p.id]:
          stations.length === 1 && stations[0].workstation.status === "ACTIVE",
      });
    } catch {
      setReadyStations({ [p.id]: false });
    }
  };

  const saveItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!detail || !chosenProduct) return;
    if (!Number.isFinite(qty) || qty <= 0 || Number(qty.toFixed(3)) !== qty) {
      setError("La cantidad debe ser mayor que cero y admitir hasta 3 decimales.");
      return;
    }
    for (const g of groupedModifiers) {
      const count = productModifiers.filter(
        (m) => m.groupId === g.id && modifierIds.includes(m.id),
      ).length;
      if (
        count < g.minSelections ||
        (g.maxSelections !== null && count > g.maxSelections)
      ) {
        setError(
          `El grupo «${g.name}» requiere entre ${g.minSelections} y ${g.maxSelections ?? "varias"} opciones.`,
        );
        return;
      }
    }
    const payload = { quantity: qty, notes: itemNotes, modifierIds };
    if (editingItem)
      await run(
        () => ordersApi.updateItem(detail.id, editingItem.id, payload),
        "Producto actualizado.",
        true,
      );
    else
      await run(
        () =>
          ordersApi.addItem(detail.id, {
            productId: chosenProduct.id,
            ...payload,
          }),
        "Producto agregado.",
        true,
      );
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!locationId || !user) return;
    const data =
      newType === "DINE_IN"
        ? {
            locationId,
            type: newType,
            tableSessionId: sessionId,
            waiterId: user.userId,
            notes: orderNotes,
          }
        : {
            locationId,
            type: newType,
            ...(customerName.trim()
              ? { customerName: customerName.trim() }
              : {}),
            notes: orderNotes,
            ...(user.role === "WAITER" ? { waiterId: user.userId } : {}),
          };
    if (
      newType === "DINE_IN" &&
      (!currentSession || currentSession.waiterId !== user.userId)
    ) {
      setError("Selecciona una mesa asignada a tu usuario.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const created = await ordersApi.create(data);
      setShowCreate(false);
      setSelectedId(created.id);
      setDetail(await ordersApi.get(created.id));
      await refresh();
      setSuccess("Pedido creado. Ahora agrega productos.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const printDispatch = async (reprint = false) => {
    if (!detail) return;
    const printWindow = window.open("", "_blank", "width=480,height=720");
    if (!printWindow) {
      setError("El navegador bloqueó la impresión. Permite ventanas emergentes para este sitio e inténtalo nuevamente.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const printData = await ordersApi.dispatch(detail.id, reprint);
      printWindow.document.open();
      printWindow.document.write(printableOrder(printData));
      printWindow.document.close();
      await refresh();
      setSuccess(reprint ? "Comanda reimpresa." : "Comanda enviada a impresión.");
    } catch (err) {
      printWindow.close();
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const markDelivered = async (item: OrderItem) => {
    if (!detail) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await ordersApi.markItemDelivered(detail.id, item.id);
      await refresh();
      setSuccess(`«${item.productNameSnapshot}» marcado como entregado.`);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (
      !detail ||
      !(await confirm({
        title: "Cancelar pedido",
        description:
          "Se cancelará el pedido completo antes de imprimirlo. Los productos ya impresos deben cancelarse uno por uno y avisar a cocina.",
        confirmLabel: "Cancelar pedido",
        tone: "danger",
      }))
    )
      return;
    void run(() => ordersApi.cancel(detail.id), "Pedido cancelado.");
  };

  const requestItemCancellation = async (item: OrderItem) => {
    if (!detail) return;
    const reason = await askInput({
      title: "Cancelar producto impreso",
      description: `«${item.productNameSnapshot}» se retirará de la cuenta. Avisa a cocina de inmediato para detener su preparación.`,
      label: "Motivo de cancelación",
      placeholder: "Indica el motivo",
      required: true,
      multiline: true,
      confirmLabel: "Cancelar producto",
      tone: "danger",
    });
    if (!reason?.trim()) return;
    void run(
      () =>
        ordersApi.requestItemCancellation(detail.id, item.id, reason.trim()),
      "Producto cancelado. Avisa a cocina de inmediato.",
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pedidos</h1>
          <p className="text-sm text-slate-500">
            Atención en mesa y pedidos para llevar
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={secondary}
            disabled={loading || busy || !locationId}
            onClick={() => void refresh()}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
          <button
            className={primary}
            disabled={!locationId || busy}
            onClick={() => {
              setError("");
              setShowCreate(true);
            }}
          >
            <Plus size={17} />
            Nuevo pedido
          </button>
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sucursal
        </label>
        <select
          className={`${input} max-w-sm`}
          value={locationId}
          disabled={locationLoading}
          onChange={(e) => setLocationId(e.target.value)}
        >
          {locations.length === 0 && <option value="">Sin sucursales</option>}
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
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
      {!selectedId ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              {
                label: "Activos",
                value: orders.filter(
                  (o) => !["CLOSED", "CANCELLED"].includes(o.status),
                ).length,
              },
              {
                label: "Borradores",
                value: orders.filter((o) => o.status === "DRAFT").length,
              },
              {
                label: "Enviados",
                value: orders.filter((o) =>
                  ["SENT", "IN_PROGRESS"].includes(o.status),
                ).length,
              },
              {
                label: "Entregados",
                value: orders.filter((o) => ["READY", "DELIVERED"].includes(o.status)).length,
              },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border bg-white p-4">
                <p className="text-2xl font-bold text-slate-900">{c.value}</p>
                <p className="text-xs text-slate-500">{c.label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["ACTIVE", "Activos"],
              ["DRAFT", "Borradores"],
              ["DELIVERED", "Entregados"],
              ["PAID", "Pagados"],
              ["FINISHED", "Finalizados"],
              ["ALL", "Todos"],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`rounded-full px-4 py-2 text-sm ${filter === v ? "bg-indigo-600 text-white" : "border bg-white text-slate-600"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={17}
            />
            <input
              className={`${input} pl-10`}
              placeholder="Buscar mesa, cliente, código de pedido o cuenta"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {loading ? (
            <p className="rounded-xl border bg-white p-10 text-center text-slate-500">
              Cargando pedidos...
            </p>
          ) : visibleOrders.length === 0 ? (
            <div className="rounded-xl border bg-white p-10 text-center">
              <ClipboardList
                className="mx-auto mb-3 text-slate-400"
                size={32}
              />
              <p className="font-medium">No hay pedidos para mostrar</p>
              <p className="text-sm text-slate-500">
                Crea un pedido o cambia los filtros.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setSelectedId(o.id);
                  }}
                  className="rounded-xl border bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">
                      {o.type === "DINE_IN"
                        ? o.tableSession?.table?.name || "Pedido de mesa"
                        : `Para llevar · ${o.customerName || "Cliente"}`}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${statusStyle[o.status]}`}
                    >
                      {statusLabel[o.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Pedido #{orderCode(o.id)}
                  </p>
                  {currentBill(o)?.status === "PAID" && (
                    <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Pagado · {money(currentBill(o)!.total)}
                    </p>
                  )}
                  {directCashTotal(o) > 0 && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      Efectivo directo a caja · {money(directCashTotal(o))}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-500">
                    {o.items?.filter((i) => i.status !== "CANCELLED").length ||
                      0}{" "}
                    ítems · {new Date(o.createdAt).toLocaleString("es-CL")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {o.waiter
                      ? `Mesero: ${o.waiter.firstName} ${o.waiter.lastName}`
                      : "Atención de caja"}
                  </p>
                  <p className="mt-3 text-sm font-medium text-indigo-600">
                    Ver pedido →
                  </p>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <button
            className={secondary}
            onClick={() => {
              setSelectedId(null);
              setDetail(null);
              setChosenProduct(null);
              setEditingItem(null);
            }}
          >
            <ArrowLeft size={16} />
            Volver al listado
          </button>
          {!detail ? (
            <div className="rounded-xl border bg-white p-8 text-center">
              Cargando detalle...
            </div>
          ) : (
            <>
              <div className="rounded-xl border bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">
                      {detail.type === "DINE_IN"
                        ? detail.tableSession?.table?.name || "Pedido de mesa"
                        : `Para llevar · ${detail.customerName || ""}`}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Creado el{" "}
                      {new Date(detail.createdAt).toLocaleString("es-CL")}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Pedido #{orderCode(detail.id)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${statusStyle[detail.status]}`}
                  >
                    {statusLabel[detail.status]}
                  </span>
                </div>
                {currentBill(detail) && (
                  <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Cuenta #
                          {currentBill(detail)!.id.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {currentBill(detail)!.status === "PAID"
                            ? "Pagada"
                            : currentBill(detail)!.status === "PARTIALLY_PAID"
                              ? "Pago parcial"
                              : "Pendiente de pago"}{" "}
                          · {money(currentBill(detail)!.total)}
                        </p>
                      </div>
                      {directCashTotal(detail) > 0 && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          Efectivo directo a caja ·{" "}
                          {money(directCashTotal(detail))}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {detail.notes && (
                  <p className="mt-3 text-sm text-slate-600">
                    Nota general: {detail.notes}
                  </p>
                )}
              </div>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                  {canAddProducts && (
                    <div className="rounded-xl border bg-white p-4">
                      <h3 className="mb-3 font-semibold">Agregar productos</h3>
                      <div className="relative mb-3">
                        <Search
                          size={16}
                          className="absolute left-3 top-3 text-slate-400"
                        />
                        <input
                          className={`${input} pl-9`}
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Buscar productos..."
                        />
                      </div>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <button
                          className={`rounded-full px-3 py-1.5 text-xs ${!categoryId ? "bg-indigo-600 text-white" : "bg-slate-100"}`}
                          onClick={() => setCategoryId("")}
                        >
                          Todos
                        </button>
                        {categories.map((c) => (
                          <button
                            key={c.id}
                            className={`rounded-full px-3 py-1.5 text-xs ${categoryId === c.id ? "bg-indigo-600 text-white" : "bg-slate-100"}`}
                            onClick={() => setCategoryId(c.id)}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                      <div className="grid max-h-[440px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => void chooseProduct(p)}
                            className="flex items-center justify-between gap-2 rounded-xl border p-3 text-left hover:border-indigo-400"
                          >
                            <div>
                              <p className="text-sm font-semibold">{p.name}</p>
                              <p className="text-xs text-slate-500">
                                {money(p.price)}
                              </p>
                            </div>
                            <Plus
                              className="shrink-0 text-indigo-600"
                              size={18}
                            />
                          </button>
                        ))}
                        {filteredProducts.length === 0 && (
                          <p className="text-sm text-slate-500">
                            No se encontraron productos.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl border bg-white p-4">
                    <h3 className="mb-3 font-semibold">Productos del pedido</h3>
                    {(detail.items || []).filter(
                      (i) => i.status !== "CANCELLED",
                    ).length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-500">
                        Aún no se han agregado productos.
                      </p>
                    ) : (
                      (detail.items || [])
                        .filter((i) => i.status !== "CANCELLED")
                        .map((i) => (
                          <div
                            key={i.id}
                            className="border-b py-3 last:border-b-0"
                          >
                            <div className="flex justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">
                                  {i.quantity} × {i.productNameSnapshot}
                                </p>
                                {(i.modifiers || []).map((m) => (
                                  <p
                                    key={m.id}
                                    className="text-xs text-slate-500"
                                  >
                                    + {m.nameSnapshot} ({money(m.priceDelta)})
                                  </p>
                                ))}
                                {i.notes && (
                                  <p className="text-xs italic text-slate-500">
                                    {i.notes}
                                  </p>
                                )}
                              </div>
                              <span className="text-sm font-semibold">
                                {money(itemTotal(i))}
                              </span>
                            </div>
                            <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                              {itemStatusLabel[i.status] ?? i.status}
                            </span>
                            {i.cancellationReason && i.status === "CANCELLED" && (
                              <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                Motivo de cancelación: {i.cancellationReason}
                              </p>
                            )}
                            {canAddProducts && i.status === "PENDING" && (
                              <div className="mt-2 flex gap-3">
                                <button
                                  className="text-xs text-indigo-600"
                                  onClick={() => {
                                    const p = products.find(
                                      (p) => p.id === i.productId,
                                    );
                                    if (p) void chooseProduct(p, i);
                                    else
                                      setError(
                                        "Este producto ya no está activo en el catálogo.",
                                      );
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  className="flex items-center gap-1 text-xs text-red-600"
                                  disabled={busy}
                                  onClick={() => {
                                    void (async () => {
                                      if (
                                        await confirm({
                                          title: "Quitar producto del pedido",
                                          description: `Se quitará «${i.productNameSnapshot}» del borrador.`,
                                          confirmLabel: "Quitar producto",
                                          tone: "danger",
                                        })
                                      )
                                        void run(
                                          () =>
                                            ordersApi.removeItem(
                                              detail.id,
                                              i.id,
                                            ),
                                          "Producto quitado.",
                                        );
                                    })();
                                  }}
                                >
                                  <Trash2 size={13} />
                                  Quitar
                                </button>
                              </div>
                            )}
                            {canOperateOrder && i.status === "SENT" && (
                                <div className="mt-2 flex gap-3">
                                  <button
                                    className="text-xs font-medium text-emerald-700"
                                    disabled={busy}
                                    onClick={() => void markDelivered(i)}
                                  >
                                    Marcar entregado
                                  </button>
                                  <button
                                    className="text-xs text-red-600"
                                    disabled={busy}
                                    onClick={() => requestItemCancellation(i)}
                                  >
                                    Cancelar producto
                                  </button>
                                </div>
                              )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
                <aside className="h-fit space-y-4 rounded-xl border bg-white p-5 xl:sticky xl:top-5">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <ShoppingCart size={18} />
                    Resumen
                  </h3>
                  <div className="flex justify-between border-t pt-4">
                    <span className="font-medium">Total estimado</span>
                    <strong className="text-xl">{money(total)}</strong>
                  </div>
                  <p className="text-xs text-slate-500">
                    Calculado con precios y modificadores registrados. El cobro
                    se realizará en Caja.
                  </p>
                  {canAddProducts && (detail.items || []).some((i) => i.status === "PENDING") && (
                    <button
                      className={`${primary} w-full`}
                      disabled={busy}
                      onClick={() => void printDispatch(false)}
                    >
                      <Send size={16} />
                      Imprimir comanda de productos nuevos
                    </button>
                  )}
                  {canOperateOrder && (detail.items || []).some((i) => i.status === "SENT") && (
                    <button
                      className={secondary + " w-full"}
                      disabled={busy}
                      onClick={() => void printDispatch(true)}
                    >
                      Reimprimir productos pendientes
                    </button>
                  )}
                  {canOperateOrder &&
                    ["DRAFT", "SENT"].includes(detail.status) &&
                    (detail.items || []).every((i) =>
                      ["PENDING", "CANCELLED"].includes(i.status),
                    ) && (
                    <button
                      className={`${secondary} w-full text-red-600`}
                      disabled={busy}
                      onClick={cancel}
                    >
                      <X size={16} />
                      Cancelar pedido
                    </button>
                  )}
                  {detail.type === "DINE_IN" && canOperateOrder && !currentBill(detail) && (
                    <p className="text-xs text-slate-500">
                      Puedes agregar otra ronda al mismo pedido mientras la mesa siga abierta. Marca cada producto al entregarlo.
                    </p>
                  )}
                  {["DELIVERED", "CLOSED"].includes(detail.status) && (
                    <BillingPanel
                      orderId={detail.id}
                      billableOrders={billableOrders}
                      locationId={detail.locationId}
                      orderStatus={detail.status}
                      onOrderUpdated={refresh}
                    />
                  )}
                </aside>
              </div>
            </>
          )}
        </>
      )}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={(e) => void create(e)}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Nuevo pedido</h2>
              <button type="button" onClick={() => setShowCreate(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewType("DINE_IN")}
                className={`rounded-xl border p-3 text-sm ${newType === "DINE_IN" ? "border-indigo-500 bg-indigo-50" : "bg-white"}`}
              >
                En mesa
              </button>
              <button
                type="button"
                onClick={() => setNewType("TAKEAWAY")}
                className={`rounded-xl border p-3 text-sm ${newType === "TAKEAWAY" ? "border-indigo-500 bg-indigo-50" : "bg-white"}`}
              >
                Para llevar
              </button>
            </div>
            {newType === "DINE_IN" ? (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Mesa asignada a ti
                </label>
                <select
                  required
                  className={input}
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                >
                  <option value="">Seleccionar mesa</option>
                  {ownSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.table?.name || s.tableId}
                    </option>
                  ))}
                </select>
                {ownSessions.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    No tienes mesas abiertas asignadas. Abre una mesa con tu
                    usuario desde Mesas.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Nombre del cliente (opcional)
                </label>
                <input
                  className={input}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej. Daniela"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Observaciones generales (opcional)
              </label>
              <textarea
                className={input}
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={`${secondary} flex-1`}
                onClick={() => setShowCreate(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy || (newType === "DINE_IN" && !sessionId)}
                className={`${primary} flex-1`}
              >
                {busy ? "Creando..." : "Crear pedido"}
              </button>
            </div>
          </form>
        </div>
      )}
      {chosenProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={(e) => void saveItem(e)}
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{chosenProduct.name}</h2>
                <p className="text-sm text-slate-500">
                  {money(chosenProduct.price)} por unidad
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setChosenProduct(null);
                  setEditingItem(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            {readyStations[chosenProduct.id] === false && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Este producto no tiene una estación activa confirmada. Para
                imprimir la comanda debe tener al menos una estación configurada.
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Cantidad</label>
              <input
                className={input}
                type="number"
                min="0.001"
                max="999999999"
                step="0.001"
                required
                value={qty}
                onChange={(event) => setQty(Number(event.target.value))}
              />
              <p className="mt-1 text-xs text-slate-500">
                Puedes ingresar cantidades fraccionarias, por ejemplo 0,5 kg.
              </p>
            </div>
            {groupedModifiers.map((g) => (
              <div key={g.id} className="rounded-xl border p-3">
                <p className="font-medium">{g.name}</p>
                <p className="mb-2 text-xs text-slate-500">
                  Mínimo {g.minSelections} · Máximo{" "}
                  {g.maxSelections ?? "sin límite"}
                </p>
                {productModifiers
                  .filter((m) => m.groupId === g.id)
                  .map((m) => (
                    <label
                      key={m.id}
                      className="flex cursor-pointer items-center justify-between gap-2 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={modifierIds.includes(m.id)}
                          onChange={(e) =>
                            setModifierIds((old) =>
                              e.target.checked
                                ? [...old, m.id]
                                : old.filter((id) => id !== m.id),
                            )
                          }
                        />
                        {m.name}
                      </span>
                      <span>
                        {Number(m.priceDelta) >= 0 ? "+" : ""}
                        {money(m.priceDelta)}
                      </span>
                    </label>
                  ))}
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Indicaciones para preparación
              </label>
              <textarea
                rows={2}
                className={input}
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="Ej. Sin cebolla"
              />
            </div>
            <div className="flex justify-between font-semibold">
              <span>Subtotal</span>
              <span>
                {money(
                  (Number(chosenProduct.price) +
                    productModifiers
                      .filter((m) => modifierIds.includes(m.id))
                      .reduce((s, m) => s + Number(m.priceDelta), 0)) *
                    qty,
                )}
              </span>
            </div>
            <button
              type="submit"
              disabled={busy}
              className={`${primary} w-full`}
            >
              {busy
                ? "Guardando..."
                : editingItem
                  ? "Guardar cambios"
                  : "Agregar al pedido"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
