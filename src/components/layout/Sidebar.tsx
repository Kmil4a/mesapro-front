import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Table2,
  ClipboardList,
  ChefHat,
  Wallet,
  BarChart3,
  Package,
  Users,
  Settings,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "../../auth/types";

interface MenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

const menu: MenuItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Mesas", path: "/mesas", icon: Table2 },
  { label: "Pedidos", path: "/pedidos", icon: ClipboardList },
  { label: "Preparación", path: "/preparacion", icon: ChefHat },
  { label: "Caja", path: "/caja", icon: Wallet },
  { label: "Productos", path: "/productos", icon: Package },
  { label: "Reportes", path: "/reportes", icon: BarChart3, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { label: "Usuarios", path: "/usuarios", icon: Users, roles: ["OWNER", "ADMIN", "MANAGER"] },
  { label: "Configuración", path: "/configuracion", icon: Settings, roles: ["OWNER", "ADMIN"] },
];

export default function Sidebar({ onNavigate, role }: { onNavigate?: () => void; role?: UserRole }) {
  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-white">
      <div className="flex h-20 items-center gap-3 border-b border-slate-700 px-6">
        <UtensilsCrossed className="text-indigo-400" />
        <span className="text-lg font-bold">Restaurante</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {menu.filter((item) => !item.roles || (role && item.roles.includes(role))).map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`
            }
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
