import { Award, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

interface HeaderProps {
  minimal?: boolean;
  step?: string;
}

export default function Header({ minimal = false, step }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E5E7EB]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <button
          onClick={() => navigate(ROUTES.LANDING)}
          className="flex items-center gap-2 group focus:outline-none"
        >
          <div className="w-7 h-7 bg-[#1A73E8] rounded-lg flex items-center justify-center">
            <Award className="w-4 h-4 text-white" />
          </div>
          <span className="text-[15px] font-bold text-[#1F2937] tracking-tight">
            Qual<span className="text-[#1A73E8]">Score</span>
          </span>
        </button>

        {step && (
          <span className="hidden sm:block text-xs text-[#6B7280] font-medium bg-[#F2F6FB] px-3 py-1 rounded-full">
            {step}
          </span>
        )}

        {!minimal && (
          <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
            <Shield className="w-3.5 h-3.5 text-[#34A853]" />
            <span>Secure & Confidential</span>
          </div>
        )}
      </div>
    </header>
  );
}
