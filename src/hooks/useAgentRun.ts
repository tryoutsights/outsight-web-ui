import { useCallback, useEffect, useRef, useState } from "react";
import {
  AgentRunRequest,
  AgentStep,
  CityMapResult,
  streamAgentRun,
} from "@/services/agent";

export type AgentRunStatus = "idle" | "streaming" | "done" | "error";

export type AgentRunState = {
  status: AgentRunStatus;
  steps: AgentStep[];
  insight: string | null;
  mapResults: CityMapResult[] | null;
  error: string | null;
  /** What the agent is currently doing — derived from the last tool_call event. */
  currentAction: string | null;
};

const initial: AgentRunState = {
  status: "idle",
  steps: [],
  insight: null,
  mapResults: null,
  error: null,
  currentAction: null,
};

const ACTION_LABELS: Record<string, (args: Record<string, unknown>) => string> = {
  query_city_data: (a) => `Finding data for ${a.city ?? "city"}…`,
  compute_change: (a) =>
    `Calculating change ${a.before_year ?? "?"} → ${a.after_year ?? "?"} for ${
      a.city_slug ?? "city"
    }…`,
  generate_map_layer: (a) =>
    `Preparing ${a.mode === "timeline" ? "year-by-year" : "change"} map…`,
};

export function useAgentRun() {
  const [state, setState] = useState<AgentRunState>(initial);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight stream on unmount.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(initial);
  }, []);

  const run = useCallback(async (request: AgentRunRequest) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState({ ...initial, status: "streaming" });

    try {
      await streamAgentRun(request, {
        signal: ctrl.signal,
        onStep(step) {
          setState((prev) => {
            const steps = [...prev.steps, step];
            if (step.role === "tool_call") {
              const labeller = ACTION_LABELS[step.name ?? ""];
              const action = labeller
                ? labeller(step.arguments ?? {})
                : `Running ${step.name}…`;
              return { ...prev, steps, currentAction: action };
            }
            if (step.role === "result") {
              return {
                ...prev,
                steps,
                status: "done",
                insight: step.insight ?? null,
                mapResults: step.map_results ?? null,
                currentAction: null,
              };
            }
            if (step.role === "error") {
              return {
                ...prev,
                steps,
                status: "error",
                error: step.error ?? "Agent error",
                currentAction: null,
              };
            }
            return { ...prev, steps };
          });
        },
        onError(err) {
          setState((prev) => ({
            ...prev,
            status: "error",
            error: err.message,
            currentAction: null,
          }));
        },
      });
    } catch (e) {
      // Already surfaced via onError; ignore here.
    }
  }, []);

  return { ...state, run, reset };
}
