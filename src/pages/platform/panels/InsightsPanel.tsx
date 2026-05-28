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
          className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm shadow-sm ${
            !hasOverlay
              ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
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
          <div className="flex flex-col items-center justify-center h-full space-y-4 text-primary">
            <Loader2 className="animate-spin" size={28} />
            <p className="animate-pulse font-medium tracking-wide">
              Synthesizing spatial context...
            </p>
          </div>
        ) : insights ? (
          <div className="flex flex-col gap-4">
            <div className="whitespace-pre-wrap p-5 rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
              {insights}
            </div>
            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl border border-border bg-card hover:bg-accent hover:text-accent-foreground text-foreground flex items-center justify-center gap-2 font-semibold transition-colors shadow-sm"
            >
              Export Report
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-center text-muted-foreground">
            <div className="p-4 rounded-full mb-2 bg-muted">
              <Sparkles size={28} className="text-primary opacity-80" />
            </div>
            <p className="max-w-[220px] leading-relaxed">
              Run a Spatial Analysis in the Copilot chat to generate a comprehensive AI report for this region.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
