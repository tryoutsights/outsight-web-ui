import { useState } from "react";
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
  setCoordinates: React.Dispatch<React.SetStateAction<Coordinates>>;
  setCloudCover: React.Dispatch<React.SetStateAction<number>>;
  setAreaSize: React.Dispatch<React.SetStateAction<number>>;
  setBand: React.Dispatch<React.SetStateAction<SpectralBand>>;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
  requestSignIn: (message?: string) => void;
  handleRetrieve: () => void;
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
  setCoordinates,
  setCloudCover,
  setAreaSize,
  setBand,
  setZoom,
  setDateRange,
  requestSignIn,
  handleRetrieve,
}: Args) {
  const [chatInput, setChatInput] = useState("");

  const { messages, status, setMessages, sendMessage, addToolOutput } = useChat({
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
      } else if (dyn.toolName === "trigger_analysis") {
        if (mode === "expansion") {
          toast.info(
            "Draw a bounding box on the map to run an expansion query.",
          );
        } else {
          handleRetrieve();
        }
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
    submit(chatInput);
    setChatInput("");
  };

  const handlePromptClick = (text: string) => submit(text);

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
