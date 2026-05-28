import { yearLegendStops } from "./lib";

type Props = {
  years: number[];
};

export default function Legend({ years }: Props) {
  if (!years.length) return null;

  const stops = yearLegendStops(years);
  const gradient = `linear-gradient(to right, ${stops.map((s) => s.color).join(", ")})`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        First urbanised
      </div>
      <div className="h-2.5 rounded w-full" style={{ background: gradient }} />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{stops[0].value}</span>
        {stops.length > 2 && (
          <span>{stops[Math.floor(stops.length / 2)].value}</span>
        )}
        <span>{stops[stops.length - 1].value}</span>
      </div>
    </div>
  );
}
