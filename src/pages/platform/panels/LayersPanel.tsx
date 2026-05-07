import { Eye, EyeOff, Hexagon, Layers, Satellite, X } from "lucide-react";
import Legend from "../../expansion/Legend";
import YearSlider from "../../expansion/YearSlider";
import type { LayerDef, LayerKind, LayerPatch } from "../layers";

type Props = {
  mapLayers: LayerDef[];
  toggleLayer: (id: string) => void;
  removeLayer: (id: string) => void;
  updateLayer: <K extends LayerKind>(
    id: string,
    kind: K,
    update: LayerPatch<K>
  ) => void;
};

export default function LayersPanel({
  mapLayers,
  toggleLayer,
  removeLayer,
  updateLayer,
}: Props) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3 bg-background">
      {mapLayers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-muted-foreground">
          <div className="p-4 rounded-full bg-muted">
            <Layers size={28} className="text-teal-400 opacity-70" />
          </div>
          <p className="text-xs max-w-[200px] leading-relaxed">
            No layers yet. Run Spatial Analysis or query Urban Expansion to add layers.
          </p>
        </div>
      ) : (
        mapLayers.map((layer) => (
          <div
            key={layer.id}
            className={`rounded-xl border p-3 flex flex-col gap-3 transition-colors ${
              "border-border bg-card"
            } ${!layer.visible ? "opacity-50" : ""}`}
          >
            <div className="flex items-center gap-2">
              {layer.kind === "imagery" ? (
                <Satellite size={13} className="text-teal-400 shrink-0" />
              ) : (
                <Hexagon size={13} className="text-orange-400 shrink-0" />
              )}
              <span
                className="text-xs flex-1 truncate font-medium text-card-foreground"
              >
                {layer.label}
              </span>
              <button
                onClick={() => toggleLayer(layer.id)}
                className="p-1 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                title={layer.visible ? "Hide layer" : "Show layer"}
              >
                {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              <button
                onClick={() => removeLayer(layer.id)}
                className="p-1 rounded transition-colors text-muted-foreground hover:text-red-500 hover:bg-accent"
                title="Remove layer"
              >
                <X size={13} />
              </button>
            </div>

            {layer.kind === "imagery" && (
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] shrink-0 text-muted-foreground"
                >
                  Opacity
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={layer.opacity}
                  onChange={(e) =>
                    updateLayer(layer.id, layer.kind, {
                      opacity: Number(e.target.value),
                    })
                  }
                  className="flex-1 accent-teal-500 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <span
                  className="text-[10px] w-7 text-right shrink-0 text-muted-foreground"
                >
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            )}

            {layer.kind === "expansion" && layer.years.length > 0 && (
              <div className="flex flex-col gap-2">
                <YearSlider
                  years={layer.years}
                  yearIdx={layer.selectedYearIdx}
                  onYearIdx={(idx) =>
                    updateLayer(layer.id, layer.kind, {
                      selectedYearIdx:
                        typeof idx === "function" ? idx(layer.selectedYearIdx) : idx,
                    })
                  }
                />
                {(() => {
                  const yr = layer.years[layer.selectedYearIdx] ?? null;
                  const maxVal = yr
                    ? layer.cells.reduce(
                        (m, c) => Math.max(m, (c[`built_${yr}_km2`] as number) ?? 0),
                        0
                      )
                    : 0;
                  return maxVal > 0 ? <Legend maxValue={maxVal} /> : null;
                })()}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
