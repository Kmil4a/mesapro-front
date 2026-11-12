import { apiRequest } from "../../api/client";

export type DashboardPeriod = "today" | "7d" | "30d";
export interface DashboardData {
  location: { id: string; name: string; timezone: string; currency: string };
  updatedAt: string;
  scope: "own" | "location";
  period: { key: DashboardPeriod; days: number; from: string; to: string };
  orders: {
    total: number;
    cancelled: number;
    dineIn: number;
    takeaway: number;
  };
  live: {
    active: number;
    drafts: number;
    awaitingDelivery: number;
    delivered: number;
    paidTakeaway: number;
    openSessions: number;
    pendingPayments: number;
    cancellationRequests: number;
    invalidProducts: number | null;
  };
  tables: {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
    outOfService: number;
  };
  timeline: Array<{ date: string; sales: number; orders: number }>;
  attentionOrders: Array<{
    id: string;
    code: string;
    label: string;
    type: string;
    status: string;
    paid: boolean;
    ageMinutes: number;
  }>;
  cash: null | {
    open: boolean;
    openedAt: string | null;
    opener: string | null;
    expected: number;
    pendingHandovers: number;
    pendingHandoverAmount: number;
  };
  finance: null | {
    sales: number;
    previousSales: number;
    change: number | null;
    tickets: number;
    averageTicket: number;
    tips: number;
    discounts: number;
    collections: number;
    reversals: number;
    outstanding: number;
    outstandingBills: number;
    methods: Array<{
      method: string;
      count: number;
      collected: number;
      reversed: number;
      net: number;
    }>;
    topProducts: Array<{ id: string; name: string; units: number }>;
  };
}

export const dashboardApi = {
  overview: (
    locationId: string,
    period: DashboardPeriod,
    signal?: AbortSignal,
  ) =>
    apiRequest<DashboardData>(
      `/dashboard?locationId=${encodeURIComponent(locationId)}&period=${period}`,
      { signal },
    ),
};
