import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Activity, Bot, CloudRain, Crosshair, Loader2, Maximize, Play, Send, User, Sparkles, Map } from "lucide-react";
import type { Coordinates, SpectralBand } from "../lib";
import type { UIMessage } from "ai";
import { isToolUIPart, getToolName } from "ai";

type Props = {
  coordinates: Coordinates;
  areaSize: number;
  cloudCover: number;
  band: SpectralBand;
  messages: UIMessage[];
  isLoading: boolean;
  isChatTyping: boolean;
  chatInput: string;
  setChatInput: Dispatch<SetStateAction<string>>;
  onRetrieve: () => void;
  onChatSubmit: (e: FormEvent) => void;
  onPromptClick: (text: string) => void;
};

type MapUpdateInput = {
  lat?: number;
  lng?: number;
  cloudCover?: number;
  areaSize?: number;
  zoom?: number;
  band?: string;
  mode?: string;
  startDate?: string;
  endDate?: string;
};

function describeMapUpdate(args: MapUpdateInput | undefined): string[] {
  const lines: string[] = [];
  if (args === undefined) return ["Adjusting view options..."];
  if (typeof args.lat === "number" && typeof args.lng === "number") {
    lines.push(`Coordinates: ${args.lat.toFixed(2)}, ${args.lng.toFixed(2)}`);
  }
  if (typeof args.cloudCover === "number") {
    lines.push(`Cloud cover: ${Math.round(args.cloudCover)}%`);
  }
  if (typeof args.areaSize === "number") {
    lines.push(`Area size: ${args.areaSize} km²`);
  }
  if (typeof args.zoom === "number") {
    lines.push(`Zoom: ${args.zoom}`);
  }
  if (args.band) {
    lines.push(`Band: ${args.band}`);
  }
  if (args.mode) {
    lines.push(`Mode: ${args.mode}`);
  }
  if (args.startDate || args.endDate) {
    lines.push(`Dates: ${args.startDate ?? "?"} → ${args.endDate ?? "?"}`);
  }
  return lines.length ? lines : ["Adjusting view options..."];
}

export default function ChatPanel({
  coordinates,
  areaSize,
  cloudCover,
  band,
  messages,
  isLoading,
  isChatTyping,
  chatInput,
  setChatInput,
  onRetrieve,
  onChatSubmit,
  onPromptClick,
}: Props) {
  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-background">
      <div className="px-4 py-3 border-b border-border bg-card flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider shadow-sm">
        <div
          className="px-2 py-1.5 rounded flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20"
        >
          <Crosshair size={12} /> {coordinates.lat.toFixed(2)}, {coordinates.lng.toFixed(2)}
        </div>
        <div
          className="px-2 py-1.5 rounded flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20"
        >
          <Maximize size={12} /> {areaSize}km²
        </div>
        <div
          className="px-2 py-1.5 rounded flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20"
        >
          <CloudRain size={12} /> {cloudCover}%
        </div>
        <div
          className="px-2 py-1.5 rounded flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20"
        >
          <Activity size={12} /> {band}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 text-muted-foreground px-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 shadow-sm border border-primary/20">
              <Sparkles className="text-primary" size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground">Spatial Copilot</h3>
              <p className="text-sm max-w-[200px]">Ask me to move the map, change parameters, or analyze an area.</p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center w-full max-w-[280px]">
              {[
                { label: "Compare Austin vs. Dallas", icon: <Map size={12} /> },
                { label: "Find growth in Nashik", icon: <Map size={12} /> },
                { label: "Show recent expansions", icon: <Activity size={12} /> }
              ].map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => onPromptClick(chip.label)}
                  className="text-xs px-3 py-2 bg-card hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30 rounded-full transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {chip.icon} {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                msg.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className="flex flex-col gap-2 max-w-[85%]">
              {/* Render each part of the UIMessage */}
              {msg.parts.map((part, i) => {
                // Text parts
                if (part.type === "text" && part.text) {
                  return (
                    <div
                      key={`${msg.id}-text-${i}`}
                      className={`p-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-card text-card-foreground border border-border rounded-tl-none"
                      }`}
                    >
                      {part.text}
                    </div>
                  );
                }

                if (isToolUIPart(part)) {
                  const toolName = getToolName(part);
                  const toolArgs = part.input as MapUpdateInput | undefined;
                  const state = part.state;

                  if (toolName === "update_map_parameters") {
                    return (
                      <div key={`${msg.id}-tool-${i}`} className="text-xs p-3 rounded-xl border border-border bg-muted/30 shadow-sm flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <Crosshair size={14} className="text-primary" />
                          Updating map parameters
                        </div>
                        <div className="text-muted-foreground flex flex-col gap-0.5">
                          {describeMapUpdate(toolArgs).map((line, j) => (
                            <span key={j}>{line}</span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  if (toolName === "trigger_analysis") {
                    return (
                      <div key={`${msg.id}-tool-${i}`} className="text-xs p-3 rounded-xl border border-border bg-muted/30 shadow-sm flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <Play size={14} className="text-primary" />
                          Triggering Spatial Analysis
                        </div>
                        <div className="text-muted-foreground">
                          Retrieving satellite imagery for current view...
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={`${msg.id}-tool-${i}`} className="text-xs p-3 rounded-xl border border-border bg-muted/30 shadow-sm">
                      <span className="font-medium">{toolName}</span>: {state}
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border bg-card flex flex-col gap-3">
        <button
          onClick={onRetrieve}
          disabled={isLoading}
          className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm shadow-sm ${
            isLoading
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
        >
          {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} fill="currentColor" />}
          {isLoading ? "Processing Analysis..." : "Run Spatial Analysis"}
        </button>
        <form onSubmit={onChatSubmit} className="relative">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isChatTyping}
            placeholder="Tell AI what to map..."
            className="w-full border border-input bg-background rounded-full py-3 pl-5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <button
            type="submit"
            disabled={isChatTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-full transition-all shadow-sm"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
