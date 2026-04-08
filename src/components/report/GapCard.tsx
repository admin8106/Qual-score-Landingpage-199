import { Gap } from '../../utils/reportInsights';

interface GapCardProps {
  gap: Gap | string;
  index: number;
}

export default function GapCard({ gap, index }: GapCardProps) {
  const title   = typeof gap === 'string' ? `Gap ${index + 1}` : gap.title;
  const description = typeof gap === 'string' ? gap : gap.description;

  return (
    <div className="flex gap-4 p-5 rounded-xl bg-red-500/5 border border-red-500/15">
      <div className="shrink-0 w-7 h-7 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
        <span className="text-xs font-bold text-red-400">{index + 1}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-200 mb-1">{title}</p>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
