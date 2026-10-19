import { apiRequest, refreshAccessToken } from "./client";

import type { LoginResponse, MeResponse } from "../auth/types";

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  login(payload: LoginPayload) {
    return apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
      skipAuthRefresh: true,
    });
  },

  me() {
    return apiRequest<MeResponse>("/auth/me");
  },

  async restore() {
    return refreshAccessToken();
  },

  logout() {
    return apiRequest<{ message: string }>("/auth/logout", {
      method: "POST",
      skipAuthRefresh: true,
    });
  },
};
