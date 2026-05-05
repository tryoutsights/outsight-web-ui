import { useRef, useState, useCallback, useMemo } from "react";
import DeckGL from "@deck.gl/react";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { PolygonLayer } from "@deck.gl/layers";
import type { PickingInfo } from "@deck.gl/core";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapRef } from "react-map-gl/maplibre";
import { makeColorScale } from "./lib";
import type { H3Cell, BBox } from "./lib";

const CARTO_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const INITIAL_VIEW = {
  longitude: 77.1,
  latitude: 28.6,
  zoom: 9,
  pitch: 0,
  bearing: 0,
};

function bboxPolygon([minLat, minLon, maxLat, maxLon]: [number, number, number, number]) {
  return [
    [minLon, minLat],
    [maxLon, minLat],
    [maxLon, maxLat],
    [minLon, maxLat],
    [minLon, minLat],
  ];
}

type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

type Props = {
  cells: H3Cell[];
  selectedYear: number | null;
  bbox: [number, number, number, number] | null;
  onBboxDrawn: (bbox: BBox) => void;
  drawMode: boolean;
  opacity?: number;
};

export default function H3Map({ cells, selectedYear, bbox, onBboxDrawn, drawMode, opacity = 1 }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW);
  const [dragStart, setDragStart] = useState<[number, number] | null>(null);
  const [dragCurrent, setDragCurrent] = useState<[number, number] | null>(null);

  const maxValue = useMemo(() => {
    if (!cells?.length || !selectedYear) return 0;
    const col = `built_${selectedYear}_km2`;
    return cells.reduce((max, c) => {
      const v = (c[col] as number) ?? 0;
      return v > max ? v : max;
    }, 0);
  }, [cells, selectedYear]);

  const colorFn = useMemo(() => makeColorScale(maxValue), [maxValue]);

  const layers = useMemo(() => {
    const result: (H3HexagonLayer<H3Cell> | PolygonLayer<{ coords: number[][] }>)[] = [];

    if (cells?.length && selectedYear) {
      result.push(
        new H3HexagonLayer<H3Cell>({
          id: "h3-urban",
          data: cells,
          getHexagon: (d) => d.h3_id as string,
          getFillColor: (d) => colorFn((d[`built_${selectedYear}_km2`] as number) ?? 0),
          getElevation: 0,
          extruded: false,
          filled: true,
          stroked: false,
          opacity,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 60],
          updateTriggers: { getFillColor: [selectedYear, maxValue] },
        })
      );
    }

    const previewBbox: [number, number, number, number] | null =
      dragStart && dragCurrent
        ? [
            Math.min(dragStart[1], dragCurrent[1]),
            Math.min(dragStart[0], dragCurrent[0]),
            Math.max(dragStart[1], dragCurrent[1]),
            Math.max(dragStart[0], dragCurrent[0]),
          ]
        : null;

    const displayBbox = previewBbox ?? bbox;
    if (displayBbox) {
      result.push(
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
        })
      );
    }

    return result;
  }, [cells, selectedYear, colorFn, maxValue, bbox, dragStart, dragCurrent]);

  const getTooltip = useCallback(
    ({ object }: PickingInfo<H3Cell>) => {
      if (!object || !selectedYear) return null;
      const col = `built_${selectedYear}_km2`;
      const built = object[col] as number;
      const area = object.cell_area_km2;
      return {
        html: `
          <div style="background:#161b22;color:#e6edf3;padding:8px 10px;border-radius:6px;font-size:12px;border:1px solid #30363d;line-height:1.6;">
            <div style="font-weight:600;margin-bottom:4px;">${(object.h3_id as string).slice(0, 12)}…</div>
            <div>Built (${selectedYear}): <b>${built != null ? built.toFixed(5) : "—"} km²</b></div>
            <div style="color:#8b949e;">Cell area: ${area?.toFixed(5)} km²</div>
          </div>
        `,
      };
    },
    [selectedYear]
  );

  const screenToLatLon = useCallback((x: number, y: number): [number, number] | null => {
    const map = mapRef.current?.getMap();
    if (!map) return null;
    const el = map.getCanvas();
    const rect = el.getBoundingClientRect();
    const ll = map.unproject([x - rect.left, y - rect.top]);
    return [ll.lng, ll.lat];
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!drawMode) return;
      const ll = screenToLatLon(e.clientX, e.clientY);
      if (ll) { setDragStart(ll); setDragCurrent(ll); }
    },
    [drawMode, screenToLatLon]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawMode || !dragStart) return;
      const ll = screenToLatLon(e.clientX, e.clientY);
      if (ll) setDragCurrent(ll);
    },
    [drawMode, dragStart, screenToLatLon]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!drawMode || !dragStart) return;
      const ll = screenToLatLon(e.clientX, e.clientY);
      if (ll) {
        const [lng1, lat1] = dragStart;
        const [lng2, lat2] = ll;
        const minLat = Math.min(lat1, lat2);
        const maxLat = Math.max(lat1, lat2);
        const minLon = Math.min(lng1, lng2);
        const maxLon = Math.max(lng1, lng2);
        if (Math.abs(maxLat - minLat) > 0.001 && Math.abs(maxLon - minLon) > 0.001) {
          onBboxDrawn({ minLat, minLon, maxLat, maxLon });
        }
      }
      setDragStart(null);
      setDragCurrent(null);
    },
    [drawMode, dragStart, screenToLatLon, onBboxDrawn]
  );

  return (
    <div
      className="relative w-full h-full"
      style={{ cursor: drawMode ? "crosshair" : "grab" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <DeckGL
        viewState={viewState}
        controller={drawMode ? false : { dragPan: true, scrollZoom: true, doubleClickZoom: true }}
        layers={layers}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as ViewState)}
        getTooltip={getTooltip}
        style={{ position: "absolute", inset: 0 }}
      >
        <Map ref={mapRef} mapStyle={CARTO_DARK} reuseMaps />
      </DeckGL>

      {drawMode && dragStart && dragCurrent && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-blue-950 text-blue-400 px-3 py-1 rounded border border-blue-400 text-xs pointer-events-none">
          Release to query this area
        </div>
      )}
    </div>
  );
}
