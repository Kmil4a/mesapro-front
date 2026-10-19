import { apiRequest } from "./client";
import type { UserRole } from "../auth/types";

export interface Membership {
  id: string;
  userId: string;
  businessId: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE";
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
};
