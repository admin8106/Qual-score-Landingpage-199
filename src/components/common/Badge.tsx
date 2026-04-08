import { ScoreLevel } from '../../types';

type BadgeVariant = 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'orange';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  blue: 'bg-[#E8F1FD] text-[#1A73E8]',
  green: 'bg-[#E6F4EA] text-[#34A853]',
  yellow: 'bg-[#FEF7E0] text-[#B06000]',
  red: 'bg-red-50 text-red-600',
  orange: 'bg-orange-50 text-orange-600',
  gray: 'bg-[#F3F4F6] text-[#6B7280]',
};

const dotColors: Record<BadgeVariant, string> = {
  blue: 'bg-[#1A73E8]',
  green: 'bg-[#34A853]',
  yellow: 'bg-[#F9AB00]',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  gray: 'bg-[#9CA3AF]',
};

export function scoreLevelToVariant(level: ScoreLevel): BadgeVariant {
  switch (level) {
    case 'critical': return 'red';
    case 'low': return 'orange';
    case 'moderate': return 'yellow';
    case 'strong': return 'blue';
    case 'excellent': return 'green';
  }
}

export default function Badge({
  children,
  variant = 'blue',
  size = 'sm',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 font-semibold rounded-full',
        variantClasses[variant],
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      ].join(' ')}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}
