import React, { useEffect, useRef, useState } from "react";
import { Cloud, Loader2 } from "lucide-react";
import { fromUrl } from "geotiff";

interface ImageryData {
  image_url: string;
  satellite_name: string;
  cloud_cover: number;
  date: string;
}

type CanvasState = "empty" | "loading" | "loaded" | "error";

interface VisualizationCanvasProps {
  state: CanvasState;
  data?: ImageryData | null;
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
        className="max-w-full max-h-[70vh] object-contain shadow-sm"
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
  return (
    <div className="relative flex-1 rounded-lg border border-border/30 overflow-hidden bg-background/50">
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
      {state === "loaded" && data && (
        <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8 animate-[fade-in_0.6s_ease-out]">
          <div className="relative max-w-full max-h-full rounded-lg overflow-hidden glow-cyan-sm border border-primary/20">
            {(data.image_url.toLowerCase().endsWith(".tif") || data.image_url.toLowerCase().endsWith(".tiff")) ? (
              <TiffImage
                url={data.image_url}
                alt={`Satellite imagery from ${data.satellite_name}`}
                className="w-full h-[70vh] aspect-square"
              />
            ) : (
              <img
                src={data.image_url}
                alt={`Satellite imagery from ${data.satellite_name}`}
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
            {/* Status badge */}
            <div className="absolute top-3 right-3 glass rounded-full px-3 py-1.5 flex items-center gap-2 text-xs font-medium z-20 shadow-md">
              <span className="text-primary font-semibold">
                {data.satellite_name}
              </span>
              <span className="w-px h-3 bg-border/50" />
              <Cloud className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {data.cloud_cover.toFixed(2)}%
              </span>
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
            Adjust coordinates or date and try again
          </p>
        </div>
      )}
    </div>
  );
};

export default VisualizationCanvas;
