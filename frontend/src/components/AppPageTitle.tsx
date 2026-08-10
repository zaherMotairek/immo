import type { ReactNode } from 'react';
import { SidebarNavIcon } from '@/components/SidebarNavIcons';
import { HelpHint } from '@/components/ui';

type AppPageTitleProps = {
  /** Même clé que dans le menu latéral (`SidebarNavIcon`) pour garder les mêmes pictogrammes. */
  iconTo: string;
  title: string;
  /** Aide contextuelle (icône ? à côté du titre). */
  hintTitle?: string;
  /** Texte descriptif sous le titre. */
  subtitle?: ReactNode;
  /** Zone droite : KPI, PDF, boutons d’action. */
  actions?: ReactNode;
  /** @deprecated Préférer `actions`. */
  titleExtra?: ReactNode;
  className?: string;
  /** Contenu additionnel sous la barre principale (alertes, fil d’Ariane interne). */
  children?: ReactNode;
};

/** Indicateur compact pour l’en-tête de page (total, compteur…). */
export function PageHeaderKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="odoo-page-header-kpi" aria-label={`${label} : ${value}`}>
      <span className="odoo-page-header-kpi__value">{value}</span>
      <span className="odoo-page-header-kpi__label">{label}</span>
    </div>
  );
}

/** En-tête de page unifié — titre, aide, actions alignées à droite. */
export function AppPageTitle({
  iconTo,
  title,
  hintTitle,
  subtitle,
  actions,
  titleExtra,
  className = '',
  children,
}: AppPageTitleProps) {
  const right = actions ?? titleExtra;

  return (
    <header className={`odoo-page-header ${className}`}>
      <div className="odoo-page-header__bar">
        <div className="odoo-page-header__main">
          <div className="odoo-page-header__icon" aria-hidden>
            <SidebarNavIcon to={iconTo} className="size-[1.35rem]" />
          </div>
          <div className="odoo-page-header__text">
            <div className="odoo-page-header__title-row">
              <h1 className="odoo-page-header__title">{title}</h1>
              {hintTitle ? <HelpHint title={hintTitle} className="shrink-0" /> : null}
            </div>
            {subtitle ? <p className="odoo-page-header__subtitle">{subtitle}</p> : null}
          </div>
        </div>
        {right ? <div className="odoo-page-header__actions">{right}</div> : null}
      </div>
      {children ? <div className="odoo-page-header__below">{children}</div> : null}
    </header>
  );
}
