import type { Dispatch, SetStateAction } from "react";
import { Activity, CloudRain, Crosshair, Hexagon, Loader2, Maximize, Play, Satellite } from "lucide-react";
import { AREA_SIZE_OPTIONS } from "../lib";
import type { Coordinates, DateRange, SpectralBand } from "../lib";

type Props = {
  mode: "imagery" | "expansion";
  setMode: (mode: "imagery" | "expansion") => void;
  coordinates: Coordinates;
  setCoordinates: Dispatch<SetStateAction<Coordinates>>;
  dateRange: DateRange;
  setDateRange: Dispatch<SetStateAction<DateRange>>;
  areaSize: number;
  setAreaSize: Dispatch<SetStateAction<number>>;
  cloudCover: number;
  setCloudCover: Dispatch<SetStateAction<number>>;
  band: SpectralBand;
  setBand: Dispatch<SetStateAction<SpectralBand>>;
  isLoading: boolean;
  onRetrieve: () => void;
};

export default function ImageryControlsPanel({
  mode,
  setMode,
  coordinates,
  setCoordinates,
  dateRange,
  setDateRange,
  areaSize,
  setAreaSize,
  cloudCover,
  setCloudCover,
  band,
  setBand,
  isLoading,
  onRetrieve,
}: Props) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-6 bg-background">
      <div className="flex rounded-lg overflow-hidden border border-border bg-card">
        <button
          onClick={() => setMode("imagery")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold ${
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
          <Crosshair size={14} className="text-emerald-500" /> Center Coordinates
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={coordinates.lat}
            onChange={(e) => setCoordinates((prev) => ({ ...prev, lat: Number(e.target.value) }))}
            className="w-1/2 border border-input bg-background rounded-lg p-2.5 text-sm text-foreground"
          />
          <input
            type="number"
            value={coordinates.lng}
            onChange={(e) => setCoordinates((prev) => ({ ...prev, lng: Number(e.target.value) }))}
            className="w-1/2 border border-input bg-background rounded-lg p-2.5 text-sm text-foreground"
          />
        </div>
        <p className="text-[10px] mt-1.5 text-right font-medium text-muted-foreground">
          Drag map or edit values
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Start Date
          </label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
            className="mt-2 w-full border border-input bg-background rounded-lg p-2.5 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            End Date
          </label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
            className="mt-2 w-full border border-input bg-background rounded-lg p-2.5 text-sm text-foreground"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Maximize size={14} className="text-amber-500" /> Area Extent
          </label>
          <span className="text-xs font-bold px-2.5 py-1 rounded-md border text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30">
            {areaSize} km²
          </span>
        </div>
        <select
          value={String(areaSize)}
          onChange={(e) => setAreaSize(parseInt(e.target.value, 10))}
          className="w-full border border-input bg-background rounded-lg p-3 text-sm text-foreground"
        >
          {AREA_SIZE_OPTIONS.map((opt) => {
            const label =
              opt === 1 ? "1x1 km" : opt === 4 ? "2x2 km" : opt === 25 ? "5x5 km" : "10x10 km";
            return (
              <option key={opt} value={opt}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <CloudRain size={14} className="text-sky-500" /> Max Cloud Cover
          </label>
          <span className="text-xs font-bold px-2.5 py-1 rounded-md border text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30">
            {cloudCover}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={cloudCover}
          onChange={(e) => setCloudCover(parseInt(e.target.value, 10))}
          className="w-full accent-sky-500 h-1.5 rounded-lg appearance-none cursor-pointer bg-muted"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider text-muted-foreground">
          <Activity size={14} className="text-fuchsia-500" /> Spectral Band
        </label>
        <select
          value={band}
          onChange={(e) => setBand(e.target.value as SpectralBand)}
          className="w-full border border-input bg-background rounded-lg p-3 text-sm text-foreground"
        >
          <option value="NDBI">NDBI (Built-up Index)</option>
          <option value="NDVI">NDVI (Vegetation Index)</option>
          <option value="TrueColor">True Color (RGB)</option>
        </select>
      </div>

      <button
        onClick={onRetrieve}
        disabled={isLoading}
        className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md ${
          isLoading
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-card hover:bg-accent text-card-foreground border border-border"
        }`}
      >
        {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} className="text-teal-500" />}
        {isLoading ? "Processing..." : "Manual Execute"}
      </button>
    </div>
  );
}
