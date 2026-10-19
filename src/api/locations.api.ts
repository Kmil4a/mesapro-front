import { apiRequest } from "./client";

export interface Location {
  id: string;
  businessId: string;
  name: string;
  address: string | null;
  status: "ACTIVE" | "INACTIVE";
}

export const locationsApi = {
  getAll() {
    return apiRequest<Location[]>("/locations");
  },
};
