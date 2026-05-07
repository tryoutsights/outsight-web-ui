import { useState, useEffect, useRef } from "react";

type Props = {
  years: number[];
  yearIdx: number;
  onYearIdx: (idx: number | ((prev: number) => number)) => void;
  isDark?: boolean;
};

export default function YearSlider({ years, yearIdx, onYearIdx, isDark = true }: Props) {
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

  const primaryText = isDark ? "text-slate-100" : "text-slate-900";
  const subtleText = isDark ? "text-slate-400" : "text-slate-500";
  const buttonClass = isDark
    ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
    : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700";

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <div className={`text-3xl font-bold tracking-tight leading-none ${primaryText}`}>
          {selectedYear}
        </div>
        <div className={`text-xs mt-1 ${subtleText}`}>selected year</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className={`w-7 h-7 rounded-full border text-sm flex items-center justify-center flex-shrink-0 transition-colors ${buttonClass}`}
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

      <div className={`flex justify-between text-[10px] ${subtleText}`}>
        {tickYears.map((y) => (
          <span key={y}>{y}</span>
        ))}
      </div>
    </div>
  );
}
