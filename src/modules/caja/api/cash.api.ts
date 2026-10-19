import { apiRequest } from "../../../api/client";

export type CashSessionStatus = "OPEN" | "CLOSED";
export type CashHandoverStatus = "PENDING" | "CONFIRMED" | "REJECTED";

export interface CashMovement {
  id: string;
  type: "SALE" | "HANDOVER" | "WITHDRAWAL" | "DEPOSIT" | "ADJUSTMENT";
  amount: number | string;
  reason: string | null;
  createdAt: string;
}

export interface CashHandover {
  id: string;
  amount: number | string;
  status: CashHandoverStatus;
  createdAt: string;
  waiter?: { firstName: string; lastName: string };
  creator?: { firstName: string; lastName: string };
  payment?: { method: string; amount: number | string };
}

export interface LocationPaymentRecord {
  id: string;
  amount: number | string;
  method: "CASH" | "CARD" | "TRANSFER";
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  createdAt: string;
  billId: string;
  cashHandover?: {
    id: string;
    status: CashHandoverStatus;
    cashSessionId: string;
    confirmedAt: string | null;
  } | null;
}

export interface CashSession {
  id: string;
  locationId: string;
  status: CashSessionStatus;
  openedAt: string;
  openingAmount: number | string;
  closingAmount: number | string | null;
  expectedAmount: number | string | null;
  difference: number | string | null;
  movements: CashMovement[];
  handovers: CashHandover[];
}

export const cashApi = {
  paymentHistory: async (locationId: string) => {
    const bills = await apiRequest<
      Array<{
        id: string;
        payments: LocationPaymentRecord[];
      }>
    >(`/bills?locationId=${encodeURIComponent(locationId)}`);

    return bills
      .flatMap((bill) => bill.payments.map((payment) => ({ ...payment, billId: bill.id })))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 30);
  },

  current: (locationId: string) =>
    apiRequest<CashSession>(
      `/cash-sessions/locations/${encodeURIComponent(locationId)}/current`,
    ),

  open: (locationId: string, openingAmount: number) =>
    apiRequest<CashSession>(
      `/cash-sessions/locations/${encodeURIComponent(locationId)}`,
      { method: "POST", body: JSON.stringify({ openingAmount }) },
    ),

  handovers: (cashSessionId: string) =>
    apiRequest<CashHandover[]>(
      `/cash-sessions/${encodeURIComponent(cashSessionId)}/handovers`,
    ),

  confirmHandover: (handoverId: string) =>
    apiRequest<CashHandover>(
      `/cash-handovers/${encodeURIComponent(handoverId)}/confirm`,
      { method: "POST" },
    ),

  close: (cashSessionId: string, closingAmount: number) =>
    apiRequest<CashSession>(
      `/cash-sessions/${encodeURIComponent(cashSessionId)}/close`,
      { method: "POST", body: JSON.stringify({ closingAmount }) },
    ),
};
