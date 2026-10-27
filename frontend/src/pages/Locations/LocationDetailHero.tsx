import { LinkButton } from '@/components/LinkButton';
import { PageDetailHero } from '@/components/PageDetailHero';
import { PdfPrintButton } from '@/components/PdfPrintButton';
import { SidebarNavIcon } from '@/components/SidebarNavIcons';
import { StatusBadge } from '@/components/ui/index';
import { fcfa } from '@/lib/format';
import { statusLabel } from '@/lib/paymentStatusUi';
import type { Fiche } from './types';

type LocationDetailHeroProps = {
  data: Fiche;
  backHref: string;
  backLabel: string;
  isSheet: boolean;
  locationHeadline: string;
  paymentsHref: string;
  buildingWithUnitFocusHref: string;
};

/** En-tête fiche location : retour, titre, loyer, statut, actions rapides. */
export function LocationDetailHero({
  data,
  backHref,
  backLabel,
  isSheet,
  locationHeadline,
  paymentsHref,
  buildingWithUnitFocusHref,
}: LocationDetailHeroProps) {
  const { tenant, financial } = data;

  return (
    <PageDetailHero
      backHref={backHref}
      backLabel={backLabel}
      breadcrumbCurrent={locationHeadline}
      breadcrumbTitle={locationHeadline}
      omitTopNav={isSheet}
      headerEnd={
        data.leaseId ? (
          <PdfPrintButton
            path={`/leases/${data.leaseId}/fiche.pdf`}
            title="Ouvrir cette fiche location en PDF (impression)"
            variant="labeled"
          />
        ) : null
      }
    >
      <div className="flex flex-wrap items-start gap-3 sm:gap-4">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] text-brand-700 dark:text-brand-300 sm:size-12"
          aria-hidden
          title="Locations"
        >
          <SidebarNavIcon to="/locations" className="size-5 sm:size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Fiche location</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-[1.65rem]">
              {locationHeadline}
            </h1>
            <StatusBadge
              status={data.active ? 'PAID' : 'CANCELLED'}
              label={data.active ? 'Actif' : 'Inactif'}
              size="sm"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--odoo-border)] pt-4 text-base">
            <span className="tabular-nums text-lg font-bold text-[var(--color-ink)]">{fcfa(financial.monthlyRent)}</span>
            <span className="text-[var(--color-muted)]">·</span>
            <span className="font-medium text-[var(--color-ink)]">Échéance le {financial.rentDueDay} / mois</span>
            <span className="text-[var(--color-muted)]">·</span>
            <StatusBadge
              status={financial.currentPaymentStatus ?? ''}
              label={statusLabel(financial.currentPaymentStatus ?? '')}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton to={paymentsHref} variant="primary" className="py-2.5 text-sm font-semibold" title="Échéances et paiements pour ce bail">
              Paiements
            </LinkButton>
            <LinkButton to={buildingWithUnitFocusHref} variant="secondary" className="py-2.5 text-sm font-semibold">
              Fiche du bien
            </LinkButton>
            <LinkButton to={`/locataires?edit=${tenant.id}`} variant="secondary" className="py-2.5 text-sm font-semibold">
              Modifier le locataire
            </LinkButton>
          </div>
        </div>
      </div>
    </PageDetailHero>
  );
}
