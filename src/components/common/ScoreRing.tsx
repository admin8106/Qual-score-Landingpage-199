import { ScoreLevel } from '../../types';

interface ScoreRingProps {
  score: number;
  level: ScoreLevel;
  size?: 'sm' | 'md' | 'lg';
}

const levelColors: Record<ScoreLevel, { stroke: string; text: string; bg: string }> = {
  critical: { stroke: '#EF4444', text: 'text-red-500', bg: 'bg-red-50' },
  low: { stroke: '#F97316', text: 'text-orange-500', bg: 'bg-orange-50' },
  moderate: { stroke: '#F9AB00', text: 'text-[#F9AB00]', bg: 'bg-yellow-50' },
  strong: { stroke: '#1A73E8', text: 'text-[#1A73E8]', bg: 'bg-[#E8F1FD]' },
  excellent: { stroke: '#34A853', text: 'text-[#34A853]', bg: 'bg-[#E6F4EA]' },
};

const sizes = {
  sm: { dim: 80, stroke: 6, fontSize: 'text-xl' },
  md: { dim: 120, stroke: 8, fontSize: 'text-3xl' },
  lg: { dim: 160, stroke: 10, fontSize: 'text-5xl' },
};

export default function ScoreRing({ score, level, size = 'md' }: ScoreRingProps) {
  const { dim, stroke, fontSize } = sizes[size];
  const { stroke: strokeColor, text, bg } = levelColors[level];
  const r = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full ${bg}`} style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="absolute inset-0 -rotate-90">
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={stroke}
        />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <span className={`relative font-bold ${fontSize} ${text}`}>{score}</span>
    </div>
  );
}
