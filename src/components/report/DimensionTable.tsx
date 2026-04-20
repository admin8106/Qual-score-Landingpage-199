import { DimensionRow } from '../../utils/reportInsights';

export interface DimensionRowInput {
  label: string;
  score: number;
  status: string;
  remark: string;
}

interface DimensionTableProps {
  rows: (DimensionRow | DimensionRowInput)[];
}

function resolveStatusColors(status: string): { barColor: string; statusColor: string } {
  const s = (status ?? '').toUpperCase();
  if (s === 'STRONG') return { barColor: 'bg-emerald-500', statusColor: 'text-emerald-400' };
  if (s === 'GOOD') return { barColor: 'bg-emerald-400', statusColor: 'text-emerald-300' };
  if (s === 'MODERATE' || s === 'FAIR') return { barColor: 'bg-amber-500', statusColor: 'text-amber-400' };
  if (s === 'NEEDS ATTENTION' || s === 'NEEDS_ATTENTION') return { barColor: 'bg-orange-500', statusColor: 'text-orange-400' };
  return { barColor: 'bg-red-500', statusColor: 'text-red-400' };
}

export default function DimensionTable({ rows }: DimensionTableProps) {
  return (
    <div className="divide-y divide-white/[0.06]">
      {rows.map((row) => {
        const barPct = Math.min(100, Math.max(0, (Number(row.score) / 10) * 100));
        const { barColor, statusColor: derivedStatusColor } = resolveStatusColors(row.status);
        const statusColor = 'statusColor' in row ? (row as DimensionRow).statusColor : derivedStatusColor;

        return (
          <div key={row.label} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-0.5">
                  <span className="text-sm font-medium text-slate-200">{row.label}</span>
                  <span className={`text-xs font-semibold ${statusColor}`}>{row.status}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{row.remark}</p>
              </div>
              <span className="shrink-0 text-lg font-bold text-white tabular-nums">
                {Number(row.score).toFixed(1)}
                <span className="text-xs text-slate-600 font-normal">/10</span>
              </span>
            </div>
            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
