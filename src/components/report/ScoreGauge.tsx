import { BandConfig } from '../../utils/reportInsights';

interface ScoreGaugeProps {
  score: number;
  bandLabel: string;
  config: BandConfig;
}

export default function ScoreGauge({ score, bandLabel, config }: ScoreGaugeProps) {
  const pct = (score / 10) * 100;
  const dim = 180;
  const strokeW = 12;
  const r = (dim - strokeW) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="absolute inset-0 -rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeW}
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke={config.ringColor}
            strokeWidth={strokeW}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-white tabular-nums leading-none">
            {score.toFixed(1)}
          </span>
          <span className="text-sm text-slate-400 mt-1">out of 10</span>
        </div>
      </div>

      <div className={`mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${config.border} ${config.badgeBg}`}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.ringColor }} />
        <span className={`text-sm font-semibold ${config.badgeText}`}>
          {bandLabel}
        </span>
      </div>
    </div>
  );
}
