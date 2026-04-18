import clsx from "clsx";

export function VoteTally({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md";
}) {
  const up = score > 0;
  const down = score < 0;
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-stone-700 ring-1",
        size === "sm" ? "text-xs" : "text-sm",
        up && "text-brand-700 ring-brand-500/30 bg-brand-50",
        down && "text-rose-700 ring-rose-200 bg-rose-50",
        !up && !down && "ring-stone-200 bg-white",
      )}
      aria-label={`${score} net vote${Math.abs(score) === 1 ? "" : "s"}`}
    >
      <span aria-hidden>▲</span>
      <span className="font-medium tabular-nums">{score}</span>
    </div>
  );
}
