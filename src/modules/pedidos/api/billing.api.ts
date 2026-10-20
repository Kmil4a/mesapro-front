import { apiRequest } from "../../../api/client";

export type BillStatus = "OPEN" | "PARTIALLY_PAID" | "PAID" | "UNPAID" | "VOID";
export type PaymentMethod = "CASH" | "CARD" | "TRANSFER";
export type PaymentStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "REVERSED";

export interface Payment {
  id: string;
  billId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number | string;
  reference: string | null;
  confirmedAt: string | null;
  reversedAt?: string | null;
  reversedBy?: string | null;
  reversalReason?: string | null;
  createdAt: string;
}

export interface BillOrderLink {
  billId: string;
  orderId: string;
  order?: {
    id: string;
    status: string;
    type: string;
    customerName?: string | null;
    tableSession?: { table: { name: string } } | null;
    waiter?: { firstName: string; lastName: string } | null;
    items?: Array<{
      id: string;
      productNameSnapshot: string;
      quantity: number | string;
      unitPrice: number | string;
      modifiers: Array<{
        nameSnapshot: string;
        priceDelta: number | string;
      }>;
    }>;
  };
}

export interface Bill {
  id: string;
  locationId: string;
  status: BillStatus;
  subtotal: number | string;
  discountTotal: number | string;
  tipAmount: number | string;
  total: number | string;
  createdAt: string;
  orders: BillOrderLink[];
  payments: Payment[];
  location?: { name: string };
}

export const billingApi = {
  list: (locationId: string) =>
    apiRequest<Bill[]>(`/bills?locationId=${encodeURIComponent(locationId)}`),

  get: (billId: string) => apiRequest<Bill>(`/bills/${encodeURIComponent(billId)}`),

  create: (orderIds: string[]) =>
    apiRequest<Bill>("/bills", {
      method: "POST",
      body: JSON.stringify({ orderIds }),
    }),

  updateTip: (billId: string, tipAmount: number) =>
    apiRequest<Bill>(`/bills/${encodeURIComponent(billId)}/tip`, {
      method: "PATCH",
      body: JSON.stringify({ tipAmount }),
    }),

  createPayment: (billId: string, method: PaymentMethod, amount: number, idempotencyKey: string) =>
    apiRequest<{ payment: Payment; bill: { id: string; total: number | string } }>(
      `/bills/${encodeURIComponent(billId)}/payments`,
      {
        method: "POST",
        body: JSON.stringify({ method, amount, idempotencyKey }),
      },
    ),

  updatePaymentStatus: (
    billId: string,
    paymentId: string,
    status: PaymentStatus,
  ) =>
    apiRequest<{ payment: Payment; bill: Bill }>(
      `/bills/${encodeURIComponent(billId)}/payments/${encodeURIComponent(paymentId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    ),

  reversePayment: (billId: string, paymentId: string, reason: string) =>
    apiRequest<Payment>(
      `/bills/${encodeURIComponent(billId)}/payments/${encodeURIComponent(paymentId)}/reverse`,
      { method: "POST", body: JSON.stringify({ reason }) },
    ),
};
