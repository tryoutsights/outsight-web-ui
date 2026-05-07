import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import {
  COPILOT_THINKING_TEXT,
  DEFAULT_COPILOT_REPLY,
  clamp,
  nearestAreaOption,
  parseFallbackExtraction,
} from "../lib";
import type {
  ChatMessage,
  CopilotExtraction,
  Coordinates,
  DateRange,
  SpectralBand,
} from "../lib";

type Args = {
  mode: "imagery" | "expansion";
  setMode: React.Dispatch<React.SetStateAction<"imagery" | "expansion">>;
  setActiveTab: React.Dispatch<React.SetStateAction<"chat" | "controls" | "insights" | "layers">>;
  coordinates: Coordinates;
  setCoordinates: React.Dispatch<React.SetStateAction<Coordinates>>;
  cloudCover: number;
  setCloudCover: React.Dispatch<React.SetStateAction<number>>;
  areaSize: number;
  setAreaSize: React.Dispatch<React.SetStateAction<number>>;
  band: SpectralBand;
  setBand: React.Dispatch<React.SetStateAction<SpectralBand>>;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  dateRange: DateRange;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
  requestSignIn: (message?: string) => void;
  handleRetrieve: (
    overrides?: {
      lat?: number;
      lon?: number;
      startDate?: string;
      endDate?: string;
      areaSize?: number;
      maxCloudCover?: number;
    },
    onMessage?: (text: string) => void
  ) => void;
};

const INITIAL_MESSAGE: ChatMessage = {
  role: "bot",
  text: "Spatial Copilot is ready. Adjust controls, then run spatial analysis to query imagery.",
};

export function useCopilotChat({
  mode,
  setMode,
  setActiveTab,
  coordinates,
  setCoordinates,
  cloudCover,
  setCloudCover,
  areaSize,
  setAreaSize,
  band,
  setBand,
  zoom,
  setZoom,
  dateRange,
  setDateRange,
  requestSignIn,
  handleRetrieve,
}: Args) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);

  const setLatestThinkingMessage = (botText: string) => {
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i].role === "bot" && next[i].text === COPILOT_THINKING_TEXT) {
          next[i] = { role: "bot", text: botText };
          return next;
        }
      }
      return [...next, { role: "bot", text: botText }];
    });
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatTyping) return;
    const text = chatInput.trim();

    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "bot", text: COPILOT_THINKING_TEXT },
    ]);
    setChatInput("");
    setIsChatTyping(true);

    const applyExtraction = (parsed: CopilotExtraction): string => {
      const updates: string[] = [];

      if (parsed.intent === "expansion") {
        setMode("expansion");
        setActiveTab("controls");
        updates.push("switched to Urban Expansion mode");
      } else if (parsed.intent === "imagery") {
        setMode("imagery");
        updates.push("switched to Imagery mode");
      }
      const nextLat =
        parsed.updatedCoordinates && Number.isFinite(parsed.updatedCoordinates.lat)
          ? clamp(parsed.updatedCoordinates.lat, -90, 90)
          : coordinates.lat;
      const nextLng =
        parsed.updatedCoordinates && Number.isFinite(parsed.updatedCoordinates.lng)
          ? clamp(parsed.updatedCoordinates.lng, -180, 180)
          : coordinates.lng;
      if (nextLat !== coordinates.lat || nextLng !== coordinates.lng) {
        setCoordinates({ lat: nextLat, lng: nextLng });
        updates.push(`coordinates -> ${nextLat.toFixed(4)}, ${nextLng.toFixed(4)}`);
      }

      const nextCloud =
        parsed.updatedCloudCover !== null && Number.isFinite(parsed.updatedCloudCover)
          ? clamp(Math.round(parsed.updatedCloudCover), 0, 100)
          : cloudCover;
      if (nextCloud !== cloudCover) {
        setCloudCover(nextCloud);
        updates.push(`cloud cover -> ${nextCloud}%`);
      }

      const nextArea =
        parsed.updatedAreaSize !== null && Number.isFinite(parsed.updatedAreaSize)
          ? nearestAreaOption(parsed.updatedAreaSize)
          : areaSize;
      if (nextArea !== areaSize) {
        setAreaSize(nextArea);
        updates.push(`area extent -> ${nextArea} km²`);
      }

      if (parsed.updatedBand && parsed.updatedBand !== band) {
        setBand(parsed.updatedBand);
        updates.push(`band -> ${parsed.updatedBand}`);
      }

      const nextZoom =
        parsed.updatedZoom !== null && Number.isFinite(parsed.updatedZoom)
          ? clamp(Math.round(parsed.updatedZoom), 2, 19)
          : zoom;
      if (nextZoom !== zoom) {
        setZoom(nextZoom);
        updates.push(`zoom -> ${nextZoom}`);
      }

      const nextStartDate = parsed.updatedDateRange?.startDate ?? dateRange.startDate;
      const nextEndDate = parsed.updatedDateRange?.endDate ?? dateRange.endDate;
      if (parsed.updatedDateRange?.startDate && parsed.updatedDateRange?.endDate) {
        setDateRange({ startDate: nextStartDate, endDate: nextEndDate });
        updates.push(`date range -> ${nextStartDate} to ${nextEndDate}`);
      }

      if (parsed.triggerRun && parsed.intent !== "expansion") {
        handleRetrieve(
          {
            lat: nextLat,
            lon: nextLng,
            startDate: nextStartDate,
            endDate: nextEndDate,
            areaSize: nextArea,
            maxCloudCover: nextCloud,
          },
          (message) => setMessages((prev) => [...prev, { role: "bot", text: message }])
        );
        updates.push("started spatial retrieval");
      }

      return (
        parsed.replyText?.trim() ||
        (updates.length > 0 ? `Applied: ${updates.join("; ")}.` : DEFAULT_COPILOT_REPLY)
      );
    };

    try {
      try {
        const response = await apiFetch(`/api/copilot/extract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            current_coordinates: coordinates,
            current_cloud_cover: cloudCover,
            current_area_size: areaSize,
            current_band: band,
            current_zoom: zoom,
            current_date_range: dateRange,
            current_mode: mode,
          }),
        });

        if (response.ok) {
          const parsed = (await response.json()) as CopilotExtraction;
          setLatestThinkingMessage(applyExtraction(parsed));
          return;
        }

        if (response.status === 401) {
          requestSignIn(
            "Sign in to use the AI copilot for natural-language commands."
          );
          setLatestThinkingMessage(
            "Sign in to chat with the AI copilot. I’ll pick up your request as soon as you’re back."
          );
          return;
        }

        const err = await response.text();
        toast.error("LLM parsing unavailable", {
          description: `Backend copilot parsing failed (${response.status}). Falling back to local parser.`,
        });
        console.warn("Copilot backend parse error:", err);
      } catch {
        toast.error("LLM parsing unavailable", {
          description: "Could not reach backend copilot endpoint. Falling back to local parser.",
        });
      }

      const fallbackExtraction = parseFallbackExtraction(text, zoom);
      setLatestThinkingMessage(applyExtraction(fallbackExtraction));
    } finally {
      setIsChatTyping(false);
    }
  };

  return {
    messages,
    setMessages,
    chatInput,
    setChatInput,
    isChatTyping,
    handleChatSubmit,
  };
}
