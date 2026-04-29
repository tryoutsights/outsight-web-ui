import { Loader2, Sparkles, X } from "lucide-react";
import type { CityMapResult } from "@/services/agent";

type AgentInsightPanelProps = {
  status: "idle" | "streaming" | "done" | "error";
  insight: string | null;
  mapResults: CityMapResult[] | null;
  currentAction: string | null;
  error: string | null;
  /** Map of layer id ("hyderabad-2025") → visibility flag, owned by parent. */
  layerVisibility: Record<string, boolean>;
  onToggleLayer: (id: string, visible: boolean) => void;
  onClose: () => void;
  isDarkMode: boolean;
};

export const buildLayerId = (citySlug: string, label: string): string =>
  `${citySlug}-${label}`;

const AgentInsightPanel = ({
  status,
  insight,
  mapResults,
  currentAction,
  error,
  layerVisibility,
  onToggleLayer,
  onClose,
  isDarkMode,
}: AgentInsightPanelProps) => {
  if (status === "idle") return null;

  return (
    <div
      className={`absolute right-4 top-4 z-[450] w-80 rounded-lg border shadow-lg backdrop-blur ${
        isDarkMode
          ? "bg-slate-900/85 border-teal-500/30 text-slate-100"
          : "bg-white/95 border-slate-300 text-slate-800"
      }`}
    >
      <div
        className={`flex items-center justify-between px-4 py-2 border-b ${
          isDarkMode ? "border-teal-500/20" : "border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>Agent</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close agent panel"
          className={`rounded p-1 ${
            isDarkMode ? "hover:bg-slate-800" : "hover:bg-slate-100"
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3 max-h-[60vh] overflow-y-auto">
        {status === "streaming" && currentAction && (
          <div
            className={`flex items-center gap-2 text-xs ${
              isDarkMode ? "text-teal-300" : "text-teal-700"
            }`}
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{currentAction}</span>
          </div>
        )}

        {status === "error" && error && (
          <div className="text-xs text-red-400 break-words">{error}</div>
        )}

        {insight && (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{insight}</p>
        )}

        {mapResults && mapResults.length > 0 && (
          <div className="space-y-3 pt-2">
            {mapResults.map((city) => (
              <div key={`${city.country}-${city.city_slug}`}>
                <div
                  className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {city.city_slug} ({city.country.toUpperCase()})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {city.layers.map((layer) => {
                    const id = buildLayerId(city.city_slug, layer.label);
                    const visible = layerVisibility[id] ?? true;
                    return (
                      <button
                        key={id}
                        onClick={() => onToggleLayer(id, !visible)}
                        className={`px-2 py-1 rounded text-xs border transition-opacity ${
                          visible ? "opacity-100" : "opacity-40"
                        } ${
                          isDarkMode
                            ? "border-slate-600 hover:border-teal-400"
                            : "border-slate-300 hover:border-teal-600"
                        }`}
                        style={{
                          background: visible ? layer.color : "transparent",
                          color: visible
                            ? "#fff"
                            : isDarkMode
                              ? "#e2e8f0"
                              : "#334155",
                        }}
                        title={`${layer.polygon_count} polygons (${layer.delivery})`}
                      >
                        {layer.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentInsightPanel;
