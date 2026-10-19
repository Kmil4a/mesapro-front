import { apiRequest } from "../../../api/client";

export interface DailyCloseReport {
  date: string;
  timeZone: string;
  location: { id: string; name: string; currency: string };
  period: { from: string; to: string };
  bills: {
    count: number;
    byStatus: Array<{ status: string; count: number }>;
    subtotal: number | string;
    discounts: number | string;
    tips: number | string;
    total: number | string;
  };
  payments: {
    registeredByStatus: Array<{
      method: string;
      status: string;
      count: number;
      amount: number | string;
    }>;
    confirmedByMethod: Array<{
      method: string;
      count: number;
      amount: number | string;
    }>;
    confirmedTotal: number | string;
    reversedByMethod: Array<{
      method: string;
      count: number;
      amount: number | string;
    }>;
    reversedTotal: number | string;
    netConfirmedTotal: number | string;
  };
  cash: {
    closedCount: number;
    expectedTotal: number | string;
    countedTotal: number | string;
    differenceTotal: number | string;
    closedSessions: Array<{
      id: string;
      openedAt: string;
      closedAt: string | null;
      openingAmount: number | string;
      expectedAmount: number | string | null;
      closingAmount: number | string | null;
      difference: number | string | null;
      opener: { firstName: string; lastName: string };
      closer: { firstName: string; lastName: string } | null;
    }>;
  };
}

export interface ProductRankingReport {
  date: string;
  timeZone: string;
  location: { id: string; name: string; currency: string };
  ranking: Array<{
    productId: string;
    productName: string;
    unitsSold: number;
    orderLines: number;
  }>;
  basis: string;
}

export const reportsApi = {
  dailyClose: (locationId: string, date: string) =>
    apiRequest<DailyCloseReport>(
      `/reports/daily-close?locationId=${encodeURIComponent(locationId)}&date=${encodeURIComponent(date)}`,
    ),
  productRanking: (locationId: string, date: string) =>
    apiRequest<ProductRankingReport>(
      `/reports/product-ranking?locationId=${encodeURIComponent(locationId)}&date=${encodeURIComponent(date)}`,
    ),
};
