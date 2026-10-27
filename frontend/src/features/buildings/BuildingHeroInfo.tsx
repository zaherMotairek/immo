import type { ReactNode } from 'react';
import { BuildingScopeBadge } from '@/components/BuildingUnitBadges';
import { SmartLink } from '@/components/SmartLink';
import { HelpHint } from '@/components/ui';
import { cn } from '@/components/ui/index';
import { BuildingKindIcon } from './BuildingKindIcon';
import { IMMEUBLE_LOGEMENT_BADGE_HINT, immeubleGridLayout, immeubleOnePerFloorMatch } from './buildingUtils';
import type { Building } from './types';

type ChipTone = 'brand' | 'neutral';

function Chip({ tone = 'neutral', className, children }: { tone?: ChipTone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs',
        tone === 'brand'
          ? 'border-brand-600/30 bg-brand-600/10 font-semibold text-brand-800 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-100'
          : 'border-[var(--odoo-border)] bg-[var(--odoo-table-head-bg)] font-medium text-[var(--color-ink)]',
        className,
      )}
    >
      {children}
    </span>
  );
}

function StructureChips({ b }: { b: Building }) {
  if (b.structureKind === 'IMMEUBLE') {
    return (
      <>
        <Chip tone="brand">Immeuble multi locataires</Chip>
        <Chip>
          {b.floorCount != null
            ? `${b.floorCount} étage${b.floorCount !== 1 ? 's' : ''} au-dessus du rez-de-chaussée${
                b.hasRezDeChaussee !== false
                  ? ' · avec RDC (étage 0)'
                  : ` · sans RDC (étages 1…${b.floorCount} seulement)`
              }`
            : 'Hauteur de l’immeuble non renseignée'}
        </Chip>
        <Chip>
          {b.apartmentCount != null ? (
            <>
              <span>
                Logements prévus : {b.apartmentCount} numéro{b.apartmentCount !== 1 ? 's' : ''}
                {immeubleGridLayout(b)
                  ? ` (${b.apartmentsPerFloor ?? 0} par étage ≥ 1)`
                  : ` (1…${b.apartmentCount})`}
                {immeubleOnePerFloorMatch(b) ? ' · 1 logement/étage' : ''}
              </span>
              <HelpHint title={IMMEUBLE_LOGEMENT_BADGE_HINT} className="align-middle shrink-0" />
            </>
          ) : (
            'Nombre de logements prévu non renseigné'
          )}
        </Chip>
      </>
    );
  }
  if (b.structureKind === 'TERRAIN_LOTS') {
    return (
      <>
        <Chip tone="brand">Terrain avec plusieurs locataires</Chip>
        <Chip>
          {b.terrainLotCount != null
            ? `${b.terrainLotCount} lot${b.terrainLotCount !== 1 ? 's' : ''} déclaré${b.terrainLotCount !== 1 ? 's' : ''}`
            : 'Lots non renseignés'}
        </Chip>
      </>
    );
  }
  return <Chip tone="brand">Un seul lot</Chip>;
}

/** Identité du bien dans l'en-tête : pictogramme, nom, localisation, adresse et pastilles de structure. */
export function BuildingHeroInfo({ b }: { b: Building }) {
  const locParts = [b.commune, b.city].filter(Boolean);
  const locLine = locParts.length ? locParts.join(', ') : '—';
  const addressParts = [b.address, b.postalCode].filter(Boolean);
  const addressLine = addressParts.length ? addressParts.join(' · ') : '';

  return (
    <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
      <BuildingKindIcon structureKind={b.structureKind} size="lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <BuildingScopeBadge className="shrink-0" />
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">{b.name}</h1>
        </div>
        <p className="text-sm font-medium leading-snug text-[var(--color-ink)]">{locLine}</p>
        {addressLine ? (
          <p className="text-sm leading-snug text-[var(--color-muted)]">{addressLine}</p>
        ) : (
          <p className="text-sm italic text-[var(--color-muted)]">Adresse non renseignée</p>
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">{b.country}</p>
        <div className="flex flex-wrap gap-2 border-t border-[var(--odoo-border)] pt-3">
          <StructureChips b={b} />
          <Chip>
            {b.units.length} unité{b.units.length !== 1 ? 's' : ''}
          </Chip>
          <SmartLink
            to={`/activite-loyers?scope=building&buildingId=${encodeURIComponent(b.id)}&year=${new Date().getFullYear()}`}
            className="inline-flex items-center rounded-full border border-brand-600/30 bg-brand-600/10 px-2.5 py-0.5 text-xs font-semibold text-brand-800 underline-offset-2 hover:underline dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-100"
          >
            Activité loyers (année)
          </SmartLink>
        </div>
      </div>
    </div>
  );
}
