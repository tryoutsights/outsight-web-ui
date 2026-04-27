import { apiFetch } from "@/lib/api-client";

export type ActiveTab = "chat" | "controls" | "insights";
export type SpectralBand = "NDBI" | "NDVI" | "TrueColor";
export type DateRange = { startDate: string; endDate: string };

export type RetrieveParams = {
  lat: number;
  lon: number;
  startDate: string;
  endDate: string;
  areaSize: number;
  maxCloudCover: number;
};

export type ChatMessage = { role: "bot" | "user"; text: string };

export type CopilotExtraction = {
  updatedCoordinates: Coordinates | null;
  updatedCloudCover: number | null;
  updatedAreaSize: number | null;
  updatedBand: SpectralBand | null;
  updatedZoom: number | null;
  updatedDateRange: DateRange | null;
  triggerRun: boolean;
  replyText: string;
};

export interface ImageryData {
  image_url: string;
  satellite_name: string;
  cloud_cover: number;
  capture_date: string;
  render_payload?: {
    cog_urls?: string[];
    bbox?: number[];
    [key: string]: unknown;
  };
}

export type Coordinates = { lat: number; lng: number };

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
export const AREA_SIZE_OPTIONS = [1, 4, 25, 100] as const;

export const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
export const LIGHT_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
export const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
export const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

export const LEFT_PANEL_DEFAULT_WIDTH = 420;
export const LEFT_PANEL_MIN_WIDTH = 320;
export const LEFT_PANEL_MAX_WIDTH = 760;

export const COPILOT_THINKING_TEXT = "Thinking...";
export const DEFAULT_COPILOT_REPLY =
  "I couldn't infer clear actions. Try including cloud/area/band/coordinates.";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const nearestAreaOption = (value: number) =>
  AREA_SIZE_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );

const isFiniteLatLng = (coords: Coordinates) =>
  Number.isFinite(coords.lat) &&
  Number.isFinite(coords.lng) &&
  coords.lat >= -90 &&
  coords.lat <= 90 &&
  coords.lng >= -180 &&
  coords.lng <= 180;

export const hasValidBbox = (
  bbox?: number[]
): bbox is [number, number, number, number] =>
  Array.isArray(bbox) && bbox.length === 4 && bbox.every((v) => Number.isFinite(v));

export const parseFallbackExtraction = (
  text: string,
  currentZoom: number
): CopilotExtraction => {
  const lower = text.toLowerCase();
  const latLonPair = lower.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  const latMatch = lower.match(/lat(?:itude)?(?:\s+is|\s+to)?\s*[:=]?\s*(-?\d+(?:\.\d+)?)/);
  const lonMatch = lower.match(
    /(?:lon|lng|longitude)(?:\s+is|\s+to)?\s*[:=]?\s*(-?\d+(?:\.\d+)?)/
  );
  const cloudClause = lower.match(/(?:cloud(?:\s*cover)?)[^0-9-]*(-?\d{1,3})/);
  const areaClause = lower.match(/(?:area|extent|size)[^0-9-]*(-?\d+(?:\.\d+)?)/);
  const zoomMatch = lower.match(/zoom(?:\s+level)?(?:\s+is|\s+to)?\s*[:=]?\s*(\d{1,2})/);
  const fromToMatch = lower.match(
    /(?:from|start)\s*(\d{4}-\d{2}-\d{2}).*?(?:to|end)\s*(\d{4}-\d{2}-\d{2})/
  );

  const extraction: CopilotExtraction = {
    updatedCoordinates: null,
    updatedCloudCover: cloudClause ? clamp(Number(cloudClause[1]), 0, 100) : null,
    updatedAreaSize: areaClause ? nearestAreaOption(Number(areaClause[1])) : null,
    updatedBand: lower.includes("ndvi")
      ? "NDVI"
      : lower.includes("ndbi")
        ? "NDBI"
        : lower.includes("truecolor") ||
            lower.includes("true color") ||
            lower.includes("rgb")
          ? "TrueColor"
          : null,
    updatedZoom: zoomMatch
      ? Number(zoomMatch[1])
      : /\bzoom in\b/.test(lower)
        ? currentZoom + 1
        : /\bzoom out\b/.test(lower)
          ? currentZoom - 1
          : null,
    updatedDateRange: fromToMatch
      ? { startDate: fromToMatch[1], endDate: fromToMatch[2] }
      : null,
    triggerRun: /(run|execute|retrieve|fetch|analy[sz]e|go)\b/.test(lower),
    replyText: "",
  };

  if (latLonPair) {
    const pair: Coordinates = { lat: Number(latLonPair[1]), lng: Number(latLonPair[2]) };
    if (isFiniteLatLng(pair)) extraction.updatedCoordinates = pair;
  }

  if (latMatch || lonMatch) {
    const candidate: Coordinates = {
      lat: latMatch ? Number(latMatch[1]) : extraction.updatedCoordinates?.lat ?? 0,
      lng: lonMatch ? Number(lonMatch[1]) : extraction.updatedCoordinates?.lng ?? 0,
    };
    if (isFiniteLatLng(candidate)) extraction.updatedCoordinates = candidate;
  }

  if (!extraction.updatedCoordinates && /(location|coordinate|coords)/.test(lower)) {
    const nums = lower.match(/-?\d+(?:\.\d+)?/g);
    if (nums && nums.length >= 2) {
      const candidate: Coordinates = { lat: Number(nums[0]), lng: Number(nums[1]) };
      if (isFiniteLatLng(candidate)) extraction.updatedCoordinates = candidate;
    }
  }

  return extraction;
};

export const fetchImagery = async (
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
  areaSize: number,
  maxCloudCover: number
): Promise<ImageryData[]> => {
  // Imagery endpoint is anonymous-friendly, but we still attach a token when
  // available so server-side analytics can scope to a user.
  const res = await apiFetch(
    `/api/imagery?lat=${lat}&lon=${lon}&start_date=${startDate}&end_date=${endDate}&area_size=${areaSize}&max_cloud=${maxCloudCover}`
  );

  if (!res.ok) {
    const text = await res.text();
    let errorMessage = `Request failed (${res.status})`;
    try {
      const errorJson = JSON.parse(text);
      if (errorJson.detail) {
        try {
          const nestedJson = JSON.parse(errorJson.detail);
          errorMessage = nestedJson.detail || errorJson.detail;
        } catch {
          errorMessage = errorJson.detail;
        }
      } else {
        errorMessage = text;
      }
    } catch {
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const json = await res.json();
  if (!Array.isArray(json)) {
    throw new Error("Invalid response format: expected an array");
  }

  return json.map((item: Record<string, unknown>): ImageryData => {
    const imageUrlRaw = typeof item.image_url === "string" ? item.image_url : "";
    const url = imageUrlRaw.startsWith("/") ? `${API_BASE_URL}${imageUrlRaw}` : imageUrlRaw;
    const satelliteName = typeof item.satellite === "string" ? item.satellite : "Sentinel-2";
    const cloud = typeof item.cloud_cover === "number" ? item.cloud_cover : 0;
    const capture = typeof item.capture_date === "string" ? item.capture_date : "";
    const renderPayload =
      item.render_payload && typeof item.render_payload === "object"
        ? (item.render_payload as ImageryData["render_payload"])
        : undefined;

    return {
      image_url: url,
      satellite_name: satelliteName,
      cloud_cover: cloud,
      capture_date: capture,
      render_payload: renderPayload,
    };
  });
};
