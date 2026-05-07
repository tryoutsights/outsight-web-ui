import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { DEFAULT_IMAGERY_OPACITY } from "../constants";
import { fetchImagery, hasValidBbox } from "../lib";
import type {
  Coordinates,
  DateRange,
  ImageryData,
  RetrieveParams,
  SpectralBand,
} from "../lib";
import type { LayerDef } from "../layers";

type Args = {
  band: SpectralBand;
  coordinates: Coordinates;
  dateRange: DateRange;
  areaSize: number;
  cloudCover: number;
  addLayer: (layer: LayerDef) => void;
};

type RetrieveOverrides = Partial<RetrieveParams>;

export function useImageryPipeline({
  band,
  coordinates,
  dateRange,
  areaSize,
  cloudCover,
  addLayer,
}: Args) {
  const [params, setParams] = useState<RetrieveParams | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeImageUrl, setActiveImageUrl] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const imageCache = useRef<Map<string, string>>(new Map());

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["imagery", params],
    queryFn: () =>
      fetchImagery(
        params!.lat,
        params!.lon,
        params!.startDate,
        params!.endDate,
        params!.areaSize,
        params!.maxCloudCover
      ),
    enabled: !!params,
    retry: false,
  });

  useEffect(() => {
    if (isError && error) {
      toast.error("Failed to retrieve imagery", {
        description: (error as Error).message,
      });
    }
  }, [isError, error]);

  useEffect(() => {
    const cache = imageCache.current;
    return () => {
      for (const url of cache.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const selectedItem = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[Math.min(activeIndex, data.length - 1)];
  }, [activeIndex, data]);

  useEffect(() => {
    if (!activeImageUrl || !selectedItem) return;
    const rawBbox = selectedItem.render_payload?.bbox;
    if (!hasValidBbox(rawBbox)) return;
    addLayer({
      kind: "imagery",
      id: "imagery-current",
      label: `${band} — ${selectedItem.capture_date?.slice(0, 10) ?? ""}`,
      visible: true,
      url: activeImageUrl,
      bbox: rawBbox as [number, number, number, number],
      opacity: DEFAULT_IMAGERY_OPACITY,
      band,
    });
  }, [activeImageUrl, selectedItem, addLayer, band]);

  useEffect(() => {
    setActiveIndex(0);
  }, [data]);

  useEffect(() => {
    if (!data || data.length === 0 || !data[activeIndex]) {
      setActiveImageUrl("");
      return;
    }

    const currentItem = data[activeIndex];
    const imageUrl = currentItem.image_url || "";

    if (!currentItem.render_payload) {
      setActiveImageUrl(imageUrl);
      setIsRendering(false);
      return;
    }

    const cacheKey = JSON.stringify(currentItem.render_payload);
    if (imageCache.current.has(cacheKey)) {
      setActiveImageUrl(imageCache.current.get(cacheKey) || "");
      setIsRendering(false);
      return;
    }

    let isMounted = true;
    setIsRendering(true);

    const fetchRendered = async () => {
      try {
        const response = await apiFetch(`/api/render`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentItem.render_payload),
        });
        if (!response.ok) throw new Error("Render endpoint failed");
        const blob = await response.blob();
        const localUrl = URL.createObjectURL(blob);
        if (!isMounted) return;
        imageCache.current.set(cacheKey, localUrl);
        setActiveImageUrl(localUrl);
      } catch {
        if (isMounted) {
          setActiveImageUrl(imageUrl);
        }
      } finally {
        if (isMounted) setIsRendering(false);
      }
    };

    fetchRendered();
    return () => {
      isMounted = false;
    };
  }, [activeIndex, data]);

  const handleRetrieve = useCallback(
    (overrides?: RetrieveOverrides, onMessage?: (text: string) => void) => {
      const next = {
        lat: overrides?.lat ?? coordinates.lat,
        lon: overrides?.lon ?? coordinates.lng,
        startDate: overrides?.startDate ?? dateRange.startDate,
        endDate: overrides?.endDate ?? dateRange.endDate,
        areaSize: overrides?.areaSize ?? areaSize,
        maxCloudCover: overrides?.maxCloudCover ?? cloudCover,
      };
      setParams(next);
      onMessage?.(
        `Running imagery retrieval at ${next.lat.toFixed(4)}, ${next.lon.toFixed(4)} with ${next.areaSize} km² and max cloud ${next.maxCloudCover}%.`
      );
      if (
        params &&
        params.lat === next.lat &&
        params.lon === next.lon &&
        params.startDate === next.startDate &&
        params.endDate === next.endDate &&
        params.areaSize === next.areaSize &&
        params.maxCloudCover === next.maxCloudCover
      ) {
        refetch();
      }
    },
    [coordinates, dateRange, areaSize, cloudCover, params, refetch]
  );

  const hasOverlay = !!data && data.length > 0 && !!activeImageUrl && !isLoading && !isError;

  return {
    data: data as ImageryData[] | undefined,
    isLoading,
    isError,
    error,
    activeIndex,
    setActiveIndex,
    activeImageUrl,
    isRendering,
    selectedItem,
    hasOverlay,
    handleRetrieve,
  };
}
