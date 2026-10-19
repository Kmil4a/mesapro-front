import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "../auth/AuthContext";
import { locationsApi, type Location } from "../api/locations.api";

interface LocationContextValue {
  locations: Location[];
  locationId: string;
  setLocationId: (id: string) => void;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function reload() {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const response = await locationsApi.getAll();
      const active = response.filter(
        (location) => location.status === "ACTIVE",
      );

      setLocations(active);

      setLocationId((previous) => {
        if (active.some((location) => location.id === previous)) {
          return previous;
        }

        return active[0]?.id ?? "";
      });
    } catch (err) {
      setLocations([]);
      setLocationId("");
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar las sucursales",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      void reload();
    } else {
      setLocations([]);
      setLocationId("");
      setLoading(false);
    }
  }, [user?.businessId]);

  return (
    <LocationContext.Provider
      value={{
        locations,
        locationId,
        setLocationId,
        loading,
        error,
        reload,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);

  if (!context) {
    throw new Error("useLocation debe utilizarse dentro de LocationProvider");
  }

  return context;
}
