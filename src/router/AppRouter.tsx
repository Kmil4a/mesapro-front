import { Navigate, Route, Routes } from "react-router-dom";

import { LoginPage } from "../pages/LoginPage";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { AppLayout } from "../components/layout/AppLayout";
import { DashboardPage } from "../pages/DashboardPage";
import { ModulePlaceholder } from "../pages/ModulePlaceholder";
import MesasPage from "../modules/mesas/pages/MesasPage";
import CatalogoPage from "../modules/catalogo/pages/CatalogoPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/mesas" element={<MesasPage />} />
          <Route
            path="/pedidos"
            element={<ModulePlaceholder title="Pedidos" />}
          />
          <Route
            path="/preparacion"
            element={<ModulePlaceholder title="Preparación" />}
          />
          <Route path="/caja" element={<ModulePlaceholder title="Caja" />} />
          <Route path="/productos" element={<CatalogoPage />} />
          <Route
            path="/reportes"
            element={<ModulePlaceholder title="Reportes" />}
          />
          <Route
            path="/usuarios"
            element={<ModulePlaceholder title="Usuarios" />}
          />
          <Route
            path="/configuracion"
            element={<ModulePlaceholder title="Configuración" />}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
