import type { Dispatch, SetStateAction } from "react";
import { Activity, Crosshair, Hexagon, Loader2, Satellite } from "lucide-react";
import StatsPanel from "../../expansion/StatsPanel";
import YearSlider from "../../expansion/YearSlider";
import Legend from "../../expansion/Legend";
import type { AnalyticsResult, Dataset } from "../../expansion/lib";
import type { LayerDef, LayerKind, LayerPatch } from "../layers";

type Props = {
  mode: "imagery" | "expansion";
  setMode: (mode: "imagery" | "expansion") => void;
  datasets: Dataset[];
  datasetsLoading: boolean;
  datasetsError: string | null;
  selectedSlug: string;
  setSelectedSlug: Dispatch<SetStateAction<string>>;
  onClear: () => void;
  drawMode: boolean;
  setDrawMode: Dispatch<SetStateAction<boolean>>;
  expLoading: boolean;
  expAnalytics: AnalyticsResult | null;
  expSelectedYear: number | undefined;
  mapLayers: LayerDef[];
  hasCellsOrBbox: boolean;
  updateLayer: <K extends LayerKind>(id: string, kind: K, update: LayerPatch<K>) => void;
};

export default function ExpansionControlsPanel({
  mode,
  setMode,
  datasets,
  datasetsLoading,
  datasetsError,
  selectedSlug,
  setSelectedSlug,
  onClear,
  drawMode,
  setDrawMode,
  expLoading,
  expAnalytics,
  expSelectedYear,
  mapLayers,
  hasCellsOrBbox,
  updateLayer,
}: Props) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-6 bg-background">
      <div className="flex rounded-lg overflow-hidden border border-border bg-card">
        <button
          onClick={() => setMode("imagery")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
            mode === "imagery"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Satellite size={12} /> Satellite Imagery
        </button>
        <button
          onClick={() => setMode("expansion")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
            mode === "expansion"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Hexagon size={12} /> Urban Expansion
        </button>
      </div>

      <div>
        <label className="flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider text-muted-foreground">
          <Hexagon size={14} className="text-primary" /> Dataset
        </label>
        {datasetsLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Loading datasets…
          </div>
        ) : datasetsError ? (
          <div className="text-xs text-red-500">{datasetsError}</div>
        ) : datasets.length === 0 ? (
          <div className="text-xs text-muted-foreground">No datasets found</div>
        ) : (
          <select
            value={selectedSlug}
            onChange={(e) => {
              setSelectedSlug(e.target.value);
              onClear();
            }}
            className="w-full border border-input bg-background rounded-lg p-3 text-sm text-foreground"
          >
            {datasets.map((d) => (
              <option key={d.slug} value={d.slug}>{d.display_name}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider text-muted-foreground">
          <Crosshair size={14} className="text-primary" /> Bounding Box
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDrawMode((m) => !m)}
            disabled={!selectedSlug || datasetsLoading}
            className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 ${
              drawMode
                ? "bg-primary/10 border-primary text-primary"
                : "bg-card border-border text-card-foreground hover:bg-accent"
            }`}
          >
            {drawMode ? "Cancel Draw" : "Draw BBOX"}
          </button>
          <button
            onClick={onClear}
            disabled={!hasCellsOrBbox}
            className="px-3 py-2.5 rounded-lg text-xs font-semibold border border-border bg-card text-card-foreground transition-colors hover:bg-accent disabled:opacity-40"
          >
            Clear
          </button>
        </div>
        {drawMode && (
          <p className="text-[10px] mt-2 leading-relaxed text-primary">
            Drag on the map to draw a bounding box, then release to query.
          </p>
        )}
        {expLoading && (
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
            <Loader2 size={12} className="animate-spin" /> Querying…
          </div>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider text-muted-foreground">
          <Activity size={14} className="text-primary" /> Statistics
        </label>
        <StatsPanel analytics={expAnalytics} selectedYear={expSelectedYear} loading={expLoading} />
      </div>

      {(() => {
        const expansionLayer = mapLayers.find((l) => l.kind === "expansion");
        if (expansionLayer && expansionLayer.kind === "expansion" && expansionLayer.years.length > 0) {
          return (
            <div className="flex flex-col gap-3 mt-2 border-t border-border pt-4">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Activity size={14} className="text-primary" /> Timeline & Legend
              </label>
              <div className="flex bg-card border border-border rounded-lg overflow-hidden text-xs font-semibold mb-2">
                <button
                  className={`flex-1 py-1.5 transition-colors ${
                    expansionLayer.cumulativeMode !== false
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                  onClick={() =>
                    updateLayer(expansionLayer.id, expansionLayer.kind, { cumulativeMode: true })
                  }
                >
                  Cumulative Growth
                </button>
                <button
                  className={`flex-1 py-1.5 transition-colors ${
                    expansionLayer.cumulativeMode === false
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                  onClick={() =>
                    updateLayer(expansionLayer.id, expansionLayer.kind, { cumulativeMode: false })
                  }
                >
                  Single Year
                </button>
              </div>
              <YearSlider
                years={expansionLayer.years}
                yearIdx={expansionLayer.selectedYearIdx}
                onYearIdx={(idx) =>
                  updateLayer(expansionLayer.id, expansionLayer.kind, {
                    selectedYearIdx:
                      typeof idx === "function" ? idx(expansionLayer.selectedYearIdx) : idx,
                  })
                }
              />
              <Legend years={expansionLayer.years} />
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}
