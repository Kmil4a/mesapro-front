export type OrderType = "DINE_IN" | "TAKEAWAY";
export type OrderStatus =
  | "DRAFT"
  | "SENT"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED"
  | "CLOSED"
  | "CANCELLED";
export type OrderItemStatus =
  "PENDING" | "IN_PROGRESS" | "READY" | "DELIVERED" | "CANCELLED";
export interface OrderModifier {
  id: string;
  orderItemId: string;
  modifierId: string;
  nameSnapshot: string;
  priceDelta: number | string;
}
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productNameSnapshot: string;
  unitPrice: number | string;
  quantity: number;
  notes: string | null;
  status: OrderItemStatus;
  cancellationStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  cancellationReason?: string | null;
  modifiers?: OrderModifier[];
}
export interface Order {
  id: string;
  locationId: string;
  type: OrderType;
  status: OrderStatus;
  tableSessionId: string | null;
  waiterId: string | null;
  createdBy: string;
  customerName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt?: string;
  tableSession?: { id: string; table?: { id: string; name: string } } | null;
  waiter?: { id: string; firstName: string; lastName: string } | null;
  items: OrderItem[];
  billOrders?: Array<{
    bill: {
      id: string;
      status: "OPEN" | "PARTIALLY_PAID" | "PAID" | "UNPAID" | "VOID";
      total: number | string;
      payments: Array<{
        id: string;
        method: "CASH" | "CARD" | "TRANSFER";
        status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "REVERSED";
        amount: number | string;
        cashHandover: { id: string; status: string } | null;
      }>;
    };
  }>;
}
export interface CreateOrderDto {
  locationId: string;
  type: OrderType;
  tableSessionId?: string;
  waiterId?: string;
  customerName?: string;
  notes?: string;
}
export interface OrderItemDto {
  productId: string;
  quantity: number;
  notes?: string;
  modifierIds?: string[];
}
export interface UpdateOrderItemDto {
  quantity?: number;
  notes?: string;
  modifierIds?: string[];
}
export interface Product {
  id: string;
  locationId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: number | string;
  status: string;
}
export interface Category {
  id: string;
  name: string;
  status: string;
}
export interface Modifier {
  id: string;
  groupId: string;
  productId: string;
  name: string;
  priceDelta: number | string;
  active: boolean;
}
export interface ModifierGroup {
  id: string;
  locationId: string;
  name: string;
  minSelections: number;
  maxSelections: number | null;
  status: string;
}
export interface ProductWorkstation {
  productId: string;
  workstationId: string;
  workstation: { id: string; name: string; status: string };
}
