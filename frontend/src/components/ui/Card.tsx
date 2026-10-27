import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export type CardProps = {
  children: ReactNode;
  className?: string;
  /** `md` (défaut) = gabarit historique `p-3 sm:p-5`. */
  padding?: CardPadding;
} & Omit<HTMLAttributes<HTMLDivElement>, 'className'>;

const paddingClass: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-3 sm:p-5',
  lg: 'p-4 sm:p-6',
};

/** Carte « surface » : bordure fine, rayon et ombre issus des tokens. */
export function Card({ children, className, padding = 'md', ...rest }: CardProps) {
  return (
    <div {...rest} className={cn('odoo-sheet text-[var(--color-ink)] dark:text-zinc-100', paddingClass[padding], className)}>
      {children}
    </div>
  );
}
