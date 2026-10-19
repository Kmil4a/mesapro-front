export type TableStatus = "ACTIVE" | "INACTIVE";

export type TableSessionStatus = "OPEN" | "CLOSING" | "CLOSED" | "CANCELLED";

export interface RestaurantTable {
  id: string;
  locationId: string;
  name: string;
  capacity: number | null;
  status: TableStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TableWaiter {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TableSession {
  id: string;
  tableId: string;
  waiterId: string;
  status: TableSessionStatus;
  openedAt: string;
  closedAt: string | null;
  table?: RestaurantTable;
  waiter?: TableWaiter;
}

export interface CreateTablePayload {
  locationId: string;
  name: string;
  capacity?: number;
}

export interface UpdateTablePayload {
  locationId?: string;
  name?: string;
  capacity?: number;
}

export interface CreateTableSessionPayload {
  tableId: string;
  waiterId: string;
}
