import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Building2, CreditCard, MapPin, RefreshCw, Save } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import { businessApi, type BusinessConfiguration } from '../../../api/business.api';
import { locationsApi, type Location } from '../../../api/locations.api';
import { useLocation } from '../../../context/LocationContext';

const input = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50';
const secondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50';

const subscriptionStatus: Record<string, string> = {
  ACTIVE: 'Activa', TRIALING: 'En periodo de prueba', PAST_DUE: 'Pago pendiente',
  CANCELLED: 'Cancelada', EXPIRED: 'Vencida',
};
const locationStatus = { ACTIVE: 'Activa', INACTIVE: 'Inactiva' };

function formatMoney(value: number | string, currency: string) {
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value) || 0);
  } catch {
    return `${currency} ${Number(value) || 0}`;
  }
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('es-CL') : '—';
}

export default function ConfigurationPage() {
  const { user } = useAuth();
  const { reload: reloadLocations } = useLocation();
  const [configuration, setConfiguration] = useState<BusinessConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [businessForm, setBusinessForm] = useState({ name: '', taxId: '' });
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState({ name: '', address: '', timezone: 'America/Santiago', currency: 'CLP', status: 'ACTIVE' as Location['status'] });

  const canConfigure = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const load = useCallback(async () => {
    if (!canConfigure) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const business = await businessApi.getCurrent();
      setConfiguration(business);
      setBusinessForm({ name: business.name, taxId: business.taxId ?? '' });
    } catch (err) {
      setConfiguration(null);
      setError(err instanceof Error ? err.message : 'No fue posible cargar la configuración.');
    } finally { setLoading(false); }
  }, [canConfigure]);

  useEffect(() => { void load(); }, [load]);

  async function saveBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice('');
    const name = businessForm.name.trim();
    const taxId = businessForm.taxId.trim();
    if (name.length < 2 || name.length > 150) { setError('El nombre debe tener entre 2 y 150 caracteres.'); return; }
    if (taxId.length > 30) { setError('El identificador tributario admite hasta 30 caracteres.'); return; }
    setSaving(true);
    try {
      await businessApi.updateCurrent({ name, taxId: taxId || null });
      setNotice('Datos del negocio guardados.'); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible guardar el negocio.'); }
    finally { setSaving(false); }
  }

  function beginLocationEdit(location: BusinessConfiguration['locations'][number]) {
    setEditingLocation(location.id);
    setLocationForm({ name: location.name, address: location.address ?? '', timezone: location.timezone, currency: location.currency, status: location.status });
    setError(''); setNotice('');
  }

  async function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingLocation) return;
    setError(''); setNotice('');
    const name = locationForm.name.trim();
    const address = locationForm.address.trim();
    const timezone = locationForm.timezone.trim();
    const currency = locationForm.currency.trim().toUpperCase();
    if (name.length < 2 || name.length > 150) { setError('El nombre de la sucursal debe tener entre 2 y 150 caracteres.'); return; }
    if (address.length > 250) { setError('La dirección admite hasta 250 caracteres.'); return; }
    if (!timezone) { setError('Indica la zona horaria de la sucursal.'); return; }
    try { new Intl.DateTimeFormat('es-CL', { timeZone: timezone }).format(); }
    catch { setError('La zona horaria no es válida. Usa un identificador IANA, por ejemplo America/Santiago.'); return; }
    if (!/^[A-Z]{3}$/.test(currency)) { setError('La moneda debe ser un código de tres letras, por ejemplo CLP.'); return; }

    setSaving(true);
    try {
      await locationsApi.update(editingLocation, { name, address, timezone, currency, status: locationForm.status });
      setEditingLocation(null); setNotice('Configuración de sucursal guardada.');
      await Promise.all([load(), reloadLocations()]);
    } catch (err) { setError(err instanceof Error ? err.message : 'No fue posible guardar la sucursal.'); }
    finally { setSaving(false); }
  }

  if (!canConfigure) return <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">La configuración del negocio está disponible para propietario y administrador.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-900">Configuración</h1><p className="text-sm text-slate-500">Datos del negocio, sucursales y estado de los servicios SaaS.</p></div>
        <button className={secondary} disabled={loading} onClick={() => void load()}><RefreshCw size={16} /> Actualizar</button>
      </div>

      {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-700">{notice}</div>}
      {loading ? <div className="rounded-xl border bg-white p-10 text-center text-slate-500">Cargando configuración...</div> : configuration && <>
        <section className="rounded-xl border bg-white p-5">
          <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><Building2 size={20} /></div><div><h2 className="font-semibold">Datos del negocio</h2><p className="text-sm text-slate-500">Información general y tributaria.</p></div></div>
          <form className="space-y-4" onSubmit={(event) => void saveBusiness(event)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre del negocio"><input className={input} required maxLength={150} minLength={2} value={businessForm.name} onChange={(event) => setBusinessForm({ ...businessForm, name: event.target.value })} /></Field>
              <Field label="Identificador tributario"><input className={input} maxLength={30} placeholder="RUT / Tax ID (opcional)" value={businessForm.taxId} onChange={(event) => setBusinessForm({ ...businessForm, taxId: event.target.value })} /></Field>
            </div>
            <p className="text-xs text-slate-500">Estado del negocio: {configuration.status === 'ACTIVE' ? 'Activo' : 'Inactivo'} · Creado el {formatDate(configuration.createdAt)}</p>
            <div className="flex justify-end"><button className={button} disabled={saving}><Save size={16} /> Guardar negocio</button></div>
          </form>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><MapPin size={20} /></div><div><h2 className="font-semibold text-slate-900">Sucursales</h2><p className="text-sm text-slate-500">Configura dirección, zona horaria, moneda y estado operativo.</p></div></div>
          {configuration.locations.length === 0 ? <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Este negocio todavía no tiene sucursales.</div> : configuration.locations.map((location) => (
            <article key={location.id} className="rounded-xl border bg-white p-5">
              {editingLocation === location.id ? <form className="space-y-4" onSubmit={(event) => void saveLocation(event)}>
                <h3 className="font-semibold">Editar {location.name}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre"><input className={input} required minLength={2} maxLength={150} value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} /></Field>
                  <Field label="Dirección"><input className={input} maxLength={250} value={locationForm.address} onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })} /></Field>
                  <Field label="Zona horaria (IANA)"><input className={input} required maxLength={100} placeholder="America/Santiago" value={locationForm.timezone} onChange={(e) => setLocationForm({ ...locationForm, timezone: e.target.value })} /></Field>
                  <Field label="Moneda (ISO 4217)"><input className={input} required maxLength={3} minLength={3} placeholder="CLP" value={locationForm.currency} onChange={(e) => setLocationForm({ ...locationForm, currency: e.target.value.toUpperCase() })} /></Field>
                  <Field label="Estado operativo"><select className={input} value={locationForm.status} onChange={(e) => setLocationForm({ ...locationForm, status: e.target.value as Location['status'] })}><option value="ACTIVE">Activa</option><option value="INACTIVE">Inactiva</option></select></Field>
                </div>
                <p className="text-xs text-amber-700">Desactivar una sucursal no cancela su suscripción. Antes de desactivarla deben cerrarse las cajas y sesiones de mesa activas.</p>
                <div className="flex justify-end gap-2"><button className={secondary} type="button" onClick={() => setEditingLocation(null)}>Cancelar</button><button className={button} disabled={saving}><Save size={16} /> Guardar sucursal</button></div>
              </form> : <div className="flex flex-wrap items-center justify-between gap-4">
                <div><div className="flex items-center gap-2"><h3 className="font-semibold">{location.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs ${location.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{locationStatus[location.status]}</span></div><p className="mt-1 text-sm text-slate-500">{location.address || 'Sin dirección'} · {location.timezone} · {location.currency}</p></div>
                <button className={secondary} onClick={() => beginLocationEdit(location)}>Editar sucursal</button>
              </div>}
            </article>
          ))}
        </section>

        <section className="rounded-xl border bg-white p-5">
          <div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><CreditCard size={20} /></div><div><h2 className="font-semibold">SaaS y suscripciones</h2><p className="text-sm text-slate-500">Plan y límites asociados a cada sucursal.</p></div></div>
          <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">La consulta del plan está disponible. Contratación, cambio de plan y pagos aún no están conectados a una pasarela.</div>
          <div className="grid gap-3 lg:grid-cols-2">
            {configuration.locations.map((location) => {
              const subscription = location.suscription;
              return <div key={location.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{location.name}</p><p className="text-xs text-slate-500">{subscription?.plan.name ?? 'Sin plan asignado'}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{subscription ? subscriptionStatus[subscription.status] : 'Sin suscripción'}</span></div>
                {subscription ? <>
                  <p className="mt-3 text-lg font-bold">{formatMoney(subscription.plan.price, location.currency)} <span className="text-xs font-normal text-slate-500">precio configurado</span></p>
                  <p className="mt-1 text-xs text-slate-500">Inicio: {formatDate(subscription.startedAt)} · Periodo: {formatDate(subscription.currentPeriodStart)} — {formatDate(subscription.currentPeriodEnd)}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs"><Limit label="Sucursales" value={subscription.plan.maxLocations} /><Limit label="Usuarios" value={subscription.plan.maxUsers} /><Limit label="Productos" value={subscription.plan.maxProducts} /></div>
                  {subscription.plan.description && <p className="mt-3 text-sm text-slate-600">{subscription.plan.description}</p>}
                </> : <p className="mt-3 text-sm text-amber-700">No hay una suscripción asociada. No se puede contratar un plan desde esta pantalla.</p>}
              </div>;
            })}
          </div>
        </section>
      </>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1 text-sm font-medium text-slate-700">{label}{children}</label>;
}

function Limit({ label, value }: { label: string; value: number | null }) {
  return <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">Máx. {label.toLowerCase()}</p><p className="mt-1 font-semibold">{value === null ? 'Ilimitados' : value}</p></div>;
}
