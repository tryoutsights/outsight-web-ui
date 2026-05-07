import type { Dispatch, SetStateAction } from "react";
import { Activity, Crosshair, Hexagon, Loader2, Satellite } from "lucide-react";
import StatsPanel from "../../expansion/StatsPanel";
import type { AnalyticsResult, Dataset } from "../../expansion/lib";
import type { LayerDef } from "../layers";

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
}: Props) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-6 bg-background">
      <div className="flex rounded-lg overflow-hidden border border-border bg-card">
        <button
          onClick={() => setMode("imagery")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
            mode === "imagery"
              ? "bg-teal-600 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Satellite size={12} /> Imagery
        </button>
        <button
          onClick={() => setMode("expansion")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${
            mode === "expansion"
              ? "bg-teal-600 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Hexagon size={12} /> Expansion
        </button>
      </div>

      <div>
        <label className="flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider text-muted-foreground">
          <Hexagon size={14} className="text-orange-500" /> Dataset
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
          <Crosshair size={14} className="text-emerald-500" /> Bounding Box
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDrawMode((m) => !m)}
            disabled={!selectedSlug || datasetsLoading}
            className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 ${
              drawMode
                ? "bg-teal-500/10 border-teal-500 text-teal-600 dark:text-teal-400"
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
          <p className="text-[10px] mt-2 leading-relaxed text-teal-600 dark:text-teal-400">
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
          <Activity size={14} className="text-orange-500" /> Statistics
        </label>
        <StatsPanel analytics={expAnalytics} selectedYear={expSelectedYear} loading={expLoading} />
      </div>

      {mapLayers.some((l) => l.kind === "expansion") && (
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Year slider and color scale are in the <strong className="text-foreground">Layers</strong> tab.
        </p>
      )}
    </div>
  );
}
