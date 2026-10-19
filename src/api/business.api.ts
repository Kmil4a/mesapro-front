import { apiRequest } from './client';

export interface BusinessConfiguration {
  id: string;
  name: string;
  taxId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  locations: Array<{
    id: string;
    name: string;
    address: string | null;
    timezone: string;
    currency: string;
    status: 'ACTIVE' | 'INACTIVE';
    suscription: null | {
      id: string;
      status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
      startedAt: string;
      currentPeriodStart: string | null;
      currentPeriodEnd: string | null;
      cancelledAt: string | null;
      plan: {
        code: 'FREE' | 'BASIC' | 'PRO';
        name: string;
        description: string | null;
        price: number | string;
        maxLocations: number | null;
        maxUsers: number | null;
        maxProducts: number | null;
      };
    };
  }>;
}

export const businessApi = {
  getCurrent: () => apiRequest<BusinessConfiguration>('/businesses/current'),
  updateCurrent: (data: { name: string; taxId: string | null }) =>
    apiRequest<Pick<BusinessConfiguration, 'id' | 'name' | 'taxId' | 'status'>>('/businesses/current', {
      method: 'PATCH', body: JSON.stringify(data),
    }),
};
