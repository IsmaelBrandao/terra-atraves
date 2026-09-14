import { describe, expect, it } from "vitest";

import { fortalezaReverse } from "../../test/fixtures";
import { describeLocation, formatCoordinate, formatKilometers } from "./formatLocation";

describe("describeLocation", () => {
  it("prefers the locality over the street in the display name", () => {
    expect(describeLocation(fortalezaReverse)).toEqual({ primary: "Fortaleza", secondary: "Ceará, Brasil" });
  });

  it("falls back to region or country without repeating parts", () => {
    expect(describeLocation({ ...fortalezaReverse, address: { state: "Ceará", country: "Brasil" } })).toEqual({
      primary: "Ceará",
      secondary: "Brasil",
    });
    expect(describeLocation({ ...fortalezaReverse, display_name: "Brasil", address: { country: "Brasil" } })).toEqual({
      primary: "Brasil",
      secondary: null,
    });
  });

  it("returns null for unidentified places and missing data", () => {
    expect(describeLocation(undefined)).toBeNull();
    expect(describeLocation({ ...fortalezaReverse, display_name: "Local não identificado", address: {} })).toBeNull();
  });
});

describe("formatters", () => {
  it("formats coordinates with hemispheres in pt-BR", () => {
    expect(formatCoordinate(-3.7319, "lat")).toBe("3,7319° S");
    expect(formatCoordinate(141.4733, "lon")).toBe("141,4733° L");
    expect(formatCoordinate(-38.5267, "lon")).toBe("38,5267° O");
  });

  it("formats distances", () => {
    expect(formatKilometers(4.26)).toBe("4,3 km");
    expect(formatKilometers(12_742.02)).toBe("12.742 km");
  });
});
