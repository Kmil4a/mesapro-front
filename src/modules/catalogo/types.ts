export type Status = "ACTIVE" | "INACTIVE";
export interface Category {
  id: string;
  locationId: string;
  name: string;
  status: Status;
}
export interface Workstation {
  id: string;
  locationId: string;
  name: string;
  status: Status;
}
export interface Product {
  id: string;
  locationId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: string | number;
  status: Status;
}
export interface ProductWorkstation {
  productId: string;
  workstationId: string;
  workstation: Workstation;
}
export interface ModifierGroup {
  id: string;
  locationId: string;
  name: string;
  minSelections: number;
  maxSelections: number | null;
  status: Status;
}
export interface Modifier {
  id: string;
  productId: string;
  groupId: string;
  name: string;
  priceDelta: string | number;
  active: boolean;
}
export interface ComboItem {
  id: string;
  comboId: string;
  productId: string;
  quantity: number;
  product: Product;
}
export interface Combo {
  id: string;
  locationId: string;
  name: string;
  description: string | null;
  price: string | number;
  status: Status;
  items: ComboItem[];
}
