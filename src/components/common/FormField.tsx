import React from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

export default function FormField({ label, error, required, hint, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#1F2937]">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-[#6B7280]">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <input
      className={[
        'w-full px-4 py-3 rounded-xl border text-[#1F2937] text-sm placeholder:text-[#9CA3AF] transition-all duration-150 bg-white',
        'focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 focus:border-[#1A73E8]',
        error ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB] hover:border-[#D1D5DB]',
        className,
      ].join(' ')}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({ error, className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={[
        'w-full px-4 py-3 rounded-xl border text-[#1F2937] text-sm transition-all duration-150 bg-white appearance-none',
        'focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30 focus:border-[#1A73E8]',
        error ? 'border-red-400 bg-red-50' : 'border-[#E5E7EB] hover:border-[#D1D5DB]',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </select>
  );
}
