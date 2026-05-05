import React, { useCallback, useEffect, useRef, useState } from "react";
import DeckGL from "@deck.gl/react";
import { BitmapLayer } from "@deck.gl/layers";
import { WebMercatorViewport } from "@deck.gl/core";
import { Map } from "react-map-gl/maplibre";
import { hasValidBbox } from "./lib";
import type { Coordinates, SpectralBand } from "./lib";

const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
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
}: MapSurfaceProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserPanning = useRef(false);

  const [viewState, setViewState] = useState<ViewState>({
    longitude: coordinates.lng,
    latitude: coordinates.lat,
    zoom,
    pitch: 0,
    bearing: 0,
  });

  const hideTimerRef = useRef<number | null>(null);
  const [showSelectionBox, setShowSelectionBox] = useState(true);

  // Sync external prop changes into the controlled viewState (e.g. copilot flying to a new location)
  useEffect(() => {
    if (isUserPanning.current) {
      isUserPanning.current = false;
      return;
    }
    setViewState((v) => ({
      ...v,
      longitude: coordinates.lng,
      latitude: coordinates.lat,
      zoom,
    }));
  }, [coordinates.lat, coordinates.lng, zoom]);

  // Selection-box fade timer — reset whenever the user changes anything
  useEffect(() => {
    setShowSelectionBox(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
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
  }, [coordinates.lat, coordinates.lng, zoom, areaSize, isGenerating, hasOverlay, overlayUrl, overlayBbox, band]);

  const handleViewStateChange = useCallback(
    ({ viewState: next }: { viewState: ViewState }) => {
      setViewState(next);
      isUserPanning.current = true;
      setCoordinates({ lat: next.latitude, lng: next.longitude });
      setZoom(next.zoom);
    },
    [setCoordinates, setZoom]
  );

  // BitmapLayer for satellite imagery overlay
  const layers = [];
  if (hasOverlay && overlayUrl && hasValidBbox(overlayBbox)) {
    const [minLon, minLat, maxLon, maxLat] = overlayBbox;
    layers.push(
      new BitmapLayer({
        id: "imagery-overlay",
        image: overlayUrl,
        bounds: [minLon, minLat, maxLon, maxLat] as [number, number, number, number],
        opacity: 0.72,
      })
    );
  }

  // Selection box pixel size
  const containerWidth = containerRef.current?.offsetWidth ?? 800;
  const containerHeight = containerRef.current?.offsetHeight ?? 600;
  const metersPerPixel =
    (156543.03392 * Math.cos((viewState.latitude * Math.PI) / 180)) / Math.pow(2, viewState.zoom);
  const sideLengthMeters = Math.sqrt(areaSize) * 1000;
  let boxWidthPixels = sideLengthMeters / metersPerPixel;
  let boxHeightPixels = sideLengthMeters / metersPerPixel;

  const canUseOverlayBboxForBox = hasValidBbox(overlayBbox) && overlayAreaSize === areaSize;
  if (canUseOverlayBboxForBox) {
    const [minLon, minLat, maxLon, maxLat] = overlayBbox;
    try {
      const viewport = new WebMercatorViewport({
        width: containerWidth,
        height: containerHeight,
        longitude: viewState.longitude,
        latitude: viewState.latitude,
        zoom: viewState.zoom,
      });
      const sw = viewport.project([minLon, minLat]);
      const ne = viewport.project([maxLon, maxLat]);
      boxWidthPixels = Math.abs(ne[0] - sw[0]);
      boxHeightPixels = Math.abs(ne[1] - sw[1]);
    } catch {
      const centerLat = (minLat + maxLat) / 2;
      const latMeters = Math.abs(maxLat - minLat) * 111320;
      const lonMeters =
        Math.abs(maxLon - minLon) * 111320 * Math.cos((centerLat * Math.PI) / 180);
      boxWidthPixels = lonMeters / metersPerPixel;
      boxHeightPixels = latMeters / metersPerPixel;
    }
  }

  boxWidthPixels = Math.max(boxWidthPixels, 20);
  boxHeightPixels = Math.max(boxHeightPixels, 20);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <DeckGL
        viewState={viewState}
        onViewStateChange={handleViewStateChange as Parameters<typeof DeckGL>[0]["onViewStateChange"]}
        controller
        layers={layers}
        style={{ position: "absolute", inset: 0 }}
      >
        <Map reuseMaps mapStyle={isDarkMode ? DARK_STYLE : LIGHT_STYLE} />
      </DeckGL>

      {/* Selection box + crosshair overlay */}
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
          <div className={`w-8 h-[2px] ${isDarkMode ? "bg-teal-400" : "bg-teal-600"} shadow-sm`} />
          <div
            className={`h-8 w-[2px] ${isDarkMode ? "bg-teal-400" : "bg-teal-600"} absolute shadow-sm`}
          />
          <div className="w-1.5 h-1.5 bg-white rounded-full z-10 shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
        </div>
      </div>
    </div>
  );
};

export default MapSurface;
