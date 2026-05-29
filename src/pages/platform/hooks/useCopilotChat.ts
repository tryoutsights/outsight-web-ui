import { useState, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type DynamicToolCall } from "ai";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { clamp, nearestAreaOption } from "../lib";
import type { Coordinates, DateRange, SpectralBand } from "../lib";

type Args = {
  mode: "imagery" | "expansion";
  setMode: React.Dispatch<React.SetStateAction<"imagery" | "expansion">>;
  setActiveTab: React.Dispatch<
    React.SetStateAction<"chat" | "controls" | "insights" | "layers">
  >;
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
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
  requestSignIn: (message?: string) => void;
  handleRetrieve: () => void;
  runExpansionQuery: (bbox: { minLat: number; minLon: number; maxLat: number; maxLon: number }) => void;
};

type MapUpdateInput = {
  lat?: number;
  lng?: number;
  cloudCover?: number;
  areaSize?: number;
  band?: SpectralBand;
  zoom?: number;
  startDate?: string;
  endDate?: string;
  mode?: "imagery" | "expansion";
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
  setDateRange,
  requestSignIn,
  handleRetrieve,
  runExpansionQuery,
}: Args) {
  const [chatInput, setChatInput] = useState("");
  const lastUpdatedParamsRef = useRef<MapUpdateInput | null>(null);

  const computeBBox = (lat: number, lng: number, areaSize: number) => {
    const sideKm = Math.sqrt(areaSize);
    const halfSide = sideKm / 2;
    const latDelta = halfSide / 111;
    const lngDelta = halfSide / (111 * Math.cos((lat * Math.PI) / 180));
    return {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLon: lng - lngDelta,
      maxLon: lng + lngDelta,
    };
  };

  const { messages, status, setMessages, sendMessage, addToolOutput } = useChat({
    body: {
      lat: coordinates.lat,
      lng: coordinates.lng,
      zoom,
      mode,
      areaSize,
    },
    transport: new DefaultChatTransport({
      api: "/api/copilot/chat",
      fetch: async (input, init) => {
        const res = await apiFetch(input.toString(), init);
        if (res.status === 401) {
          requestSignIn(
            "Sign in to use the AI copilot for natural-language commands.",
          );
        }
        return res;
      },
    }),
    onToolCall: ({ toolCall }) => {
      const dyn = toolCall as DynamicToolCall;

      if (dyn.toolName === "update_map_parameters") {
        const args = (dyn.input ?? {}) as MapUpdateInput;
        lastUpdatedParamsRef.current = args;

        if (args.mode === "expansion") {
          setMode("expansion");
          setActiveTab("controls");
        } else if (args.mode === "imagery") {
          setMode("imagery");
        }

        if (
          args.lat !== undefined &&
          args.lng !== undefined &&
          Number.isFinite(args.lat) &&
          Number.isFinite(args.lng)
        ) {
          setCoordinates({
            lat: clamp(args.lat, -90, 90),
            lng: clamp(args.lng, -180, 180),
          });
        }

        if (args.cloudCover !== undefined && Number.isFinite(args.cloudCover)) {
          setCloudCover(clamp(Math.round(args.cloudCover), 0, 100));
        }

        if (args.areaSize !== undefined && Number.isFinite(args.areaSize)) {
          setAreaSize(nearestAreaOption(args.areaSize));
        }

        if (args.band) {
          setBand(args.band);
        }

        if (args.zoom !== undefined && Number.isFinite(args.zoom)) {
          setZoom(clamp(Math.round(args.zoom), 2, 19));
        }

        if (args.startDate && args.endDate) {
          setDateRange({ startDate: args.startDate, endDate: args.endDate });
        }
      } else if (dyn.toolName === "plot_expansion_data") {
        const args = (dyn.input ?? {}) as any;
        setMode("expansion");
        setActiveTab("chat"); // keep user in chat panel to see summary!
        
        let targetLat = coordinates.lat;
        let targetLng = coordinates.lng;
        let targetArea = args.areaSize || areaSize;

        if (args.lat !== undefined && args.lng !== undefined) {
          targetLat = clamp(args.lat, -90, 90);
          targetLng = clamp(args.lng, -180, 180);
          setCoordinates({ lat: targetLat, lng: targetLng });
          setAreaSize(nearestAreaOption(targetArea));
          setZoom(11);
        } else {
          if (args.areaSize !== undefined) {
            setAreaSize(nearestAreaOption(args.areaSize));
          }
        }

        const bbox = computeBBox(targetLat, targetLng, targetArea);
        runExpansionQuery(bbox, args.end_year);

      } else if (dyn.toolName === "trigger_analysis") {
        // Since trigger_analysis is strictly for satellite imagery / STAC,
        // force the mode to imagery and fetch, ignoring any stale React state closures
        // if update_map_parameters was called in the same LLM step.
        setMode("imagery");
        
        const overrides: any = {};
        if (lastUpdatedParamsRef.current) {
          const params = lastUpdatedParamsRef.current;
          if (params.lat !== undefined) overrides.lat = params.lat;
          if (params.lng !== undefined) overrides.lon = params.lng;
          if (params.areaSize !== undefined) overrides.areaSize = params.areaSize;
          if (params.startDate !== undefined) overrides.startDate = params.startDate;
          if (params.endDate !== undefined) overrides.endDate = params.endDate;
          if (params.cloudCover !== undefined) overrides.maxCloudCover = params.cloudCover;
        }
        handleRetrieve(overrides);
        lastUpdatedParamsRef.current = null;
      }

      // Record a result so the assistant tool call has a matching tool reply
      // in conversation history. Without this, the next user message would
      // arrive with an orphan tool_call and the LLM API would reject it.
      addToolOutput({
        tool: dyn.toolName as never,
        toolCallId: dyn.toolCallId,
        output: { ok: true },
      });
    },
    onError: (error) => {
      toast.error("Copilot error", {
        description: error.message || "Copilot stream failed.",
      });
    },
  });

  const isChatTyping = status === "streaming" || status === "submitted";

  const submit = (text: string) => {
    if (!text.trim() || isChatTyping) return;
    sendMessage({ text: text.trim() });
  };

  const handleChatSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    lastUpdatedParamsRef.current = null;
    submit(chatInput);
    setChatInput("");
  };

  const handlePromptClick = (text: string) => {
    lastUpdatedParamsRef.current = null;
    submit(text);
  };

  return {
    messages,
    setMessages,
    chatInput,
    setChatInput,
    isChatTyping,
    handleChatSubmit,
    handlePromptClick,
    sendMessage,
  };
}

// Small helper used by other modules that want to build assistant messages.
export const assistantTextMessage = (text: string) => ({
  id: crypto.randomUUID(),
  role: "assistant" as const,
  parts: [{ type: "text" as const, text }],
});
