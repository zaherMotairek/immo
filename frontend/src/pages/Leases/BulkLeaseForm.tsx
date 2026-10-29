import { useMemo } from 'react';
import { Button, Callout, Field, Input, MoneyInput, Select } from '@/components/ui/index';
import { INPUT_AMOUNT_FCFA_LABEL } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { formatBuildingChoiceLabel } from './leaseUtils';
import { NEW_TENANT_OPTION_ID } from './types';
import type { TenantOpt } from './types';
import type { BulkLeaseFormState } from './useBulkLeaseForm';

type BulkLeaseFormProps = {
  bulk: BulkLeaseFormState;
  tenants: TenantOpt[];
  onOpenQuickTenant: () => void;
  onCancel: () => void;
};

const cell = 'px-2 py-2 align-top';

/** Grille d’ajout groupé : plusieurs lots libres d’un bien multi-locataires en une fois. */
export function BulkLeaseForm({ bulk, tenants, onOpenQuickTenant, onCancel }: BulkLeaseFormProps) {
  const buildingOptions = useMemo(
    () =>
      [...bulk.multiLotBuildings]
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
        .map((b) => ({ id: b.id, label: formatBuildingChoiceLabel(b) })),
    [bulk.multiLotBuildings],
  );

  const tenantOptions = useMemo(
    () => [
      ...tenants.map((t) => ({ id: t.id, label: `${t.firstName} ${t.lastName}` })),
      { id: NEW_TENANT_OPTION_ID, label: '+ Nouveau locataire…' },
    ],
    [tenants],
  );

  const selectedCount = bulk.rows.filter((r) => r.selected).length;

  if (bulk.multiLotBuildings.length === 0) {
    return (
      <div className="space-y-4">
        <Callout variant="info" title="Aucun bien multi-lots avec des lots libres">
          <p>
            Cette option sert pour un terrain ou un immeuble qui a déjà des unités libres. Créez d’abord les lots sur la
            fiche Biens, ou utilisez « Un bail » pour un seul contrat.
          </p>
        </Callout>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Fermer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Callout variant="info" title="Baux légers — vous pourrez compléter ensuite">
        <p>
          Cochez les lots, indiquez locataire, loyer et date. Caution, contrat et détails se renseignent plus tard sur
          chaque fiche location.
        </p>
      </Callout>

      <Field label="Bien (terrain / immeuble multi locataires)" htmlFor="bulk-lease-building">
        <Select
          id="bulk-lease-building"
          options={buildingOptions}
          emptyLabel="Choisir le bien…"
          value={bulk.buildingId}
          onValueChange={bulk.setBuildingId}
          required
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Date de début (défaut)" htmlFor="bulk-lease-start-default">
          <Input
            id="bulk-lease-start-default"
            type="date"
            value={bulk.defaultStartDate}
            onChange={(e) => bulk.setDefaultStartDate(e.target.value)}
          />
        </Field>
        <Field label={`${INPUT_AMOUNT_FCFA_LABEL} — loyer (défaut)`} htmlFor="bulk-lease-rent-default">
          <MoneyInput
            id="bulk-lease-rent-default"
            value={bulk.defaultMonthlyRent}
            onChange={(e) => bulk.setDefaultMonthlyRent(e.target.value)}
          />
        </Field>
        <Field label="Jour d’échéance (1–31)" htmlFor="bulk-lease-due">
          <Input
            id="bulk-lease-due"
            type="number"
            min={1}
            max={31}
            value={bulk.rentDueDay}
            onChange={(e) => bulk.setRentDueDay(e.target.value)}
          />
        </Field>
      </div>

      {bulk.buildingId ? (
        <div className="flex flex-wrap items-center gap-2">
          {bulk.contactsSupported ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={bulk.busy || bulk.contactsBusy}
              loading={bulk.contactsBusy}
              onClick={() => void bulk.importFromPhoneContacts()}
            >
              Depuis les contacts…
            </Button>
          ) : null}
          <Button type="button" variant="secondary" size="sm" onClick={() => bulk.applyDefaultsToSelected()}>
            Appliquer date / loyer aux lots cochés
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => bulk.selectAll(true)}>
            Tout cocher
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => bulk.selectAll(false)}>
            Tout décocher
          </Button>
          <span className="text-xs text-[var(--color-muted)]">
            {selectedCount} lot{selectedCount !== 1 ? 's' : ''} sélectionné{selectedCount !== 1 ? 's' : ''}
            {bulk.contactsSupported ? ' · Android Chrome : multi-contacts' : ''}
          </span>
        </div>
      ) : null}

      {bulk.buildingId && bulk.rows.length === 0 ? (
        <Callout variant="warning" title="Aucun lot libre">
          Tous les lots de ce bien ont déjà un bail actif.
        </Callout>
      ) : null}

      {bulk.rows.length > 0 ? (
        <div className="table-scroll overflow-x-auto rounded-[var(--radius-card)] border border-[var(--odoo-border)]">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-[var(--odoo-table-head-bg)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted)]">
              <tr>
                <th scope="col" className={`${cell} w-10 text-left`}>
                  <span className="sr-only">Inclure</span>
                </th>
                <th scope="col" className={`${cell} text-left`}>
                  Lot
                </th>
                <th scope="col" className={`${cell} text-left`}>
                  Locataire
                </th>
                <th scope="col" className={`${cell} text-left`}>
                  Loyer
                </th>
                <th scope="col" className={`${cell} text-left`}>
                  Début
                </th>
              </tr>
            </thead>
            <tbody>
              {bulk.rows.map((r) => (
                <tr key={r.unitId} className="border-t border-[var(--odoo-border)]">
                  <td className={cell}>
                    <input
                      type="checkbox"
                      className="size-5 accent-[var(--color-brand-600)]"
                      checked={r.selected}
                      onChange={(e) => bulk.updateRow(r.unitId, { selected: e.target.checked })}
                      aria-label={`Inclure ${r.label}`}
                    />
                  </td>
                  <td className={cell}>
                    <p className="font-medium text-[var(--color-ink)]">{r.label}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {unitKindLabel(r.kind)}
                      {r.apartmentSlot != null ? ` · n° ${r.apartmentSlot}` : ''}
                    </p>
                  </td>
                  <td className={`${cell} min-w-[12rem]`}>
                    <Select
                      id={`bulk-tenant-${r.unitId}`}
                      aria-label={`Locataire — ${r.label}`}
                      options={tenantOptions}
                      emptyLabel="Choisir…"
                      value={r.tenantId}
                      disabled={!r.selected || bulk.busy}
                      onValueChange={(next) => {
                        if (next === NEW_TENANT_OPTION_ID) {
                          bulk.openQuickTenantForRow(r.unitId, onOpenQuickTenant);
                          return;
                        }
                        bulk.updateRow(r.unitId, { tenantId: next });
                      }}
                    />
                  </td>
                  <td className={`${cell} min-w-[8rem]`}>
                    <MoneyInput
                      aria-label={`Loyer — ${r.label}`}
                      value={r.monthlyRent}
                      disabled={!r.selected || bulk.busy}
                      onChange={(e) => bulk.updateRow(r.unitId, { monthlyRent: e.target.value })}
                    />
                  </td>
                  <td className={`${cell} min-w-[9rem]`}>
                    <Input
                      type="date"
                      aria-label={`Début — ${r.label}`}
                      value={r.startDate}
                      disabled={!r.selected || bulk.busy}
                      onChange={(e) => bulk.updateRow(r.unitId, { startDate: e.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {bulk.err ? <Callout variant="danger">{bulk.err}</Callout> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={bulk.busy || selectedCount === 0}
          onClick={() => void bulk.createBulk()}
        >
          {bulk.busy ? 'Création…' : `Créer ${selectedCount || ''} bail${selectedCount !== 1 ? 's' : ''}`}
        </Button>
        <Button type="button" variant="secondary" disabled={bulk.busy} onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
