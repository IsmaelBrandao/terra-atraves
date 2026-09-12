import { describe, expect, it } from "vitest";

import { getDrillingPollingInterval } from "./useLocation";

describe("getDrillingPollingInterval", () => {
  it.each(["queued", "processing"])("polls while status is %s", (status) => {
    expect(getDrillingPollingInterval(status)).toBe(1500);
  });

  it.each(["completed", "failed", undefined, "unexpected"])(
    "stops polling for status %s",
    (status) => {
      expect(getDrillingPollingInterval(status)).toBe(false);
    },
  );
});
