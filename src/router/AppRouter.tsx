import { Navigate, Route, Routes } from "react-router-dom";

import { LoginPage } from "../pages/LoginPage";
import { ProtectedRoute, RoleProtectedRoute } from "../auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";
import { DashboardPage } from "../pages/DashboardPage";
import MesasPage from "../modules/mesas/pages/MesasPage";
import CatalogoPage from "../modules/catalogo/pages/CatalogoPage";
import OrdersPage from "../modules/pedidos/pages/OrdersPage";
import PreparationsPage from "../modules/preparations/pages/PreparationsPage";
import CajaPage from "../modules/caja/pages/CajaPage";
import DailyClosePage from "../modules/reportes/pages/DailyClosePage";
import UsersPage from "../modules/usuarios/pages/UsersPage";
import ConfigurationPage from "../modules/configuracion/pages/ConfigurationPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<RoleProtectedRoute path="/dashboard" />}><Route path="/dashboard" element={<DashboardPage />} /></Route>
          <Route element={<RoleProtectedRoute path="/mesas" />}><Route path="/mesas" element={<MesasPage />} /></Route>
          <Route element={<RoleProtectedRoute path="/pedidos" />}><Route path="/pedidos" element={<OrdersPage />} /></Route>
          <Route element={<RoleProtectedRoute path="/preparacion" />}><Route path="/preparacion" element={<PreparationsPage />} /></Route>
          <Route element={<RoleProtectedRoute path="/caja" />}><Route path="/caja" element={<CajaPage />} /></Route>
          <Route element={<RoleProtectedRoute path="/productos" />}><Route path="/productos" element={<CatalogoPage />} /></Route>
          <Route element={<RoleProtectedRoute path="/reportes" />}><Route path="/reportes" element={<DailyClosePage />} /></Route>
          <Route element={<RoleProtectedRoute path="/usuarios" />}><Route path="/usuarios" element={<UsersPage />} /></Route>
          <Route element={<RoleProtectedRoute path="/configuracion" />}><Route path="/configuracion" element={<ConfigurationPage />} /></Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
