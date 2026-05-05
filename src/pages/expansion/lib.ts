import { scaleLinear } from "d3-scale";
import { interpolateYlOrRd } from "d3-scale-chromatic";
import { apiFetch } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type H3Cell = {
  h3_id: string;
  cell_area_km2: number;
  [key: string]: number | string; // built_YYYY_km2 columns
};

export type PerYearStat = {
  total_built_km2: number;
  cells_with_built: number;
};

export type AnalyticsResult = {
  status: "ok" | "empty" | "error";
  years: number[];
  per_year: Record<string, PerYearStat>;
  net_expansion_km2: number;
  growth_pct: number | null;
  first_year: number | null;
  last_year: number | null;
  cell_count: number;
};

export type MapResult = {
  status: "ok" | "empty" | "error";
  resolution: number;
  bbox: number[];
  cell_count: number;
  years: number[];
  cells: H3Cell[];
};

export type Dataset = {
  slug: string;
  display_name: string;
};

export type BBox = {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
};

// ---------------------------------------------------------------------------
// Color scale (YlOrRd — matches Honeycomb POC)
// ---------------------------------------------------------------------------

/** Returns a [r, g, b, a] deck.gl color array for a built-up km² value. */
export function makeColorScale(maxValue: number): (value: number) => [number, number, number, number] {
  const norm = scaleLinear()
    .domain([0, Math.max(maxValue, 1e-9)])
    .range([0, 1])
    .clamp(true);

  return (value: number): [number, number, number, number] => {
    if (!value || value <= 0) return [30, 35, 45, 50];
    const t = norm(value);
    const rgb = interpolateYlOrRd(t).match(/\d+/g);
    if (!rgb) return [200, 100, 50, 200];
    return [+rgb[0], +rgb[1], +rgb[2], 210];
  };
}

export type LegendStop = { value: number; color: string };

export function legendStops(maxValue: number, steps = 6): LegendStop[] {
  const fn = makeColorScale(maxValue);
  return Array.from({ length: steps }, (_, i) => {
    const value = (maxValue / (steps - 1)) * i;
    const [r, g, b] = fn(value);
    return { value, color: `rgb(${r},${g},${b})` };
  });
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export async function fetchDatasets(): Promise<Dataset[]> {
  const res = await apiFetch("/api/spatial/datasets");
  if (!res.ok) throw new Error(`Failed to load datasets (${res.status})`);
  const json = await res.json();
  return json.datasets as Dataset[];
}

export async function fetchYears(slug: string): Promise<number[]> {
  const res = await apiFetch(`/api/spatial/years?slug=${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`Failed to load years (${res.status})`);
  const json = await res.json();
  return json.years as number[];
}

export async function queryMap(slug: string, bbox: BBox, years?: number[]): Promise<MapResult> {
  const res = await apiFetch("/api/spatial/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      min_lat: bbox.minLat,
      min_lon: bbox.minLon,
      max_lat: bbox.maxLat,
      max_lon: bbox.maxLon,
      years: years?.length ? years : null,
      fmt: "map",
      resolution: 10,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err.detail;
    throw new Error(
      typeof detail === "object" ? detail.message ?? JSON.stringify(detail) : String(detail)
    );
  }
  return res.json();
}

export async function queryAnalytics(slug: string, bbox: BBox, years?: number[]): Promise<AnalyticsResult> {
  const res = await apiFetch("/api/spatial/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      min_lat: bbox.minLat,
      min_lon: bbox.minLon,
      max_lat: bbox.maxLat,
      max_lon: bbox.maxLon,
      years: years?.length ? years : null,
      fmt: "analytics",
      resolution: 10,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(String(err.detail ?? res.statusText));
  }
  return res.json();
}
