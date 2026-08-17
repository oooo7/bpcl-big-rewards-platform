import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hoverable = false }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-white rounded-2xl p-6 bpcl-card-shadow border border-slate-200',
          hoverable && 'bpcl-card-hover cursor-pointer',
          className
        )
      )}
    >
      {children}
    </div>
  );
};
