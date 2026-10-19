export type UserRole =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "WAITER"
  | "KITCHEN"
  | "CASHIER";

export interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  businessId: string;
  membershipId: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
}
