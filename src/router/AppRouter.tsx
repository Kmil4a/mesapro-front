import { Navigate, Route, Routes } from "react-router-dom";

import { LoginPage } from "../pages/LoginPage";
import { ProtectedRoute } from "../auth/ProtectedRoute";
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
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/mesas" element={<MesasPage />} />
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/preparacion" element={<PreparationsPage />} />
          <Route path="/caja" element={<CajaPage />} />
          <Route path="/productos" element={<CatalogoPage />} />
          <Route path="/reportes" element={<DailyClosePage />} />
          <Route path="/usuarios" element={<UsersPage />} />
          <Route path="/configuracion" element={<ConfigurationPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
