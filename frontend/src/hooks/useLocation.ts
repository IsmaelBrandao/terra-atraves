import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { createDrilling, getDrilling, reverseLocation } from "../api/client";
import { useExplorationStore } from "../store/exploration.store";

export function getDrillingPollingInterval(status: string | undefined): number | false {
  return status === "queued" || status === "processing" ? 1500 : false;
}

export const DRILLING_TIMEOUT_MS = 45_000;

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
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [timeoutAttempt, setTimeoutAttempt] = useState(0);
  const query = useQuery({
    queryKey: ["drilling", id],
    queryFn: ({ signal }) => getDrilling(id!, signal),
    enabled: id !== null && !isTimedOut,
    refetchInterval: (query) => getDrillingPollingInterval(query.state.data?.status),
  });

  useEffect(() => {
    setIsTimedOut(false);
    const status = query.data?.status;
    if (!id || status === "completed" || status === "failed") return;
    const timeoutId = window.setTimeout(() => setIsTimedOut(true), DRILLING_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [id, query.data?.status, timeoutAttempt]);

  const retry = useCallback(() => {
    setIsTimedOut(false);
    setTimeoutAttempt((attempt) => attempt + 1);
    void query.refetch();
  }, [query]);

  return { ...query, isTimedOut, retry };
}
