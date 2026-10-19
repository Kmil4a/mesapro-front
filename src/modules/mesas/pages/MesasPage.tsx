import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  CheckCircle2,
  CirclePlus,
  Pencil,
  RefreshCw,
  Table2,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "../../../auth/AuthContext";
import { useLocation } from "../../../context/LocationContext";
import { membershipsApi, type Membership } from "../../../api/memberships";
import { tablesApi } from "../api/tables.api";
import { tableSessionsApi } from "../api/tableSessions.api";

import type { RestaurantTable, TableSession } from "../types";

type ModalMode = "create" | "edit" | "open" | null;

const canManageTables = ["OWNER", "ADMIN", "MANAGER"];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado";
}

export default function MesasPage() {
  const { user } = useAuth();
  const {
    locations,
    locationId,
    setLocationId,
    loading: loadingLocations,
    error: locationsError,
  } = useLocation();

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modal, setModal] = useState<ModalMode>(null);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(
    null,
  );

  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [waiterId, setWaiterId] = useState("");

  const isManager = !!user && canManageTables.includes(user.role);

  const waiters = useMemo(() => {
    return memberships
      .filter(
        (membership) =>
          membership.status === "ACTIVE" && membership.role === "WAITER",
      )
      .map((membership) => membership.user);
  }, [memberships]);

  const activeSessions = useMemo(() => {
    return new Map(sessions.map((session) => [session.tableId, session]));
  }, [sessions]);

  const occupied = tables.filter((table) =>
    activeSessions.has(table.id),
  ).length;

  const available = tables.length - occupied;

  const loadTables = useCallback(async (id: string) => {
    const [tableData, sessionData] = await Promise.all([
      tablesApi.getAll(id),
      tableSessionsApi.getOpenByLocation(id),
    ]);

    return { tableData, sessionData };
  }, []);

  useEffect(() => {
    let cancelled = false;

    setError("");
    setSuccess("");
    setTables([]);
    setSessions([]);

    if (!locationId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    loadTables(locationId)
      .then(({ tableData, sessionData }) => {
        if (cancelled) return;

        setTables(tableData);
        setSessions(sessionData);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locationId, loadTables]);

  useEffect(() => {
    let cancelled = false;

    setMemberships([]);

    if (!isManager) return;

    membershipsApi
      .getAll()
      .then((data) => {
        if (!cancelled) setMemberships(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            `No se pudieron cargar los meseros: ${getErrorMessage(err)}`,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isManager, user?.businessId]);

  async function refresh() {
    if (!locationId) return;

    setLoading(true);
    setError("");

    try {
      const { tableData, sessionData } = await loadTables(locationId);
      setTables(tableData);
      setSessions(sessionData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    if (saving) return;

    setModal(null);
    setSelectedTable(null);
    setName("");
    setCapacity("4");
    setWaiterId("");
  }

  function showCreate() {
    setSelectedTable(null);
    setName("");
    setCapacity("4");
    setModal("create");
  }

  function showEdit(table: RestaurantTable) {
    setSelectedTable(table);
    setName(table.name);
    setCapacity(String(table.capacity ?? 4));
    setModal("edit");
  }

  function showOpen(table: RestaurantTable) {
    setSelectedTable(table);

    if (user?.role === "WAITER") {
      setWaiterId(user.userId);
    } else {
      setWaiterId(waiters[0]?.id ?? "");
    }

    setModal("open");
  }

  async function handleSaveTable(event: FormEvent) {
    event.preventDefault();

    if (!locationId) return;

    const cleanName = name.trim();
    const numericCapacity = Number(capacity);

    if (
      !cleanName ||
      !Number.isInteger(numericCapacity) ||
      numericCapacity < 1
    ) {
      setError("Ingresa un nombre y una capacidad válida.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (modal === "create") {
        await tablesApi.create({
          locationId,
          name: cleanName,
          capacity: numericCapacity,
        });
        setSuccess("Mesa creada correctamente.");
      } else if (modal === "edit" && selectedTable) {
        await tablesApi.update(selectedTable.id, {
          name: cleanName,
          capacity: numericCapacity,
        });
        setSuccess("Mesa actualizada correctamente.");
      }

      setModal(null);
      setSelectedTable(null);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenSession(event: FormEvent) {
    event.preventDefault();

    if (!selectedTable || !waiterId) {
      setError("Selecciona un mesero para abrir la mesa.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await tableSessionsApi.create({
        tableId: selectedTable.id,
        waiterId,
      });

      setSuccess(`Se abrió ${selectedTable.name} correctamente.`);
      setModal(null);
      setSelectedTable(null);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseSession(
    table: RestaurantTable,
    session: TableSession,
  ) {
    const confirmed = window.confirm(
      `¿Deseas cerrar la atención de ${table.name}?\n\n` +
        "Comprueba antes que no existan pedidos ni cuentas pendientes.",
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await tableSessionsApi.close(session.id);
      setSuccess(`Se cerró la atención de ${table.name}.`);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(table: RestaurantTable) {
    if (activeSessions.has(table.id)) {
      setError("No puedes desactivar una mesa ocupada.");
      return;
    }

    if (!window.confirm(`¿Desactivar ${table.name}?`)) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await tablesApi.deactivate(table.id);
      setSuccess(`${table.name} fue desactivada.`);
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Gestión de mesas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Administra las mesas y sus atenciones.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => void refresh()}
            disabled={loading || !locationId}
            className="rounded-lg border bg-white p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw size={19} />
          </button>

          {isManager && (
            <button
              onClick={showCreate}
              disabled={!locationId || saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <CirclePlus size={18} />
              Nueva mesa
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Sucursal
        </label>
        <select
          value={locationId}
          onChange={(event) => {
            closeModal();
            setLocationId(event.target.value);
          }}
          disabled={loadingLocations}
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
        >
          {locations.length === 0 && (
            <option value="">Sin sucursales activas</option>
          )}
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      {(error || locationsError) && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
        >
          {error || locationsError}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg bg-green-50 p-4 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total de mesas", value: tables.length, icon: Table2 },
          { label: "Disponibles", value: available, icon: CheckCircle2 },
          { label: "Ocupadas", value: occupied, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border bg-white p-5">
            <Icon className="mb-3 text-indigo-600" size={22} />
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border bg-white p-12 text-center text-slate-500">
          Cargando mesas...
        </div>
      ) : !locationId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-slate-500">
          No hay una sucursal activa disponible.
        </div>
      ) : tables.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-slate-500">
          No hay mesas registradas en esta sucursal.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {tables.map((table) => {
            const session = activeSessions.get(table.id);
            const isOccupied = !!session;

            return (
              <div
                key={table.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`rounded-xl p-3 ${
                      isOccupied
                        ? "bg-amber-50 text-amber-600"
                        : "bg-green-50 text-green-600"
                    }`}
                  >
                    <Table2 size={25} />
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      isOccupied
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {isOccupied ? "Ocupada" : "Disponible"}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {table.name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Capacidad: {table.capacity ?? "No definida"}
                </p>

                {session?.waiter && (
                  <p className="mt-2 text-sm text-slate-600">
                    Mesero: {session.waiter.firstName} {session.waiter.lastName}
                  </p>
                )}

                <div className="mt-5 space-y-2">
                  {isOccupied && session ? (
                    <button
                      disabled={saving}
                      onClick={() => void handleCloseSession(table, session)}
                      className="w-full rounded-lg border border-amber-300 px-3 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      Cerrar atención
                    </button>
                  ) : (
                    <button
                      disabled={saving}
                      onClick={() => showOpen(table)}
                      className="w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Abrir mesa
                    </button>
                  )}

                  {isManager && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => showEdit(table)}
                        disabled={saving || isOccupied}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <Pencil size={15} />
                        Editar
                      </button>
                      <button
                        onClick={() => void handleDeactivate(table)}
                        disabled={saving || isOccupied}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                        Desactivar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "open"
                ? "Abrir mesa"
                : modal === "create"
                  ? "Nueva mesa"
                  : "Editar mesa"
            }
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">
                {modal === "create"
                  ? "Nueva mesa"
                  : modal === "edit"
                    ? "Editar mesa"
                    : `Abrir ${selectedTable?.name}`}
              </h3>

              <button onClick={closeModal} disabled={saving}>
                <X size={20} />
              </button>
            </div>
            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}
            {modal === "open" ? (
              <form onSubmit={handleOpenSession} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Mesero responsable
                  </label>

                  {user?.role === "WAITER" ? (
                    <div className="rounded-lg bg-slate-100 p-3 text-sm">
                      {user.firstName} {user.lastName}
                    </div>
                  ) : (
                    <select
                      value={waiterId}
                      onChange={(event) => setWaiterId(event.target.value)}
                      required
                      className="w-full rounded-lg border px-3 py-3"
                    >
                      <option value="">Selecciona un mesero</option>
                      {waiters.map((waiter) => (
                        <option key={waiter.id} value={waiter.id}>
                          {waiter.firstName} {waiter.lastName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {user?.role !== "WAITER" && waiters.length === 0 && (
                  <p className="text-sm text-amber-700">
                    No hay meseros activos. Debes registrar un usuario con
                    membresía WAITER para asignarlo.
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-lg border py-3"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !waiterId}
                    className="flex-1 rounded-lg bg-indigo-600 py-3 font-medium text-white disabled:opacity-50"
                  >
                    {saving ? "Abriendo..." : "Abrir mesa"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveTable} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Nombre de la mesa
                  </label>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ejemplo: Mesa 01"
                    maxLength={100}
                    required
                    className="w-full rounded-lg border px-3 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Capacidad de personas
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={capacity}
                    onChange={(event) => setCapacity(event.target.value)}
                    required
                    className="w-full rounded-lg border px-3 py-3"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-lg border py-3"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-indigo-600 py-3 font-medium text-white disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
