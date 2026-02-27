// Geographic map of Brazil using simplified GeoJSON data
// Source: luizpedone/municipal-brazilian-geodata (IBGE-based)

import brazilGeoJSON from "@/assets/brazil-simplified.json";

export type StateFeature = {
  uf: string;
  name: string;
  paths: string[]; // multiple paths for MultiPolygon states (islands etc.)
  centroidX: number;
  centroidY: number;
};

// Brazil bounding box (approximate)
const LON_MIN = -74.0;
const LON_MAX = -34.5;
const LAT_MIN = -33.8;
const LAT_MAX = 5.5;

// SVG dimensions
const SVG_W = 550;
const SVG_H = 580;
const PADDING = 15;

// Mercator projection
function projectLon(lon: number): number {
  return PADDING + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (SVG_W - 2 * PADDING);
}

function projectLat(lat: number): number {
  // Mercator: y increases downward, lat decreases downward
  const latRad = (lat * Math.PI) / 180;
  const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));

  const latMinRad = (LAT_MIN * Math.PI) / 180;
  const latMaxRad = (LAT_MAX * Math.PI) / 180;
  const mercMin = Math.log(Math.tan(Math.PI / 4 + latMinRad / 2));
  const mercMax = Math.log(Math.tan(Math.PI / 4 + latMaxRad / 2));

  // Invert: top of map = LAT_MAX, bottom = LAT_MIN
  return PADDING + ((mercMax - mercY) / (mercMax - mercMin)) * (SVG_H - 2 * PADDING);
}

function coordsToPath(coords: number[][]): string {
  return coords
    .map((c, i) => {
      const x = projectLon(c[0]);
      const y = projectLat(c[1]);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join("") + "Z";
}

function computeCentroid(coords: number[][]): [number, number] {
  let sumX = 0, sumY = 0;
  for (const c of coords) {
    sumX += c[0];
    sumY += c[1];
  }
  return [sumX / coords.length, sumY / coords.length];
}

// Small states that need label offset for readability
const LABEL_OFFSETS: Record<string, [number, number]> = {
  DF: [18, 0],
  RJ: [16, 8],
  ES: [16, 0],
  SE: [18, 0],
  AL: [18, 0],
  RN: [12, -8],
  PB: [12, -4],
  PA: [-20, 15],
  AC: [0, -5],
};

function buildStates(): StateFeature[] {
  const features = (brazilGeoJSON as any).features;
  const states: StateFeature[] = [];

  for (const feature of features) {
    const uf = feature.properties.UF as string;
    const name = feature.properties.ESTADO as string;
    const geom = feature.geometry;

    let allPaths: string[] = [];
    let mainCoords: number[][] = [];

    if (geom.type === "Polygon") {
      const coords = geom.coordinates[0] as number[][];
      allPaths.push(coordsToPath(coords));
      mainCoords = coords;
    } else if (geom.type === "MultiPolygon") {
      // Use the first (largest) polygon for centroid, render all
      let maxLen = 0;
      for (const polygon of geom.coordinates) {
        const coords = polygon[0] as number[][];
        allPaths.push(coordsToPath(coords));
        if (coords.length > maxLen) {
          maxLen = coords.length;
          mainCoords = coords;
        }
      }
    }

    const [cLon, cLat] = computeCentroid(mainCoords);
    const offset = LABEL_OFFSETS[uf] || [0, 0];
    const cx = projectLon(cLon) + offset[0];
    const cy = projectLat(cLat) + offset[1];

    states.push({ uf, name, paths: allPaths, centroidX: cx, centroidY: cy });
  }

  return states;
}

export const BRAZIL_VIEWBOX = `0 0 ${SVG_W} ${SVG_H}`;
export const brazilStates: StateFeature[] = buildStates();
