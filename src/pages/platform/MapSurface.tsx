import React, { useEffect, useRef, useState } from "react";
import {
  LEAFLET_CSS_URL,
  LEAFLET_JS_URL,
  LIGHT_TILE_URL,
  hasValidBbox,
} from "./lib";
import type { Coordinates, SpectralBand } from "./lib";

declare global {
  interface Window {
    L?: {
      map: (el: HTMLElement, options: Record<string, unknown>) => {
        on: (event: string, cb: () => void) => void;
        getCenter: () => { lat: number; lng: number };
        getZoom: () => number;
        setView: (center: [number, number], zoom: number) => void;
        setZoom: (zoom: number) => void;
        invalidateSize: () => void;
        remove: () => void;
        fitBounds?: (bounds: unknown, options?: Record<string, unknown>) => void;
      };
      tileLayer: (
        url: string,
        options: Record<string, unknown>
      ) => { addTo: (map: unknown) => { setUrl: (url: string) => void } };
      imageOverlay: (
        url: string,
        bounds: [[number, number], [number, number]],
        options?: Record<string, unknown>
      ) => { addTo: (map: unknown) => unknown };
      geoJSON: (
        data: unknown,
        options?: Record<string, unknown>
      ) => {
        addTo: (map: unknown) => unknown;
        getBounds?: () => unknown;
      };
    };
  }
}

export type AgentLayerInput = {
  /** Stable id used as React/layer key, e.g. "hyderabad-2025". */
  id: string;
  /** Display label, e.g. "2025" or "change". */
  label: string;
  /** Hex color assigned by the backend. */
  color: string;
  /** Inline GeoJSON FeatureCollection (for delivery="inline"). */
  geojson: GeoJSON.FeatureCollection | null;
  /** Visibility flag from the year-toggle UI. */
  visible: boolean;
};

type MapSurfaceProps = {
  coordinates: Coordinates;
  setCoordinates: React.Dispatch<React.SetStateAction<Coordinates>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  areaSize: number;
  hasOverlay: boolean;
  band: SpectralBand;
  isGenerating: boolean;
  isDarkMode: boolean;
  overlayUrl: string;
  overlayBbox?: number[];
  overlayAreaSize?: number;
  /** Agent-mode GeoJSON layers (one per year, color-coded). */
  agentLayers?: AgentLayerInput[];
  /** When true, fit the map to the union of visible agentLayers' bounds on next change. */
  fitAgentLayers?: boolean;
};

const MapSurface = ({
  coordinates,
  setCoordinates,
  zoom,
  setZoom,
  areaSize,
  hasOverlay,
  band,
  isGenerating,
  isDarkMode,
  overlayUrl,
  overlayBbox,
  overlayAreaSize,
  agentLayers,
  fitAgentLayers,
}: MapSurfaceProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<unknown>(null);
  const tileLayerRef = useRef<unknown>(null);
  const imageOverlayRef = useRef<unknown>(null);
  const agentLayerRefs = useRef<Map<string, unknown>>(new Map());
  const hideTimerRef = useRef<number | null>(null);
  const [showSelectionBox, setShowSelectionBox] = useState(true);

  useEffect(() => {
    const initMap = () => {
      if (mapInstance.current || !window.L || !mapRef.current) return;
      const L = window.L;
      if (!L) return;

      const map = L.map(mapRef.current, {
        center: [coordinates.lat, coordinates.lng],
        zoom,
        zoomControl: false,
        attributionControl: false,
      });
      const initialUrl = LIGHT_TILE_URL;
      tileLayerRef.current = L.tileLayer(initialUrl, {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);

      map.on("moveend", () => {
        const center = map.getCenter();
        setCoordinates({ lat: center.lat, lng: center.lng });
      });
      map.on("zoomend", () => setZoom(map.getZoom()));
      mapInstance.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    };

    if (!document.getElementById("leaflet-css")) {
      const css = document.createElement("link");
      css.id = "leaflet-css";
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS_URL;
      document.head.appendChild(css);
    }

    const scriptId = "leaflet-js";
    const script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      const next = document.createElement("script");
      next.id = scriptId;
      next.src = LEAFLET_JS_URL;
      next.onload = initMap;
      document.head.appendChild(next);
    } else if (window.L) {
      initMap();
    } else {
      script.addEventListener("load", initMap);
    }

    return () => {
      if (mapInstance.current) {
        const map = mapInstance.current as { remove: () => void };
        map.remove();
        mapInstance.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!tileLayerRef.current) return;
    const tileLayer = tileLayerRef.current as { setUrl: (url: string) => void };
    tileLayer.setUrl(LIGHT_TILE_URL);
  }, []);

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current as {
      getCenter: () => { lat: number; lng: number };
      setView: (center: [number, number], zoom: number) => void;
    };
    const center = map.getCenter();
    if (
      Math.abs(center.lat - coordinates.lat) > 0.0001 ||
      Math.abs(center.lng - coordinates.lng) > 0.0001
    ) {
      map.setView([coordinates.lat, coordinates.lng], zoom);
    }
  }, [coordinates.lat, coordinates.lng, zoom]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current as { getZoom: () => number; setZoom: (zoom: number) => void };
    if (map.getZoom() !== zoom) {
      map.setZoom(zoom);
    }
  }, [zoom]);

  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    const map = mapInstance.current as {
      removeLayer: (layer: unknown) => void;
    };
    const L = window.L;

    if (imageOverlayRef.current) {
      map.removeLayer(imageOverlayRef.current);
      imageOverlayRef.current = null;
    }

    if (!hasOverlay || !overlayUrl || !hasValidBbox(overlayBbox)) return;

    const [minLon, minLat, maxLon, maxLat] = overlayBbox;
    const southWest: [number, number] = [minLat, minLon];
    const northEast: [number, number] = [maxLat, maxLon];
    imageOverlayRef.current = L.imageOverlay(overlayUrl, [southWest, northEast], {
      opacity: 0.72,
      interactive: false,
    }).addTo(map);

    return () => {
      if (imageOverlayRef.current) {
        map.removeLayer(imageOverlayRef.current);
        imageOverlayRef.current = null;
      }
    };
  }, [hasOverlay, overlayUrl, overlayBbox]);

  // Agent-mode GeoJSON layers — one per year, color-coded, toggleable.
  useEffect(() => {
    if (!mapInstance.current || !window.L) return;
    const map = mapInstance.current as {
      removeLayer: (layer: unknown) => void;
      fitBounds?: (bounds: unknown, options?: Record<string, unknown>) => void;
    };
    const L = window.L;

    // Tear down any layers no longer in the input list.
    const incomingIds = new Set((agentLayers ?? []).map((l) => l.id));
    for (const [id, layer] of agentLayerRefs.current.entries()) {
      if (!incomingIds.has(id)) {
        map.removeLayer(layer);
        agentLayerRefs.current.delete(id);
      }
    }

    // (Re)create layers that should be visible.
    for (const input of agentLayers ?? []) {
      // Drop the old layer first; we always re-add to honor color changes.
      const existing = agentLayerRefs.current.get(input.id);
      if (existing) {
        map.removeLayer(existing);
        agentLayerRefs.current.delete(input.id);
      }
      if (!input.visible || !input.geojson) continue;

      const layer = L.geoJSON(input.geojson, {
        style: () => ({
          color: input.color,
          fillColor: input.color,
          weight: 1,
          fillOpacity: 0.55,
          opacity: 0.9,
        }),
      });
      layer.addTo(map);
      agentLayerRefs.current.set(input.id, layer);
    }

    // Fit map to combined bounds when requested.
    if (fitAgentLayers && agentLayerRefs.current.size > 0 && map.fitBounds) {
      // Compute union of all visible layer bounds.
      let union: { extend: (b: unknown) => void; isValid: () => boolean } | null = null;
      for (const layer of agentLayerRefs.current.values()) {
        const lyr = layer as { getBounds?: () => unknown };
        const b = lyr.getBounds?.();
        if (!b) continue;
        if (!union) {
          union = b as typeof union;
        } else {
          union.extend(b);
        }
      }
      if (union && (union as { isValid: () => boolean }).isValid()) {
        map.fitBounds(union, { padding: [40, 40] });
      }
    }
  }, [agentLayers, fitAgentLayers]);

  // Cleanup on unmount: remove any remaining agent layers.
  useEffect(() => {
    return () => {
      if (!mapInstance.current) return;
      const map = mapInstance.current as { removeLayer: (layer: unknown) => void };
      for (const layer of agentLayerRefs.current.values()) {
        try {
          map.removeLayer(layer);
        } catch {
          // map already destroyed; ignore
        }
      }
      agentLayerRefs.current.clear();
    };
  }, []);

  useEffect(() => {
    setShowSelectionBox(true);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      setShowSelectionBox(false);
      hideTimerRef.current = null;
    }, 3000);

    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [
    coordinates.lat,
    coordinates.lng,
    zoom,
    areaSize,
    isGenerating,
    hasOverlay,
    overlayUrl,
    overlayBbox,
    band,
  ]);

  const metersPerPixel =
    (156543.03392 * Math.cos((coordinates.lat * Math.PI) / 180)) / Math.pow(2, zoom);
  const sideLengthMeters = Math.sqrt(areaSize) * 1000;
  let boxWidthPixels = sideLengthMeters / metersPerPixel;
  let boxHeightPixels = sideLengthMeters / metersPerPixel;
  const canUseOverlayBboxForBox = hasValidBbox(overlayBbox) && overlayAreaSize === areaSize;

  if (canUseOverlayBboxForBox) {
    const [minLon, minLat, maxLon, maxLat] = overlayBbox;
    const map = mapInstance.current as {
      latLngToContainerPoint?: (latLng: [number, number]) => { x: number; y: number };
    } | null;

    if (map?.latLngToContainerPoint) {
      const southWestPx = map.latLngToContainerPoint([minLat, minLon]);
      const northEastPx = map.latLngToContainerPoint([maxLat, maxLon]);
      boxWidthPixels = Math.abs(northEastPx.x - southWestPx.x);
      boxHeightPixels = Math.abs(northEastPx.y - southWestPx.y);
    } else {
      const centerLat = (minLat + maxLat) / 2;
      const latMeters = Math.abs(maxLat - minLat) * 111320;
      const lonMeters = Math.abs(maxLon - minLon) * 111320 * Math.cos((centerLat * Math.PI) / 180);
      boxWidthPixels = lonMeters / metersPerPixel;
      boxHeightPixels = latMeters / metersPerPixel;
    }
  }

  boxWidthPixels = Math.max(boxWidthPixels, 20);
  boxHeightPixels = Math.max(boxHeightPixels, 20);

  return (
    <div className="absolute inset-0">
      <div
        className={`absolute inset-0 z-0 ${isDarkMode ? "bg-[#050505]" : "bg-slate-200"} transition-colors duration-300`}
      >
        <div ref={mapRef} className="absolute inset-0" />
      </div>

      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-[400] transition-opacity duration-500 ${
          showSelectionBox ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`border-2 ${
            isDarkMode
              ? "border-teal-500/50 bg-teal-500/10"
              : "border-teal-600/60 bg-teal-600/10"
          } border-dashed relative transition-all duration-300 flex items-center justify-center overflow-hidden`}
          style={{ width: `${boxWidthPixels}px`, height: `${boxHeightPixels}px` }}
        >
          {isGenerating && (
            <div
              className={`absolute inset-0 ${
                isDarkMode ? "bg-teal-500/20 border-teal-400" : "bg-teal-600/20 border-teal-600"
              } animate-pulse border-t-2`}
              style={{ animation: "scan 2s linear infinite" }}
            />
          )}
          {hasOverlay && (
            <div
              className={`absolute inset-0 opacity-40 transition-opacity duration-500 ${
                band === "NDBI"
                  ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600 via-orange-500/40 to-transparent"
                  : band === "NDVI"
                    ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-green-600/40 to-transparent"
                    : "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-400 via-slate-600/40 to-transparent"
              }`}
            />
          )}
        </div>
        <div className="absolute flex items-center justify-center">
          <div
            className={`w-8 h-[2px] ${isDarkMode ? "bg-teal-400" : "bg-teal-600"} shadow-sm`}
          />
          <div
            className={`h-8 w-[2px] ${
              isDarkMode ? "bg-teal-400" : "bg-teal-600"
            } absolute shadow-sm`}
          />
          <div className="w-1.5 h-1.5 bg-white rounded-full z-10 shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
        </div>
      </div>
    </div>
  );
};

export default MapSurface;
