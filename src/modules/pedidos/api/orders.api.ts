import { apiRequest } from "../../../api/client";
import type {
  Order,
  OrderStatus,
  CreateOrderDto,
  OrderItem,
  OrderItemDto,
  UpdateOrderItemDto,
  Product,
  Category,
  Modifier,
  ModifierGroup,
  ProductWorkstation,
} from "../types";

const q = (s: string) => encodeURIComponent(s);

export const ordersApi = {
  list: (locationId: string) =>
    apiRequest<Order[]>(`/orders?locationId=${q(locationId)}`),

  get: (id: string) => apiRequest<Order>(`/orders/${q(id)}`),

  create: (body: CreateOrderDto) =>
    apiRequest<Order>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  addItem: (id: string, body: OrderItemDto) =>
    apiRequest<OrderItem>(`/orders/${q(id)}/items`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateItem: (id: string, itemId: string, body: UpdateOrderItemDto) =>
    apiRequest<OrderItem>(`/orders/${q(id)}/items/${q(itemId)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  removeItem: (id: string, itemId: string) =>
    apiRequest<OrderItem>(`/orders/${q(id)}/items/${q(itemId)}`, {
      method: "DELETE",
    }),

  requestItemCancellation: (id: string, itemId: string, reason: string) =>
    apiRequest<OrderItem>(`/orders/${q(id)}/items/${q(itemId)}/cancellation-request`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  status: (id: string, status: OrderStatus) =>
    apiRequest<{ order: Order; preparationTickets: unknown[] }>(
      `/orders/${q(id)}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    ),

  cancel: (id: string) =>
    apiRequest<Order>(`/orders/${q(id)}/cancel`, { method: "PATCH" }),
};

export const orderCatalogApi = {
  products: (locationId: string) =>
    apiRequest<Product[]>(`/products?locationId=${q(locationId)}`),

  categories: (locationId: string) =>
    apiRequest<Category[]>(`/locations/${q(locationId)}/categories`),

  modifiers: () => apiRequest<Modifier[]>("/modifiers"),

  groups: (locationId: string) =>
    apiRequest<ModifierGroup[]>(`/modifier-groups?locationId=${q(locationId)}`),

  workstations: (productId: string) =>
    apiRequest<ProductWorkstation[]>(
      `/product-workstations/product/${q(productId)}`,
    ),
};
