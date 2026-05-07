import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Activity, Bot, CloudRain, Crosshair, Loader2, Maximize, Play, Send, User } from "lucide-react";
import { COPILOT_THINKING_TEXT } from "../lib";
import type { ChatMessage, Coordinates, SpectralBand } from "../lib";

type Props = {
  coordinates: Coordinates;
  areaSize: number;
  cloudCover: number;
  band: SpectralBand;
  messages: ChatMessage[];
  isLoading: boolean;
  isChatTyping: boolean;
  chatInput: string;
  setChatInput: Dispatch<SetStateAction<string>>;
  onRetrieve: () => void;
  onChatSubmit: (e: FormEvent) => void;
};

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
}: Props) {
  return (
    <div className="flex-1 min-h-0 flex flex-col h-full bg-background">
      <div className="px-4 py-3 border-b border-border bg-card flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider shadow-sm">
        <div
          className="px-2 py-1.5 rounded flex items-center gap-1.5 border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
        >
          <Crosshair size={12} /> {coordinates.lat.toFixed(2)}, {coordinates.lng.toFixed(2)}
        </div>
        <div
          className="px-2 py-1.5 rounded flex items-center gap-1.5 border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
        >
          <Maximize size={12} /> {areaSize}km²
        </div>
        <div
          className="px-2 py-1.5 rounded flex items-center gap-1.5 border bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
        >
          <CloudRain size={12} /> {cloudCover}%
        </div>
        <div
          className="px-2 py-1.5 rounded flex items-center gap-1.5 border bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30"
        >
          <Activity size={12} /> {band}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={`${msg.role}-${idx}`}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-slate-600 to-slate-700 text-white"
                  : "bg-gradient-to-br from-teal-500 to-emerald-600 text-white"
              }`}
            >
              {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div
              className={`p-3 rounded-2xl text-sm max-w-[85%] whitespace-pre-wrap shadow-sm ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-teal-600 to-emerald-600 text-white rounded-tr-none"
                  : "bg-card text-card-foreground border border-border rounded-tl-none"
              }`}
            >
              {msg.role === "bot" && msg.text === COPILOT_THINKING_TEXT ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  {COPILOT_THINKING_TEXT}
                </span>
              ) : (
                <div>{msg.text}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border bg-card flex flex-col gap-3">
        <button
          onClick={onRetrieve}
          disabled={isLoading}
          className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm shadow-lg ${
            isLoading
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white"
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
            className="w-full border border-input bg-background rounded-full py-3 pl-5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
          />
          <button
            type="submit"
            disabled={isChatTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-br from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-full transition-all shadow-md"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
