import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Satellite, Hexagon, Loader2 } from "lucide-react";
import H3Map from "./expansion/H3Map";
import YearSlider from "./expansion/YearSlider";
import StatsPanel from "./expansion/StatsPanel";
import Legend from "./expansion/Legend";
import {
  fetchDatasets,
  queryMap,
  queryAnalytics,
  fetchYears,
} from "./expansion/lib";
import type { H3Cell, AnalyticsResult, Dataset, BBox } from "./expansion/lib";

const Expansion = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [drawMode, setDrawMode] = useState(false);
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(null);

  const [cells, setCells] = useState<H3Cell[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [yearIdx, setYearIdx] = useState(0);

  const [layerVisible, setLayerVisible] = useState(true);
  const [layerOpacity, setLayerOpacity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datasetsLoading, setDatasetsLoading] = useState(true);
  const [datasetsError, setDatasetsError] = useState<string | null>(null);

  const selectedYear = years[yearIdx] ?? null;

  const maxCellValue =
    cells.length && selectedYear
      ? cells.reduce((max, c) => {
          const v = (c[`built_${selectedYear}_km2`] as number) ?? 0;
          return v > max ? v : max;
        }, 0)
      : 0;

  // Load available datasets on mount
  useEffect(() => {
    setDatasetsLoading(true);
    fetchDatasets()
      .then((ds) => {
        setDatasets(ds);
        if (ds.length > 0) setSelectedSlug(ds[0].slug);
      })
      .catch((e: Error) => setDatasetsError(e.message))
      .finally(() => setDatasetsLoading(false));
  }, []);

  // Pre-fetch years when slug changes
  useEffect(() => {
    if (!selectedSlug) return;
    fetchYears(selectedSlug)
      .then((ys) => {
        setYears(ys);
        setYearIdx(ys.length ? ys.length - 1 : 0);
      })
      .catch(() => {});
  }, [selectedSlug]);

  const runQuery = useCallback(
    async (newBbox: BBox) => {
      if (!selectedSlug) {
        setError("Select a dataset first.");
        return;
      }
      setError(null);
      setLoading(true);
      setBbox([newBbox.minLat, newBbox.minLon, newBbox.maxLat, newBbox.maxLon]);
      try {
        const [mapResult, analyticsResult] = await Promise.all([
          queryMap(selectedSlug, newBbox),
          queryAnalytics(selectedSlug, newBbox),
        ]);
        if (mapResult.status === "empty") {
          setError("No data in this region. Check the dataset AOI.");
          setLoading(false);
          return;
        }
        setCells(mapResult.cells ?? []);
        setYears(mapResult.years ?? []);
        setYearIdx(mapResult.years?.length ? mapResult.years.length - 1 : 0);
        setAnalytics(analyticsResult);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
        setDrawMode(false);
      }
    },
    [selectedSlug]
  );

  const handleClear = () => {
    setCells([]);
    setAnalytics(null);
    setYears([]);
    setBbox(null);
    setError(null);
    setYearIdx(0);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#0d1117] text-slate-200 overflow-hidden font-sans">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 h-13 shrink-0 bg-[#161b22] border-b border-[#30363d]">
        <Link to="/" className="flex items-center gap-2 group" title="Back to home">
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-1.5 rounded-lg text-white">
            <Satellite size={16} />
          </div>
          <span className="font-bold text-sm text-white group-hover:text-teal-300 transition-colors">
            Outsights
          </span>
        </Link>

        <div className="w-px h-5 bg-slate-700" />

        <div className="flex items-center gap-1.5 text-slate-400">
          <Hexagon size={14} className="text-orange-400" />
          <span className="text-xs font-semibold">Urban Expansion · H3 r10</span>
        </div>

        <div className="flex-1" />

        {/* Dataset selector */}
        {datasetsLoading ? (
          <Loader2 size={14} className="animate-spin text-slate-500" />
        ) : datasetsError ? (
          <span className="text-xs text-red-400">{datasetsError}</span>
        ) : datasets.length === 0 ? (
          <span className="text-xs text-slate-500">No datasets available</span>
        ) : (
          <select
            value={selectedSlug}
            onChange={(e) => {
              setSelectedSlug(e.target.value);
              handleClear();
            }}
            className="bg-[#0d1117] border border-[#30363d] text-slate-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-teal-500"
          >
            {datasets.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.display_name}
              </option>
            ))}
          </select>
        )}

        <button
          className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${
            drawMode
              ? "bg-blue-900/50 border-blue-500 text-blue-300"
              : "bg-[#21262d] border-[#30363d] text-slate-300 hover:border-slate-500"
          }`}
          onClick={() => setDrawMode((m) => !m)}
          disabled={!selectedSlug || datasetsLoading}
        >
          {drawMode ? "Cancel draw" : "Draw BBOX"}
        </button>

        <button
          className="px-3 py-1 rounded text-xs font-semibold border border-[#30363d] bg-[#21262d] text-slate-300 hover:border-slate-500 disabled:opacity-40 transition-colors"
          onClick={handleClear}
          disabled={!cells.length && !bbox}
        >
          Clear
        </button>

        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Loader2 size={12} className="animate-spin" />
            Querying…
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 bg-[#161b22] border-r border-[#30363d] p-4 flex flex-col gap-5 overflow-y-auto">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Statistics
            </div>
            <StatsPanel
              analytics={analytics}
              selectedYear={selectedYear}
              loading={loading}
            />
          </div>

          {years.length > 0 && (
            <>
              <div className="h-px bg-[#30363d]" />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
                  Year
                </div>
                <YearSlider years={years} yearIdx={yearIdx} onYearIdx={setYearIdx} />
              </div>
            </>
          )}

          {maxCellValue > 0 && (
            <>
              <div className="h-px bg-[#30363d]" />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
                  Color scale
                </div>
                <Legend maxValue={maxCellValue} />
              </div>
            </>
          )}

          {cells.length > 0 && (
            <>
              <div className="h-px bg-[#30363d]" />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
                  Layer
                </div>
                <button
                  onClick={() => setLayerVisible((v) => !v)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold border transition-colors ${
                    layerVisible
                      ? "bg-[#21262d] border-[#30363d] text-slate-300 hover:border-slate-500"
                      : "bg-slate-900/50 border-[#30363d] text-slate-500 hover:border-slate-500"
                  }`}
                >
                  {layerVisible ? <Eye size={13} /> : <EyeOff size={13} />}
                  {layerVisible ? "Visible" : "Hidden"}
                </button>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-500 shrink-0">Opacity</span>
                  <input
                    type="range"
                    min={0} max={1} step={0.05}
                    value={layerOpacity}
                    onChange={(e) => setLayerOpacity(Number(e.target.value))}
                    className="flex-1 accent-orange-500 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 w-7 text-right shrink-0">
                    {Math.round(layerOpacity * 100)}%
                  </span>
                </div>
              </div>
            </>
          )}

          {drawMode && (
            <>
              <div className="h-px bg-[#30363d]" />
              <p className="text-xs text-blue-400 leading-relaxed">
                Drag on the map to draw your bounding box, then release to query.
              </p>
            </>
          )}
        </aside>

        {/* Map area */}
        <div className="flex-1 relative overflow-hidden">
          <H3Map
            cells={layerVisible ? cells : []}
            opacity={layerOpacity}
            selectedYear={selectedYear}
            bbox={bbox}
            onBboxDrawn={runQuery}
            drawMode={drawMode}
          />

          {error && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-950 text-red-400 px-4 py-2 rounded border border-red-500 text-xs max-w-sm text-center z-10">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Expansion;
