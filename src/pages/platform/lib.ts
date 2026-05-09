import { apiFetch } from "@/lib/api-client";

export type ActiveTab = "chat" | "controls" | "insights" | "layers";
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


export const LEFT_PANEL_DEFAULT_WIDTH = 420;
export const LEFT_PANEL_MIN_WIDTH = 320;
export const LEFT_PANEL_MAX_WIDTH = 760;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const nearestAreaOption = (value: number) =>
  AREA_SIZE_OPTIONS.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );

export const hasValidBbox = (
  bbox?: number[]
): bbox is [number, number, number, number] =>
  Array.isArray(bbox) && bbox.length === 4 && bbox.every((v) => Number.isFinite(v));

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
