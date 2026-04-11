import type { ReactNode } from 'react';
import { HelpHint } from '@/components/ui';
import { SidebarNavIcon } from '@/components/SidebarNavIcons';

type AppPageTitleProps = {
  /** Même clé que dans le menu latéral (`SidebarNavIcon`) pour garder les mêmes pictogrammes. */
  iconTo: string;
  title: string;
  hintTitle?: string;
  /** Éléments après l’aide (ex. badge) */
  titleExtra?: ReactNode;
  className?: string;
};

/** Titre de section principal : icône dans un cartouche + titre plus lisible, aligné sur la barre latérale. */
export function AppPageTitle({ iconTo, title, hintTitle, titleExtra, className = '' }: AppPageTitleProps) {
  return (
    <div className={`flex items-start gap-3 sm:gap-4 ${className}`}>
      <div
        className="flex size-[3.35rem] shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-gradient-to-br from-brand-50 via-white to-sky-50/90 text-brand-700 shadow-md shadow-slate-900/[0.07] ring-1 ring-slate-900/[0.04] dark:border-slate-600 dark:from-brand-950/55 dark:via-slate-900 dark:to-slate-800/90 dark:text-brand-300 dark:shadow-black/30 dark:ring-white/[0.05] sm:size-[3.5rem]"
        aria-hidden
      >
        <SidebarNavIcon to={iconTo} className="size-6 sm:size-[1.65rem]" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h1 className="text-[1.6rem] font-bold leading-[1.2] tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl sm:leading-tight">
            {title}
          </h1>
          {hintTitle ? (
            <HelpHint className="shrink-0 align-middle [&_button]:translate-y-px" title={hintTitle} />
          ) : null}
          {titleExtra}
        </div>
      </div>
    </div>
  );
}
