import type { ReactNode } from 'react';
import { cn } from './cn';

export type PageHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  /** Zone droite : boutons d'action principaux. */
  actions?: ReactNode;
  /** Indicateurs (StatTile, etc.) affichés sous la barre de titre. */
  kpis?: ReactNode;
  className?: string;
};

/** En-tête de page « Calm ledger » : titre, sous-titre, actions, KPI. */
export function PageHeader({ title, subtitle, actions, kpis, className }: PageHeaderProps) {
  return (
    <header className={cn('odoo-page-header', className)}>
      <div className="odoo-page-header__bar">
        <div className="odoo-page-header__main">
          <div className="odoo-page-header__text">
            <div className="odoo-page-header__title-row">
              <h1 className="odoo-page-header__title">{title}</h1>
            </div>
            {subtitle ? <p className="odoo-page-header__subtitle">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="odoo-page-header__actions">{actions}</div> : null}
      </div>
      {kpis ? <div className="odoo-page-header__below flex flex-wrap gap-2">{kpis}</div> : null}
    </header>
  );
}
