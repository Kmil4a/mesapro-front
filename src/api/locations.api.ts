import { apiRequest } from "./client";

export interface Location {
  id: string;
  businessId: string;
  name: string;
  address: string | null;
  status: "ACTIVE" | "INACTIVE";
  timezone?: string;
  currency?: string;
}

export const locationsApi = {
  getAll() {
    return apiRequest<Location[]>("/locations");
  },
  update(id: string, data: Partial<Pick<Location, "name" | "address" | "timezone" | "currency" | "status">>) {
    return apiRequest<Location>(`/locations/${encodeURIComponent(id)}`, {
      method: "PATCH", body: JSON.stringify(data),
    });
  },
};
