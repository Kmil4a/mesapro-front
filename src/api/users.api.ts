import { apiRequest } from './client';
import type { UserRole } from '../auth/types';

export interface CreateStaffUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  locationId: string;
  role: UserRole;
}

export const usersApi = {
  create: (data: CreateStaffUser) => apiRequest('/users', {
    method: 'POST', body: JSON.stringify(data),
  }),
  update: (id: string, data: {
    firstName?: string; lastName?: string; email?: string; password?: string;
    role?: UserRole; locationId?: string; status?: 'ACTIVE' | 'INACTIVE';
  }) => apiRequest(`/users/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify(data),
  }),
};
