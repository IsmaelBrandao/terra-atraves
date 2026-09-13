import type { DrillingResponse, ReverseGeocodingResponse } from "../api/client";

export const fortalezaReverse: ReverseGeocodingResponse = {
  latitude: -3.7319,
  longitude: -38.5267,
  display_name: "Rua Solon Pinheiro, Centro, Fortaleza, Ceará, Região Nordeste, 60035-190, Brasil",
  address: { road: "Rua Solon Pinheiro", suburb: "Centro", city: "Fortaleza", state: "Ceará", country: "Brasil" },
  cached: true,
};

const baseJob = {
  id: "89d31e48-8bd3-4c28-a4f0-dae0e660594f",
  status: "completed",
  progress: 100,
  stage: "completed",
  nearest_place: null,
  nearest_place_distance_m: null,
  error: null,
  created_at: "2026-09-13T12:00:00Z",
  completed_at: "2026-09-13T12:00:01Z",
} satisfies Partial<DrillingResponse>;

export const oceanJob: DrillingResponse = {
  ...baseJob,
  origin: { latitude: -3.7319, longitude: -38.5267 },
  antipode: { latitude: 3.7319, longitude: 141.4733 },
  destination: {
    type: "ocean",
    country: null,
    state: null,
    nearest_place: null,
    nearest_land: {
      coordinates: { latitude: 3.9, longitude: 140.1 },
      distance_km: 479.7,
      country: { name: "Indonésia", iso_a2: "ID", iso_a3: "IDN" },
      nearest_place: {
        name: "Biak",
        country: "Indonésia",
        coordinates: { latitude: -1.18, longitude: 136.08 },
        distance_km: 52.4,
      },
    },
  },
  origin_label: "Fortaleza, Ceará, Brasil",
  destination_label: "Oceano Pacífico",
  destination_is_land: false,
};

export const landJob: DrillingResponse = {
  ...baseJob,
  origin: { latitude: 3.7319, longitude: 141.4733 },
  antipode: { latitude: -3.7319, longitude: -38.5267 },
  destination: {
    type: "land",
    country: { name: "Brasil", iso_a2: "BR", iso_a3: "BRA" },
    state: { name: "Ceará", admin: "Brasil" },
    nearest_place: {
      name: "Fortaleza",
      country: "Brasil",
      coordinates: { latitude: -3.7275, longitude: -38.5275 },
      distance_km: 0.5,
    },
    nearest_land: null,
  },
  origin_label: null,
  destination_label: "Brasil",
  destination_is_land: true,
};

export const sparseOceanJob: DrillingResponse = {
  ...oceanJob,
  destination: { type: "ocean", country: null, state: null, nearest_place: null, nearest_land: null },
  destination_label: null,
  origin_label: null,
};
