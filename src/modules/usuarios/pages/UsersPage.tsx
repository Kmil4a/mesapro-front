import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, RefreshCw, Search, UserRound, UserRoundX } from 'lucide-react';
import { useAuth } from '../../../auth/AuthContext';
import type { UserRole } from '../../../auth/types';
import { useLocation } from '../../../context/LocationContext';
import { membershipsApi, type Membership } from '../../../api/memberships';
import { usersApi, type CreateStaffUser } from '../../../api/users.api';

const input = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50';
const secondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50';

const roleLabels: Record<UserRole, string> = {
  OWNER: 'Propietario', ADMIN: 'Administrador', MANAGER: 'Encargado',
  WAITER: 'Mesero', KITCHEN: 'Cocina', CASHIER: 'Caja',
};
const operationalRoles: UserRole[] = ['WAITER', 'CASHIER'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function roleOptions(actorRole?: UserRole): UserRole[] {
  if (actorRole === 'OWNER') return ['ADMIN', 'MANAGER', ...operationalRoles, 'OWNER'];
  if (actorRole === 'ADMIN') return ['ADMIN', 'MANAGER', ...operationalRoles];
  if (actorRole === 'MANAGER') return operationalRoles;
  return [];
}

function canManage(actor: UserRole | undefined, target: Membership, actorId?: string) {
  if (target.userId === actorId) return actor === 'OWNER';
  if (actor === 'OWNER') return true;
  if (actor === 'ADMIN') return !['OWNER', 'ADMIN'].includes(target.role);
  if (actor === 'MANAGER') return operationalRoles.includes(target.role);
  return false;
}

export default function UsersPage() {
  const { user } = useAuth();
  const { locationId, locations, loading: locationsLoading } = useLocation();
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Membership | null>(null);
  const [form, setForm] = useState<CreateStaffUser>({
    firstName: '', lastName: '', email: '', password: '',
    locationId: '', role: 'WAITER',
  });
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    locationId: '', role: 'WAITER' as UserRole, status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const availableRoles = roleOptions(user?.role);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setMembers(await membershipsApi.getAll());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);
  useEffect(() => {
    if (!form.locationId && locationId) setForm((current) => ({ ...current, locationId }));
  }, [form.locationId, locationId]);

  const filteredMembers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return members.filter((membership) => {
      const userText = `${membership.user.firstName} ${membership.user.lastName} ${membership.user.email}`.toLowerCase();
      return (!normalized || userText.includes(normalized))
        && (roleFilter === 'ALL' || membership.role === roleFilter)
        && (statusFilter === 'ALL' || membership.status === statusFilter)
        && (locationFilter === 'ALL' || membership.locationId === locationFilter);
    });
  }, [members, search, roleFilter, statusFilter, locationFilter]);

  function validateProfile(data: { firstName: string; lastName: string; email: string; password?: string }) {
    if (data.firstName.trim().length < 2 || data.firstName.trim().length > 150) return 'El nombre debe tener entre 2 y 150 caracteres.';
    if (data.lastName.trim().length < 2 || data.lastName.trim().length > 150) return 'El apellido debe tener entre 2 y 150 caracteres.';
    if (!emailPattern.test(data.email.trim())) return 'Ingresa un correo electrónico válido.';
    if (data.password !== undefined && data.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    return '';
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setNotice('');
    const invalid = validateProfile(form);
    if (invalid) { setError(invalid); return; }
    if (form.password !== passwordConfirmation) { setError('Las contraseñas no coinciden.'); return; }
    if (!locations.some((location) => location.id === form.locationId)) { setError('Selecciona una sucursal activa del negocio.'); return; }
    if (!availableRoles.includes(form.role)) { setError('No tienes permiso para asignar ese rol.'); return; }

    setSaving(true);
    try {
      await usersApi.create({ ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim().toLowerCase() });
      setCreateOpen(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', locationId: locationId || locations[0]?.id || '', role: availableRoles[0] ?? 'WAITER' });
      setPasswordConfirmation('');
      setNotice('Usuario creado y asignado a la sucursal.');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible crear el usuario.');
    } finally { setSaving(false); }
  }

  function beginEdit(membership: Membership) {
    setEditing(membership);
    setEditForm({
      firstName: membership.user.firstName, lastName: membership.user.lastName,
      email: membership.user.email, password: '', locationId: membership.locationId,
      role: membership.role, status: membership.status,
    });
    setError(''); setNotice('');
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setError(''); setNotice('');
    const invalid = validateProfile({
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email,
      ...(editForm.password ? { password: editForm.password } : {}),
    });
    if (invalid) { setError(invalid); return; }
    if (!locations.some((location) => location.id === editForm.locationId)) { setError('Selecciona una sucursal activa del negocio.'); return; }
    if (!availableRoles.includes(editForm.role) && editForm.role !== editing.role) { setError('No tienes permiso para asignar ese rol.'); return; }
    if (editing.userId === user?.userId && (editForm.role !== editing.role || editForm.status !== editing.status)) {
      setError('No puedes cambiar tu propio rol ni desactivar tu cuenta.'); return;
    }
    setSaving(true);
    try {
      await usersApi.update(editing.userId, {
        firstName: editForm.firstName.trim(), lastName: editForm.lastName.trim(),
        email: editForm.email.trim().toLowerCase(),
        ...(editForm.password ? { password: editForm.password } : {}),
        role: editForm.role, locationId: editForm.locationId, status: editForm.status,
      });
      setEditing(null); setNotice('Cambios guardados.'); await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar los cambios.');
    } finally { setSaving(false); }
  }

  if (!['OWNER', 'ADMIN', 'MANAGER'].includes(user?.role ?? '')) {
    return <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">No tienes permisos para administrar usuarios.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-slate-900">Usuarios</h1><p className="text-sm text-slate-500">Administra las personas, sus roles y sucursales asignadas.</p></div>
        <div className="flex gap-2"><button className={secondary} disabled={loading} onClick={() => void loadUsers()}><RefreshCw size={16} /> Actualizar</button><button className={button} onClick={() => { setCreateOpen((open) => !open); setEditing(null); setError(''); }}><Plus size={16} /> Nuevo usuario</button></div>
      </div>

      {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-700">{notice}</div>}

      {createOpen && <form onSubmit={(event) => void createUser(event)} className="space-y-4 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Crear usuario</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre"><input className={input} autoComplete="given-name" maxLength={150} required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Apellido"><input className={input} autoComplete="family-name" maxLength={150} required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="Correo"><input className={input} type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Contraseña (mínimo 8 caracteres)"><input className={input} type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          <Field label="Confirmar contraseña"><input className={input} type="password" autoComplete="new-password" required value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} /></Field>
          <Field label="Sucursal asignada"><select className={input} required value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })}><option value="">Selecciona una sucursal</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
          <Field label="Rol"><select className={input} required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>{availableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></Field>
        </div>
        {locations.length === 0 && <p className="text-sm text-amber-700">No hay sucursales activas para asignar. Activa o crea una sucursal antes de continuar.</p>}
        <div className="flex justify-end gap-2"><button type="button" className={secondary} onClick={() => setCreateOpen(false)}>Cancelar</button><button className={button} type="submit" disabled={saving || locationsLoading || locations.length === 0}>{saving ? 'Creando...' : 'Crear usuario'}</button></div>
      </form>}

      <div className="flex flex-wrap gap-3 rounded-xl border bg-white p-4">
        <label className="relative min-w-56 flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input className={`${input} pl-9`} placeholder="Buscar por nombre o correo" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <select className={input} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="ALL">Todos los roles</option>{Object.entries(roleLabels).map(([role, label]) => <option key={role} value={role}>{label}</option>)}</select>
        <select className={input} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}><option value="ALL">Todas las sucursales</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
        <select className={input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="ACTIVE">Activos</option><option value="INACTIVE">Inactivos</option><option value="ALL">Todos los estados</option></select>
      </div>

      {editing && <form onSubmit={(event) => void saveEdit(event)} className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-5">
        <h2 className="font-semibold">Editar {editing.user.firstName} {editing.user.lastName}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre"><input className={input} maxLength={150} required value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} /></Field>
          <Field label="Apellido"><input className={input} maxLength={150} required value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} /></Field>
          <Field label="Correo"><input className={input} type="email" required value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></Field>
          <Field label="Nueva contraseña (opcional)"><input className={input} type="password" minLength={8} autoComplete="new-password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} /></Field>
          <Field label="Sucursal asignada"><select className={input} required value={editForm.locationId} onChange={(e) => setEditForm({ ...editForm, locationId: e.target.value })}>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
          <Field label="Rol"><select className={input} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}>{[...new Set([...availableRoles, editing.role])].map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></Field>
          <Field label="Estado"><select className={input} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}><option value="ACTIVE">Activo</option><option value="INACTIVE" disabled={editing.userId === user?.userId}>Inactivo</option></select></Field>
        </div>
        <div className="flex justify-end gap-2"><button type="button" className={secondary} onClick={() => setEditing(null)}>Cancelar</button><button className={button} type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button></div>
      </form>}

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Personal del negocio</h2><p className="text-sm text-slate-500">{filteredMembers.length} usuario(s)</p></div>
        {loading ? <div className="p-8 text-center text-sm text-slate-500">Cargando usuarios...</div> : filteredMembers.length === 0 ? <div className="p-10 text-center"><UserRoundX className="mx-auto mb-2 text-slate-400" /><p className="text-sm text-slate-500">No hay usuarios que coincidan con los filtros.</p></div> : <div className="divide-y">
          {filteredMembers.map((membership) => <div key={membership.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex min-w-56 items-center gap-3"><div className="rounded-full bg-indigo-50 p-2 text-indigo-600"><UserRound size={18} /></div><div><p className="font-medium text-slate-900">{membership.user.firstName} {membership.user.lastName}</p><p className="text-sm text-slate-500">{membership.user.email}</p></div></div>
            <div className="flex flex-wrap items-center gap-2 text-sm"><span className="rounded-full bg-slate-100 px-3 py-1">{roleLabels[membership.role]}</span><span className="rounded-full bg-slate-100 px-3 py-1">{membership.location?.name ?? 'Sucursal sin asignar'}</span><span className={`rounded-full px-3 py-1 ${membership.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{membership.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</span></div>
            {canManage(user?.role, membership, user?.userId) && <button type="button" className={secondary} onClick={() => beginEdit(membership)}><Pencil size={15} /> Editar</button>}
          </div>)}
        </div>}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1 text-sm font-medium text-slate-700">{label}{children}</label>;
}
