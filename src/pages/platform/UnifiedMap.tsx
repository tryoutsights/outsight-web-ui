import React, { useCallback, useEffect, useRef, useState } from "react";
import { BitmapLayer, PolygonLayer } from "@deck.gl/layers";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import type { MapViewState } from "@deck.gl/core";
import { Map, useControl } from "react-map-gl/maplibre";
import { MapboxOverlay } from "@deck.gl/mapbox";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapRef } from "react-map-gl/maplibre";
import { firstBuiltYear, makeYearColorScale } from "../expansion/lib";
import type { BBox, H3Cell } from "../expansion/lib";
import {
  BASEMAP_STYLES,
  BBOX_MIN_DELTA_DEG,
  SELECTION_BOX_FADE_MS,
} from "./constants";
import { hasValidBbox } from "./lib";
import type { Coordinates, SpectralBand } from "./lib";
import type { LayerDef, LayerKind, LayerPatch } from "./layers";

type ViewState = MapViewState;

function bboxPolygon([minLat, minLon, maxLat, maxLon]: [number, number, number, number]) {
  return [
    [minLon, minLat],
    [maxLon, minLat],
    [maxLon, maxLat],
    [minLon, maxLat],
    [minLon, minLat],
  ];
}

import type { MapboxOverlayProps } from "@deck.gl/mapbox";

function DeckGLOverlay(props: MapboxOverlayProps & { interleaved?: boolean }) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

type UnifiedMapProps = {
  mapLayers: LayerDef[];
  updateLayer: <K extends LayerKind>(id: string, kind: K, update: LayerPatch<K>) => void;
  // View control (from imagery tool / copilot)
  coordinates: Coordinates;
  setCoordinates: React.Dispatch<React.SetStateAction<Coordinates>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  // Imagery selection box
  areaSize: number;
  band: SpectralBand;
  isGenerating: boolean;
  isDarkMode: boolean;
  showSelectionBox: boolean;
  // Expansion bbox draw
  drawMode: boolean;
  onBboxDrawn: (bbox: BBox) => void;
  expBbox: [number, number, number, number] | null;
};

export default function UnifiedMap({
  mapLayers,
  coordinates,
  setCoordinates,
  zoom,
  setZoom,
  areaSize,
  band,
  isGenerating,
  isDarkMode,
  showSelectionBox,
  drawMode,
  onBboxDrawn,
  expBbox,
}: UnifiedMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapRef>(null);
  const isUserPanning = useRef(false);

  const [viewState, setViewState] = useState<ViewState>({
    longitude: coordinates.lng,
    latitude: coordinates.lat,
    zoom,
    pitch: 0,
    bearing: 0,
  });

  // Bbox draw state
  const [dragStart, setDragStart] = useState<[number, number] | null>(null);
  const [dragCurrent, setDragCurrent] = useState<[number, number] | null>(null);

  // Selection box visibility
  const hideTimerRef = useRef<number | null>(null);
  const [selBoxVisible, setSelBoxVisible] = useState(true);

  // First symbol layer ID for interleaving under labels
  const [firstSymbolId, setFirstSymbolId] = useState<string | undefined>(undefined);

  const handleMapLoad = useCallback((e: { target: unknown }) => {
    const map = e.target as { getStyle: () => { layers?: { type: string; id: string }[] } };
    if (!map) return;
    const style = map.getStyle();
    if (style && style.layers) {
      const firstSymbol = style.layers.find((l: { type: string; id: string }) => l.type === "symbol");
      if (firstSymbol) setFirstSymbolId(firstSymbol.id);
    }
  }, []);

  // Sync external coordinate/zoom → viewState (e.g. copilot navigation)
  useEffect(() => {
    if (isUserPanning.current) { isUserPanning.current = false; return; }
    setViewState((v) => ({ ...v, longitude: coordinates.lng, latitude: coordinates.lat, zoom }));
  }, [coordinates.lat, coordinates.lng, zoom]);

  // Selection box fade timer
  useEffect(() => {
    if (!showSelectionBox) { setSelBoxVisible(false); return; }
    setSelBoxVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setSelBoxVisible(false);
      hideTimerRef.current = null;
    }, SELECTION_BOX_FADE_MS);
    return () => {
      if (hideTimerRef.current) { window.clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    };
  }, [showSelectionBox, coordinates.lat, coordinates.lng, zoom, areaSize, isGenerating]);

  const handleViewStateChange = useCallback(
    ({ viewState: next }: { viewState: ViewState }) => {
      setViewState(next);
      isUserPanning.current = true;
      setCoordinates({ lat: next.latitude, lng: next.longitude });
      setZoom(next.zoom);
    },
    [setCoordinates, setZoom]
  );

  // Bbox draw helpers
  const screenToLatLon = useCallback((x: number, y: number): [number, number] | null => {
    const map = mapRef.current?.getMap();
    if (!map) return null;
    const rect = map.getCanvas().getBoundingClientRect();
    const ll = map.unproject([x - rect.left, y - rect.top]);
    return [ll.lng, ll.lat];
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!drawMode) return;
    const ll = screenToLatLon(e.clientX, e.clientY);
    if (ll) { setDragStart(ll); setDragCurrent(ll); }
  }, [drawMode, screenToLatLon]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawMode || !dragStart) return;
    const ll = screenToLatLon(e.clientX, e.clientY);
    if (ll) setDragCurrent(ll);
  }, [drawMode, dragStart, screenToLatLon]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!drawMode || !dragStart) return;
    const ll = screenToLatLon(e.clientX, e.clientY);
    if (ll) {
      const [lng1, lat1] = dragStart;
      const [lng2, lat2] = ll;
      const minLat = Math.min(lat1, lat2), maxLat = Math.max(lat1, lat2);
      const minLon = Math.min(lng1, lng2), maxLon = Math.max(lng1, lng2);
      if (
        Math.abs(maxLat - minLat) > BBOX_MIN_DELTA_DEG &&
        Math.abs(maxLon - minLon) > BBOX_MIN_DELTA_DEG
      ) {
        onBboxDrawn({ minLat, minLon, maxLat, maxLon });
      }
    }
    setDragStart(null);
    setDragCurrent(null);
  }, [drawMode, dragStart, screenToLatLon, onBboxDrawn]);

  // Build deck.gl layer list from LayerDef[]
  const deckLayers: unknown[] = [];

  for (const layer of mapLayers) {
    if (!layer.visible) continue;

    if (layer.kind === "imagery" && hasValidBbox(layer.bbox)) {
      deckLayers.push(
        new BitmapLayer({
          id: `bitmap-${layer.id}`,
          image: layer.url,
          bounds: layer.bbox as [number, number, number, number],
          opacity: layer.opacity,
          // @ts-expect-error deck.gl mapbox overlay supports beforeId
          beforeId: firstSymbolId,
        })
      );
    } else if (layer.kind === "expansion" && layer.cells.length > 0) {
      const selectedYear = layer.years[layer.selectedYearIdx] ?? null;
      const colorFn = makeYearColorScale(layer.years);
      // Cumulative display: each cell is colored by the first year it became
      // built-up (not the selected year's value). Cells first urbanised after
      // the selected year are hidden (transparent) so the slider shows
      // accumulated growth up to that point — older cells are never obscured
      // by newer ones.
      deckLayers.push(
        new H3HexagonLayer<H3Cell>({
          id: `h3-${layer.id}`,
          data: layer.cells,
          getHexagon: (d) => d.h3_id as string,
          getFillColor: (d) => {
            const fy = firstBuiltYear(d, layer.years);
            if (fy === null) return [0, 0, 0, 0];
            const isCumulative = layer.cumulativeMode !== false;
            if (selectedYear !== null) {
              if (isCumulative && fy > selectedYear) return [0, 0, 0, 0];
              if (!isCumulative && fy !== selectedYear) return [0, 0, 0, 0];
            }
            return colorFn(fy);
          },
          getElevation: 0,
          extruded: false,
          filled: true,
          stroked: false,
          opacity: 1,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 60],
          updateTriggers: { getFillColor: [layer.years, selectedYear, layer.cumulativeMode] },
          // @ts-expect-error deck.gl mapbox overlay supports beforeId
          beforeId: firstSymbolId,
        })
      );
    }
  }

  // Bbox outline (draw preview + committed bbox)
  const previewBbox: [number, number, number, number] | null =
    dragStart && dragCurrent
      ? [
          Math.min(dragStart[1], dragCurrent[1]),
          Math.min(dragStart[0], dragCurrent[0]),
          Math.max(dragStart[1], dragCurrent[1]),
          Math.max(dragStart[0], dragCurrent[0]),
        ]
      : null;
  const displayBbox = previewBbox ?? expBbox;
  if (displayBbox) {
    deckLayers.push(
      new PolygonLayer<{ coords: number[][] }>({
        id: "bbox-outline",
        data: [{ coords: bboxPolygon(displayBbox) }],
        getPolygon: (d) => d.coords,
        getFillColor: [88, 166, 255, 20],
        getLineColor: [88, 166, 255, 220],
        getLineWidth: 2,
        lineWidthUnits: "pixels",
        stroked: true,
        filled: true,
        // @ts-expect-error deck.gl mapbox overlay supports beforeId
        beforeId: firstSymbolId,
      })
    );
  }

  // Selection box pixel size (rough geodetic approximation)
  const metersPerPixel =
    (156543.03392 * Math.cos((viewState.latitude * Math.PI) / 180)) / Math.pow(2, viewState.zoom);
  const side = Math.sqrt(areaSize) * 1000;
  const boxPx = Math.max(side / metersPerPixel, 20);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ cursor: drawMode ? "crosshair" : undefined }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Map
        ref={mapRef}
        reuseMaps
        mapStyle={isDarkMode ? BASEMAP_STYLES.dark : BASEMAP_STYLES.light}
        longitude={viewState.longitude}
        latitude={viewState.latitude}
        zoom={viewState.zoom}
        pitch={viewState.pitch}
        bearing={viewState.bearing}
        onMove={(evt) => handleViewStateChange({ viewState: evt.viewState })}
        onLoad={handleMapLoad}
        scrollZoom={!drawMode}
        dragPan={!drawMode}
        doubleClickZoom={!drawMode}
      >
        <DeckGLOverlay layers={deckLayers} interleaved={true} />
      </Map>

      {/* Imagery selection box + crosshair */}
      {showSelectionBox && (
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-[400] transition-opacity duration-500 ${
            selBoxVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="border-2 border-teal-500/60 bg-teal-500/10 border-dashed relative flex items-center justify-center overflow-hidden"
            style={{ width: `${boxPx}px`, height: `${boxPx}px` }}
          >
            {isGenerating && (
              <div className="absolute inset-0 animate-pulse border-t-2 bg-teal-500/20 border-teal-500" />
            )}
            <div
              className={`absolute inset-0 opacity-30 ${
                band === "NDBI"
                  ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600 via-orange-500/40 to-transparent"
                  : band === "NDVI"
                    ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500 via-green-600/40 to-transparent"
                    : "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-400 via-slate-600/40 to-transparent"
              }`}
            />
          </div>
          <div className="absolute flex items-center justify-center">
            <div className="w-8 h-[2px] bg-teal-500" />
            <div className="h-8 w-[2px] bg-teal-500 absolute" />
            <div className="w-1.5 h-1.5 bg-white rounded-full z-10 shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
          </div>
        </div>
      )}

      {/* Expansion draw hint */}
      {drawMode && dragStart && dragCurrent && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-card text-foreground px-3 py-1 rounded border border-border text-xs pointer-events-none z-[500]">
          Release to query this area
        </div>
      )}
    </div>
  );
}
