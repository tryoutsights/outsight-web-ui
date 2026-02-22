import React, { useState } from "react";
import { format, parse } from "date-fns";
import { CalendarIcon, Loader2, Satellite, MapPin } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { MapPicker } from "./MapPicker";

interface ControlPanelProps {
  onRetrieve: (lat: number, lon: number, startDate: string, endDate: string, areaSize: number, maxCloudCover: number) => void;
  isLoading: boolean;
}

const DateInput = ({ label, date, onDateChange }: { label: string, date: Date | undefined, onDateChange: (d: Date | undefined) => void }) => {
  const [inputValue, setInputValue] = useState(date ? format(date, "yyyy-MM-dd") : "");
  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.length === 10) {
      const parsedDate = parse(value, "yyyy-MM-dd", new Date());
      if (!isNaN(parsedDate.getTime())) {
        onDateChange(parsedDate);
      } else {
        onDateChange(undefined);
      }
    } else {
      onDateChange(undefined);
    }
  };

  const handleCalendarSelect = (newDate: Date | undefined) => {
    onDateChange(newDate);
    if (newDate) {
      setInputValue(format(newDate, "yyyy-MM-dd"));
      setIsOpen(false);
    } else {
      setInputValue("");
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex w-full items-center rounded-md border border-border/50 bg-background/50 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-colors h-10">
          <Input
            type="text"
            placeholder="YYYY-MM-DD"
            value={inputValue}
            onChange={handleInputChange}
            className="border-0 focus-visible:ring-0 bg-transparent flex-1 rounded-none px-3"
          />
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "px-3 rounded-none hover:bg-secondary shrink-0 h-10 border-l border-border/50",
                !date && "text-muted-foreground/40"
              )}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            initialFocus
            captionLayout="dropdown"
            fromYear={2015}
            toYear={2026}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

const ControlPanel: React.FC<ControlPanelProps> = ({ onRetrieve, isLoading }) => {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [areaSize, setAreaSize] = useState("1"); // Default to 1x1 km
  const [maxCloudCover, setMaxCloudCover] = useState([100]);
  const [isMapOpen, setIsMapOpen] = useState(false);

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
      startDate !== undefined &&
      endDate !== undefined &&
      startDate <= endDate
    );
  };

  const handleSubmit = () => {
    if (!isValid()) return;
    onRetrieve(parseFloat(lat), parseFloat(lon), format(startDate!, "yyyy-MM-dd"), format(endDate!, "yyyy-MM-dd"), parseInt(areaSize, 10), maxCloudCover[0]);
  };

  return (
    <div className="glass rounded-lg p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Satellite className="h-5 w-5 text-primary" />
        <h1 className="text-sm font-semibold tracking-widest uppercase text-foreground">
          Outsight
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 items-end">
        <div className="space-y-1.5 relative">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Latitude
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 py-0 text-muted-foreground hover:text-primary transition-colors hover:bg-transparent"
              onClick={() => setIsMapOpen(true)}
              title="Select on map"
            >
              <MapPin className="h-3.5 w-3.5 mr-1" />
              <span className="text-[10px] uppercase font-semibold tracking-wider">Map</span>
            </Button>
          </div>
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

        <DateInput label="Start Date" date={startDate} onDateChange={setStartDate} />
        <DateInput label="End Date" date={endDate} onDateChange={setEndDate} />

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Sector Size
          </Label>
          <Select value={areaSize} onValueChange={setAreaSize}>
            <SelectTrigger className="w-full bg-background/50 border-border/50 focus:ring-primary h-10">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1x1 km</SelectItem>
              <SelectItem value="4">2x2 km</SelectItem>
              <SelectItem value="25">5x5 km</SelectItem>
              <SelectItem value="100">10x10 km</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 pb-2 w-full pr-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Max Cloud: {maxCloudCover[0]}%
            </Label>
          </div>
          <Slider
            value={maxCloudCover}
            onValueChange={setMaxCloudCover}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isValid() || isLoading}
          className="w-full sm:col-span-2 lg:col-span-1 mt-2 lg:mt-0 bg-primary text-primary-foreground font-semibold tracking-wide hover:glow-cyan transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Retrieving…
            </>
          ) : (
            "Retrieve"
          )}
        </Button>
      </div>

      <MapPicker
        isOpen={isMapOpen}
        onOpenChange={setIsMapOpen}
        initialLat={parseFloat(lat)}
        initialLon={parseFloat(lon)}
        onSelect={(newLat, newLon) => {
          setLat(newLat.toString());
          setLon(newLon.toString());
        }}
      />
    </div>
  );
};

export default ControlPanel;
