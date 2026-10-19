import { apiRequest } from "../../../api/client";

import type { TableSession, CreateTableSessionPayload } from "../types";

export const tableSessionsApi = {
  getOpenByLocation(locationId: string) {
    return apiRequest<TableSession[]>(
      `/table-sessions?locationId=${encodeURIComponent(locationId)}`,
    );
  },

  getById(id: string) {
    return apiRequest<TableSession>(
      `/table-sessions/${encodeURIComponent(id)}`,
    );
  },

  create(payload: CreateTableSessionPayload) {
    return apiRequest<TableSession>("/table-sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  close(id: string) {
    return apiRequest<TableSession>(
      `/table-sessions/${encodeURIComponent(id)}/close`,
      {
        method: "PATCH",
      },
    );
  },

  transfer(id: string, waiterId: string) {
    return apiRequest<TableSession>(`/table-sessions/${encodeURIComponent(id)}/transfer`, {
      method: "PATCH",
      body: JSON.stringify({ waiterId }),
    });
  },
};
