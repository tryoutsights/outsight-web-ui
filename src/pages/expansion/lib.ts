import { scaleLinear } from "d3-scale";
import { interpolateYlOrRd } from "d3-scale-chromatic";
import { apiFetch } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type H3Cell = {
  h3_id: string;
  cell_area_km2: number;
  [key: string]: number | string; // builtup_km2_YYYY columns
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

/** Global metadata returned by GET /api/spatial/datasets */
export type StoreInfo = {
  h3_resolution: number;
  partition_resolution: number;
  years: number[];
  cities: Array<{
    country: string;
    city_slug: string;
    bbox: number[];
    years: number[];
    model_version: string;
    generated_at: string;
  }>;
  last_updated: string | null;
};

export type BBox = {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
};

export type Dataset = {
  slug: string;
  display_name: string;
  bbox?: number[];
};

// ---------------------------------------------------------------------------
// Color scales
// ---------------------------------------------------------------------------

/** @deprecated — continuous km² scale, kept for imagery band legend. */
export function makeColorScale(maxValue: number): (value: number) => [number, number, number, number] {
  const norm = scaleLinear()
    .domain([0, Math.max(maxValue, 1e-9)])
    .range([0, 1])
    .clamp(true);

  return (value: number): [number, number, number, number] => {
    if (!value || value <= 0) return [30, 35, 45, 50];
    const t = norm(value);
    const constrainedT = 0.3 + t * 0.45;
    const rgb = interpolateYlOrRd(constrainedT).match(/\d+/g);
    if (!rgb) return [200, 100, 50, 200];
    return [+rgb[0], +rgb[1], +rgb[2], 210];
  };
}

export type LegendStop = { value: number; color: string };

/**
 * Returns the earliest year in which a cell has non-zero built-up area.
 * `years` need not be pre-sorted.
 */
export function firstBuiltYear(cell: H3Cell, years: number[]): number | null {
  const sorted = [...years].sort((a, b) => a - b);
  for (const year of sorted) {
    const val = (cell[`builtup_km2_${year}`] as number) ?? 0;
    if (val > 0) return year;
  }
  return null;
}

/**
 * Returns a color function that maps a cell's first-built year to an RGBA
 * deck.gl color using the YlOrRd scale:
 *   earliest year → yellow (established, older urbanisation)
 *   latest year   → dark red (recent expansion frontier)
 */
export function makeYearColorScale(
  years: number[]
): (year: number) => [number, number, number, number] {
  const sorted = [...years].sort((a, b) => a - b);
  const minYear = sorted[0] ?? 0;
  const maxYear = sorted[sorted.length - 1] ?? 0;
  const range = maxYear - minYear || 1;

  return (year: number): [number, number, number, number] => {
    // Constrain t to [0.3, 0.75] to avoid pale yellow (too light) and dark maroon (too dark)
    const t = (year - minYear) / range;
    const constrainedT = 0.3 + t * 0.45;
    const rgb = interpolateYlOrRd(constrainedT).match(/\d+/g);
    if (!rgb) return [200, 100, 50, 210];
    return [+rgb[0], +rgb[1], +rgb[2], 210];
  };
}

/** One legend stop per year, ordered earliest → latest. */
export function yearLegendStops(years: number[]): LegendStop[] {
  const sorted = [...years].sort((a, b) => a - b);
  const colorFn = makeYearColorScale(sorted);
  return sorted.map((year) => {
    const [r, g, b] = colorFn(year);
    return { value: year, color: `rgb(${r},${g},${b})` };
  });
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

/**
 * Fetch global store metadata: available years, cities, resolution.
 * Replaces the old per-slug dataset list now that the store is H3-partitioned.
 */
export async function fetchStoreInfo(): Promise<StoreInfo> {
  const res = await apiFetch("/api/spatial/datasets");
  if (!res.ok) throw new Error(`Failed to load store info (${res.status})`);
  return res.json() as Promise<StoreInfo>;
}

/** Fetch all years available in the Hive-partitioned store (no slug needed). */
export async function fetchYears(): Promise<number[]> {
  const res = await apiFetch("/api/spatial/years");
  if (!res.ok) throw new Error(`Failed to load years (${res.status})`);
  const json = await res.json();
  return json.years as number[];
}

/** BBOX → map payload (H3 cell array for deck.gl). No slug — the store is global. */
export async function queryMap(bbox: BBox, years?: number[]): Promise<MapResult> {
  const res = await apiFetch("/api/spatial/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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

/** BBOX → analytics payload (aggregated km² stats). No slug — the store is global. */
export async function queryAnalytics(bbox: BBox, years?: number[]): Promise<AnalyticsResult> {
  const res = await apiFetch("/api/spatial/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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
