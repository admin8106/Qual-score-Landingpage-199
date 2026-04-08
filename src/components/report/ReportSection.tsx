import React from 'react';

interface ReportSectionProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  accent?: string;
}

export default function ReportSection({ label, children, className = '', accent }: ReportSectionProps) {
  return (
    <section className={`bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 sm:p-8 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        {accent && (
          <div className="w-1 h-5 rounded-full" style={{ backgroundColor: accent }} />
        )}
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</h2>
      </div>
      {children}
    </section>
  );
}
