import { X } from 'lucide-react';

interface Tab {
  key: string;
  label: string;
  icon: React.ElementType;
}

interface Props {
  title: string;
  subtitle?: string;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (t: string) => void;
  accentColor: string;
  onClose: () => void;
  actionBar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export default function DrawerShell({
  title, subtitle, tabs, activeTab, onTabChange,
  accentColor, onClose, actionBar, footer, children,
}: Props) {
  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <div
        className="w-full max-w-2xl bg-[#0A0F1E] border-l border-white/[0.08] flex flex-col h-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {actionBar && (
          <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.05] shrink-0 overflow-x-auto">
            {actionBar}
          </div>
        )}

        <div className="flex border-b border-white/[0.05] shrink-0">
          {tabs.map((t) => {
            const TIcon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === t.key
                    ? `border-${accentColor}-500 text-${accentColor}-400`
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <TIcon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-white/[0.07] shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
