import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  border?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export default function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  border = false,
}: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-2xl shadow-sm',
        border ? 'border border-[#E5E7EB]' : '',
        hover ? 'hover:shadow-md transition-shadow duration-200 cursor-pointer' : '',
        paddingClasses[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
