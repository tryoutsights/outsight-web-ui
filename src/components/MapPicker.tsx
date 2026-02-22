import React, { useState, useCallback, useEffect } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import type { MapMouseEvent, MapRef } from "react-map-gl/mapbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Search, Loader2 } from "lucide-react";

import "mapbox-gl/dist/mapbox-gl.css";

// Mapbox token from environment variable
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapPickerProps {
  initialLat?: number;
  initialLon?: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (lat: number, lon: number) => void;
}

interface GeocodingFeature {
  id: string;
  place_name: string;
  center: [number, number];
}

export const MapPicker: React.FC<MapPickerProps> = ({
  initialLat,
  initialLon,
  isOpen,
  onOpenChange,
  onSelect,
}) => {
  // Default to a central location (e.g. New York) if no initial coordinates are given
  const defaultLat = 40.7128;
  const defaultLon = -74.0060;

  const [markerState, setMarkerState] = useState<{ lat: number; lon: number } | null>(null);
  const [viewState, setViewState] = useState({
    latitude: defaultLat,
    longitude: defaultLon,
    zoom: 4,
  });

  const mapRef = React.useRef<MapRef>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Reset marker and view when dialog opens or initial coordinates change
  useEffect(() => {
    if (isOpen) {
      const lat = initialLat !== undefined && !isNaN(initialLat) ? initialLat : defaultLat;
      const lon = initialLon !== undefined && !isNaN(initialLon) ? initialLon : defaultLon;

      if (initialLat !== undefined && initialLon !== undefined && !isNaN(initialLat) && !isNaN(initialLon)) {
        setMarkerState({ lat, lon });
      } else {
        setMarkerState(null);
      }

      setViewState({
        latitude: lat,
        longitude: lon,
        zoom: initialLat !== undefined && !isNaN(initialLat) ? 10 : 4,
      });

      setSearchQuery("");
      setSearchResults([]);
      setShowResults(false);
    }
  }, [isOpen, initialLat, initialLon]);

  const onMapClick = useCallback((event: MapMouseEvent) => {
    const { lng, lat } = event.lngLat;
    setMarkerState({ lat, lon: lng });
  }, []);

  const handleConfirm = () => {
    if (markerState) {
      // Return fixed precision to avoid excessively long values
      onSelect(Number(markerState.lat.toFixed(6)), Number(markerState.lon.toFixed(6)));
      onOpenChange(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery.trim() || !MAPBOX_TOKEN) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&types=place,postcode,address,poi&limit=5`
        );
        const data = await response.json();
        if (data.features) {
          setSearchResults(data.features);
          setShowResults(true);
        }
      } catch (error) {
        console.error("Geocoding search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectResult = (feature: GeocodingFeature) => {
    const [lon, lat] = feature.center;

    setMarkerState({ lat, lon });
    setSearchQuery(feature.place_name);
    setShowResults(false);

    // Fly to the new location
    mapRef.current?.flyTo({
      center: [lon, lat],
      zoom: 12,
      duration: 1500,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] w-[95vw] h-[80vh] flex flex-col p-0 glass border-border/50 gap-0 overflow-hidden">
        <DialogHeader className="p-4 md:p-6 pb-2 shrink-0">
          <DialogTitle className="text-xl">Select Location</DialogTitle>
          <DialogDescription>
            Click anywhere on the map to drop a pin. Zoom in for precision.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative mx-4 md:mx-6 mb-2 rounded-md overflow-hidden border border-border/50">
          {!MAPBOX_TOKEN ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 text-muted-foreground p-6 text-center">
              <div>
                <MapPin className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>Mapbox token is missing.</p>
                <p className="text-sm">Please add VITE_MAPBOX_TOKEN to your .env file.</p>
              </div>
            </div>
          ) : (
             <>
               <Map
                  ref={mapRef}
                  {...viewState}
                  onMove={evt => setViewState(evt.viewState)}
                  style={{ width: "100%", height: "100%" }}
                  mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                  mapboxAccessToken={MAPBOX_TOKEN}
                  onClick={onMapClick}
                  cursor="crosshair"
                >
                  <NavigationControl position="bottom-right" />

                  {markerState && (
                    <Marker longitude={markerState.lon} latitude={markerState.lat} anchor="bottom">
                      <MapPin className="h-8 w-8 text-primary drop-shadow-md animate-in slide-in-from-bottom-2" />
                    </Marker>
                  )}
              </Map>

              {/* Overlay Search Box */}
              <div className="absolute top-4 left-4 right-14 max-w-sm z-10">
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <Input
                    type="text"
                    placeholder="Search for a place..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                        if (searchResults.length > 0) setShowResults(true);
                    }}
                    className="pl-9 bg-background/90 backdrop-blur-md border-border/50 text-foreground shadow-sm h-10 w-full"
                  />
                </div>

                {showResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-background/95 backdrop-blur-md border border-border/50 rounded-md shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/80 focus:bg-secondary/80 focus:outline-none transition-colors border-b border-border/20 last:border-0 truncate"
                        onClick={() => handleSelectResult(result)}
                        title={result.place_name}
                      >
                        {result.place_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-4 md:p-6 pt-2 shrink-0 flex items-center justify-between sm:justify-between w-full">
          <div className="text-sm text-muted-foreground font-mono hidden sm:block">
            {markerState
              ? `${markerState.lat.toFixed(4)}, ${markerState.lon.toFixed(4)}`
              : "No coordinate selected"}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!markerState}
              className="bg-primary text-primary-foreground hover:glow-cyan"
            >
              Confirm Location
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
