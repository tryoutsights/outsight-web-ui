import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity,
  Bot,
  CloudRain,
  Crosshair,
  Eye,
  EyeOff,
  FileText,
  Hexagon,
  Layers,
  Loader2,
  Maximize,
  Moon,
  Play,
  Send,
  Sliders,
  Sparkles,
  Satellite,
  Sun,
  User,
  X,
} from "lucide-react";
import YearSlider from "./expansion/YearSlider";
import StatsPanel from "./expansion/StatsPanel";
import Legend from "./expansion/Legend";
import {
  fetchDatasets,
  queryMap,
  queryAnalytics,
} from "./expansion/lib";
import type { AnalyticsResult, Dataset, BBox } from "./expansion/lib";
import UnifiedMap from "./platform/UnifiedMap";
import { useLayerManager } from "./platform/layers";
import type { LayerDef } from "./platform/layers";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/hooks/use-auth";
import { useResizablePanel } from "@/hooks/use-resizable-panel";
import { apiFetch } from "@/lib/api-client";
import {
  AREA_SIZE_OPTIONS,
  COPILOT_THINKING_TEXT,
  LEFT_PANEL_DEFAULT_WIDTH,
  LEFT_PANEL_MAX_WIDTH,
  LEFT_PANEL_MIN_WIDTH,
  DEFAULT_COPILOT_REPLY,
  clamp,
  fetchImagery,
  hasValidBbox,
  nearestAreaOption,
  parseFallbackExtraction,
} from "./platform/lib";
import type {
  ActiveTab,
  ChatMessage,
  Coordinates,
  CopilotExtraction,
  DateRange,
  RetrieveParams,
  SpectralBand,
} from "./platform/lib";

const Platform = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("chat");
  const [band, setBand] = useState<SpectralBand>("NDBI");
  const [coordinates, setCoordinates] = useState<Coordinates>({ lat: 37.7749, lng: -122.4194 });
  const [zoom, setZoom] = useState(12);
  const [areaSize, setAreaSize] = useState(25);
  const [cloudCover, setCloudCover] = useState(20);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: format(subDays(new Date(), 60), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [params, setParams] = useState<RetrieveParams | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Spatial Copilot is ready. Adjust controls, then run spatial analysis to query imagery.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeImageUrl, setActiveImageUrl] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState("");
  const [analysisPrompt, setAnalysisPrompt] = useState(
    "Provide a concise geospatial change summary and key features."
  );
  const imageCache = useRef<Map<string, string>>(new Map());

  // ---------------------------------------------------------------------------
  // Mode toggle: "imagery" | "expansion"
  // ---------------------------------------------------------------------------
  const [mode, setMode] = useState<"imagery" | "expansion">("imagery");

  // Layer manager (imagery + expansion layers rendered on unified map)
  const { layers: mapLayers, addLayer, removeLayer, toggleLayer, updateLayer } = useLayerManager();

  // Expansion state
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [drawMode, setDrawMode] = useState(false);
  const [expBbox, setExpBbox] = useState<[number, number, number, number] | null>(null);
  const [expAnalytics, setExpAnalytics] = useState<AnalyticsResult | null>(null);
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [datasetsError, setDatasetsError] = useState<string | null>(null);

  const expLayer = mapLayers.find((l) => l.id === "expansion-current");
  const expSelectedYear = expLayer?.kind === "expansion" ? expLayer.years[expLayer.selectedYearIdx] : undefined;
  const cells = expLayer?.kind === "expansion" ? expLayer.cells : [];

  const { width: leftPanelWidth, startResize } = useResizablePanel({
    initialWidth: LEFT_PANEL_DEFAULT_WIDTH,
    minWidth: LEFT_PANEL_MIN_WIDTH,
    maxWidth: LEFT_PANEL_MAX_WIDTH,
  });
  const { requestSignIn } = useAuth();


  // Load datasets the first time expansion mode is activated
  useEffect(() => {
    if (mode !== "expansion" || datasets.length > 0) return;
    setDatasetsLoading(true);
    fetchDatasets()
      .then((ds) => {
        setDatasets(ds);
        if (ds.length > 0) setSelectedSlug(ds[0].slug);
      })
      .catch((e: Error) => setDatasetsError(e.message))
      .finally(() => setDatasetsLoading(false));
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const runExpansionQuery = useCallback(async (newBbox: BBox) => {
    if (!selectedSlug) { setExpError("Select a dataset first."); return; }
    setExpError(null);
    setExpLoading(true);
    const bboxTuple: [number, number, number, number] = [newBbox.minLat, newBbox.minLon, newBbox.maxLat, newBbox.maxLon];
    setExpBbox(bboxTuple);
    try {
      const [mapResult, analyticsResult] = await Promise.all([
        queryMap(selectedSlug, newBbox),
        queryAnalytics(selectedSlug, newBbox),
      ]);
      if (mapResult.status === "empty") {
        setExpError("No data in this region. Check the dataset AOI.");
        return;
      }
      const years = mapResult.years ?? [];
      setExpAnalytics(analyticsResult);
      const displayName = datasets.find((d) => d.slug === selectedSlug)?.display_name ?? selectedSlug;
      addLayer({
        kind: "expansion",
        id: "expansion-current",
        label: `${displayName} — H3 r10`,
        visible: true,
        cells: mapResult.cells ?? [],
        years,
        selectedYearIdx: years.length ? years.length - 1 : 0,
        bbox: bboxTuple,
      } satisfies LayerDef);
    } catch (e) {
      setExpError((e as Error).message);
    } finally {
      setExpLoading(false);
      setDrawMode(false);
    }
  }, [selectedSlug, datasets, addLayer]);

  const handleExpansionClear = () => {
    setExpAnalytics(null);
    setExpBbox(null);
    setExpError(null);
    removeLayer("expansion-current");
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["imagery", params],
    queryFn: () => fetchImagery(params!.lat, params!.lon, params!.startDate, params!.endDate, params!.areaSize, params!.maxCloudCover),
    enabled: !!params,
    retry: false,
  });

  useEffect(() => {
    if (isError && error) {
      toast.error("Failed to retrieve imagery", {
        description: (error as Error).message,
      });
    }
  }, [isError, error]);

  useEffect(() => {
    const cache = imageCache.current;
    return () => {
      for (const url of cache.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  // Wire rendered imagery URL → imagery layer in the layer manager
  const selectedItem = useMemo(() => {
    if (!data || data.length === 0) return null;
    return data[Math.min(activeIndex, data.length - 1)];
  }, [activeIndex, data]);

  useEffect(() => {
    if (!activeImageUrl || !selectedItem) return;
    const rawBbox = selectedItem.render_payload?.bbox;
    if (!hasValidBbox(rawBbox)) return;
    addLayer({
      kind: "imagery",
      id: "imagery-current",
      label: `${band} — ${selectedItem.capture_date?.slice(0, 10) ?? ""}`,
      visible: true,
      url: activeImageUrl,
      bbox: rawBbox as [number, number, number, number],
      opacity: 0.72,
      band,
    });
  }, [activeImageUrl, selectedItem]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetrieve = (overrides?: Partial<RetrieveParams>) => {
    const next = {
      lat: overrides?.lat ?? coordinates.lat,
      lon: overrides?.lon ?? coordinates.lng,
      startDate: overrides?.startDate ?? dateRange.startDate,
      endDate: overrides?.endDate ?? dateRange.endDate,
      areaSize: overrides?.areaSize ?? areaSize,
      maxCloudCover: overrides?.maxCloudCover ?? cloudCover,
    };
    setParams(next);
    setMessages((prev) => [
      ...prev,
      {
        role: "bot",
        text: `Running imagery retrieval at ${next.lat.toFixed(4)}, ${next.lon.toFixed(4)} with ${next.areaSize} km² and max cloud ${next.maxCloudCover}%.`,
      },
    ]);
    if (
      params &&
      params.lat === next.lat &&
      params.lon === next.lon &&
      params.startDate === next.startDate &&
      params.endDate === next.endDate &&
      params.areaSize === next.areaSize &&
      params.maxCloudCover === next.maxCloudCover
    ) {
      refetch();
    }
  };

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

  useEffect(() => {
    setActiveIndex(0);
    setInsights("");
  }, [data]);

  useEffect(() => {
    if (!data || data.length === 0 || !data[activeIndex]) {
      setActiveImageUrl("");
      return;
    }

    const currentItem = data[activeIndex];
    const imageUrl = currentItem.image_url || "";

    // For map overlays, prefer backend-rendered PNG whenever render_payload is available.
    // Browsers cannot reliably render remote GeoTIFF URLs directly in <img>/Leaflet image overlays.
    if (!currentItem.render_payload) {
      setActiveImageUrl(imageUrl);
      setIsRendering(false);
      return;
    }

    const cacheKey = JSON.stringify(currentItem.render_payload);
    if (imageCache.current.has(cacheKey)) {
      setActiveImageUrl(imageCache.current.get(cacheKey) || "");
      setIsRendering(false);
      return;
    }

    let isMounted = true;
    setIsRendering(true);

    const fetchRendered = async () => {
      try {
        const response = await apiFetch(`/api/render`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentItem.render_payload),
        });
        if (!response.ok) throw new Error("Render endpoint failed");
        const blob = await response.blob();
        const localUrl = URL.createObjectURL(blob);
        if (!isMounted) return;
        imageCache.current.set(cacheKey, localUrl);
        setActiveImageUrl(localUrl);
      } catch {
        if (isMounted) {
          setActiveImageUrl(imageUrl);
        }
      } finally {
        if (isMounted) setIsRendering(false);
      }
    };

    fetchRendered();
    return () => {
      isMounted = false;
    };
  }, [activeIndex, data]);

  const hasOverlay = !!data && data.length > 0 && !!activeImageUrl && !isLoading && !isError;



  const handleGenerateInsights = async () => {
    if (!selectedItem?.render_payload) {
      toast.error("No render payload available for analysis.");
      return;
    }
    setActiveTab("insights");
    setIsGeneratingInsights(true);
    setInsights("");

    try {
      const sortedData = [...(data || [])].sort(
        (a, b) => new Date(a.capture_date).getTime() - new Date(b.capture_date).getTime()
      );
      const image_sets = sortedData.slice(0, 8).map((item) => ({
        date: item.capture_date.split("T")[0],
        cog_urls: item.render_payload?.cog_urls || [],
      }));
      const payload = {
        prompt: `${analysisPrompt} Focus band: ${band}.`,
        image_sets,
        bbox: selectedItem.render_payload.bbox || [],
      };

      const res = await apiFetch(`/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        // Hard-gated endpoint: prompt the user to sign in and abort silently.
        requestSignIn("Sign in to run AI-powered geospatial analysis.");
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Analysis failed.");
      }
      const result = await res.json();
      const finalText = [result.analysis, ...(result.key_features || [])].join("\n\n");
      setInsights(finalText);
      setMessages((prev) => [...prev, { role: "bot", text: finalText }]);
      toast.success("Analysis complete.");
    } catch (err) {
      toast.error("Analysis Failed", { description: (err as Error).message });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatTyping) return;
    const text = chatInput.trim();

    // Reflect user intent immediately, then show in-thread bot thinking state.
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "bot", text: COPILOT_THINKING_TEXT },
    ]);
    setChatInput("");
    setIsChatTyping(true);

    const applyExtraction = (parsed: CopilotExtraction): string => {
      const updates: string[] = [];

      // Mode switch from copilot intent
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
        handleRetrieve({
          lat: nextLat,
          lon: nextLng,
          startDate: nextStartDate,
          endDate: nextEndDate,
          areaSize: nextArea,
          maxCloudCover: nextCloud,
        });
        updates.push("started spatial retrieval");
      }

      return (
        parsed.replyText?.trim() ||
        (updates.length > 0
          ? `Applied: ${updates.join("; ")}.`
          : DEFAULT_COPILOT_REPLY)
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
          // Hard-gated: prompt the user to sign in and stop here. We
          // intentionally do NOT fall through to the local parser, because it
          // would post a misleading reply behind the sign-in modal and apply
          // state changes the user never opted into.
          requestSignIn(
            "Sign in to use the AI copilot for natural-language commands.",
          );
          setLatestThinkingMessage(
            "Sign in to chat with the AI copilot. I’ll pick up your request as soon as you’re back.",
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

  const isLeftDark = isDarkMode;

  return (
    <div
      className={`flex h-screen w-full font-sans overflow-hidden transition-colors duration-300 ${
        isDarkMode ? "bg-slate-950 text-slate-200" : "bg-slate-50 text-slate-800"
      }`}
    >
      <div
        style={{ width: `${leftPanelWidth}px` }}
        className={`h-full shrink-0 border-r flex flex-col z-10 shadow-2xl transition-colors duration-300 ${isLeftDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
          }`}
      >
        <div
          className={`p-5 border-b flex items-center justify-between bg-gradient-to-r transition-colors duration-300 ${isLeftDark
            ? "border-slate-800 from-slate-900 to-slate-900"
            : "border-slate-200 from-teal-50 to-emerald-50"
            }`}
        >
          <Link to="/" className="flex items-center gap-3 group" title="Back to home">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-lg text-white flex-shrink-0 shadow-md">
              <Satellite size={20} />
            </div>
            <div>
              <h1 className={`font-bold text-lg tracking-wide leading-tight transition-colors ${isLeftDark ? "text-white group-hover:text-teal-300" : "text-slate-900 group-hover:text-teal-600"}`}>
                Outsights
              </h1>
              <p className={`text-xs font-medium ${isLeftDark ? "text-slate-400" : "text-slate-500"}`}>
                AI-Guided Spatial Analytics
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <UserMenu isDark={isLeftDark} />
            <button
              onClick={() => setIsDarkMode((p) => !p)}
              className={`p-2 rounded-full transition-colors shadow-sm border ${isLeftDark
                ? "hover:bg-slate-800 text-slate-400 border-transparent hover:border-slate-700"
                : "hover:bg-white text-slate-500 border-transparent hover:border-slate-200"
                }`}
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <div
          className={`flex items-center border-b transition-colors duration-300 ${isLeftDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
            }`}
        >
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 flex items-center justify-center gap-2 p-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "chat"
              ? isLeftDark
                ? "text-teal-400 border-b-2 border-teal-500 bg-slate-800/50"
                : "text-teal-600 border-b-2 border-teal-600 bg-teal-50"
              : isLeftDark
                ? "text-slate-400 hover:text-slate-300"
                : "text-slate-500 hover:text-slate-700"
              }`}
          >
            <Bot size={16} /> Copilot
          </button>
          <button
            onClick={() => setActiveTab("controls")}
            className={`flex-1 flex items-center justify-center gap-2 p-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "controls"
              ? isLeftDark
                ? "text-teal-400 border-b-2 border-teal-500 bg-slate-800/50"
                : "text-teal-600 border-b-2 border-teal-600 bg-teal-50"
              : isLeftDark
                ? "text-slate-400 hover:text-slate-300"
                : "text-slate-500 hover:text-slate-700"
              }`}
          >
            <Sliders size={16} /> Controls
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`flex-1 flex items-center justify-center gap-2 p-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "insights"
              ? isLeftDark
                ? "text-teal-400 border-b-2 border-teal-500 bg-slate-800/50"
                : "text-teal-600 border-b-2 border-teal-600 bg-teal-50"
              : isLeftDark
                ? "text-slate-400 hover:text-slate-300"
                : "text-slate-500 hover:text-slate-700"
              }`}
          >
            <FileText size={16} /> Insights
          </button>
          <button
            onClick={() => setActiveTab("layers")}
            className={`flex-1 flex items-center justify-center gap-2 p-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === "layers"
              ? isLeftDark
                ? "text-teal-400 border-b-2 border-teal-500 bg-slate-800/50"
                : "text-teal-600 border-b-2 border-teal-600 bg-teal-50"
              : isLeftDark
                ? "text-slate-400 hover:text-slate-300"
                : "text-slate-500 hover:text-slate-700"
              }`}
          >
            <Layers size={16} /> Layers
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeTab === "chat" && (
            <div
              className={`flex-1 min-h-0 flex flex-col h-full transition-colors duration-300 ${isLeftDark ? "bg-slate-950" : "bg-slate-50"
                }`}
            >
              <div
                className={`px-4 py-3 border-b flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider shadow-sm transition-colors duration-300 ${isLeftDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  }`}
              >
                <div className={`px-2 py-1.5 rounded flex items-center gap-1.5 border ${isLeftDark ? "bg-emerald-900/30 text-emerald-400 border-emerald-800/50" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>
                  <Crosshair size={12} /> {coordinates.lat.toFixed(2)}, {coordinates.lng.toFixed(2)}
                </div>
                <div className={`px-2 py-1.5 rounded flex items-center gap-1.5 border ${isLeftDark ? "bg-amber-900/30 text-amber-400 border-amber-800/50" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                  <Maximize size={12} /> {areaSize}km²
                </div>
                <div className={`px-2 py-1.5 rounded flex items-center gap-1.5 border ${isLeftDark ? "bg-sky-900/30 text-sky-400 border-sky-800/50" : "bg-sky-100 text-sky-700 border-sky-200"}`}>
                  <CloudRain size={12} /> {cloudCover}%
                </div>
                <div className={`px-2 py-1.5 rounded flex items-center gap-1.5 border ${isLeftDark ? "bg-fuchsia-900/30 text-fuchsia-400 border-fuchsia-800/50" : "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200"}`}>
                  <Activity size={12} /> {band}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                  <div key={`${msg.role}-${idx}`} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === "user" ? "bg-gradient-to-br from-slate-600 to-slate-700 text-white" : "bg-gradient-to-br from-teal-500 to-emerald-600 text-white"}`}>
                      {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm max-w-[85%] whitespace-pre-wrap shadow-sm ${msg.role === "user" ? "bg-gradient-to-br from-teal-600 to-emerald-600 text-white rounded-tr-none" : isLeftDark ? "bg-slate-900 text-slate-300 border border-slate-800 rounded-tl-none" : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"}`}>
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

              <div
                className={`p-4 border-t flex flex-col gap-3 transition-colors duration-300 ${isLeftDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                  }`}
              >
                <button
                  onClick={() => handleRetrieve()}
                  disabled={isLoading}
                  className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm shadow-lg ${isLoading ? isLeftDark ? "bg-teal-900/50 text-teal-200 cursor-not-allowed" : "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white"}`}
                >
                  {isLoading ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} fill="currentColor" />}
                  {isLoading ? "Processing Analysis..." : "Run Spatial Analysis"}
                </button>
                <form onSubmit={handleChatSubmit} className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isChatTyping}
                    placeholder="Tell AI what to map..."
                    className={`w-full border rounded-full py-3 pl-5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all ${isLeftDark
                      ? "bg-slate-950 border-slate-700 text-slate-200 placeholder-slate-500"
                      : "bg-slate-100 border-slate-200 text-slate-800 placeholder-slate-400"
                      }`}
                  />
                  <button type="submit" disabled={isChatTyping} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-br from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-full transition-all shadow-md">
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === "controls" && mode === "expansion" && (
            <div
              className={`flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-6 transition-colors duration-300 ${isLeftDark ? "bg-slate-900" : "bg-slate-50"
                }`}
            >
              {/* Mode toggle */}
              <div className={`flex rounded-lg overflow-hidden border ${isLeftDark ? "border-slate-700" : "border-slate-200"}`}>
                <button
                  onClick={() => setMode("imagery")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${isLeftDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <Satellite size={12} /> Imagery
                </button>
                <button
                  onClick={() => setMode("expansion")}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-teal-600 text-white"
                >
                  <Hexagon size={12} /> Expansion
                </button>
              </div>

              <div>
                <label className={`flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider ${isLeftDark ? "text-slate-400" : "text-slate-600"}`}>
                  <Hexagon size={14} className="text-orange-500" /> Dataset
                </label>
                {datasetsLoading ? (
                  <div className={`flex items-center gap-2 text-xs ${isLeftDark ? "text-slate-400" : "text-slate-500"}`}>
                    <Loader2 size={12} className="animate-spin" /> Loading datasets…
                  </div>
                ) : datasetsError ? (
                  <div className="text-xs text-red-500">{datasetsError}</div>
                ) : datasets.length === 0 ? (
                  <div className={`text-xs ${isLeftDark ? "text-slate-400" : "text-slate-500"}`}>No datasets found</div>
                ) : (
                  <select
                    value={selectedSlug}
                    onChange={(e) => { setSelectedSlug(e.target.value); handleExpansionClear(); }}
                    className={`w-full border rounded-lg p-3 text-sm ${isLeftDark ? "bg-slate-950 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"}`}
                  >
                    {datasets.map((d) => (
                      <option key={d.slug} value={d.slug}>{d.display_name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className={`flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider ${isLeftDark ? "text-slate-400" : "text-slate-600"}`}>
                  <Crosshair size={14} className="text-emerald-500" /> Bounding Box
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDrawMode((m) => !m)}
                    disabled={!selectedSlug || datasetsLoading}
                    className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 ${drawMode
                        ? isLeftDark
                          ? "bg-teal-900/40 border-teal-500 text-teal-300"
                          : "bg-teal-50 border-teal-500 text-teal-700"
                        : isLeftDark
                          ? "bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"
                      }`}
                  >
                    {drawMode ? "Cancel Draw" : "Draw BBOX"}
                  </button>
                  <button
                    onClick={handleExpansionClear}
                    disabled={!cells.length && !expBbox}
                    className={`px-3 py-2.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40 ${isLeftDark ? "bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500" : "bg-white border-slate-200 text-slate-700 hover:border-slate-400"}`}
                  >
                    Clear
                  </button>
                </div>
                {drawMode && (
                  <p className={`text-[10px] mt-2 leading-relaxed ${isLeftDark ? "text-teal-400" : "text-teal-600"}`}>
                    Drag on the map to draw a bounding box, then release to query.
                  </p>
                )}
                {expLoading && (
                  <div className={`flex items-center gap-2 mt-2 text-[10px] ${isLeftDark ? "text-slate-400" : "text-slate-500"}`}>
                    <Loader2 size={12} className="animate-spin" /> Querying…
                  </div>
                )}
              </div>

              <div>
                <label className={`flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider ${isLeftDark ? "text-slate-400" : "text-slate-600"}`}>
                  <Activity size={14} className="text-orange-500" /> Statistics
                </label>
                <StatsPanel
                  analytics={expAnalytics}
                  selectedYear={expSelectedYear}
                  loading={expLoading}
                  isDark={isLeftDark}
                />
              </div>

              {mapLayers.some((l) => l.kind === "expansion") && (
                <p className={`text-[10px] leading-relaxed ${isLeftDark ? "text-slate-400" : "text-slate-500"}`}>
                  Year slider and color scale are in the <strong className={isLeftDark ? "text-slate-300" : "text-slate-700"}>Layers</strong> tab.
                </p>
              )}
            </div>
          )}

          {activeTab === "controls" && mode === "imagery" && (
            <div
              className={`flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-6 transition-colors duration-300 ${isLeftDark ? "bg-slate-900" : "bg-slate-50"
                }`}
            >
              {/* Mode toggle */}
              <div className={`flex rounded-lg overflow-hidden border ${isLeftDark ? "border-slate-700" : "border-slate-200"}`}>
                <button
                  onClick={() => setMode("imagery")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold ${isLeftDark ? "bg-teal-600 text-white" : "bg-teal-600 text-white"}`}
                >
                  <Satellite size={12} /> Imagery
                </button>
                <button
                  onClick={() => setMode("expansion")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${isLeftDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <Hexagon size={12} /> Expansion
                </button>
              </div>

              <div>
                <label className={`flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider ${isLeftDark ? "text-slate-400" : "text-slate-600"}`}>
                  <Crosshair size={14} className="text-emerald-500" /> Center Coordinates
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={coordinates.lat}
                    onChange={(e) => setCoordinates((prev) => ({ ...prev, lat: Number(e.target.value) }))}
                    className={`w-1/2 border rounded-lg p-2.5 text-sm ${isLeftDark ? "bg-slate-950 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"}`}
                  />
                  <input
                    type="number"
                    value={coordinates.lng}
                    onChange={(e) => setCoordinates((prev) => ({ ...prev, lng: Number(e.target.value) }))}
                    className={`w-1/2 border rounded-lg p-2.5 text-sm ${isLeftDark ? "bg-slate-950 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"}`}
                  />
                </div>
                <p className={`text-[10px] mt-1.5 text-right font-medium ${isLeftDark ? "text-slate-400" : "text-slate-500"}`}>
                  Drag map or edit values
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider ${isLeftDark ? "text-slate-400" : "text-slate-600"}`}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                    className={`mt-2 w-full border rounded-lg p-2.5 text-sm ${isLeftDark ? "bg-slate-950 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"}`}
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wider ${isLeftDark ? "text-slate-400" : "text-slate-600"}`}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                    className={`mt-2 w-full border rounded-lg p-2.5 text-sm ${isLeftDark ? "bg-slate-950 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"}`}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isLeftDark ? "text-slate-400" : "text-slate-600"}`}>
                    <Maximize size={14} className="text-amber-500" /> Area Extent
                  </label>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${isLeftDark ? "text-amber-400 bg-amber-900/30 border-amber-800/50" : "text-amber-700 bg-amber-100 border-amber-200"}`}>
                    {areaSize} km²
                  </span>
                </div>
                <select
                  value={String(areaSize)}
                  onChange={(e) => setAreaSize(parseInt(e.target.value, 10))}
                  className={`w-full border rounded-lg p-3 text-sm ${isLeftDark ? "bg-slate-950 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"}`}
                >
                  {AREA_SIZE_OPTIONS.map((opt) => {
                    const label =
                      opt === 1 ? "1x1 km" : opt === 4 ? "2x2 km" : opt === 25 ? "5x5 km" : "10x10 km";
                    return (
                      <option key={opt} value={opt}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isLeftDark ? "text-slate-400" : "text-slate-600"}`}>
                    <CloudRain size={14} className="text-sky-500" /> Max Cloud Cover
                  </label>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${isLeftDark ? "text-sky-400 bg-sky-900/30 border-sky-800/50" : "text-sky-700 bg-sky-100 border-sky-200"}`}>
                    {cloudCover}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cloudCover}
                  onChange={(e) => setCloudCover(parseInt(e.target.value, 10))}
                  className={`w-full accent-sky-500 h-1.5 rounded-lg appearance-none cursor-pointer ${isLeftDark ? "bg-slate-700" : "bg-slate-200"}`}
                />
              </div>

              <div>
                <label className={`flex items-center gap-2 text-xs font-bold mb-2 uppercase tracking-wider ${isLeftDark ? "text-slate-400" : "text-slate-600"}`}>
                  <Activity size={14} className="text-fuchsia-500" /> Spectral Band
                </label>
                <select
                  value={band}
                  onChange={(e) => setBand(e.target.value as "NDBI" | "NDVI" | "TrueColor")}
                  className={`w-full border rounded-lg p-3 text-sm ${isLeftDark ? "bg-slate-950 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-800"}`}
                >
                  <option value="NDBI">NDBI (Built-up Index)</option>
                  <option value="NDVI">NDVI (Vegetation Index)</option>
                  <option value="TrueColor">True Color (RGB)</option>
                </select>
              </div>

              <button
                onClick={() => handleRetrieve()}
                disabled={isLoading}
                className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-md ${isLoading ? isLeftDark ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-slate-200 text-slate-400 cursor-not-allowed" : isLeftDark ? "bg-slate-950 hover:bg-slate-800 text-white border border-slate-700" : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200"}`}
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} className="text-teal-500" />}
                {isLoading ? "Processing..." : "Manual Execute"}
              </button>
            </div>
          )}

          {activeTab === "insights" && (
            <div
              className={`flex-1 min-h-0 flex flex-col transition-colors duration-300 ${isLeftDark ? "bg-slate-900" : "bg-slate-50"
                }`}
            >
              <div
                className={`p-5 border-b transition-colors duration-300 ${isLeftDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white"
                  }`}
              >
                <button
                  onClick={handleGenerateInsights}
                  disabled={!hasOverlay || isGeneratingInsights}
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-sm shadow-md ${!hasOverlay ? isLeftDark ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700" : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200" : "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)]"}`}
                >
                  {isGeneratingInsights ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  {isGeneratingInsights ? "Analyzing Region..." : "Generate AI Report"}
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-6 text-sm leading-relaxed">
                {isGeneratingInsights ? (
                  <div className={`flex flex-col items-center justify-center h-full space-y-4 ${isLeftDark ? "text-teal-400" : "text-teal-600"}`}>
                    <Loader2 className="animate-spin" size={28} />
                    <p className="animate-pulse font-medium tracking-wide">Synthesizing spatial context...</p>
                  </div>
                ) : insights ? (
                  <div className={`whitespace-pre-wrap p-5 rounded-2xl border shadow-sm ${isLeftDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                    {insights}
                  </div>
                ) : (
                  <div className={`flex flex-col items-center justify-center h-full space-y-3 text-center ${isLeftDark ? "text-slate-500" : "text-slate-400"}`}>
                    <div className={`p-4 rounded-full mb-2 ${isLeftDark ? "bg-slate-800/50" : "bg-slate-100"}`}>
                      <Sparkles size={28} className="text-teal-400 opacity-80" />
                    </div>
                    <p className="max-w-[200px] leading-relaxed">
                      Awaiting map data to generate detailed report.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "layers" && (
            <div
              className={`flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3 transition-colors duration-300 ${
                isLeftDark ? "bg-slate-900" : "bg-slate-50"
              }`}
            >
              {mapLayers.length === 0 ? (
                <div className={`flex flex-col items-center justify-center h-full gap-3 text-center ${isLeftDark ? "text-slate-500" : "text-slate-400"}`}>
                  <div className={`p-4 rounded-full ${isLeftDark ? "bg-slate-800/50" : "bg-slate-100"}`}>
                    <Layers size={28} className="text-teal-400 opacity-70" />
                  </div>
                  <p className="text-xs max-w-[200px] leading-relaxed">
                    No layers yet. Run Spatial Analysis or query Urban Expansion to add layers.
                  </p>
                </div>
              ) : (
                mapLayers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`rounded-xl border p-3 flex flex-col gap-3 transition-colors ${
                      isLeftDark ? "border-slate-700 bg-slate-800/60" : "border-slate-200 bg-white"
                    } ${!layer.visible ? "opacity-50" : ""}`}
                  >
                    {/* Row 1: icon + label + toggle + remove */}
                    <div className="flex items-center gap-2">
                      {layer.kind === "imagery" ? (
                        <Satellite size={13} className="text-teal-400 shrink-0" />
                      ) : (
                        <Hexagon size={13} className="text-orange-400 shrink-0" />
                      )}
                      <span className={`text-xs flex-1 truncate font-medium ${isLeftDark ? "text-slate-200" : "text-slate-700"}`}>
                        {layer.label}
                      </span>
                      <button
                        onClick={() => toggleLayer(layer.id)}
                        className={`p-1 rounded transition-colors ${isLeftDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}
                        title={layer.visible ? "Hide layer" : "Show layer"}
                      >
                        {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button
                        onClick={() => removeLayer(layer.id)}
                        className={`p-1 rounded transition-colors ${isLeftDark ? "hover:bg-slate-700 text-slate-500 hover:text-red-400" : "hover:bg-slate-100 text-slate-400 hover:text-red-500"}`}
                        title="Remove layer"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {/* Row 2: per-kind controls */}
                    {layer.kind === "imagery" && (
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] shrink-0 ${isLeftDark ? "text-slate-500" : "text-slate-400"}`}>Opacity</span>
                        <input
                          type="range"
                          min={0} max={1} step={0.05}
                          value={layer.opacity}
                          onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) })}
                          className="flex-1 accent-teal-500 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className={`text-[10px] w-7 text-right shrink-0 ${isLeftDark ? "text-slate-400" : "text-slate-500"}`}>
                          {Math.round(layer.opacity * 100)}%
                        </span>
                      </div>
                    )}

                    {layer.kind === "expansion" && layer.years.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <YearSlider
                          years={layer.years}
                          yearIdx={layer.selectedYearIdx}
                          onYearIdx={(idx) => updateLayer(layer.id, { selectedYearIdx: typeof idx === "function" ? idx(layer.selectedYearIdx) : idx })}
                          isDark={isLeftDark}
                        />
                        {(() => {
                          const yr = layer.years[layer.selectedYearIdx] ?? null;
                          const maxVal = yr
                            ? layer.cells.reduce((m, c) => Math.max(m, (c[`built_${yr}_km2`] as number) ?? 0), 0)
                            : 0;
                          return maxVal > 0 ? <Legend maxValue={maxVal} isDark={isLeftDark} /> : null;
                        })()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize left dashboard"
        onMouseDown={startResize}
        className={`w-1 shrink-0 cursor-col-resize transition-colors ${isDarkMode ? "bg-slate-800/80 hover:bg-teal-500/80" : "bg-slate-300 hover:bg-teal-500/70"}`}
      />

      <div
        className={`flex-1 relative overflow-hidden transition-colors duration-300 ${
          isDarkMode ? "bg-[#050505]" : "bg-slate-200"
        }`}
      >
        {/* ---- Unified map — renders all layers simultaneously ---- */}
        <UnifiedMap
          mapLayers={mapLayers}
          updateLayer={updateLayer}
          coordinates={coordinates}
          setCoordinates={setCoordinates}
          zoom={zoom}
          setZoom={setZoom}
          areaSize={areaSize}
          band={band}
          isGenerating={isLoading || isRendering}
          isDarkMode={isDarkMode}
          showSelectionBox={mode === "imagery"}
          drawMode={drawMode}
          onBboxDrawn={runExpansionQuery}
          expBbox={expBbox}
        />

        {/* Band legend overlay (imagery) */}
        {hasOverlay && (
          <div className={`absolute bottom-8 right-8 backdrop-blur-md border p-5 rounded-2xl shadow-2xl z-[1000] transition-colors duration-300 ${isDarkMode ? "bg-[#121216]/95 border-slate-800" : "bg-white/95 border-slate-200"}`}>
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${isDarkMode ? "text-slate-300" : "text-slate-800"}`}>
              <Activity size={14} className={band === "NDBI" ? "text-orange-500" : band === "NDVI" ? "text-emerald-500" : "text-slate-500"} />
              {band} Intensity
            </h4>
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-500">Low</span>
              <div className={`h-3 w-32 rounded-full shadow-inner ${band === "NDBI" ? "bg-gradient-to-r from-transparent via-orange-400 to-red-600" : band === "NDVI" ? "bg-gradient-to-r from-transparent via-emerald-400 to-green-700" : isDarkMode ? "bg-gradient-to-r from-slate-800 to-slate-200" : "bg-gradient-to-r from-slate-200 to-slate-600"}`} />
              <span className="text-xs font-semibold text-slate-500">High</span>
            </div>
          </div>
        )}

        {expError && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-950 text-red-400 px-4 py-2 rounded border border-red-500 text-xs max-w-sm text-center z-[1000]">
            {expError}
          </div>
        )}
      </div>
    </div>
  );
};

export default Platform;
