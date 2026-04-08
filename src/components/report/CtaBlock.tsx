import { ArrowRight, Calendar } from 'lucide-react';
import { BandConfig } from '../../utils/reportInsights';

interface CtaBlockProps {
  band: string;
  config: BandConfig;
  onBook: () => void;
}

export default function CtaBlock({ config, onBook }: CtaBlockProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0F1B35] to-[#0A0F1E] p-8">
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-blue-600/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-cyan-500/8 blur-[60px] pointer-events-none" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-3 py-1 mb-5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Next Step</span>
        </div>

        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">
          {config.ctaHeadline}
        </h3>
        <p className="text-slate-400 mb-8 max-w-lg leading-relaxed">
          {config.ctaBody}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onBook}
            className="inline-flex items-center justify-center gap-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white font-semibold px-6 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 active:scale-[0.98]"
          >
            <Calendar className="w-4 h-4" />
            Book My Evaluation Session
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 mt-5">
          This is a diagnostic report only, not a job guarantee. Results are based on your self-reported inputs and profile signals.
        </p>
      </div>
    </div>
  );
}
