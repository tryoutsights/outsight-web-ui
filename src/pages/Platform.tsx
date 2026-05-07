import React, { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity,
  Bot,
  FileText,
  Layers,
  Moon,
  Sliders,
  Satellite,
  Sun,
} from "lucide-react";
import UnifiedMap from "./platform/UnifiedMap";
import { useLayerManager } from "./platform/layers";
import ChatPanel from "./platform/panels/ChatPanel";
import ExpansionControlsPanel from "./platform/panels/ExpansionControlsPanel";
import ImageryControlsPanel from "./platform/panels/ImageryControlsPanel";
import InsightsPanel from "./platform/panels/InsightsPanel";
import LayersPanel from "./platform/panels/LayersPanel";
import { useCopilotChat } from "./platform/hooks/useCopilotChat";
import { useExpansionPipeline } from "./platform/hooks/useExpansionPipeline";
import { useImageryPipeline } from "./platform/hooks/useImageryPipeline";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/hooks/use-auth";
import { useResizablePanel } from "@/hooks/use-resizable-panel";
import { apiFetch } from "@/lib/api-client";
import { ANALYZE_MAX_IMAGE_SETS } from "./platform/constants";
import {
  LEFT_PANEL_DEFAULT_WIDTH,
  LEFT_PANEL_MAX_WIDTH,
  LEFT_PANEL_MIN_WIDTH,
} from "./platform/lib";
import type {
  ActiveTab,
  Coordinates,
  DateRange,
  SpectralBand,
} from "./platform/lib";

const Platform = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("outsights-theme");
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
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
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState("");
  const [analysisPrompt, setAnalysisPrompt] = useState(
    "Provide a concise geospatial change summary and key features."
  );

  // ---------------------------------------------------------------------------
  // Mode toggle: "imagery" | "expansion"
  // ---------------------------------------------------------------------------
  const [mode, setMode] = useState<"imagery" | "expansion">("imagery");

  // Layer manager (imagery + expansion layers rendered on unified map)
  const { layers: mapLayers, addLayer, removeLayer, toggleLayer, updateLayer } = useLayerManager();

  const { width: leftPanelWidth, startResize } = useResizablePanel({
    initialWidth: LEFT_PANEL_DEFAULT_WIDTH,
    minWidth: LEFT_PANEL_MIN_WIDTH,
    maxWidth: LEFT_PANEL_MAX_WIDTH,
  });
  const { requestSignIn } = useAuth();

  const {
    datasets,
    selectedSlug,
    setSelectedSlug,
    drawMode,
    setDrawMode,
    expBbox,
    expAnalytics,
    expLoading,
    expError,
    datasetsLoading,
    datasetsError,
    runExpansionQuery,
    handleExpansionClear,
    expSelectedYear,
    cells,
  } = useExpansionPipeline({ mode, mapLayers, addLayer, removeLayer });

  const {
    data,
    isLoading,
    activeImageUrl,
    isRendering,
    selectedItem,
    hasOverlay,
    handleRetrieve,
  } = useImageryPipeline({
    band,
    coordinates,
    dateRange,
    areaSize,
    cloudCover,
    addLayer,
  });

  const appendRetrieveMessage = (text: string) => {
    setMessages((prev) => [...prev, { role: "bot", text }]);
  };

  const { messages, setMessages, chatInput, setChatInput, isChatTyping, handleChatSubmit } =
    useCopilotChat({
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
    });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    window.localStorage.setItem("outsights-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    setInsights("");
  }, [data]);



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
      const image_sets = sortedData.slice(0, ANALYZE_MAX_IMAGE_SETS).map((item) => ({
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

  const isCompactTabs = leftPanelWidth < 430;
  const panelTabs = [
    { id: "chat" as const, label: "Copilot", Icon: Bot },
    { id: "controls" as const, label: "Controls", Icon: Sliders },
    { id: "insights" as const, label: "Insights", Icon: FileText },
    { id: "layers" as const, label: "Layers", Icon: Layers },
  ];

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden bg-background text-foreground transition-colors duration-300">
      <div
        style={{ width: `${leftPanelWidth}px` }}
        className="h-full shrink-0 border-r border-border flex flex-col z-10 shadow-2xl bg-card transition-colors duration-300"
      >
        <div className="p-5 border-b border-border flex items-center justify-between bg-gradient-to-r from-teal-500/5 to-emerald-500/5 transition-colors duration-300">
          <Link to="/" className="flex items-center gap-3 group" title="Back to home">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2 rounded-lg text-white flex-shrink-0 shadow-md">
              <Satellite size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-wide leading-tight text-foreground group-hover:text-teal-500 transition-colors">
                Outsights
              </h1>
              <p className="text-xs font-medium text-muted-foreground">
                AI-Guided Spatial Analytics
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <UserMenu isDark={isDarkMode} />
            <button
              onClick={() => setIsDarkMode((p) => !p)}
              className="p-2 rounded-full transition-colors shadow-sm border border-transparent text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-stretch border-b border-border bg-card transition-colors duration-300 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {panelTabs.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            const showLabel = !isCompactTabs || isActive;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                title={isCompactTabs && !isActive ? label : undefined}
                className={`shrink-0 flex items-center border-b-2 text-xs font-bold uppercase tracking-wider transition-colors py-3 ${
                  isCompactTabs
                    ? isActive
                      ? "min-w-[132px] px-3 gap-2 justify-start"
                      : "w-10 px-0 justify-center"
                    : "flex-1 min-w-0 px-3 gap-2 justify-center"
                } ${
                  isActive
                    ? "text-teal-500 border-teal-500 bg-teal-500/10"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {showLabel && <span className="truncate">{label}</span>}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeTab === "chat" && (
            <ChatPanel
              coordinates={coordinates}
              areaSize={areaSize}
              cloudCover={cloudCover}
              band={band}
              messages={messages}
              isLoading={isLoading}
              isChatTyping={isChatTyping}
              chatInput={chatInput}
              setChatInput={setChatInput}
              onRetrieve={() => handleRetrieve(undefined, appendRetrieveMessage)}
              onChatSubmit={handleChatSubmit}
            />
          )}

          {activeTab === "controls" && mode === "expansion" && (
            <ExpansionControlsPanel
              mode={mode}
              setMode={setMode}
              datasets={datasets}
              datasetsLoading={datasetsLoading}
              datasetsError={datasetsError}
              selectedSlug={selectedSlug}
              setSelectedSlug={setSelectedSlug}
              onClear={handleExpansionClear}
              drawMode={drawMode}
              setDrawMode={setDrawMode}
              expLoading={expLoading}
              expAnalytics={expAnalytics}
              expSelectedYear={expSelectedYear}
              mapLayers={mapLayers}
              hasCellsOrBbox={Boolean(cells.length || expBbox)}
            />
          )}

          {activeTab === "controls" && mode === "imagery" && (
            <ImageryControlsPanel
              mode={mode}
              setMode={setMode}
              coordinates={coordinates}
              setCoordinates={setCoordinates}
              dateRange={dateRange}
              setDateRange={setDateRange}
              areaSize={areaSize}
              setAreaSize={setAreaSize}
              cloudCover={cloudCover}
              setCloudCover={setCloudCover}
              band={band}
              setBand={setBand}
              isLoading={isLoading}
              onRetrieve={() => handleRetrieve(undefined, appendRetrieveMessage)}
            />
          )}

          {activeTab === "insights" && (
            <InsightsPanel
              hasOverlay={hasOverlay}
              isGeneratingInsights={isGeneratingInsights}
              insights={insights}
              onGenerateInsights={handleGenerateInsights}
            />
          )}

          {activeTab === "layers" && (
            <LayersPanel
              mapLayers={mapLayers}
              toggleLayer={toggleLayer}
              removeLayer={removeLayer}
              updateLayer={updateLayer}
            />
          )}
        </div>
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize left dashboard"
        onMouseDown={startResize}
        className="w-1 shrink-0 cursor-col-resize bg-border/80 hover:bg-teal-500/80 transition-colors"
      />

      <div className="flex-1 relative overflow-hidden bg-background transition-colors duration-300">
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
          <div className="absolute bottom-8 right-8 backdrop-blur-md border border-border bg-card/95 p-5 rounded-2xl shadow-2xl z-[1000] transition-colors duration-300">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-card-foreground">
              <Activity size={14} className={band === "NDBI" ? "text-orange-500" : band === "NDVI" ? "text-emerald-500" : "text-muted-foreground"} />
              {band} Intensity
            </h4>
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-muted-foreground">Low</span>
              <div className={`h-3 w-32 rounded-full shadow-inner ${band === "NDBI" ? "bg-gradient-to-r from-transparent via-orange-400 to-red-600" : band === "NDVI" ? "bg-gradient-to-r from-transparent via-emerald-400 to-green-700" : "bg-gradient-to-r from-muted to-foreground/60"}`} />
              <span className="text-xs font-semibold text-muted-foreground">High</span>
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
