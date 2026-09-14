const SIZE = 96;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A circular completion meter. Uses a stroke-dasharray/offset on a plain
 * circle rather than an arc `<path>`, so a fraction of exactly 0 or 1 never
 * hits the degenerate-arc case that path-based rings need special-casing
 * for. `label` is always caller-supplied text (e.g. "4 of 10 packed" /
 * its Hindi translation) -- this component never derives English wording
 * of its own.
 */
export function ProgressRing({ fraction, label }: { fraction: number; label: string }) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const percent = Math.round(clamped * 100);
  const offset = CIRCUMFERENCE * (1 - clamped);

  return (
    <div className="flex flex-col items-center gap-xs">
      <svg
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          className="text-divider"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          className="text-accent-primary"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-text-primary text-body-sm font-medium">
          {percent}%
        </text>
      </svg>
      <p className="text-body-sm text-text-secondary">{label}</p>
    </div>
  );
}
