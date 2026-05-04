import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  clamp,
  nearestAreaOption,
  hasValidBbox,
  parseFallbackExtraction,
  AREA_SIZE_OPTIONS,
  fetchImagery,
} from "@/pages/platform/lib";

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------
describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it("clamps to min when below range", () => {
    expect(clamp(-10, 0, 100)).toBe(0);
  });

  it("clamps to max when above range", () => {
    expect(clamp(200, 0, 100)).toBe(100);
  });

  it("handles exact boundary values", () => {
    expect(clamp(0, 0, 100)).toBe(0);
    expect(clamp(100, 0, 100)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// nearestAreaOption
// ---------------------------------------------------------------------------
describe("nearestAreaOption", () => {
  it("returns exact match when value equals an option", () => {
    for (const opt of AREA_SIZE_OPTIONS) {
      expect(nearestAreaOption(opt)).toBe(opt);
    }
  });

  it("snaps 3 to 4 (nearest)", () => {
    expect(nearestAreaOption(3)).toBe(4);
  });

  it("snaps 90 to 100 (nearest)", () => {
    expect(nearestAreaOption(90)).toBe(100);
  });

  it("snaps 0.1 to 1 (nearest)", () => {
    expect(nearestAreaOption(0.1)).toBe(1);
  });

  it("snaps 12 to 4 or 25 — picks closer", () => {
    // |12-4|=8, |12-25|=13 → 4 is closer
    expect(nearestAreaOption(12)).toBe(4);
  });

  it("snaps 15 to 25 — equidistant to 4 (|15-4|=11) and 25 (|15-25|=10)", () => {
    expect(nearestAreaOption(15)).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// hasValidBbox
// ---------------------------------------------------------------------------
describe("hasValidBbox", () => {
  it("returns true for a valid 4-element finite array", () => {
    expect(hasValidBbox([10, 20, 30, 40])).toBe(true);
  });

  it("returns false for undefined", () => {
    expect(hasValidBbox(undefined)).toBe(false);
  });

  it("returns false for array shorter than 4", () => {
    expect(hasValidBbox([1, 2, 3])).toBe(false);
  });

  it("returns false when any element is NaN", () => {
    expect(hasValidBbox([1, NaN, 3, 4])).toBe(false);
  });

  it("returns false when any element is Infinity", () => {
    expect(hasValidBbox([1, 2, Infinity, 4])).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(hasValidBbox([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseFallbackExtraction
// ---------------------------------------------------------------------------
describe("parseFallbackExtraction", () => {
  it("parses a lat,lng pair from the text", () => {
    const result = parseFallbackExtraction("set location 37.77, -122.42", 12);
    expect(result.updatedCoordinates?.lat).toBeCloseTo(37.77);
    expect(result.updatedCoordinates?.lng).toBeCloseTo(-122.42);
  });

  it("parses cloud cover", () => {
    const result = parseFallbackExtraction("cloud cover 30", 12);
    expect(result.updatedCloudCover).toBe(30);
  });

  it("clamps cloud cover to 0–100", () => {
    const result = parseFallbackExtraction("cloud cover 150", 12);
    expect(result.updatedCloudCover).toBe(100);
  });

  it("parses NDVI band", () => {
    const result = parseFallbackExtraction("switch to ndvi", 12);
    expect(result.updatedBand).toBe("NDVI");
  });

  it("parses NDBI band", () => {
    const result = parseFallbackExtraction("use ndbi band", 12);
    expect(result.updatedBand).toBe("NDBI");
  });

  it("parses TrueColor band", () => {
    const result = parseFallbackExtraction("show truecolor", 12);
    expect(result.updatedBand).toBe("TrueColor");
  });

  it("parses zoom level explicitly", () => {
    const result = parseFallbackExtraction("zoom level 14", 12);
    expect(result.updatedZoom).toBe(14);
  });

  it("increments zoom on 'zoom in'", () => {
    const result = parseFallbackExtraction("zoom in please", 12);
    expect(result.updatedZoom).toBe(13);
  });

  it("decrements zoom on 'zoom out'", () => {
    const result = parseFallbackExtraction("zoom out", 12);
    expect(result.updatedZoom).toBe(11);
  });

  it("sets triggerRun on action keywords", () => {
    for (const phrase of ["run it", "go", "fetch imagery", "retrieve now", "analyze this"]) {
      const result = parseFallbackExtraction(phrase, 12);
      expect(result.triggerRun, `phrase: "${phrase}"`).toBe(true);
    }
  });

  it("does not set triggerRun for passive description", () => {
    const result = parseFallbackExtraction("I want to see ndvi", 12);
    expect(result.triggerRun).toBe(false);
  });

  it("parses explicit date range from/to", () => {
    const result = parseFallbackExtraction(
      "from 2024-01-01 to 2024-06-30",
      12
    );
    expect(result.updatedDateRange?.startDate).toBe("2024-01-01");
    expect(result.updatedDateRange?.endDate).toBe("2024-06-30");
  });

  it("returns null fields when nothing can be inferred", () => {
    const result = parseFallbackExtraction("hello there", 12);
    expect(result.updatedCoordinates).toBeNull();
    expect(result.updatedCloudCover).toBeNull();
    expect(result.updatedAreaSize).toBeNull();
    expect(result.updatedBand).toBeNull();
    expect(result.updatedZoom).toBeNull();
    expect(result.updatedDateRange).toBeNull();
    expect(result.triggerRun).toBe(false);
  });

  it("rejects out-of-range lat/lng coordinates silently", () => {
    // lat 200 is invalid — should not set updatedCoordinates
    const result = parseFallbackExtraction("200.0, 400.0", 12);
    expect(result.updatedCoordinates).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchImagery — happy path and error handling
// ---------------------------------------------------------------------------

vi.mock("@/lib/api-client", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api-client";

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe("fetchImagery", () => {
  it("maps a valid API response to ImageryData[]", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          image_url: "/tiles/abc.tif",
          satellite: "Sentinel-2",
          cloud_cover: 5,
          capture_date: "2024-03-15T00:00:00Z",
          render_payload: {
            cog_urls: ["https://example.com/cog.tif"],
            bbox: [73.0, 18.0, 74.0, 19.0],
          },
        },
      ],
    });

    const results = await fetchImagery(18.5, 73.5, "2024-01-01", "2024-04-01", 25, 20);

    expect(results).toHaveLength(1);
    expect(results[0].satellite_name).toBe("Sentinel-2");
    expect(results[0].cloud_cover).toBe(5);
    expect(results[0].capture_date).toBe("2024-03-15T00:00:00Z");
    expect(results[0].render_payload?.cog_urls).toEqual(["https://example.com/cog.tif"]);
    // Relative image_url should be prefixed with API_BASE_URL
    expect(results[0].image_url).toContain("abc.tif");
  });

  it("throws when response is not ok", async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => JSON.stringify({ detail: "Validation error" }),
    });

    await expect(fetchImagery(18.5, 73.5, "2024-01-01", "2024-04-01", 25, 20)).rejects.toThrow(
      "Validation error"
    );
  });

  it("throws when response body is not an array", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ error: "unexpected" }),
    });

    await expect(fetchImagery(18.5, 73.5, "2024-01-01", "2024-04-01", 25, 20)).rejects.toThrow(
      "Invalid response format"
    );
  });

  it("handles items missing optional fields gracefully", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => [{}],
    });

    const results = await fetchImagery(0, 0, "2024-01-01", "2024-04-01", 1, 100);
    expect(results[0].image_url).toBe("");
    expect(results[0].satellite_name).toBe("Sentinel-2");
    expect(results[0].cloud_cover).toBe(0);
    expect(results[0].capture_date).toBe("");
    expect(results[0].render_payload).toBeUndefined();
  });
});
