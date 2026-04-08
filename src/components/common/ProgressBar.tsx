interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'auto';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

function getAutoColor(pct: number): string {
  if (pct < 30) return 'bg-red-500';
  if (pct < 50) return 'bg-orange-400';
  if (pct < 65) return 'bg-[#F9AB00]';
  if (pct < 80) return 'bg-[#1A73E8]';
  return 'bg-[#34A853]';
}

const colorMap = {
  blue: 'bg-[#1A73E8]',
  green: 'bg-[#34A853]',
  yellow: 'bg-[#F9AB00]',
  red: 'bg-red-500',
  auto: '',
};

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export default function ProgressBar({
  value,
  max = 100,
  color = 'auto',
  size = 'md',
  showLabel = false,
  label,
  animated = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = color === 'auto' ? getAutoColor(pct) : colorMap[color];

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5 text-sm text-[#6B7280]">
          {label && <span className="font-medium">{label}</span>}
          {showLabel && <span className="font-semibold text-[#1F2937]">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={`w-full bg-[#F2F6FB] rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${barColor} ${sizeClasses[size]} rounded-full transition-all duration-700 ease-out ${animated ? 'animate-pulse' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
