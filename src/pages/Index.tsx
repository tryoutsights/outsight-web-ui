import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import ControlPanel from "@/components/ControlPanel";
import VisualizationCanvas from "@/components/VisualizationCanvas";

interface ImageryData {
  image_url: string;
  satellite_name: string;
  cloud_cover: number;
  date: string;
}

const fetchImagery = async (lat: number, lon: number, date: string): Promise<ImageryData> => {
  const res = await fetch(
    `http://localhost:8000/api/imagery?lat=${lat}&lon=${lon}&date=${date}`
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `Request failed (${res.status})`);
  }
  const json = await res.json();
  if (!json.imagery) {
    throw new Error("No imagery data found in response");
  }
  return {
    image_url: json.imagery.visual_asset_url,
    satellite_name: json.imagery.platform || "Sentinel-2",
    cloud_cover: json.imagery.cloud_cover_percentage,
    date: json.imagery.capture_datetime
  };
};

const Index = () => {
  const [params, setParams] = useState<{ lat: number; lon: number; date: string } | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["imagery", params],
    queryFn: () => fetchImagery(params!.lat, params!.lon, params!.date),
    enabled: !!params,
    retry: false,
  });

  // Show toast on error
  React.useEffect(() => {
    if (isError && error) {
      toast.error("Failed to retrieve imagery", {
        description: (error as Error).message,
      });
    }
  }, [isError, error]);

  const handleRetrieve = (lat: number, lon: number, date: string) => {
    setParams({ lat, lon, date });
  };

  const canvasState = !params
    ? "empty"
    : isLoading
      ? "loading"
      : isError
        ? "error"
        : data
          ? "loaded"
          : "empty";

  return (
    <div className="flex flex-col h-screen p-3 md:p-4 gap-3 md:gap-4">
      <ControlPanel onRetrieve={handleRetrieve} isLoading={isLoading} />
      <VisualizationCanvas
        state={canvasState as any}
        data={data}
        errorMessage={isError ? (error as Error).message : undefined}
      />
    </div>
  );
};

export default Index;
