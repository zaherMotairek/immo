import type { ReactNode } from 'react';
import { SidebarNavIcon } from '@/components/SidebarNavIcons';

type AppPageTitleProps = {
  /** Même clé que dans le menu latéral (`SidebarNavIcon`) pour garder les mêmes pictogrammes. */
  iconTo: string;
  title: string;
  /** Aide contextuelle (icône ? à côté du titre) — remplace l’ancien sous-titre visible. */
  hintTitle?: string;
  /** Éléments après l’aide (ex. badge) */
  titleExtra?: ReactNode;
  className?: string;
};

/** Panneau de contrôle type Odoo : icône module + titre + actions. */
export function AppPageTitle({ iconTo, title, hintTitle: _hintTitle, titleExtra, className = '' }: AppPageTitleProps) {
  return (
    <div className={`odoo-control-panel ${className}`}>
      <div className="odoo-control-panel-icon" aria-hidden>
        <SidebarNavIcon to={iconTo} className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h1>{title}</h1>
          {titleExtra}
        </div>
      </div>
    </div>
  );
}
