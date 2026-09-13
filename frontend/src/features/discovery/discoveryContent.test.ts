import { describe, expect, it } from "vitest";

import { fortalezaReverse, landJob, oceanJob, sparseOceanJob } from "../../test/fixtures";
import { describeLocation } from "../location/formatLocation";
import { buildDiscovery, chordDistanceKm } from "./discoveryContent";

describe("chordDistanceKm", () => {
  it("is the Earth's mean diameter between antipodes", () => {
    expect(chordDistanceKm({ latitude: -3.7319, longitude: -38.5267 }, { latitude: 3.7319, longitude: 141.4733 })).toBeCloseTo(12_742, 0);
  });

  it("is zero for the same point", () => {
    expect(chordDistanceKm({ latitude: 10, longitude: 10 }, { latitude: 10, longitude: 10 })).toBeCloseTo(0, 6);
  });
});

describe("buildDiscovery", () => {
  it("returns nothing until destination and antipode exist", () => {
    expect(buildDiscovery({ ...oceanJob, destination: null }, null)).toBeNull();
    expect(buildDiscovery({ ...oceanJob, antipode: null }, null)).toBeNull();
  });

  it("builds an ocean discovery with nearest land and settlement", () => {
    const discovery = buildDiscovery(oceanJob, describeLocation(fortalezaReverse));
    expect(discovery?.kind).toBe("ocean");
    if (discovery?.kind !== "ocean") return;
    expect(discovery.title).toBe("Oceano Pacífico");
    expect(discovery.origin).toMatchObject({ title: "Fortaleza", subtitle: "Ceará, Brasil" });
    expect(discovery.nearestLand).toMatchObject({ name: "Indonésia", distanceKm: 479.7, detail: "Localidade de referência: Biak, Indonésia" });
    expect(discovery.nearestSettlement).toMatchObject({ name: "Biak", detail: "Indonésia", distanceReference: "costa" });
    expect(discovery.imageSearch.map((term) => term.title)).toEqual(["Biak", "Indonésia"]);
  });

  it("builds a land discovery without a nearest-land section", () => {
    const discovery = buildDiscovery(landJob, null);
    expect(discovery?.kind).toBe("land");
    if (discovery?.kind !== "land") return;
    expect(discovery.title).toBe("Fortaleza");
    expect(discovery.locale).toBe("Ceará, Brasil");
    expect(discovery).not.toHaveProperty("nearestLand");
    expect(discovery.origin.title).toBe("Ponto de origem");
    expect(buildDiscovery({ ...landJob, origin_label: "Local não identificado" }, null)?.origin.title).toBe("Ponto de origem");
    expect(discovery.imageSearch[0]).toMatchObject({ title: "Fortaleza", maxDistanceKm: 60 });
  });

  it("uses the region as title when the nearest place is far away", () => {
    const farPlace = {
      ...landJob,
      destination: {
        ...landJob.destination!,
        nearest_place: { ...landJob.destination!.nearest_place!, distance_km: 180 },
      },
    };
    expect(buildDiscovery(farPlace, null)?.title).toBe("Ceará");
  });

  it("never exposes null fields when the API returns only the basics", () => {
    const discovery = buildDiscovery(sparseOceanJob, null);
    expect(discovery).toMatchObject({ kind: "ocean", title: "Oceano", nearestLand: null, nearestSettlement: null, imageSearch: [] });
    expect(JSON.stringify(discovery)).not.toContain("undefined");
  });
});
