import { Link } from "react-router-dom";
import {
  Table2,
  ClipboardList,
  Wallet,
  ArrowRight,
} from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import { hasModuleAccess } from "../auth/moduleAccess";

const modules = [
  {
    title: "Mesas",
    description: "Administrar las mesas del restaurante.",
    path: "/mesas",
    icon: Table2,
  },
  {
    title: "Pedidos",
    description: "Crear y gestionar pedidos.",
    path: "/pedidos",
    icon: ClipboardList,
  },
  {
    title: "Caja",
    description: "Administrar cobros y movimientos.",
    path: "/caja",
    icon: Wallet,
  },
];

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Hola, {user?.firstName}
        </h2>
        <p className="mt-2 text-slate-500">
          Bienvenido al sistema de gestión de tu restaurante.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {modules.filter(({ path }) => hasModuleAccess(path, user?.role)).map(({ title, description, path, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className="group rounded-xl border border-slate-200 bg-white p-6 transition hover:border-indigo-300 hover:shadow-md"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Icon size={24} />
            </div>

            <h3 className="font-semibold text-slate-900">{title}</h3>

            <p className="mt-2 min-h-12 text-sm text-slate-500">
              {description}
            </p>

            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-indigo-600">
              Ir al módulo
              <ArrowRight
                size={16}
                className="transition group-hover:translate-x-1"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
