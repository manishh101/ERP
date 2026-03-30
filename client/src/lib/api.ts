export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: HeadersInit;
  query?: Record<string, string | number | boolean | null | undefined>;
  token?: string | null;
};

type ApiErrorPayload = {
  message?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path.slice(1) : path;
  const combined = `${base}/${p}`;
  
  const url = combined.startsWith("http") 
    ? new URL(combined) 
    : new URL(combined, window.location.origin);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, headers: customHeaders, query, token, ...requestInit } = options;
  const headers = new Headers(customHeaders);

  headers.set("Accept", "application/json");

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, query), {
    ...requestInit,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const apiMessage =
      typeof payload === "object" && payload !== null
        ? (payload as ApiErrorPayload).message
        : undefined;

    throw new ApiError(apiMessage ?? `Request failed with status ${response.status}`, response.status, payload);
  }

  return payload as T;
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  return error instanceof Error ? error.message : fallback;
}
