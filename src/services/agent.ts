import { fetchEventSource } from "@microsoft/fetch-event-source";
import { supabase, SUPABASE_CONFIGURED } from "@/lib/supabase";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type CityIntent = {
  city: string;
  country: string;
  date_range: { startDate: string; endDate: string };
  geometry?: GeoJSON.Geometry | null;
};

export type AgentRunRequest = {
  cities: CityIntent[];
  intent_type?: string;
};

export type YearLayer = {
  label: string;
  color: string;
  geojson: GeoJSON.FeatureCollection | null;
  tile_url: string | null;
  polygon_count: number;
  delivery: "inline" | "tiled";
};

export type CityMapResult = {
  city_slug: string;
  country: string;
  layers: YearLayer[];
};

export type AgentStep = {
  role: "tool_call" | "tool_result" | "result" | "error";
  name?: string;
  arguments?: Record<string, unknown>;
  result?: Record<string, unknown>;
  insight?: string;
  map_results?: CityMapResult[];
  error?: string;
};

export type AgentCallbacks = {
  onStep?: (step: AgentStep) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
  signal?: AbortSignal;
};

/**
 * Stream POST /agent/run as SSE. Each `data:` line is parsed as an AgentStep.
 *
 * Browser EventSource doesn't support POST — we use fetch-event-source instead.
 */
export async function streamAgentRun(
  request: AgentRunRequest,
  callbacks: AgentCallbacks = {},
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  
  if (SUPABASE_CONFIGURED) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
  }

  await fetchEventSource(`${API_BASE_URL}/agent/run`, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
    signal: callbacks.signal,
    openWhenHidden: true,
    onmessage(ev) {
      if (!ev.data) return;
      try {
        const step = JSON.parse(ev.data) as AgentStep;
        callbacks.onStep?.(step);
      } catch (e) {
        callbacks.onError?.(
          new Error(`Failed to parse SSE event: ${(e as Error).message}`),
        );
      }
    },
    onerror(err) {
      callbacks.onError?.(err as Error);
      throw err; // stop retrying on transport error
    },
    onclose() {
      callbacks.onClose?.();
    },
  });
}
