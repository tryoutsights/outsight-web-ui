import type { AnalyticsResult } from "./lib";

type Props = {
  analytics: AnalyticsResult | null;
  selectedYear: number | null;
  loading: boolean;
  isDark?: boolean;
};

export default function StatsPanel({ analytics, selectedYear, loading, isDark = true }: Props) {
  const subtleText = isDark ? "text-slate-400" : "text-slate-500";
  const labelText = isDark ? "text-slate-500" : "text-slate-500";
  const primaryText = isDark ? "text-slate-100" : "text-slate-900";
  const secondaryText = isDark ? "text-slate-200" : "text-slate-700";
  const trackBg = isDark ? "bg-slate-800" : "bg-slate-200";

  if (loading) {
    return <p className={`text-xs leading-relaxed ${subtleText}`}>Querying…</p>;
  }
  if (!analytics) {
    return (
      <p className={`text-xs leading-relaxed ${subtleText}`}>
        Draw a bounding box on the map to load data.
      </p>
    );
  }

  const { per_year, net_expansion_km2, growth_pct, cell_count, first_year, last_year } = analytics;
  const yearData = per_year?.[String(selectedYear)];
  const maxBuilt = Math.max(
    ...Object.values(per_year).map((d) => d.total_built_km2),
    1e-9
  );
  const barPct = ((yearData?.total_built_km2 ?? 0) / maxBuilt) * 100;

  return (
    <div className="flex flex-col gap-4">
      {/* Built-up area */}
      <div className="flex flex-col gap-1">
        <div className={`text-[10px] font-semibold uppercase tracking-widest ${labelText}`}>
          Built-up area
        </div>
        <div className={`text-2xl font-bold leading-none ${primaryText}`}>
          {yearData?.total_built_km2?.toFixed(2) ?? "—"}
          <span className={`text-sm font-normal ml-1 ${labelText}`}>km²</span>
        </div>
        <div className={`h-0.5 rounded-full overflow-hidden mt-1 ${trackBg}`}>
          <div
            className="h-full bg-orange-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(barPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Net growth + growth % */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <div className={`text-[10px] font-semibold uppercase tracking-widest ${labelText}`}>
            Net growth
          </div>
          <div className="text-lg font-bold text-orange-500 leading-none">
            +{net_expansion_km2?.toFixed(2) ?? "—"}
            <span className={`text-xs font-normal ml-1 ${labelText}`}>km²</span>
          </div>
          <div className={`text-[10px] ${labelText}`}>
            {first_year} → {last_year}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className={`text-[10px] font-semibold uppercase tracking-widest ${labelText}`}>
            Growth
          </div>
          <div className="text-lg font-bold text-orange-500 leading-none">
            {growth_pct != null ? `+${growth_pct}%` : "—"}
          </div>
          <div className={`text-[10px] ${labelText}`}>vs. {first_year}</div>
        </div>
      </div>

      {/* Cell count */}
      <div className="flex flex-col gap-1">
        <div className={`text-[10px] font-semibold uppercase tracking-widest ${labelText}`}>
          Cells in query
        </div>
        <div className={`text-base font-semibold leading-none ${secondaryText}`}>
          {cell_count?.toLocaleString() ?? "—"}
          <span className={`text-xs font-normal ml-1 ${labelText}`}>H3 r10</span>
        </div>
      </div>
    </div>
  );
}
