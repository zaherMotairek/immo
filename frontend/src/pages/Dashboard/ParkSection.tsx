import type { ReactNode } from 'react';
import { KpiIconBuilding, KpiIconMoney, KpiIconTenant, KpiIconUnits } from '@/components/dashboardKpiIcons';
import { SmartLink } from '@/components/SmartLink';
import { fcfa } from '@/lib/format';
import type { Overview } from './types';

const linkClass =
  'group block rounded-[var(--radius-card)] no-underline outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)]';

const cardClass =
  'dashboard-park-card h-full p-4 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-lift)]';

const openHintClass =
  'text-[10px] font-semibold normal-case tracking-normal opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100';

function ParkCard({
  to,
  ariaLabel,
  accent,
  icon,
  label,
  value,
  footer,
  showOpenHint = true,
}: {
  to: string;
  ariaLabel?: string;
  accent: 'brand-dark' | 'brand' | 'pending' | 'paid';
  icon: ReactNode;
  label: string;
  value: ReactNode;
  footer?: ReactNode;
  showOpenHint?: boolean;
}) {
  return (
    <SmartLink to={to} className={linkClass} aria-label={ariaLabel}>
      <div className={`${cardClass} dashboard-park-card--${accent}`}>
        <p className="dashboard-park-card__label flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide">
          <span className="flex items-center gap-2">
            {icon}
            {label}
          </span>
          {showOpenHint ? <span className={openHintClass}>Ouvrir →</span> : null}
        </p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-[var(--color-ink)]">{value}</p>
        {footer ? <p className="dashboard-park-card__label mt-1 text-xs font-semibold">{footer}</p> : null}
      </div>
    </SmartLink>
  );
}

/** Cartes « parc » : biens, unités, locataires, loyer mensuel attendu. */
export function ParkSection({ kpis, className }: { kpis: Overview['kpis']; className?: string }) {
  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4${className ? ` ${className}` : ''}`}>
      <ParkCard
        to="/biens"
        ariaLabel={`Voir les biens — ${kpis.buildings} enregistré${kpis.buildings !== 1 ? 's' : ''}`}
        accent="brand-dark"
        icon={<KpiIconBuilding className="h-4 w-4 shrink-0" />}
        label="Biens"
        value={kpis.buildings}
      />
      <ParkCard
        to="/biens"
        ariaLabel={`Voir les biens et les unités — ${kpis.units} unité${kpis.units !== 1 ? 's' : ''}`}
        accent="brand"
        icon={<KpiIconUnits className="h-4 w-4 shrink-0" />}
        label="Unités"
        value={kpis.units}
      />
      <ParkCard
        to="/locataires"
        ariaLabel={`Voir les locataires — ${kpis.tenants} enregistré${kpis.tenants !== 1 ? 's' : ''}`}
        accent="pending"
        icon={<KpiIconTenant className="h-4 w-4 shrink-0" />}
        label="Locataires"
        value={kpis.tenants}
      />
      <ParkCard
        to="/paiements?year=all&month=all"
        accent="paid"
        showOpenHint={false}
        icon={<KpiIconMoney className="h-4 w-4 shrink-0" />}
        label="Loyer mensuel attendu"
        value={fcfa(kpis.expectedMonthlyRent)}
        footer="Ouvrir les paiements →"
      />
    </div>
  );
}
