import { apiRequest } from "../../../api/client";
import type {
  PreparationTicket,
  PreparationTicketStatus,
  PreparationWorkstation,
  UpdatePreparationTicketStatusResponse,
} from "../types";

const q = (value: string) => encodeURIComponent(value);

export const preparationsApi = {
  list: (locationId: string) =>
    apiRequest<PreparationTicket[]>(
      `/preparation-tickets?locationId=${q(locationId)}`,
    ),

  get: (id: string) =>
    apiRequest<PreparationTicket>(`/preparation-tickets/${q(id)}`),

  updateStatus: (id: string, status: PreparationTicketStatus) =>
    apiRequest<UpdatePreparationTicketStatusResponse>(
      `/preparation-tickets/${q(id)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    ),

  workstations: (locationId: string) =>
    apiRequest<PreparationWorkstation[]>(
      `/locations/${q(locationId)}/workstations`,
    ),
};
