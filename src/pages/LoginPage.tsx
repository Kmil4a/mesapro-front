import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, UtensilsCrossed } from "lucide-react";

import { useAuth } from "../auth/AuthContext";

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
      await login(email, password);

      const from = (
        location.state as {
          from?: { pathname?: string };
        } | null
      )?.from?.pathname;

      navigate(from && from !== "/login" ? from : "/dashboard", {
        replace: true,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No fue posible iniciar sesión",
      );
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
