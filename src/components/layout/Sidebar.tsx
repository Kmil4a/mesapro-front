import { NavLink } from "react-router-dom";
import type { UserRole } from "../../auth/types";
import { modulesForRole } from "../../auth/moduleAccess";
import { UtensilsCrossed } from "lucide-react";

export default function Sidebar({ onNavigate, role }: { onNavigate?: () => void; role?: UserRole }) {
  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-white">
      <div className="flex h-20 items-center gap-3 border-b border-slate-700 px-6">
        <UtensilsCrossed className="text-indigo-400" />
        <span className="text-lg font-bold">Restaurante</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {modulesForRole(role).map(({ label, path, icon: Icon }) => (
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
