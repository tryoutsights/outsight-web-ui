import { legendStops } from "./lib";

type Props = {
  maxValue: number;
};

export default function Legend({ maxValue }: Props) {
  if (!maxValue || maxValue <= 0) return null;

  const stops = legendStops(maxValue, 6);
  const gradient = `linear-gradient(to right, ${stops.map((s) => s.color).join(", ")})`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        Built-up km² (year)
      </div>
      <div className="h-2.5 rounded w-full" style={{ background: gradient }} />
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>0</span>
        <span>{(maxValue / 2).toFixed(3)}</span>
        <span>{maxValue.toFixed(3)}</span>
      </div>
    </div>
  );
}
