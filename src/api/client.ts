const API_URL = import.meta.env.VITE_API_URL;

interface ApiError {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

export class ApiRequestError extends Error {
  public statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
  }
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiError = {};

    try {
      errorData = await response.json();
    } catch {
      // Respuesta sin JSON.
    }

    const message = Array.isArray(errorData.message)
      ? errorData.message.join(", ")
      : (errorData.message ?? errorData.error ?? "Ocurrió un error inesperado");

    throw new ApiRequestError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

interface RefreshResponse {
  accessToken: string;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      const data = await parseResponse<RefreshResponse>(response);

      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch {
      setAccessToken(null);
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

interface ApiRequestOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { skipAuthRefresh = false, ...fetchOptions } = options;

  async function execute(token: string | null) {
    const headers = new Headers(fetchOptions.headers);

    if (fetchOptions.body != null && !(fetchOptions.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: "include",
    });
  }

  let response = await execute(accessToken);

  if (response.status === 401 && !skipAuthRefresh) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      response = await execute(newToken);
    }
  }

  return parseResponse<T>(response);
}
