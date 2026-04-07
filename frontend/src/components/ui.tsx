import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-300/70 bg-white/95 p-4 shadow-md shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-sm sm:p-5 dark:border-slate-600 dark:bg-slate-800/95 dark:ring-white/10 ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50';
  const styles = {
    primary: 'bg-brand-600 text-white shadow-md shadow-brand-600/25 hover:bg-brand-700 focus-visible:outline-brand-600',
    secondary:
      'border border-slate-300/90 bg-slate-50 text-slate-800 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
    ghost: 'text-slate-700 hover:bg-slate-200/80 dark:text-slate-200 dark:hover:bg-slate-700',
    danger: 'bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-700 focus-visible:outline-red-600',
  };
  return (
    <button type={type} className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-xl border border-slate-300 bg-slate-50/90 px-3 py-2 text-sm text-slate-900 shadow-inner shadow-slate-900/5 placeholder:text-slate-500 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:bg-slate-900 ${className}`}
      {...props}
    />
  );
});

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
    >
      {children}
    </label>
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="w-full rounded-xl border border-slate-300 bg-slate-50/90 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-100"
      {...props}
    />
  );
}
