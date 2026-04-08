import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[#1A73E8] hover:bg-[#1557B0] text-white shadow-sm hover:shadow-md active:scale-[0.98]',
  secondary:
    'bg-[#F2F6FB] hover:bg-[#E3EDFA] text-[#1A73E8] border border-[#1A73E8]/20',
  ghost:
    'bg-transparent hover:bg-[#F2F6FB] text-[#1A73E8]',
  success:
    'bg-[#34A853] hover:bg-[#2D8F47] text-white shadow-sm hover:shadow-md active:scale-[0.98]',
  outline:
    'bg-white hover:bg-[#F2F6FB] text-[#1F2937] border border-[#E5E7EB] hover:border-[#1A73E8]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
  xl: 'px-8 py-4 text-lg rounded-2xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/40 focus:ring-offset-1',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
