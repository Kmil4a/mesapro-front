import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useLocation } from "../../../context/LocationContext";
import { useAuth } from "../../../auth/AuthContext";
import { useAppDialog } from "../../../components/ui/AppDialog";
import {
  categoriesApi,
  workstationsApi,
  productsApi,
  productWorkstationsApi,
  groupsApi,
  modifiersApi,
  combosApi,
  comboItemsApi,
} from "../api/catalogo.api";
import type {
  Category,
  Workstation,
  Product,
  ModifierGroup,
  Modifier,
  Combo,
} from "../types";

type Tab =
  "Productos" | "Categorías" | "Modificadores" | "Combos" | "Estaciones";
type Kind =
  "category" | "workstation" | "product" | "group" | "modifier" | "combo";
type CatalogRow =
  Category | Workstation | Product | ModifierGroup | Modifier | Combo;
type Edit = { kind: Kind; id?: string } | null;
const money = (value: number | string) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value));
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "No fue posible completar la operación";
const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const btn =
  "rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
function Modal({
  title,
  onClose,
  children,
  busy,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={secondary}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function isPricedRow(row: CatalogRow): row is Product | Combo {
  return "price" in row;
}

function isModifierRow(row: CatalogRow): row is Modifier {
  return "priceDelta" in row;
}

function isProductRow(row: CatalogRow): row is Product {
  return "categoryId" in row;
}

function isModifierGroupRow(row: CatalogRow): row is ModifierGroup {
  return "minSelections" in row;
}

function isComboRow(row: CatalogRow): row is Combo {
  return "items" in row;
}

export default function CatalogoPage() {
  const { confirm } = useAppDialog();
  const { user } = useAuth();
  const {
    locations,
    locationId,
    setLocationId,
    loading: loadingLocations,
    error: locationsError,
  } = useLocation();
  const canManage = !!user && ["OWNER", "ADMIN", "MANAGER"].includes(user.role);
  const [tab, setTab] = useState<Tab>("Productos");
  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [edit, setEdit] = useState<Edit>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [productId, setProductId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [min, setMin] = useState("0");
  const [max, setMax] = useState("");
  const [stationIds, setStationIds] = useState<string[]>([]);
  const [originalStationIds, setOriginalStationIds] = useState<string[]>([]);
  const [comboId, setComboId] = useState<string | null>(null);
  const [itemProductId, setItemProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const load = useCallback(async (id: string) => {
    const [c, w, p, g, m, b] = await Promise.all([
      categoriesApi.list(id),
      workstationsApi.list(id),
      productsApi.list(id),
      groupsApi.list(id),
      modifiersApi.list(),
      combosApi.list(id),
    ]);
    return { c, w, p, g, m, b };
  }, []);
  const refresh = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const d = await load(locationId);
      setCategories(d.c);
      setWorkstations(d.w);
      setProducts(d.p);
      setGroups(d.g);
      setModifiers(d.m);
      setCombos(d.b);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [locationId, load]);
  useEffect(() => {
    let alive = true;
    setCategories([]);
    setWorkstations([]);
    setProducts([]);
    setGroups([]);
    setModifiers([]);
    setCombos([]);
    setError("");
    setSuccess("");
    setEdit(null);
    setComboId(null);
    if (!locationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load(locationId)
      .then((d) => {
        if (!alive) return;
        setCategories(d.c);
        setWorkstations(d.w);
        setProducts(d.p);
        setGroups(d.g);
        setModifiers(d.m);
        setCombos(d.b);
      })
      .catch((e) => {
        if (alive) setError(errorText(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [locationId, load]);
  const activeGroups = groups.filter((g) => g.status === "ACTIVE");
  const visibleModifiers = modifiers.filter((m) =>
    products.some((p) => p.id === m.productId),
  );
  const rows = useMemo<CatalogRow[]>(() => {
    const matches = (s: string) =>
      s.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"));
    switch (tab) {
      case "Productos":
        return products.filter((x) => matches(x.name));
      case "Categorías":
        return categories.filter((x) => matches(x.name));
      case "Estaciones":
        return workstations.filter((x) => matches(x.name));
      case "Modificadores":
        return visibleModifiers.filter(
          (x) =>
            matches(x.name) ||
            matches(products.find((p) => p.id === x.productId)?.name ?? ""),
        );
      case "Combos":
        return combos.filter((x) => matches(x.name));
    }
  }, [
    tab,
    search,
    products,
    categories,
    workstations,
    visibleModifiers,
    combos,
  ]);
  const close = () => {
    if (!busy) setEdit(null);
  };
  async function open(kind: Kind, id?: string) {
    setError("");
    setSuccess("");
    setName("");
    setDescription("");
    setPrice("0");
    setCategoryId("");
    setProductId("");
    setGroupId("");
    setMin("0");
    setMax("");
    setStationIds([]);
    setOriginalStationIds([]);
    const found =
      kind === "category"
        ? categories.find((x) => x.id === id)
        : kind === "workstation"
          ? workstations.find((x) => x.id === id)
          : kind === "product"
            ? products.find((x) => x.id === id)
            : kind === "group"
              ? groups.find((x) => x.id === id)
              : kind === "modifier"
                ? modifiers.find((x) => x.id === id)
                : combos.find((x) => x.id === id);
    if (found) {
      setName(found.name);
      if ("description" in found)
        setDescription(String(found.description ?? ""));
      if ("price" in found) setPrice(String(found.price));
      if ("categoryId" in found) setCategoryId(String(found.categoryId ?? ""));
      if ("productId" in found) setProductId(String(found.productId));
      if ("groupId" in found) setGroupId(String(found.groupId));
      if ("priceDelta" in found) setPrice(String(found.priceDelta));
      if ("minSelections" in found) setMin(String(found.minSelections));
      if ("maxSelections" in found)
        setMax(found.maxSelections === null ? "" : String(found.maxSelections));
    }
    setEdit({ kind, id });
    if (kind === "product" && id) {
      try {
        const rel = await productWorkstationsApi.list(id);
        const ids = rel.map((x) => x.workstationId);
        setStationIds(ids);
        setOriginalStationIds(ids);
      } catch (e) {
        setError(errorText(e));
      }
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit || !locationId) return;
    const clean = name.trim();
    if (!clean) {
      setError("El nombre es obligatorio");
      return;
    }
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) {
      setError("Ingresa un precio válido");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (edit.kind === "category") {
        if (edit.id) await categoriesApi.update(locationId, edit.id, clean);
        else await categoriesApi.create(locationId, clean);
      }
      if (edit.kind === "workstation") {
        if (edit.id) await workstationsApi.update(locationId, edit.id, clean);
        else await workstationsApi.create(locationId, clean);
      }
      if (edit.kind === "product") {
        const data = {
          name: clean,
          description: description.trim(),
          price: n,
          ...(categoryId ? { categoryId } : {}),
        };
        let id = edit.id;
        if (id) await productsApi.update(id, data);
        else {
          const created = await productsApi.create({ locationId, ...data });
          id = created.id;
        }
        if (id) {
          const nextStation = stationIds[0];
          const currentStation = originalStationIds[0];
          if (nextStation && nextStation !== currentStation)
            await productWorkstationsApi.create(id, nextStation);
          else if (!nextStation && currentStation)
            await productWorkstationsApi.remove(id, currentStation);
        }
      }
      if (edit.kind === "group") {
        const minN = Number(min),
          maxN = max.trim() === "" ? undefined : Number(max);
        if (
          !Number.isInteger(minN) ||
          minN < 0 ||
          (maxN !== undefined && (!Number.isInteger(maxN) || maxN < minN))
        ) {
          throw new Error(
            "Las selecciones mínimas y máximas deben ser enteros válidos",
          );
        }
        const data = {
          name: clean,
          minSelections: minN,
          ...(maxN === undefined ? {} : { maxSelections: maxN }),
        };
        if (edit.id) await groupsApi.update(edit.id, data);
        else await groupsApi.create({ locationId, ...data });
      }
      if (edit.kind === "modifier") {
        if (!productId || !groupId)
          throw new Error("Selecciona un producto y un grupo");
        const group = groups.find((x) => x.id === groupId);
        const product = products.find((x) => x.id === productId);
        if (!group || !product || group.locationId !== product.locationId)
          throw new Error("Producto y grupo deben ser de la misma sucursal");
        const data = { productId, groupId, name: clean, priceDelta: n };
        if (edit.id) await modifiersApi.update(edit.id, data);
        else await modifiersApi.create(data);
      }
      if (edit.kind === "combo") {
        const data = { name: clean, description: description.trim(), price: n };
        if (edit.id) await combosApi.update(edit.id, data);
        else await combosApi.create({ locationId, ...data });
      }
      setEdit(null);
      setSuccess("Cambios guardados correctamente");
      await refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function deactivate(kind: Kind, id: string, name: string) {
    if (
      !(await confirm({
        title: "Desactivar elemento",
        description: `¿Desactivar «${name}»? Se ocultará de los listados activos y no estará disponible para nuevas ventas.`,
        confirmLabel: "Desactivar",
        tone: "danger",
      }))
    )
      return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (kind === "category") await categoriesApi.remove(locationId, id);
      if (kind === "workstation") await workstationsApi.remove(locationId, id);
      if (kind === "product") await productsApi.remove(id);
      if (kind === "group") await groupsApi.remove(id);
      if (kind === "modifier") await modifiersApi.remove(id);
      if (kind === "combo") await combosApi.remove(id);
      setSuccess("Registro desactivado");
      await refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function addItem(e: FormEvent) {
    e.preventDefault();
    if (!comboId || !itemProductId) return;
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      setError("La cantidad debe ser un entero positivo");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await comboItemsApi.create(comboId, itemProductId, qty);
      setItemProductId("");
      setQuantity("1");
      await refresh();
      setSuccess("Producto agregado al combo");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function changeItem(itemId: string, qty: number) {
    if (!comboId) return;
    if (!Number.isInteger(qty) || qty < 1) {
      setError("Cantidad inválida");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await comboItemsApi.update(comboId, itemId, qty);
      await refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function removeItem(itemId: string) {
    if (
      !comboId ||
      !(await confirm({
        title: "Quitar producto del combo",
        description:
          "El producto dejará de formar parte de este combo para las próximas ventas.",
        confirmLabel: "Quitar producto",
        tone: "danger",
      }))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await comboItemsApi.remove(comboId, itemId);
      await refresh();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const combo = combos.find((x) => x.id === comboId);
  const tabs: Tab[] = [
    "Productos",
    "Categorías",
    "Modificadores",
    "Combos",
    "Estaciones",
  ];
  const kind: Kind =
    tab === "Productos"
      ? "product"
      : tab === "Categorías"
        ? "category"
        : tab === "Modificadores"
          ? "modifier"
          : tab === "Combos"
            ? "combo"
            : "workstation";
  return (
    <main className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Catálogo de productos
          </h1>
          <p className="text-sm text-slate-500">
            Configura el menú, sus opciones y las estaciones de preparación.
          </p>
        </div>
        <button
          className={secondary}
          disabled={loading || !locationId}
          onClick={() => void refresh()}
        >
          ↻ Actualizar
        </button>
      </header>
      <div className="rounded-xl border bg-white p-4">
        <Field label="Sucursal">
          <select
            className={inputClass}
            value={locationId}
            disabled={loadingLocations}
            onChange={(e) => setLocationId(e.target.value)}
          >
            {!locations.length && <option value="">Sin sucursales</option>}
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {(error || locationsError) && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error || locationsError}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {success}
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setSearch("");
              setError("");
              setSuccess("");
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === t ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          aria-label="Buscar"
          className={`${inputClass} max-w-sm`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Buscar en ${tab.toLowerCase()}...`}
        />
        {canManage && (
          <button
            className={btn}
            disabled={!locationId || busy}
            onClick={() => void open(kind)}
          >
            +{" "}
            {tab === "Productos"
              ? "Nuevo producto"
              : tab === "Categorías"
                ? "Nueva categoría"
                : tab === "Modificadores"
                  ? "Nuevo modificador"
                  : tab === "Combos"
                    ? "Nuevo combo"
                    : "Nueva estación"}
          </button>
        )}
      </div>
      {tab === "Modificadores" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-3 text-sm">
          <span>Los modificadores se asignan a un producto y a un grupo.</span>
          {canManage && (
            <button className={secondary} onClick={() => void open("group")}>
              Administrar grupos ({activeGroups.length})
            </button>
          )}
        </div>
      )}
      {loading ? (
        <div className="rounded-xl border bg-white p-12 text-center text-slate-500">
          Cargando catálogo...
        </div>
      ) : !locationId ? (
        <div className="rounded-xl border bg-white p-12 text-center text-slate-500">
          Selecciona una sucursal.
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center text-slate-500">
          No se encontraron registros.{" "}
          {canManage ? "Puedes crear el primero con el botón superior." : ""}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{row.name}</h3>
                {isPricedRow(row) && (
                  <span className="shrink-0 font-bold text-indigo-700">
                    {money(row.price)}
                  </span>
                )}
                {isModifierRow(row) && (
                  <span className="shrink-0 font-bold text-indigo-700">
                    +{money(row.priceDelta)}
                  </span>
                )}
              </div>
              {isPricedRow(row) && row.description && (
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                  {row.description}
                </p>
              )}
              {isProductRow(row) && (
                <p className="mt-2 text-xs text-slate-500">
                  {categories.find((c) => c.id === row.categoryId)?.name ??
                    "Sin categoría"}
                </p>
              )}
              {isModifierRow(row) && (
                <p className="mt-2 text-xs text-slate-500">
                  Producto:{" "}
                  {products.find((p) => p.id === row.productId)?.name ??
                    "No disponible"}{" "}
                  · Grupo:{" "}
                  {groups.find((g) => g.id === row.groupId)?.name ??
                    "No disponible"}
                </p>
              )}
              {isModifierGroupRow(row) && (
                <p className="mt-2 text-xs text-slate-500">
                  Selecciones: {row.minSelections} a{" "}
                  {row.maxSelections ?? "sin límite"}
                </p>
              )}
              {isComboRow(row) && (
                <p className="mt-2 text-xs text-slate-500">
                  {row.items.length} productos incluidos
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {canManage && (
                  <>
                    <button
                      className={secondary}
                      disabled={busy}
                      onClick={() => void open(kind, row.id)}
                    >
                      Editar
                    </button>
                    <button
                      className={`${secondary} text-red-600`}
                      disabled={busy}
                      onClick={() => void deactivate(kind, row.id, row.name)}
                    >
                      Desactivar
                    </button>
                  </>
                )}
                {isComboRow(row) && (
                  <button
                    className={secondary}
                    onClick={() => {
                      setComboId(row.id);
                      setError("");
                      setSuccess("");
                    }}
                  >
                    Ver productos
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      {tab === "Modificadores" && (
        <section className="rounded-xl border bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Grupos de modificadores</h2>
            {canManage && (
              <button className={secondary} onClick={() => void open("group")}>
                + Nuevo grupo
              </button>
            )}
          </div>
          {activeGroups.length === 0 ? (
            <p className="text-sm text-slate-500">
              Crea un grupo antes de agregar modificadores.
            </p>
          ) : (
            <div className="space-y-2">
              {activeGroups.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <span className="text-sm">
                    {g.name} · mínimo {g.minSelections} · máximo{" "}
                    {g.maxSelections ?? "libre"}
                  </span>
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        className={secondary}
                        onClick={() => void open("group", g.id)}
                      >
                        Editar
                      </button>
                      <button
                        className={secondary}
                        onClick={() => void deactivate("group", g.id, g.name)}
                      >
                        Desactivar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {edit && (
        <Modal
          title={`${edit.id ? "Editar" : "Crear"} ${edit.kind === "product" ? "producto" : edit.kind === "category" ? "categoría" : edit.kind === "workstation" ? "estación" : edit.kind === "group" ? "grupo" : edit.kind === "modifier" ? "modificador" : "combo"}`}
          busy={busy}
          onClose={close}
        >
          <form onSubmit={(e) => void save(e)} className="space-y-4">
            <Field label="Nombre">
              <input
                className={inputClass}
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </Field>
            {["product", "combo"].includes(edit.kind) && (
              <Field label="Descripción (opcional)">
                <textarea
                  className={inputClass}
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            )}
            {["product", "combo", "modifier"].includes(edit.kind) && (
              <Field
                label={
                  edit.kind === "modifier"
                    ? "Precio adicional (CLP)"
                    : "Precio (CLP)"
                }
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </Field>
            )}
            {edit.kind === "product" && (
              <>
                <Field label="Categoría">
                  <select
                    className={inputClass}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-slate-700">
                    Estación responsable
                  </legend>
                  {workstations.length === 0 ? (
                    <p className="text-sm text-amber-700">
                      Crea estaciones en la pestaña Estaciones.
                    </p>
                  ) : (
                    <select
                      className={inputClass}
                      value={stationIds[0] ?? ""}
                      onChange={(e) =>
                        setStationIds(e.target.value ? [e.target.value] : [])
                      }
                    >
                      <option value="">Selecciona una estación</option>
                      {workstations
                        .filter(
                          (w) =>
                            w.status === "ACTIVE" || stationIds.includes(w.id),
                        )
                        .map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                    </select>
                  )}
                  <p className="text-xs text-slate-500">
                    Cada producto se prepara en una sola estación. Cambiarla
                    actualiza la asignación para pedidos nuevos.
                  </p>
                </fieldset>
              </>
            )}
            {edit.kind === "group" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Mínimo">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={inputClass}
                    value={min}
                    onChange={(e) => setMin(e.target.value)}
                  />
                </Field>
                <Field label="Máximo (vacío = sin límite)">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={inputClass}
                    value={max}
                    onChange={(e) => setMax(e.target.value)}
                  />
                </Field>
              </div>
            )}
            {edit.kind === "modifier" && (
              <>
                <Field label="Producto">
                  <select
                    required
                    className={inputClass}
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                  >
                    <option value="">Selecciona un producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Grupo">
                  <select
                    required
                    className={inputClass}
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                  >
                    <option value="">Selecciona un grupo</option>
                    {activeGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={secondary}
                disabled={busy}
                onClick={close}
              >
                Cancelar
              </button>
              <button type="submit" className={btn} disabled={busy}>
                {busy ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {combo && (
        <Modal
          title={`Productos de ${combo.name}`}
          busy={busy}
          onClose={() => setComboId(null)}
        >
          <div className="space-y-3">
            {combo.items.length === 0 && (
              <p className="text-sm text-slate-500">
                Este combo todavía no contiene productos.
              </p>
            )}
            {combo.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
              >
                <span className="text-sm font-medium">{item.product.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">Cantidad:</span>
                  <input
                    aria-label={`Cantidad de ${item.product.name}`}
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={item.quantity}
                    key={`${item.id}-${item.quantity}`}
                    disabled={!canManage || busy}
                    className="w-16 rounded border p-1 text-sm"
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (n !== item.quantity) void changeItem(item.id, n);
                    }}
                  />
                  {canManage && (
                    <button
                      className={secondary}
                      disabled={busy}
                      onClick={() => void removeItem(item.id)}
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            ))}
            {canManage && (
              <form
                className="space-y-3 border-t pt-4"
                onSubmit={(e) => void addItem(e)}
              >
                <Field label="Agregar producto">
                  <select
                    className={inputClass}
                    required
                    value={itemProductId}
                    onChange={(e) => setItemProductId(e.target.value)}
                  >
                    <option value="">Selecciona un producto</option>
                    {products
                      .filter(
                        (p) => !combo.items.some((i) => i.productId === p.id),
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Cantidad">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className={inputClass}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </Field>
                <button className={btn} disabled={busy || !itemProductId}>
                  Agregar al combo
                </button>
              </form>
            )}
            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>
        </Modal>
      )}
    </main>
  );
}
