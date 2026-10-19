import { apiRequest } from "../../../api/client";
import type {
  Category,
  Workstation,
  Product,
  ProductWorkstation,
  ModifierGroup,
  Modifier,
  Combo,
  ComboItem,
} from "../types";
const q = (x: string) => encodeURIComponent(x);
export const categoriesApi = {
  list: (locationId: string) =>
    apiRequest<Category[]>(`/locations/${q(locationId)}/categories`),
  create: (locationId: string, name: string) =>
    apiRequest<Category>(`/locations/${q(locationId)}/categories`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  update: (locationId: string, id: string, name: string) =>
    apiRequest<Category>(`/locations/${q(locationId)}/categories/${q(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  remove: (locationId: string, id: string) =>
    apiRequest<Category>(`/locations/${q(locationId)}/categories/${q(id)}`, {
      method: "DELETE",
    }),
};
export const workstationsApi = {
  list: (locationId: string) =>
    apiRequest<Workstation[]>(`/locations/${q(locationId)}/workstations`),
  create: (locationId: string, name: string) =>
    apiRequest<Workstation>(`/locations/${q(locationId)}/workstations`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  update: (locationId: string, id: string, name: string) =>
    apiRequest<Workstation>(
      `/locations/${q(locationId)}/workstations/${q(id)}`,
      { method: "PATCH", body: JSON.stringify({ name }) },
    ),
  remove: (locationId: string, id: string) =>
    apiRequest<Workstation>(
      `/locations/${q(locationId)}/workstations/${q(id)}`,
      { method: "DELETE" },
    ),
};
export type ProductInput = {
  locationId: string;
  categoryId?: string;
  name: string;
  description?: string;
  price: number;
};
export const productsApi = {
  list: (locationId: string) =>
    apiRequest<Product[]>(`/products?locationId=${q(locationId)}`),
  create: (data: ProductInput) =>
    apiRequest<Product>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ProductInput>) =>
    apiRequest<Product>(`/products/${q(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiRequest<Product>(`/products/${q(id)}`, { method: "DELETE" }),
};
export const productWorkstationsApi = {
  list: (productId: string) =>
    apiRequest<ProductWorkstation[]>(
      `/product-workstations/product/${q(productId)}`,
    ),
  create: (productId: string, workstationId: string) =>
    apiRequest<ProductWorkstation>("/product-workstations", {
      method: "POST",
      body: JSON.stringify({ productId, workstationId }),
    }),
  remove: (productId: string, workstationId: string) =>
    apiRequest<{ message: string }>(
      `/product-workstations/product/${q(productId)}/workstation/${q(workstationId)}`,
      { method: "DELETE" },
    ),
};
export type GroupInput = {
  locationId: string;
  name: string;
  minSelections: number;
  maxSelections?: number;
};
export const groupsApi = {
  list: (locationId: string) =>
    apiRequest<ModifierGroup[]>(`/modifier-groups?locationId=${q(locationId)}`),
  create: (data: GroupInput) =>
    apiRequest<ModifierGroup>("/modifier-groups", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<GroupInput>) =>
    apiRequest<ModifierGroup>(`/modifier-groups/${q(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiRequest<ModifierGroup>(`/modifier-groups/${q(id)}`, {
      method: "DELETE",
    }),
};
export type ModifierInput = {
  productId: string;
  groupId: string;
  name: string;
  priceDelta: number;
};
export const modifiersApi = {
  list: () => apiRequest<Modifier[]>("/modifiers"),
  create: (data: ModifierInput) =>
    apiRequest<Modifier>("/modifiers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ModifierInput & { active: boolean }>) =>
    apiRequest<Modifier>(`/modifiers/${q(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiRequest<Modifier>(`/modifiers/${q(id)}`, { method: "DELETE" }),
};
export type ComboInput = {
  locationId: string;
  name: string;
  description?: string;
  price: number;
};
export const combosApi = {
  list: (locationId: string) =>
    apiRequest<Combo[]>(`/combos?locationId=${q(locationId)}`),
  create: (data: ComboInput) =>
    apiRequest<Combo>("/combos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ComboInput>) =>
    apiRequest<Combo>(`/combos/${q(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiRequest<Combo>(`/combos/${q(id)}`, { method: "DELETE" }),
};
export const comboItemsApi = {
  create: (comboId: string, productId: string, quantity: number) =>
    apiRequest<ComboItem>(`/combos/${q(comboId)}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    }),
  update: (comboId: string, itemId: string, quantity: number) =>
    apiRequest<ComboItem>(`/combos/${q(comboId)}/items/${q(itemId)}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    }),
  remove: (comboId: string, itemId: string) =>
    apiRequest<ComboItem>(`/combos/${q(comboId)}/items/${q(itemId)}`, {
      method: "DELETE",
    }),
};
