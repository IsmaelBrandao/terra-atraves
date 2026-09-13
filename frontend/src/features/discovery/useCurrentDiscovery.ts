import { useMemo } from "react";

import { useDrillingStatus, useReverseLocation } from "../../hooks/useLocation";
import { describeLocation } from "../location/formatLocation";
import { buildDiscovery, type Discovery } from "./discoveryContent";

export function useCurrentDiscovery(): Discovery | null {
  const drillingStatus = useDrillingStatus();
  const reverse = useReverseLocation();
  const job = drillingStatus.data;
  const reverseData = reverse.data;

  return useMemo(() => {
    if (!job || job.status !== "completed") return null;
    return buildDiscovery(job, describeLocation(reverseData));
  }, [job, reverseData]);
}
