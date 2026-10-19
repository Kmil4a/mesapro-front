export type PreparationTicketStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "READY"
  | "CANCELLED";

export type OrderType = "DINE_IN" | "TAKEAWAY";

export interface PreparationModifier {
  id: string;
  nameSnapshot: string;
  priceDelta: number | string;
}

export interface PreparationOrderItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  notes: string | null;
  status?: string;
  product?: { id: string; name: string };
  modifiers?: PreparationModifier[];
}

export interface PreparationTicketItem {
  id: string;
  ticketId: string;
  orderItemId: string;
  quantity: number;
  orderItem: PreparationOrderItem;
}

export interface PreparationWorkstation {
  id: string;
  locationId: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface PreparationOrder {
  id: string;
  type: OrderType;
  status: string;
  customerName: string | null;
  notes: string | null;
  createdAt: string;
  tableSession?: {
    id: string;
    table?: { id: string; name: string };
  } | null;
}

export interface PreparationTicket {
  id: string;
  orderId: string;
  workstationId: string;
  status: PreparationTicketStatus;
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
  cancelledAt: string | null;
  workstation: PreparationWorkstation;
  order: PreparationOrder;
  items: PreparationTicketItem[];
}

export interface UpdatePreparationTicketStatusResponse {
  ticket: PreparationTicket;
  orderUpdated: boolean;
}
