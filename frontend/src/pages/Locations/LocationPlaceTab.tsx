import { unitKindLabel } from '@/lib/unitKind';
import { LocationDepositSection } from './LocationDepositSection';
import { LocationScheduleTable } from './LocationScheduleTable';
import type { Fiche } from './types';
import type { LocationFicheModel } from './useLocationFiche';

type LocationPlaceTabProps = {
  data: Fiche;
  schedule: LocationFicheModel['schedule'];
  deposit: LocationFicheModel['deposit'];
  prepay: LocationFicheModel['prepay'];
};

/** Onglet « Lieu & finances » : adresse, locataire, échéances, caution, prépaiement. */
export function LocationPlaceTab({ data, schedule, deposit, prepay }: LocationPlaceTabProps) {
  const { localization, property, tenant, financial } = data;

  const housingBits: string[] = [];
  housingBits.push(unitKindLabel(property.kind));
  if (property.surfaceM2 != null) housingBits.push(`${property.surfaceM2} m²`);
  if (property.rooms != null) housingBits.push(`${property.rooms} pièce${property.rooms !== 1 ? 's' : ''}`);
  if (property.floor != null) housingBits.push(property.floor === 0 ? 'RDC' : `Étage ${property.floor}`);
  const housingLine = housingBits.filter(Boolean).join(' · ');

  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-[var(--color-ink)]">
      <div className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">Lieu & logement</h3>
        <div className="space-y-4">
          <div>
            <p className="text-lg font-semibold leading-snug text-[var(--color-ink)]">
              {localization.shortLabel?.trim() ||
                [localization.commune, localization.city].filter(Boolean).join(', ') ||
                '—'}
            </p>
            {localization.address?.trim() ? (
              <p className="mt-2 text-[15px] font-medium text-[var(--color-ink)]">{localization.address}</p>
            ) : null}
            {localization.postalCode?.trim() ? (
              <p className="mt-1 text-sm font-medium text-[var(--color-muted)]">{localization.postalCode}</p>
            ) : null}
          </div>

          {housingLine ? <p className="font-medium text-[var(--color-ink)]">{housingLine}</p> : null}

          {(property.description || property.notes)?.trim() ? (
            <p className="text-[15px] text-[var(--color-ink)]">{property.description || property.notes}</p>
          ) : null}

          <div className="border-t border-[var(--odoo-border)] pt-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">Locataire</p>
            <p className="mt-2 text-lg font-bold text-[var(--color-ink)]">{tenant.fullName}</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {tenant.phone?.trim() ? (
                <a
                  href={`tel:${tenant.phone.replace(/\s/g, '')}`}
                  className="text-base font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                >
                  {tenant.phone}
                </a>
              ) : (
                <span className="text-[var(--color-muted)]">—</span>
              )}
              {tenant.email?.trim() ? (
                <a
                  href={`mailto:${tenant.email}`}
                  className="break-all text-base font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                >
                  {tenant.email}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div id="fiche-finances" className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-ink)]">Finances sur ce bail</h3>
        <p className="mb-4 text-[15px] font-medium text-[var(--color-ink)]">
          Détail mois par mois : bouton <span className="font-bold">Paiements</span> en haut de page.
        </p>

        <LocationScheduleTable
          rows={schedule.sortedPaymentSchedule}
          leaseActive={data.active}
          sortKey={schedule.scheduleSortKey}
          sortDir={schedule.scheduleSortDir}
          onSort={schedule.toggleScheduleSort}
          onWaive={schedule.openWaive}
        />

        <LocationDepositSection
          financial={financial}
          leaseActive={data.active}
          deposit={deposit}
          prepay={prepay}
        />
      </div>
    </div>
  );
}
