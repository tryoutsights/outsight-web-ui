import { useState, useEffect, useRef } from "react";

type Props = {
  years: number[];
  yearIdx: number;
  onYearIdx: (idx: number | ((prev: number) => number)) => void;
};

export default function YearSlider({ years, yearIdx, onYearIdx }: Props) {
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        onYearIdx((prev) => {
          if (prev >= years.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, years.length, onYearIdx]);

  if (!years.length) return null;

  const selectedYear = years[yearIdx];
  const tickYears =
    years.length <= 6
      ? years
      : [years[0], years[Math.floor(years.length / 2)], years[years.length - 1]];

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <div className="text-3xl font-bold tracking-tight text-slate-100 leading-none">
          {selectedYear}
        </div>
        <div className="text-xs text-slate-500 mt-1">selected year</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="w-7 h-7 rounded-full border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm flex items-center justify-center flex-shrink-0 transition-colors"
          onClick={() => {
            if (yearIdx >= years.length - 1) onYearIdx(0);
            setPlaying((p) => !p);
          }}
          title={playing ? "Pause" : "Play"}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <input
          type="range"
          className="flex-1 accent-teal-500 h-1"
          min={0}
          max={years.length - 1}
          step={1}
          value={yearIdx}
          onChange={(e) => {
            setPlaying(false);
            onYearIdx(+e.target.value);
          }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-500">
        {tickYears.map((y) => (
          <span key={y}>{y}</span>
        ))}
      </div>
    </div>
  );
}
