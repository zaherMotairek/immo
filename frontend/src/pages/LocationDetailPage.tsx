import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LinkButton } from '@/components/LinkButton';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { LeaseContractSection } from '@/components/LeaseContractSection';
import { Card } from '@/components/ui';

type Fiche = {
  leaseId: string;
  active: boolean;
  startDate: string;
  endDate: string | null;
  localization: {
    city: string;
    commune: string;
    address: string | null;
    postalCode: string | null;
    country: string;
    shortLabel: string;
  };
  property: {
    buildingName: string;
    buildingId: string;
    unitId: string;
    unitLabel: string;
    kind: string;
    floor: number | null;
    rooms: number | null;
    surfaceM2: number | null;
    description: string | null;
    notes: string | null;
  };
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string | null;
    email: string | null;
  };
  financial: {
    monthlyRent: number;
    rentDueDay: number;
    depositAmount: number | null;
    currentPeriodYear: number;
    currentPeriodMonth: number;
    currentPaymentStatusFr: string;
    currentPaymentDueDate: string | null;
  };
  contract: {
    fileName: string | null;
    mimeType: string | null;
    size: number | null;
    uploadedAt: string | null;
  } | null;
};

function badge(fr: string) {
  if (fr === 'Payé') return 'bg-emerald-100 text-emerald-900';
  if (fr === 'En retard') return 'bg-amber-100 text-amber-900';
  if (fr === 'Annulé') return 'bg-slate-100 text-slate-600';
  return 'bg-red-50 text-red-800';
}

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Fiche | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!id) return;
    api<Fiche>(`/leases/${id}/fiche`)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur'));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (err) {
    return (
      <Card>
        <p className="text-red-600">{err}</p>
        <Link to="/locations" className="mt-2 inline-block text-sm text-brand-700">
          ← Retour aux locations
        </Link>
      </Card>
    );
  }

  if (!data) {
    return <p className="text-slate-500">Chargement de la fiche…</p>;
  }

  const { localization, property, tenant, financial } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/locations" className="text-sm text-brand-700">
          ← Locations
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Fiche location</h1>
          {!data.active && <span className="rounded-lg bg-slate-200 px-2 py-0.5 text-xs">Bail inactif</span>}
          <span className={`rounded-lg px-2 py-1 text-xs font-medium ${badge(financial.currentPaymentStatusFr)}`}>
            Mois en cours : {financial.currentPaymentStatusFr}
          </span>
        </div>
        <p className="mt-1 text-lg text-slate-800">
          {property.buildingName} — {property.unitLabel}
        </p>
        <p className="text-sm text-slate-600">{unitKindLabel(property.kind)}</p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Localisation</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Ville</dt>
            <dd className="font-medium text-slate-900">{localization.city}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Commune / zone</dt>
            <dd className="font-medium text-slate-900">{localization.commune}</dd>
          </div>
          {localization.address && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Adresse ou précision</dt>
              <dd className="font-medium text-slate-900">{localization.address}</dd>
            </div>
          )}
          {localization.postalCode && (
            <div>
              <dt className="text-slate-500">Code postal</dt>
              <dd className="font-medium text-slate-900">{localization.postalCode}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-500">Pays</dt>
            <dd className="font-medium text-slate-900">{localization.country}</dd>
          </div>
        </dl>
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">{localization.shortLabel}</p>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Détails du bien</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Nom du bien</dt>
            <dd className="font-medium text-slate-900">{property.buildingName}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Unité / référence</dt>
            <dd className="font-medium text-slate-900">{property.unitLabel}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Type</dt>
            <dd className="font-medium text-slate-900">{unitKindLabel(property.kind)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Étage</dt>
            <dd className="font-medium text-slate-900">{property.floor != null ? property.floor : '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Pièces</dt>
            <dd className="font-medium text-slate-900">{property.rooms != null ? property.rooms : '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Surface</dt>
            <dd className="font-medium text-slate-900">
              {property.surfaceM2 != null ? `${property.surfaceM2} m²` : '—'}
            </dd>
          </div>
          {(property.description || property.notes) && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Description</dt>
              <dd className="text-slate-800">{property.description || property.notes}</dd>
            </div>
          )}
        </dl>
        <LinkButton to={`/biens/${property.buildingId}`} variant="secondary" className="mt-4 py-2 text-xs">
          Voir le bien & les unités
        </LinkButton>
      </Card>

      <Card className="border-slate-200">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Locataire</h2>
        <p className="text-xl font-semibold leading-snug text-slate-900">{tenant.fullName}</p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/90 p-4">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Téléphone</dt>
              <dd className="mt-1 text-base font-medium text-slate-900">
                {tenant.phone?.trim() ? (
                  <a href={`tel:${tenant.phone.replace(/\s/g, '')}`} className="text-brand-800 hover:underline">
                    {tenant.phone}
                  </a>
                ) : (
                  <span className="font-normal text-slate-400">Non renseigné</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">E-mail</dt>
              <dd className="mt-1 break-all text-base font-medium text-slate-900">
                {tenant.email?.trim() ? (
                  <a href={`mailto:${tenant.email}`} className="text-brand-800 hover:underline">
                    {tenant.email}
                  </a>
                ) : (
                  <span className="font-normal text-slate-400">Non renseigné</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton to={`/locataires?edit=${tenant.id}`} variant="secondary" className="py-2 text-sm">
            Modifier ce locataire
          </LinkButton>
          <LinkButton to="/locataires" variant="ghost" className="py-2 text-sm">
            Liste des locataires
          </LinkButton>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Contrat de bail</h2>
        <p className="mb-3 text-xs text-slate-500">
          PDF ou photo du contrat signé (15 Mo max). Un nouveau fichier remplace l’ancien.
        </p>
        <LeaseContractSection leaseId={data.leaseId} contract={data.contract} onChanged={reload} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Informations financières</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Loyer mensuel</dt>
            <dd className="text-xl font-bold text-slate-900">{fcfa(financial.monthlyRent)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Jour d’échéance</dt>
            <dd className="font-medium text-slate-900">Le {financial.rentDueDay} de chaque mois</dd>
          </div>
          {financial.depositAmount != null && (
            <div>
              <dt className="text-slate-500">Dépôt de garantie</dt>
              <dd className="font-medium text-slate-900">{fcfa(financial.depositAmount)}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-500">Statut loyer (mois en cours)</dt>
            <dd>
              <span className={`inline-block rounded-lg px-2 py-1 text-xs font-medium ${badge(financial.currentPaymentStatusFr)}`}>
                {financial.currentPaymentStatusFr}
              </span>
            </dd>
          </div>
          {financial.currentPaymentDueDate && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Date d’échéance (mois courant)</dt>
              <dd className="font-medium text-slate-900">{financial.currentPaymentDueDate.slice(0, 10)}</dd>
            </div>
          )}
        </dl>
        <p className="mt-2 text-xs text-slate-500">
          Période suivie : {financial.currentPeriodMonth}/{financial.currentPeriodYear}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton to="/baux" variant="secondary" className="py-2 text-xs">
            Modifier le bail / générer loyers
          </LinkButton>
          <LinkButton to="/paiements" variant="primary" className="py-2 text-xs">
            Paiements
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}
