import { apiRequest } from "./client";
import type { UserRole } from "../auth/types";

export interface Membership {
  id: string;
  userId: string;
  businessId: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE";
  locationId: string;
  location: { id: string; name: string };
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export const membershipsApi = {
  getAll() {
    return apiRequest<Membership[]>("/memberships");
  },
  update(id: string, data: { role?: UserRole; status?: "ACTIVE" | "INACTIVE"; locationId?: string }) {
    return apiRequest<Membership>(`/memberships/${encodeURIComponent(id)}`, {
      method: "PATCH", body: JSON.stringify(data),
    });
  },
};
