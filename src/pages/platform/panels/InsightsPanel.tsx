import { Loader2, Sparkles } from "lucide-react";

type Props = {
  hasOverlay: boolean;
  isGeneratingInsights: boolean;
  insights: string;
  onGenerateInsights: () => void;
};

export default function InsightsPanel({
  hasOverlay,
  isGeneratingInsights,
  insights,
  onGenerateInsights,
}: Props) {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background">
      <div className="p-5 border-b border-border bg-card">
        <button
          onClick={onGenerateInsights}
          disabled={!hasOverlay || isGeneratingInsights}
          className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm shadow-md ${
            !hasOverlay
              ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
              : "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)]"
          }`}
        >
          {isGeneratingInsights ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Sparkles size={18} />
          )}
          {isGeneratingInsights ? "Analyzing Region..." : "Generate AI Report"}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-6 text-sm leading-relaxed">
        {isGeneratingInsights ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-teal-600 dark:text-teal-400">
            <Loader2 className="animate-spin" size={28} />
            <p className="animate-pulse font-medium tracking-wide">
              Synthesizing spatial context...
            </p>
          </div>
        ) : insights ? (
          <div className="whitespace-pre-wrap p-5 rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
            {insights}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-center text-muted-foreground">
            <div className="p-4 rounded-full mb-2 bg-muted">
              <Sparkles size={28} className="text-teal-400 opacity-80" />
            </div>
            <p className="max-w-[200px] leading-relaxed">
              Awaiting map data to generate detailed report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
