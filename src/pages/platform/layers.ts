import { useCallback, useState } from "react";
import type { H3Cell } from "../expansion/lib";
import type { SpectralBand } from "./lib";

// ---------------------------------------------------------------------------
// Layer type definitions
// ---------------------------------------------------------------------------

export type ImageryLayerDef = {
  kind: "imagery";
  id: string;
  label: string;
  visible: boolean;
  url: string;
  bbox: [number, number, number, number];
  opacity: number;
  band: SpectralBand;
};

export type ExpansionLayerDef = {
  kind: "expansion";
  id: string;
  label: string;
  visible: boolean;
  cells: H3Cell[];
  years: number[];
  selectedYearIdx: number;
  bbox: [number, number, number, number] | null;
  cumulativeMode?: boolean;
};

export type LayerDef = ImageryLayerDef | ExpansionLayerDef;
export type LayerKind = LayerDef["kind"];
export type LayerPatch<K extends LayerKind> = Partial<
  Omit<Extract<LayerDef, { kind: K }>, "kind" | "id">
>;

// ---------------------------------------------------------------------------
// useLayerManager hook
// ---------------------------------------------------------------------------

export function useLayerManager() {
  const [layers, setLayers] = useState<LayerDef[]>([]);

  /** Add or replace a layer by id. */
  const addLayer = useCallback((layer: LayerDef) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === layer.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = layer;
        return next;
      }
      return [...prev, layer];
    });
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  }, []);

  /** Kind-aware partial update — preserves `kind` and `id`. */
  const updateLayer = useCallback(
    <K extends LayerKind>(id: string, kind: K, update: LayerPatch<K>) => {
      setLayers((prev) =>
        prev.map((l) =>
          l.id === id && l.kind === kind ? ({ ...l, ...update } as LayerDef) : l
        )
      );
    },
    []
  );

  const clearLayers = useCallback(() => setLayers([]), []);

  return { layers, addLayer, removeLayer, toggleLayer, updateLayer, clearLayers };
}
