import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchStoreInfo, queryAnalytics, queryMap } from "../../expansion/lib";
import type { AnalyticsResult, BBox, Dataset } from "../../expansion/lib";
import type { LayerDef } from "../layers";

type Args = {
  mode: "imagery" | "expansion";
  mapLayers: LayerDef[];
  addLayer: (layer: LayerDef) => void;
  removeLayer: (id: string) => void;
};

export function useExpansionPipeline({ mode, mapLayers, addLayer, removeLayer }: Args) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>("");
  const [drawMode, setDrawMode] = useState(false);
  const [expBbox, setExpBbox] = useState<[number, number, number, number] | null>(null);
  const [expAnalytics, setExpAnalytics] = useState<AnalyticsResult | null>(null);
  const [expLoading, setExpLoading] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [datasetsError, setDatasetsError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "expansion" || datasets.length > 0) return;
    setDatasetsLoading(true);
    fetchStoreInfo()
      .then((info) => {
        const ds = info.cities.map(c => {
          let displayName = c.city_slug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
          if (c.city_slug === "nac_egypt") displayName = "New Administrative Capital, Egypt";
          if (c.city_slug === "bangalore") displayName = "Bangalore, India";
          
          return {
            slug: c.city_slug,
            display_name: displayName,
            bbox: c.bbox
          };
        });
        setDatasets(ds);
        if (ds.length > 0) setSelectedSlug(ds[0].slug);
      })
      .catch((e: Error) => setDatasetsError(e.message))
      .finally(() => setDatasetsLoading(false));
  }, [mode, datasets.length]);

  const runExpansionQuery = useCallback(
    async (newBbox: BBox, targetYear?: number) => {
      setExpError(null);
      setExpLoading(true);
      const bboxTuple: [number, number, number, number] = [
        newBbox.minLat,
        newBbox.minLon,
        newBbox.maxLat,
        newBbox.maxLon,
      ];
      setExpBbox(bboxTuple);
      try {
        const [mapResult, analyticsResult] = await Promise.all([
          queryMap(newBbox),
          queryAnalytics(newBbox),
        ]);
        if (mapResult.status === "empty") {
          setExpError("No data in this region. Check the dataset AOI.");
          return;
        }
        const years = mapResult.years ?? [];
        setExpAnalytics(analyticsResult);
        const displayName =
          datasets.find((d) => d.slug === selectedSlug)?.display_name || "Custom Area";
          
        let initialYearIdx = years.length ? years.length - 1 : 0;
        if (targetYear !== undefined && years.includes(targetYear)) {
          initialYearIdx = years.indexOf(targetYear);
        }
        
        addLayer({
          kind: "expansion",
          id: "expansion-current",
          label: `${displayName} — H3 r10`,
          visible: true,
          cells: mapResult.cells ?? [],
          years,
          selectedYearIdx: initialYearIdx,
          bbox: bboxTuple,
        } satisfies LayerDef);
      } catch (e) {
        setExpError((e as Error).message);
      } finally {
        setExpLoading(false);
        setDrawMode(false);
      }
    },
    [selectedSlug, datasets, addLayer]
  );

  const handleExpansionClear = useCallback(() => {
    setExpAnalytics(null);
    setExpBbox(null);
    setExpError(null);
    removeLayer("expansion-current");
  }, [removeLayer]);

  const expLayer = useMemo(
    () => mapLayers.find((l) => l.id === "expansion-current"),
    [mapLayers]
  );
  const expSelectedYear =
    expLayer?.kind === "expansion" ? expLayer.years[expLayer.selectedYearIdx] : undefined;
  const cells = expLayer?.kind === "expansion" ? expLayer.cells : [];

  return {
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
  };
}
