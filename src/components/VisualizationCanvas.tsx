import React, { useEffect, useRef, useState } from "react";
import { Cloud, Loader2 } from "lucide-react";
import { fromUrl } from "geotiff";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";

interface ImageryData {
  image_url: string;
  satellite_name: string;
  cloud_cover: number;
  capture_date: string;
  render_payload?: any;
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
        // Map 3-band RGB Uint8 to 4-band RGBA for canvas rendering
        let j = 0;
        for (let i = 0; i < (rasters as any).length; i += 3) {
          imageData.data[j] = (rasters as any)[i];
          imageData.data[j + 1] = (rasters as any)[i + 1];
          imageData.data[j + 2] = (rasters as any)[i + 2];
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
  const imageCache = useRef<Map<string, string>>(new Map<string, string>());

  useEffect(() => {
    return () => {
      for (const url of imageCache.current.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  useEffect(() => {
    if (!data || data.length === 0 || !data[activeIndex]) return;

    const currentItem = data[activeIndex];

    if (currentItem.image_url.toLowerCase().endsWith(".tif") || currentItem.image_url.toLowerCase().endsWith(".tiff") || !currentItem.render_payload) {
      setActiveImageUrl(currentItem.image_url);
      setIsRendering(false);
      return;
    }

    if (imageCache.current.has(currentItem.capture_date)) {
      setActiveImageUrl(imageCache.current.get(currentItem.capture_date)!);
      setIsRendering(false);
      return;
    }

    let isMounted = true;
    setIsRendering(true);

    const fetchImage = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentItem.render_payload)
        });

        if (!response.ok) throw new Error("Network response was not ok");

        const blob = await response.blob();
        const localUrl = URL.createObjectURL(blob);

        if (isMounted) {
          imageCache.current.set(currentItem.capture_date, localUrl);
          setActiveImageUrl(localUrl);
          setIsRendering(false);
        }
      } catch (err) {
        console.error("Failed to render image via POST", err);
        if (isMounted) {
          setActiveImageUrl(currentItem.image_url);
          setIsRendering(false);
        }
      }
    };

    fetchImage();

    return () => { isMounted = false; };
  }, [activeIndex, data]);

  // Reset slider when new data arrives
  useEffect(() => {
    setActiveIndex(0);
  }, [data]);

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
