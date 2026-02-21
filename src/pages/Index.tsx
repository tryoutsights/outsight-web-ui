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

const fetchImagery = async (lat: number, lon: number, startDate: string, endDate: string): Promise<ImageryData[]> => {
  const res = await fetch(
    `http://localhost:8000/api/imagery?lat=${lat}&lon=${lon}&start_date=${startDate}&end_date=${endDate}`
  );
  if (!res.ok) {
    const text = await res.text();
    let errorMessage = `Request failed (${res.status})`;
    try {
      const errorJson = JSON.parse(text);
      if (errorJson.detail) {
        // Handle cases where the detail itself is a stringified JSON (from FastAPI HttpException)
        try {
           const nestedJson = JSON.parse(errorJson.detail);
           errorMessage = nestedJson.detail || errorJson.detail;
        } catch {
           errorMessage = errorJson.detail;
        }
      } else {
        errorMessage = text;
      }
    } catch (e) {
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }
  const json = await res.json();
  if (!Array.isArray(json)) {
    throw new Error("Invalid response format: expected an array");
  }
  return json.map((item: any) => ({
    image_url: item.image_url,
    satellite_name: item.satellite || "Sentinel-2",
    cloud_cover: item.cloud_cover,
    date: item.capture_date
  }));
};

const Index = () => {
  const [params, setParams] = useState<{ lat: number; lon: number; startDate: string; endDate: string } | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["imagery", params],
    queryFn: () => fetchImagery(params!.lat, params!.lon, params!.startDate, params!.endDate),
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

  const handleRetrieve = (lat: number, lon: number, startDate: string, endDate: string) => {
    setParams({ lat, lon, startDate, endDate });
    // Force a refetch if the params are exactly the same and useQuery ignores the state update
    if (params && params.lat === lat && params.lon === lon && params.startDate === startDate && params.endDate === endDate) {
      refetch();
    }
  };

  const canvasState = !params
    ? "empty"
    : isLoading
      ? "loading"
      : isError
        ? "error"
        : data && data.length > 0
          ? "loaded"
          : "error";

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
