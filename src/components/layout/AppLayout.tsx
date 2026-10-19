import { useState } from "react";
import { Menu, LogOut, X } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import Sidebar from "./Sidebar";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setLoggingOut(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden lg:block">
          <Sidebar role={user?.role} />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="relative z-50">
            <Sidebar role={user?.role} onNavigate={() => setMenuOpen(false)} />
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-6 text-white"
            >
              <X size={20} />
            </button>
          </div>
          <button
            aria-label="Cerrar menú"
            className="flex-1 bg-black/50"
            onClick={() => setMenuOpen(false)}
          />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 items-center justify-between border-b bg-white px-5 lg:px-8">
          <button
            className="lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu />
          </button>

          <div>
            <h1 className="font-semibold text-slate-800">Panel de gestión</h1>
            <p className="text-xs text-slate-500">Sistema de restaurante</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
