import { apiRequest } from "../../../api/client";

import type {
  RestaurantTable,
  CreateTablePayload,
  UpdateTablePayload,
} from "../types";

export const tablesApi = {
  getAll(locationId: string) {
    return apiRequest<RestaurantTable[]>(
      `/restaurant-tables?locationId=${encodeURIComponent(locationId)}`,
    );
  },

  getById(id: string) {
    return apiRequest<RestaurantTable>(
      `/restaurant-tables/${encodeURIComponent(id)}`,
    );
  },

  create(payload: CreateTablePayload) {
    return apiRequest<RestaurantTable>("/restaurant-tables", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateTablePayload) {
    return apiRequest<RestaurantTable>(
      `/restaurant-tables/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  deactivate(id: string) {
    return apiRequest<RestaurantTable>(
      `/restaurant-tables/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
  },

  updateOperationalStatus(
    id: string,
    operationalStatus: "AVAILABLE" | "RESERVED" | "OUT_OF_SERVICE",
  ) {
    return apiRequest<RestaurantTable>(
      `/restaurant-tables/${encodeURIComponent(id)}/operational-status`,
      {
        method: "PATCH",
        body: JSON.stringify({ operationalStatus }),
      },
    );
  },
};
