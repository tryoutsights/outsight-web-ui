import React, { useEffect, useRef, useState } from "react";
import { Cloud, Loader2 } from "lucide-react";
import { fromUrl } from "geotiff";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageryData {
  image_url: string;
  satellite_name: string;
  cloud_cover: number;
  capture_date: string;
  render_payload?: {
    cog_urls?: string[];
    bbox?: number[];
    [key: string]: unknown;
  };
}

type CanvasState = "empty" | "loading" | "loaded" | "error";

interface VisualizationCanvasProps {
  state: CanvasState;
  data?: ImageryData[] | null;
  errorMessage?: string;
}

const TiffImage: React.FC<{ url: string; alt: string; className?: string }> = ({ url, alt, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadTiff = async () => {
      try {
        setLoading(true);
        const tiff = await fromUrl(url);
        const count = await tiff.getImageCount();

        // Use a smaller overview downsampled for web viewing (usually index 2 or 3)
        const imgIndex = Math.max(0, count - 2);
        const image = await tiff.getImage(imgIndex);

        const width = image.getWidth();
        const height = image.getHeight();
        const rasters = await image.readRasters({ interleave: true });

        if (!isMounted) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const imageData = ctx.createImageData(width, height);
        const rasterData = rasters as ArrayLike<number>;
        // Map 3-band RGB Uint8 to 4-band RGBA for canvas rendering
        let j = 0;
        for (let i = 0; i < rasterData.length; i += 3) {
          imageData.data[j] = rasterData[i];
          imageData.data[j + 1] = rasterData[i + 1];
          imageData.data[j + 2] = rasterData[i + 2];
          imageData.data[j + 3] = 255; // Alpha
          j += 4;
        }
        ctx.putImageData(imageData, 0, 0);
        setLoading(false);
      } catch (err) {
        if (isMounted) {
          console.error("Error rendering TIFF:", err);
          setError("Failed to render TIFF image");
          setLoading(false);
        }
      }
    };

    loadTiff();
    return () => { isMounted = false; };
  }, [url]);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/10 text-destructive text-sm p-4 text-center z-10 mt-10">
          {error}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-[60vh] object-contain shadow-sm"
        aria-label={alt}
      />
    </div>
  );
};

const VisualizationCanvas: React.FC<VisualizationCanvasProps> = ({
  state,
  data,
  errorMessage,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeImageUrl, setActiveImageUrl] = useState<string>("");
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [analysisPrompt, setAnalysisPrompt] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<{ analysis: string; key_features: string[] } | null>(null);
  const imageCache = useRef<Map<string, string>>(new Map<string, string>());

  useEffect(() => {
    const cachedImages = imageCache.current;
    return () => {
      for (const url of cachedImages.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  useEffect(() => {
    if (!data || data.length === 0 || !data[activeIndex]) return;

    const currentItem = data[activeIndex];
    console.log(`[VisualizationCanvas] Activating index ${activeIndex} for date ${currentItem.capture_date}`);

    if (currentItem.image_url.toLowerCase().endsWith(".tif") || currentItem.image_url.toLowerCase().endsWith(".tiff") || !currentItem.render_payload) {
      console.log(`[VisualizationCanvas] Skipping rendering for static/TIF resource: ${currentItem.image_url}`);
      setActiveImageUrl(currentItem.image_url);
      setIsRendering(false);
      return;
    }

    const cacheKey = currentItem.render_payload ? JSON.stringify(currentItem.render_payload) : currentItem.capture_date;

    if (imageCache.current.has(cacheKey)) {
      console.log(`[VisualizationCanvas] Cache Hit: Loading Object URL for ${currentItem.capture_date}`);
      setActiveImageUrl(imageCache.current.get(cacheKey)!);
      setIsRendering(false);
      return;
    }

    console.log(`[VisualizationCanvas] Cache Miss: Initiating render for ${currentItem.capture_date}`);

    let isMounted = true;
    setIsRendering(true);

    const fetchMosaic = async () => {
      console.log(`[VisualizationCanvas] POST /api/render payload:`, currentItem.render_payload);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      try {
        const response = await fetch(`${API_BASE_URL}/api/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentItem.render_payload)
        });

        console.log(`[VisualizationCanvas] POST /api/render response status: ${response.status}`);

        if (!response.ok) throw new Error("Network response was not ok");

        const blob = await response.blob();
        console.log(`[VisualizationCanvas] Render response Blob generated: ${blob.size} bytes`);
        const localUrl = URL.createObjectURL(blob);
        console.log(`[VisualizationCanvas] Object URL generated for cache: ${localUrl}`);

        if (isMounted) {
          imageCache.current.set(cacheKey, localUrl);
          setActiveImageUrl(localUrl);
        }
      } catch (err) {
        console.error("Failed to render image via POST", err);
        if (isMounted) {
          setActiveImageUrl(currentItem.image_url);
        }
      } finally {
        if (isMounted) {
          setIsRendering(false);
        }
      }
    };

    fetchMosaic();

    return () => { isMounted = false; };
  }, [activeIndex, data]);

  // Reset slider and clear analysis when new data arrives or index changes
  useEffect(() => {
    setActiveIndex(0);
    setAnalysisResult(null);
  }, [data]);

  useEffect(() => {
    setAnalysisResult(null);
  }, [activeIndex]);

  const handleAnalyze = async () => {
    if (!data || data.length === 0 || !data[activeIndex]) return;
    if (!analysisPrompt.trim()) {
      toast.error("Please enter a prompt for the analysis.");
      return;
    }

    const currentItem = data[activeIndex];
    setIsAnalyzing(true);
    setAnalysisResult(null);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

    try {
      const sortedData = [...data].sort((a, b) => new Date(a.capture_date).getTime() - new Date(b.capture_date).getTime());
      const minDate = sortedData[0];
      const maxDate = sortedData[sortedData.length - 1];
      const minTime = new Date(minDate.capture_date).getTime();
      const maxTime = new Date(maxDate.capture_date).getTime();
      const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
      const span = maxTime - minTime;

      let bestSelection: typeof sortedData = [];

      if (sortedData.length <= 2) {
        bestSelection = sortedData;
      } else {
        let maxK = 0;
        for (let k = Math.min(10, sortedData.length); k >= 3; k--) {
          const interval = span / (k - 1);
          const currentSelection = [minDate];
          let valid = true;

          for (let i = 1; i < k - 1; i++) {
            const idealTime = minTime + i * interval;
            let closestIdx = -1;
            let minDiff = Infinity;
            const lastTime = new Date(currentSelection[currentSelection.length - 1].capture_date).getTime();

            for (let j = 1; j < sortedData.length - 1; j++) {
              const time = new Date(sortedData[j].capture_date).getTime();
              const remainingPoints = k - 1 - i;
              if (time - lastTime >= TEN_DAYS && maxTime - time >= remainingPoints * TEN_DAYS) {
                const diff = Math.abs(time - idealTime);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestIdx = j;
                }
              }
            }

            if (closestIdx !== -1) {
              currentSelection.push(sortedData[closestIdx]);
            } else {
              valid = false;
              break;
            }
          }

          if (valid) {
            const lastSelectedTime = new Date(currentSelection[currentSelection.length - 1].capture_date).getTime();
            if (maxTime - lastSelectedTime >= TEN_DAYS) {
              currentSelection.push(maxDate);
              bestSelection = currentSelection;
              maxK = k;
              break;
            }
          }
        }

        if (maxK === 0) {
          bestSelection = [minDate, maxDate];
        }
      }

      const image_sets = bestSelection.map(item => ({
        date: item.capture_date.split('T')[0],
        cog_urls: item.render_payload?.cog_urls || []
      }));

      const payload = {
        prompt: analysisPrompt,
        image_sets: image_sets,
        bbox: currentItem.render_payload?.bbox || []
      };

      const res = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        let errMsg = errData.detail || "Analysis failed.";

        if (typeof errMsg === 'string') {
          if (errMsg.toLowerCase().includes("api key")) {
            errMsg = "Invalid or missing API key. Please check your backend configuration.";
          } else if (errMsg.length > 150) {
            errMsg = "An internal error occurred during analysis. Please check server logs.";
          }
        } else {
          errMsg = "An unexpected error occurred.";
        }

        throw new Error(errMsg);
      }

      const result = await res.json();
      setAnalysisResult(result);
      toast.success("Analysis complete.");
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unexpected analysis error.";
      toast.error("Analysis Failed", { description: message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentImage = data && data.length > 0 ? data[activeIndex] : null;

  return (
    <div className="relative flex-1 flex flex-col rounded-lg border border-border/30 overflow-hidden bg-background/50">
      {/* Empty State */}
      {state === "empty" && (
        <div className="absolute inset-0 dot-grid flex items-center justify-center">
          <p className="pulse-soft text-muted-foreground text-lg tracking-widest uppercase font-light">
            Awaiting coordinates…
          </p>
        </div>
      )}

      {/* Loading State */}
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="dot-grid absolute inset-0 opacity-30" />
          {/* Scan line */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent scan-line opacity-70" />
          <p className="pulse-soft text-primary text-lg tracking-widest uppercase font-light z-10">
            Retrieving imagery…
          </p>
        </div>
      )}

      {/* Loaded State */}
      {state === "loaded" && currentImage && data && (
        <div className="flex flex-1 w-full flex-col items-center justify-start p-4 md:p-6 animate-[fade-in_0.6s_ease-out]">
          <div className="relative w-full max-w-[60vh] md:max-w-[70vh] mx-auto aspect-square shrink-0 rounded-lg overflow-hidden glow-cyan-sm border border-primary/20 bg-background/80">
            {currentImage.image_url.toLowerCase().endsWith(".tif") || currentImage.image_url.toLowerCase().endsWith(".tiff") ? (
              <TiffImage
                url={activeImageUrl || currentImage.image_url}
                alt={`Satellite imagery from ${currentImage.satellite_name}`}
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                {isRendering && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-30 rounded-lg gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs text-primary font-medium tracking-widest uppercase animate-pulse">
                      Rendering Image...
                    </span>
                  </div>
                )}
                {activeImageUrl && (
                  <img
                    src={activeImageUrl}
                    alt={`Satellite imagery from ${currentImage.satellite_name}`}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${isRendering ? 'opacity-0' : 'opacity-100'}`}
                  />
                )}
              </div>
            )}
            {/* Status badge */}
            <div className="absolute top-3 right-3 glass rounded-full px-3 py-1.5 flex items-center gap-2 text-xs font-medium z-20 shadow-md">
              <span className="text-primary font-semibold">
                {currentImage.satellite_name}
              </span>
              <span className="w-px h-3 bg-border/50" />
              <Cloud className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {currentImage.cloud_cover.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Timeline Slider */}
          <div className="w-full max-w-lg mt-6 flex items-center gap-2 bg-background/50 p-2 md:p-3 rounded-lg border border-border/50 backdrop-blur-sm shadow-sm">
            <div className="text-sm font-medium text-foreground w-28 shrink-0 text-right pr-2">
              {format(new Date(currentImage.capture_date), "MMM d, yyyy")}
            </div>

            <button
              onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="p-1 rounded-md hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              aria-label="Previous image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m15 18-6-6 6-6"/></svg>
            </button>

            {data.length > 1 ? (
              <Slider
                value={[activeIndex]}
                min={0}
                max={data.length - 1}
                step={1}
                onValueChange={(val) => setActiveIndex(val[0])}
                className="flex-1 cursor-grab active:cursor-grabbing px-2"
              />
            ) : (
              <div className="flex-1 mx-2 h-2 bg-secondary rounded-full" />
            )}

            <button
              onClick={() => setActiveIndex(Math.min(data.length - 1, activeIndex + 1))}
              disabled={activeIndex === data.length - 1}
              className="p-1 rounded-md hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              aria-label="Next image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m9 18 6-6-6-6"/></svg>
            </button>

            <div className="text-xs text-muted-foreground shrink-0 tabular-nums w-12 text-center pl-2">
              {activeIndex + 1} / {data.length}
            </div>
          </div>

          {/* AI Analysis Section */}
          <div className="w-full max-w-lg mt-4 flex flex-col gap-3 bg-background/50 p-4 rounded-lg border border-border/50 backdrop-blur-sm shadow-sm">
            <h3 className="text-sm font-semibold text-primary">Analyze Image</h3>
            <div className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="What geographical features are visible here?"
                value={analysisPrompt}
                onChange={(e) => setAnalysisPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAnalyze();
                  }
                }}
                disabled={isAnalyzing || isRendering}
                className="bg-background/80"
              />
              <Button onClick={handleAnalyze} disabled={isAnalyzing || isRendering || !analysisPrompt.trim()}>
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Analyze
              </Button>
            </div>

            {analysisResult && (
              <div className="mt-2 p-3 bg-muted/30 rounded border border-border/30 text-sm animate-in fade-in zoom-in duration-300">
                <p className="text-foreground leading-relaxed mb-3">{analysisResult.analysis}</p>
                {analysisResult.key_features && analysisResult.key_features.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {analysisResult.key_features.map((feature, idx) => (
                      <span key={idx} className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-md">
                        {feature}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {state === "error" && (
        <div className="absolute inset-0 dot-grid flex flex-col items-center justify-center gap-2">
          <p className="text-destructive text-sm font-medium">
            {errorMessage || "No imagery found"}
          </p>
          <p className="text-muted-foreground text-xs">
            Adjust coordinates or date range and try again
          </p>
        </div>
      )}
    </div>
  );
};

export default VisualizationCanvas;
