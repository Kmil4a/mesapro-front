import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Clock3,
  Coffee,
  LoaderCircle,
  RefreshCw,
  Search,
  Utensils,
  XCircle,
} from "lucide-react";

import { useLocation } from "../../../context/LocationContext";
import { preparationsApi } from "../api/preparations.api";
import type {
  PreparationTicket,
  PreparationTicketStatus,
  PreparationWorkstation,
} from "../types";

const input =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";
const primary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const statusLabel: Record<PreparationTicketStatus, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  IN_PROGRESS: "En preparación",
  READY: "Lista",
  CANCELLED: "Cancelada",
};

const statusStyle: Record<PreparationTicketStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800",
  READY: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-100 text-slate-600",
};

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Ocurrió un error inesperado";

const dateTime = (value: string) =>
  new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const elapsedMinutes = (value: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));

function ticketDestination(ticket: PreparationTicket) {
  if (ticket.order.type === "TAKEAWAY") {
    return `Para llevar${ticket.order.customerName ? ` · ${ticket.order.customerName}` : ""}`;
  }
  return ticket.order.tableSession?.table?.name ?? "Pedido en mesa";
}

function TicketCard({
  ticket,
  busy,
  onStatus,
}: {
  ticket: PreparationTicket;
  busy: boolean;
  onStatus: (
    ticket: PreparationTicket,
    status: PreparationTicketStatus,
  ) => void;
}) {
  const canAccept = ticket.status === "PENDING";
  const canStart = ticket.status === "ACCEPTED";
  const canFinish = ticket.status === "IN_PROGRESS";
  const itemCount = ticket.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">
            {ticketDestination(ticket)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Pedido #{ticket.orderId.slice(0, 8).toUpperCase()} · Recibida{" "}
            {dateTime(ticket.createdAt)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[ticket.status]}`}
        >
          {statusLabel[ticket.status]}
        </span>
      </div>

      <div className="flex-1 space-y-3 p-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock3 size={14} />
          <span>{elapsedMinutes(ticket.createdAt)} min en cola</span>
          <span aria-hidden="true">·</span>
          <span>
            {itemCount} {itemCount === 1 ? "unidad" : "unidades"}
          </span>
        </div>

        <ul className="space-y-3">
          {ticket.items.map((ticketItem) => {
            const item = ticketItem.orderItem;
            return (
              <li key={ticketItem.id} className="flex items-start gap-3">
                <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2 text-sm font-bold text-slate-800">
                  {ticketItem.quantity}×
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {item.productNameSnapshot ||
                      item.product?.name ||
                      "Producto"}
                  </p>
                  {!!item.modifiers?.length && (
                    <p className="mt-1 text-xs text-slate-500">
                      {item.modifiers
                        .map((modifier) => modifier.nameSnapshot)
                        .join(" · ")}
                    </p>
                  )}
                  {item.notes && (
                    <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
                      <span className="font-semibold">Nota: </span>
                      {item.notes}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {ticket.order.notes && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">
              Nota del pedido:{" "}
            </span>
            {ticket.order.notes}
          </div>
        )}
      </div>

      {ticket.status !== "READY" && ticket.status !== "CANCELLED" && (
        <div className="border-t border-slate-100 p-4">
          {canAccept && (
            <button
              className={`${primary} w-full`}
              disabled={busy}
              onClick={() => onStatus(ticket, "ACCEPTED")}
            >
              {busy ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Aceptar comanda
            </button>
          )}
          {canStart && (
            <button
              className={`${primary} w-full`}
              disabled={busy}
              onClick={() => onStatus(ticket, "IN_PROGRESS")}
            >
              {busy ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <ChefHat size={16} />
              )}
              Comenzar preparación
            </button>
          )}
          {canFinish && (
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              onClick={() => onStatus(ticket, "READY")}
            >
              {busy ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Marcar como lista
            </button>
          )}
          <button
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            onClick={() => onStatus(ticket, "CANCELLED")}
          >
            <XCircle size={15} />
            Cancelar comanda
          </button>
        </div>
      )}
    </article>
  );
}

export default function PreparationsPage() {
  const {
    locationId,
    locations,
    setLocationId,
    loading: locationLoading,
  } = useLocation();

  const [tickets, setTickets] = useState<PreparationTicket[]>([]);
  const [workstations, setWorkstations] = useState<PreparationWorkstation[]>(
    [],
  );
  const [workstationId, setWorkstationId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ACTIVE" | "ALL" | PreparationTicketStatus
  >("ACTIVE");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(
    async (showLoader = true) => {
      if (!locationId) {
        setTickets([]);
        setWorkstations([]);
        return;
      }

      if (showLoader) setLoading(true);
      try {
        const [ticketData, workstationData] = await Promise.all([
          preparationsApi.list(locationId),
          preparationsApi.workstations(locationId),
        ]);
        setTickets(ticketData);
        setWorkstations(workstationData);

        setWorkstationId((current) => {
          if (
            current !== "ALL" &&
            !workstationData.some((w) => w.id === current)
          ) {
            return "ALL";
          }
          return current;
        });
        setLastUpdated(new Date());
        setError("");
      } catch (e) {
        setError(message(e));
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [locationId],
  );

  useEffect(() => {
    setTickets([]);
    setWorkstations([]);
    setWorkstationId("ALL");
    setError("");
    setSuccess("");
    void refresh(true);
  }, [refresh]);

  // Polling keeps the kitchen/bar board reasonably fresh without requiring WebSockets.
  useEffect(() => {
    if (!locationId) return;
    const timer = window.setInterval(() => void refresh(false), 15_000);
    return () => window.clearInterval(timer);
  }, [locationId, refresh]);

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es-CL");
    return tickets
      .filter(
        (ticket) =>
          workstationId === "ALL" || ticket.workstationId === workstationId,
      )
      .filter((ticket) => {
        if (statusFilter === "ACTIVE") {
          return ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(ticket.status);
        }
        return statusFilter === "ALL" || ticket.status === statusFilter;
      })
      .filter((ticket) => {
        if (!normalizedSearch) return true;
        const productNames = ticket.items
          .map(
            (item) =>
              item.orderItem.productNameSnapshot ||
              item.orderItem.product?.name ||
              "",
          )
          .join(" ");
        const haystack = [
          ticket.id,
          ticket.orderId,
          ticket.workstation.name,
          ticketDestination(ticket),
          productNames,
        ]
          .join(" ")
          .toLocaleLowerCase("es-CL");
        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => {
        const priority: Record<PreparationTicketStatus, number> = {
          PENDING: 0,
          ACCEPTED: 1,
          IN_PROGRESS: 2,
          READY: 3,
          CANCELLED: 4,
        };
        return (
          priority[a.status] - priority[b.status] ||
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
  }, [tickets, workstationId, statusFilter, search]);

  const counts = useMemo(
    () => ({
      pending: tickets.filter(
        (t) =>
          t.status === "PENDING" &&
          (workstationId === "ALL" || t.workstationId === workstationId),
      ).length,
      inProgress: tickets.filter(
        (t) =>
          ["ACCEPTED", "IN_PROGRESS"].includes(t.status) &&
          (workstationId === "ALL" || t.workstationId === workstationId),
      ).length,
      ready: tickets.filter(
        (t) =>
          t.status === "READY" &&
          (workstationId === "ALL" || t.workstationId === workstationId),
      ).length,
    }),
    [tickets, workstationId],
  );

  const changeStatus = async (
    ticket: PreparationTicket,
    status: PreparationTicketStatus,
  ) => {
    const actionLabel: Record<PreparationTicketStatus, string> = {
      PENDING: "pendiente",
      ACCEPTED: "aceptada",
      IN_PROGRESS: "en preparación",
      READY: "lista",
      CANCELLED: "cancelada",
    };
    const question: Partial<Record<PreparationTicketStatus, string>> = {
      ACCEPTED: "¿Aceptar esta comanda?",
      IN_PROGRESS: "¿Comenzar la preparación de esta comanda?",
      READY:
        "¿Marcar esta comanda como lista? Si es la última de su pedido, el pedido también quedará listo.",
      CANCELLED: "¿Cancelar esta comanda? Esta acción no se puede deshacer.",
    };

    if (question[status] && !window.confirm(question[status])) return;

    setBusyTicketId(ticket.id);
    setError("");
    setSuccess("");
    try {
      const result = await preparationsApi.updateStatus(ticket.id, status);
      setSuccess(
        result.orderUpdated
          ? "Comanda lista. Todas las comandas del pedido están listas y el pedido se actualizó."
          : `Comanda actualizada a ${actionLabel[status]}.`,
      );
      await refresh(false);
    } catch (e) {
      setError(message(e));
      // Refresh helps reconcile if the server changed state before a network error.
      await refresh(false);
    } finally {
      setBusyTicketId(null);
    }
  };

  const activeWorkstationName =
    workstationId === "ALL"
      ? "Todas las estaciones"
      : (workstations.find((w) => w.id === workstationId)?.name ?? "Estación");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
              <ChefHat size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Preparaciones</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona las comandas y sigue su avance por estación de trabajo.
          </p>
        </div>
        <button
          className={secondary}
          disabled={loading || !locationId}
          onClick={() => void refresh(true)}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sucursal
            </label>
            <select
              className={input}
              value={locationId}
              disabled={locationLoading}
              onChange={(event) => setLocationId(event.target.value)}
            >
              {locations.length === 0 && (
                <option value="">Sin sucursales</option>
              )}
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Estación de trabajo
            </label>
            <select
              className={input}
              value={workstationId}
              onChange={(event) => setWorkstationId(event.target.value)}
              disabled={!locationId || workstations.length === 0}
            >
              <option value="ALL">Todas las estaciones</option>
              {workstations.map((workstation) => (
                <option key={workstation.id} value={workstation.id}>
                  {workstation.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            className="text-red-700 underline"
            onClick={() => void refresh(true)}
          >
            Reintentar
          </button>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            label: "Pendientes",
            value: counts.pending,
            icon: Clock3,
            style: "bg-amber-50 text-amber-700",
          },
          {
            label: "Aceptadas / en preparación",
            value: counts.inProgress,
            icon: Utensils,
            style: "bg-indigo-50 text-indigo-700",
          },
          {
            label: "Listas",
            value: counts.ready,
            icon: CheckCircle2,
            style: "bg-emerald-50 text-emerald-700",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className={`rounded-xl p-3 ${card.style}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {card.value}
                </p>
                <p className="text-xs text-slate-500">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["ACTIVE", "Activas"],
              ["PENDING", "Pendientes"],
              ["ACCEPTED", "Aceptadas"],
              ["IN_PROGRESS", "En preparación"],
              ["READY", "Listas"],
              ["CANCELLED", "Canceladas"],
              ["ALL", "Todas"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                statusFilter === value
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            className={`${input} pl-9`}
            placeholder="Buscar pedido o producto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <p>
          {filteredTickets.length} comandas · {activeWorkstationName}
        </p>
        {lastUpdated && (
          <p>Actualizado {dateTime(lastUpdated.toISOString())}</p>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          <LoaderCircle
            size={28}
            className="mx-auto mb-3 animate-spin text-indigo-600"
          />
          Cargando comandas...
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          {statusFilter === "ACTIVE" ? (
            <Coffee size={34} className="mx-auto mb-3 text-slate-400" />
          ) : (
            <XCircle size={34} className="mx-auto mb-3 text-slate-400" />
          )}
          <p className="font-semibold text-slate-800">
            No hay comandas para mostrar
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {statusFilter === "ACTIVE"
              ? "Las nuevas comandas aparecerán aquí cuando se envíen desde Pedidos."
              : "Prueba con otro estado, estación o término de búsqueda."}
          </p>
        </div>
      ) : (
        <div className="grid items-stretch gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              busy={busyTicketId === ticket.id}
              onStatus={changeStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
