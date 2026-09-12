import type { components } from "./schema";

export type ReverseGeocodingResponse = components["schemas"]["ReverseGeocodingResponse"];
export type DrillingAccepted = components["schemas"]["DrillingAccepted"];
export type DrillingResponse = components["schemas"]["DrillingResponse"];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const detail =
      typeof payload === "object" && payload !== null && "detail" in payload
        ? String(payload.detail)
        : `Erro HTTP ${response.status}`;
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export function reverseLocation(latitude: number, longitude: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude) });
  return apiRequest<ReverseGeocodingResponse>(`/locations/reverse?${params}`, { signal });
}

export function createDrilling(latitude: number, longitude: number, originLabel?: string) {
  return apiRequest<DrillingAccepted>("/drillings", {
    method: "POST",
    body: JSON.stringify({ latitude, longitude, origin_label: originLabel }),
  });
}

export function getDrilling(id: string, signal?: AbortSignal) {
  return apiRequest<DrillingResponse>(`/drillings/${id}`, { signal });
}
