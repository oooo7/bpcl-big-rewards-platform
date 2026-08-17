import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'gold' | 'navy';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info', className }) => {
  const baseStyles = 'inline-flex items-center gap-1 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full border uppercase tracking-wider';

  const variants = {
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    error: 'bg-rose-100 text-rose-800 border-rose-200',
    info: 'bg-blue-50 text-bpcl-blue border-blue-200',
    gold: 'bg-bpcl-yellow text-bpcl-darkBlue border-bpcl-gold',
    navy: 'bg-bpcl-darkBlue text-white border-bpcl-blue',
  };

  return <span className={twMerge(clsx(baseStyles, variants[variant], className))}>{children}</span>;
};
