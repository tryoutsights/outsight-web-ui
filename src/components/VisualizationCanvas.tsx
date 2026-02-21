import React from "react";
import { Cloud } from "lucide-react";

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
            <img
              src={data.image_url}
              alt={`Satellite imagery from ${data.satellite_name}`}
              className="max-w-full max-h-[70vh] object-contain"
            />
            {/* Status badge */}
            <div className="absolute top-3 right-3 glass rounded-full px-3 py-1.5 flex items-center gap-2 text-xs font-medium">
              <span className="text-primary font-semibold">
                {data.satellite_name}
              </span>
              <span className="w-px h-3 bg-border/50" />
              <Cloud className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {data.cloud_cover}%
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
