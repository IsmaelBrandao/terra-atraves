import { useMutation, useQuery } from "@tanstack/react-query";

import { createDrilling, getDrilling, reverseLocation } from "../api/client";
import { useExplorationStore } from "../store/exploration.store";

export function getDrillingPollingInterval(status: string | undefined): number | false {
  return status === "queued" || status === "processing" ? 1500 : false;
}

export function useReverseLocation() {
  const point = useExplorationStore((state) => state.selectedPoint);
  return useQuery({
    queryKey: ["reverse-location", point?.latitude, point?.longitude],
    queryFn: ({ signal }) => reverseLocation(point!.latitude, point!.longitude, signal),
    enabled: point !== null,
  });
}

export function useCreateDrilling() {
  const setCurrentDrillingId = useExplorationStore((state) => state.setCurrentDrillingId);
  return useMutation({
    mutationFn: ({
      latitude,
      longitude,
      originLabel,
    }: {
      latitude: number;
      longitude: number;
      originLabel?: string;
    }) => createDrilling(latitude, longitude, originLabel),
    onSuccess: (data) => setCurrentDrillingId(data.id),
  });
}

export function useDrillingStatus() {
  const id = useExplorationStore((state) => state.currentDrillingId);
  return useQuery({
    queryKey: ["drilling", id],
    queryFn: ({ signal }) => getDrilling(id!, signal),
    enabled: id !== null,
    refetchInterval: (query) => getDrillingPollingInterval(query.state.data?.status),
  });
}
