import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, UtensilsCrossed } from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import { hasModuleAccess, homeForRole } from "../auth/moduleAccess";
import { ApiRequestError } from "../api/client";

function authErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.statusCode === 401) return "Correo o contraseña incorrectos.";
    if (error.statusCode === 403) return error.message || "Tu usuario no tiene una membresía activa. Contacta al administrador del negocio.";
    if (error.statusCode === 429) return "Se alcanzó el límite de intentos. Espera unos minutos antes de volver a intentarlo.";
    if (error.statusCode && error.statusCode >= 500) return "El servicio de autenticación no está disponible temporalmente. Inténtalo más tarde.";
    return error.message;
  }
  if (error instanceof TypeError) return "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.";
  return "No fue posible iniciar sesión. Inténtalo nuevamente.";
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const authenticatedUser = await login(email, password);

      const from = (
        location.state as {
          from?: { pathname?: string };
        } | null
      )?.from?.pathname;

      const destination = from && from !== "/login" && hasModuleAccess(from, authenticatedUser.role)
        ? from
        : homeForRole(authenticatedUser.role);
      navigate(destination, {
        replace: true,
      });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <UtensilsCrossed size={28} />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Bienvenido</h1>

          <p className="mt-2 text-sm text-slate-500">
            Ingresa a tu sistema de gestión
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Correo electrónico
            </label>

            <div className="flex items-center gap-3 rounded-lg border border-slate-300 px-3">
              <Mail size={18} className="text-slate-400" />
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.cl"
                className="w-full py-3 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Contraseña</label>

            <div className="flex items-center gap-3 rounded-lg border border-slate-300 px-3">
              <LockKeyhole size={18} className="text-slate-400" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="w-full py-3 outline-none"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
