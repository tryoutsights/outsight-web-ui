import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ControlPanelProps {
  onRetrieve: (lat: number, lon: number, date: string) => void;
  isLoading: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onRetrieve, isLoading }) => {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [date, setDate] = useState<Date>();

  const isValid = () => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    return (
      !isNaN(latNum) &&
      !isNaN(lonNum) &&
      latNum >= -90 &&
      latNum <= 90 &&
      lonNum >= -180 &&
      lonNum <= 180 &&
      date !== undefined
    );
  };

  const handleSubmit = () => {
    if (!isValid()) return;
    onRetrieve(parseFloat(lat), parseFloat(lon), format(date!, "yyyy-MM-dd"));
  };

  return (
    <div className="glass rounded-lg p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Satellite className="h-5 w-5 text-primary" />
        <h1 className="text-sm font-semibold tracking-widest uppercase text-foreground">
          Outsight
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Latitude
          </Label>
          <Input
            type="number"
            placeholder="40.7128"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            min={-90}
            max={90}
            step="any"
            className="bg-background/50 border-border/50 focus:border-primary focus:ring-primary placeholder:text-muted-foreground/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Longitude
          </Label>
          <Input
            type="number"
            placeholder="-74.0060"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            min={-180}
            max={180}
            step="any"
            className="bg-background/50 border-border/50 focus:border-primary focus:ring-primary placeholder:text-muted-foreground/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-background/50 border-border/50 hover:bg-secondary",
                  !date && "text-muted-foreground/40"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isValid() || isLoading}
          className="w-full bg-primary text-primary-foreground font-semibold tracking-wide hover:glow-cyan transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Retrieving…
            </>
          ) : (
            "Retrieve EO Data"
          )}
        </Button>
      </div>
    </div>
  );
};

export default ControlPanel;
