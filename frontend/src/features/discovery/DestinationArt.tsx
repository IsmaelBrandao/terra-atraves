import { useMemo } from "react";

import type { GeoPoint } from "../../map/initialView";

const SIZE = 320;
const RADIUS = 118;
const toRad = (degrees: number) => (degrees * Math.PI) / 180;

function orthographicPaths(center: GeoPoint): string[] {
  const lat0 = toRad(center.latitude);
  const lon0 = toRad(center.longitude);
  const project = (latDeg: number, lonDeg: number): [number, number] | null => {
    const lat = toRad(latDeg);
    const dLon = toRad(lonDeg) - lon0;
    const visible = Math.sin(lat0) * Math.sin(lat) + Math.cos(lat0) * Math.cos(lat) * Math.cos(dLon);
    if (visible < 0) return null;
    const x = Math.cos(lat) * Math.sin(dLon);
    const y = Math.cos(lat0) * Math.sin(lat) - Math.sin(lat0) * Math.cos(lat) * Math.cos(dLon);
    return [SIZE / 2 + x * RADIUS, SIZE / 2 - y * RADIUS];
  };

  const lines: Array<Array<[number, number]>> = [];
  for (let lon = -180; lon < 180; lon += 30) {
    lines.push(Array.from({ length: 61 }, (_, index) => [-90 + index * 3, lon] as [number, number]));
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    lines.push(Array.from({ length: 121 }, (_, index) => [lat, -180 + index * 3] as [number, number]));
  }

  return lines.flatMap((line) => {
    const paths: string[] = [];
    let current = "";
    for (const [lat, lon] of line) {
      const point = project(lat, lon);
      if (!point) {
        if (current) paths.push(current);
        current = "";
        continue;
      }
      current += `${current ? "L" : "M"}${point[0].toFixed(1)} ${point[1].toFixed(1)}`;
    }
    if (current) paths.push(current);
    return paths;
  });
}

/** Procedural fallback: an orthographic globe centred on the antipode. Never a broken image. */
export function DestinationArt({ antipode }: { antipode: GeoPoint }) {
  const paths = useMemo(() => orthographicPaths(antipode), [antipode]);
  return (
    <div className="destination-art" aria-hidden="true">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="destination-art-body" cx="38%" cy="34%" r="75%">
            <stop offset="0%" stopColor="#1f3e60" />
            <stop offset="70%" stopColor="#0b1d33" />
            <stop offset="100%" stopColor="#06111f" />
          </radialGradient>
          <radialGradient id="destination-art-glow" cx="50%" cy="50%" r="50%">
            <stop offset="72%" stopColor="#6aa8ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6aa8ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS * 1.32} fill="url(#destination-art-glow)" />
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="url(#destination-art-body)" />
        <g fill="none" stroke="#c8dcff" strokeOpacity="0.16" strokeWidth="0.8">
          {paths.map((d, index) => (
            <path key={index} d={d} />
          ))}
        </g>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#d6e6ff" strokeOpacity="0.35" />
        <circle cx={SIZE / 2} cy={SIZE / 2} r="16" fill="#7fe3f2" fillOpacity="0.14" />
        <circle cx={SIZE / 2} cy={SIZE / 2} r="5" fill="#7fe3f2" stroke="#02040a" strokeWidth="2" />
      </svg>
    </div>
  );
}
