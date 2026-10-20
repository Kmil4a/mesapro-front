import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  Table2,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "./types";

export interface AppModule {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: UserRole[];
}

const managementRoles: UserRole[] = ["OWNER", "ADMIN", "MANAGER"];
const operationalReaders: UserRole[] = [
  "OWNER", "ADMIN", "MANAGER", "WAITER", "CASHIER",
];

export const appModules: AppModule[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["OWNER", "ADMIN", "MANAGER", "WAITER", "CASHIER"] },
  { label: "Mesas", path: "/mesas", icon: Table2, roles: operationalReaders },
  { label: "Pedidos", path: "/pedidos", icon: ClipboardList, roles: ["OWNER", "ADMIN", "MANAGER", "WAITER", "CASHIER"] },
  { label: "Caja", path: "/caja", icon: Wallet, roles: ["OWNER", "ADMIN", "MANAGER", "CASHIER"] },
  { label: "Catalogo", path: "/productos", icon: Package, roles: operationalReaders },
  { label: "Reportes", path: "/reportes", icon: BarChart3, roles: managementRoles },
  { label: "Usuarios", path: "/usuarios", icon: Users, roles: managementRoles },
  { label: "Configuración", path: "/configuracion", icon: Settings, roles: ["OWNER", "ADMIN"] },
];

export function modulesForRole(role?: UserRole | null) {
  return role ? appModules.filter((module) => module.roles.includes(role)) : [];
}

export function homeForRole(role?: UserRole | null) {
  switch (role) {
    case "WAITER": return "/mesas";
    case "KITCHEN": return "/mesas";
    case "CASHIER": return "/caja";
    default: return "/dashboard";
  }
}

export function hasModuleAccess(path: string, role?: UserRole | null) {
  return !!role && appModules.some(
    (module) => module.path === path && module.roles.includes(role),
  );
}

export const accessDeniedIcon = UtensilsCrossed;
