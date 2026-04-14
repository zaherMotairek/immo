import type { ReactNode } from 'react';
import { Link, useLocation, type LinkProps } from 'react-router-dom';
import { saveReturnFocusForPath, saveScrollForPath, type AppNavigateState } from '@/lib/navigation';

type Props = Omit<LinkProps, 'className'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
  children: ReactNode;
  returnFocusId?: string;
};

export function LinkButton({
  variant = 'secondary',
  className = '',
  children,
  state,
  onClick,
  returnFocusId,
  ...props
}: Props) {
  const loc = useLocation();
  const mergedState: AppNavigateState = {
    ...(state as object),
    from: (state as AppNavigateState)?.from ?? loc.pathname + loc.search,
  };
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const from = loc.pathname + loc.search;
    saveScrollForPath(from);
    if (returnFocusId) saveReturnFocusForPath(from, returnFocusId);
    onClick?.(e);
  };
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600',
    secondary:
      'border border-slate-300/90 bg-slate-50 text-slate-800 shadow-sm hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    ghost: 'text-slate-700 hover:bg-slate-200/80 dark:text-slate-200 dark:hover:bg-slate-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
  };
  return (
    <Link
      className={`${base} ${styles[variant]} ${className}`}
      {...props}
      state={mergedState}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
