import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LinkButton } from '@/components/LinkButton';
import { PageDetailBackLink, PageDetailHero } from '@/components/PageDetailHero';
import { api, downloadBulkPaymentReceipts } from '@/lib/api';
import { fcfa, formatAmountDigitsGrouped, INPUT_AMOUNT_FCFA_LABEL } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { LeaseContractSection } from '@/components/LeaseContractSection';
import { AmountFcfaInput, Button, Card, HelpHint, Input, Label, Select } from '@/components/ui';

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
    depositPaidAt: string | null;
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
  if (fr === 'Payé') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200';
  if (fr === 'En retard') return 'bg-amber-100 text-amber-900 dark:bg-amber-950/65 dark:text-amber-200';
  if (fr === 'Annulé') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  return 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200';
}

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<Fiche | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savingLease, setSavingLease] = useState(false);
  const [leaseErr, setLeaseErr] = useState<string | null>(null);
  const [monthlyRent, setMonthlyRent] = useState('');
  const [rentDueDay, setRentDueDay] = useState('1');
  const [depositAmount, setDepositAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [prepayMonths, setPrepayMonths] = useState('1');
  const [prepayBusy, setPrepayBusy] = useState(false);
  const [prepayErr, setPrepayErr] = useState<string | null>(null);
  const [depositActBusy, setDepositActBusy] = useState(false);

  const reload = useCallback(() => {
    if (!id) return;
    api<Fiche>(`/leases/${id}/fiche`)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur'));
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!data) return;
    setMonthlyRent(String(Math.round(Number(data.financial.monthlyRent))));
    setRentDueDay(String(data.financial.rentDueDay));
    setDepositAmount(
      data.financial.depositAmount != null ? String(Math.round(Number(data.financial.depositAmount))) : '',
    );
    setStartDate(data.startDate.slice(0, 10));
    setEndDate(data.endDate ? data.endDate.slice(0, 10) : '');
    setLeaseErr(null);
  }, [data]);

  async function saveLeaseConditions(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    setLeaseErr(null);
    const rent = Number(monthlyRent);
    if (!Number.isFinite(rent) || rent < 0) {
      setLeaseErr('Loyer mensuel invalide.');
      return;
    }
    const due = Number(rentDueDay);
    if (!Number.isInteger(due) || due < 1 || due > 31) {
      setLeaseErr('Jour d’échéance : entre 1 et 31.');
      return;
    }
    let depositPayload: number | null;
    if (depositAmount.trim() === '') {
      depositPayload = null;
    } else {
      const d = Number(depositAmount);
      if (!Number.isFinite(d) || d < 0) {
        setLeaseErr('Dépôt de garantie invalide.');
        return;
      }
      depositPayload = Math.round(d);
    }
    setSavingLease(true);
    try {
      await api(`/leases/${data.leaseId}`, {
        method: 'PATCH',
        json: {
          monthlyRent: Math.round(rent),
          rentDueDay: due,
          startDate,
          endDate: endDate.trim() ? endDate.trim() : null,
          depositAmount: depositPayload,
        },
      });
      await reload();
    } catch (e2) {
      setLeaseErr(e2 instanceof Error ? e2.message : 'Enregistrement impossible.');
    } finally {
      setSavingLease(false);
    }
  }

  async function markDepositReceived(todayIsoDate: string) {
    if (!data) return;
    setDepositActBusy(true);
    try {
      await api(`/leases/${data.leaseId}`, { method: 'PATCH', json: { depositPaidAt: todayIsoDate } });
      await reload();
    } catch (e2) {
      alert(e2 instanceof Error ? e2.message : 'Action impossible.');
    } finally {
      setDepositActBusy(false);
    }
  }

  async function clearDepositReceived() {
    if (!data) return;
    setDepositActBusy(true);
    try {
      await api(`/leases/${data.leaseId}`, { method: 'PATCH', json: { depositPaidAt: null } });
      await reload();
    } catch (e2) {
      alert(e2 instanceof Error ? e2.message : 'Action impossible.');
    } finally {
      setDepositActBusy(false);
    }
  }

  async function prepayRent() {
    if (!data) return;
    const n = Number(prepayMonths);
    if (!Number.isInteger(n) || n < 1 || n > 12) {
      setPrepayErr('Choisissez un nombre de mois entre 1 et 12.');
      return;
    }
    setPrepayErr(null);
    setPrepayBusy(true);
    try {
      const res = await api<{
        monthsPaid: number;
        totalFcfa: number;
        periods: string[];
        paymentIds: string[];
      }>(`/leases/${data.leaseId}/prepay-months`, { method: 'POST', json: { months: n } });
      alert(
        `${res.monthsPaid} mois enregistré(s) comme payés (${res.periods.join(', ')}) — total ${fcfa(res.totalFcfa)}. Un reçu PDF groupé va se télécharger.`,
      );
      if (res.paymentIds?.length) downloadBulkPaymentReceipts(res.paymentIds);
      await reload();
    } catch (e2) {
      setPrepayErr(e2 instanceof Error ? e2.message : 'Impossible d’enregistrer le paiement.');
    } finally {
      setPrepayBusy(false);
    }
  }

  function applyDepositFromRent(months: 1 | 2 | 3) {
    const rent = Number(monthlyRent);
    if (!Number.isFinite(rent) || rent < 0) {
      setLeaseErr('Indiquez d’abord un loyer mensuel valide.');
      return;
    }
    setLeaseErr(null);
    setDepositAmount(String(Math.round(rent * months)));
  }

  if (err) {
    return (
      <Card>
        <p className="text-red-600">{err}</p>
        <PageDetailBackLink to="/locations">Locations</PageDetailBackLink>
      </Card>
    );
  }

  if (!data) {
    return <p className="text-slate-500 dark:text-slate-400">Chargement de la fiche…</p>;
  }

  const { localization, property, tenant, financial } = data;
  const locationHeadline = `${property.buildingName} — ${property.unitLabel}`;

  async function requestDeleteLocation() {
    if (!data) return;
    const msg = `Supprimer définitivement ce bail (${tenant.fullName} — ${locationHeadline}) ? Les paiements, échéances et le fichier de contrat seront supprimés. Le bien, l’unité et le locataire ne sont pas supprimés. Irréversible.`;
    if (!window.confirm(msg)) return;
    try {
      await api(`/leases/${data.leaseId}`, { method: 'DELETE' });
      navigate('/locations');
    } catch (e2) {
      alert(e2 instanceof Error ? e2.message : 'Suppression impossible.');
    }
  }

  return (
    <div className="space-y-6">
      <PageDetailHero
        backHref="/locations"
        backLabel="Locations"
        breadcrumbCurrent={locationHeadline}
        breadcrumbTitle={locationHeadline}
      >
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">Fiche location</h1>
          {!data.active ? (
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-200">
              Bail inactif
            </span>
          ) : null}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge(financial.currentPaymentStatusFr)}`}
          >
            Mois en cours : {financial.currentPaymentStatusFr}
          </span>
        </div>
        <p className="text-sm font-medium leading-snug text-slate-800 dark:text-slate-200">{locationHeadline}</p>
        <p className="text-sm leading-snug text-slate-600 dark:text-slate-400">{unitKindLabel(property.kind)}</p>
      </PageDetailHero>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Localisation</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Ville</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{localization.city}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Commune / zone</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{localization.commune}</dd>
          </div>
          {localization.address && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">Adresse ou précision</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{localization.address}</dd>
            </div>
          )}
          {localization.postalCode && (
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Code postal</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{localization.postalCode}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Pays</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{localization.country}</dd>
          </div>
        </dl>
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 dark:bg-slate-800/50 dark:text-slate-200">
          {localization.shortLabel}
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Détails du bien</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Nom du bien</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{property.buildingName}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Unité / référence</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{property.unitLabel}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Type</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{unitKindLabel(property.kind)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Étage</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{property.floor != null ? property.floor : '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Pièces</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">{property.rooms != null ? property.rooms : '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Surface</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">
              {property.surfaceM2 != null ? `${property.surfaceM2} m²` : '—'}
            </dd>
          </div>
          {(property.description || property.notes) && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">Description</dt>
              <dd className="text-slate-800 dark:text-slate-300">{property.description || property.notes}</dd>
            </div>
          )}
        </dl>
        <LinkButton to={`/biens/${property.buildingId}`} variant="secondary" className="mt-4 py-2 text-xs">
          Voir le bien & les unités
        </LinkButton>
      </Card>

      <Card className="border-slate-200 dark:border-slate-700">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Locataire</h2>
        <p className="text-xl font-semibold leading-snug text-slate-900 dark:text-slate-100">{tenant.fullName}</p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-600 dark:bg-slate-800/50">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Téléphone</dt>
              <dd className="mt-1 text-base font-medium text-slate-900 dark:text-slate-100">
                {tenant.phone?.trim() ? (
                  <a
                    href={`tel:${tenant.phone.replace(/\s/g, '')}`}
                    className="text-brand-800 hover:underline dark:text-brand-400"
                  >
                    {tenant.phone}
                  </a>
                ) : (
                  <span className="font-normal text-slate-400">Non renseigné</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">E-mail</dt>
              <dd className="mt-1 break-all text-base font-medium text-slate-900 dark:text-slate-100">
                {tenant.email?.trim() ? (
                  <a href={`mailto:${tenant.email}`} className="text-brand-800 hover:underline dark:text-brand-400">
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
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Contrat de bail</h2>
          <HelpHint
            className="align-middle"
            title="PDF ou photo du contrat signé (15 Mo max). Un nouveau fichier remplace l’ancien."
          />
        </div>
        <LeaseContractSection leaseId={data.leaseId} contract={data.contract} onChanged={reload} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Informations financières</h2>
        <dl className="mb-6 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Loyer mensuel</dt>
            <dd className="text-xl font-bold text-slate-900 dark:text-slate-100">{fcfa(financial.monthlyRent)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Jour d’échéance</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100">Le {financial.rentDueDay} de chaque mois</dd>
          </div>
          {financial.depositAmount != null && financial.depositAmount > 0 ? (
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Dépôt de garantie (caution)</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">
                {fcfa(financial.depositAmount)}
                {financial.depositPaidAt ? (
                  <span className="mt-1 block text-sm font-normal text-emerald-700 dark:text-emerald-400">
                    Encaissée le {financial.depositPaidAt}
                  </span>
                ) : (
                  <span className="mt-1 block text-sm font-normal text-amber-800 dark:text-amber-300">
                    Encaissement non enregistré dans l’app
                  </span>
                )}
              </dd>
            </div>
          ) : (
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Dépôt de garantie</dt>
              <dd className="text-slate-500 dark:text-slate-400">Aucun montant indiqué</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Statut loyer (mois en cours)</dt>
            <dd>
              <span className={`inline-block rounded-lg px-2 py-1 text-xs font-medium ${badge(financial.currentPaymentStatusFr)}`}>
                {financial.currentPaymentStatusFr}
              </span>
            </dd>
          </div>
          {financial.currentPaymentDueDate && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">Date d’échéance (mois courant)</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-100">{financial.currentPaymentDueDate.slice(0, 10)}</dd>
            </div>
          )}
        </dl>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Période suivie : {financial.currentPeriodMonth}/{financial.currentPeriodYear}
        </p>

        {financial.depositAmount != null && financial.depositAmount > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="py-2 text-xs"
              disabled={depositActBusy || !!financial.depositPaidAt}
              onClick={() => void markDepositReceived(new Date().toISOString().slice(0, 10))}
            >
              Marquer la caution encaissée (aujourd’hui)
            </Button>
            {financial.depositPaidAt ? (
              <Button
                type="button"
                variant="ghost"
                className="py-2 text-xs"
                disabled={depositActBusy}
                onClick={() => void clearDepositReceived()}
              >
                Effacer la date d’encaissement
              </Button>
            ) : null}
          </div>
        ) : null}

        {data.active ? (
          <div className="mt-6 rounded-xl border border-slate-200/90 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-800/40">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Paiement de plusieurs mois de loyer</h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Enregistre d’un coup les prochaines échéances <strong className="font-medium">encore impayées</strong> (ordre du
              calendrier), jusqu’à 12 mois — par ex. <strong className="font-medium">6 mois</strong> payés d’avance. Les lignes de
              loyer doivent exister (générez les années nécessaires depuis la page Baux).
            </p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <Label htmlFor="prepay-n">Nombre de mois</Label>
                <Select
                  id="prepay-n"
                  className="mt-1 min-w-[10rem]"
                  value={prepayMonths}
                  onChange={(e) => setPrepayMonths(e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={String(m)}>
                      {m} mois{m === 6 ? ' (semestre)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="button" className="py-2 text-sm" disabled={prepayBusy} onClick={() => void prepayRent()}>
                {prepayBusy ? 'Enregistrement…' : 'Marquer comme payés'}
              </Button>
            </div>
            {prepayErr ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{prepayErr}</p> : null}
          </div>
        ) : null}

        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-700">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Modifier le bail (loyer & conditions)</h3>
            <HelpHint
              className="align-middle"
              title="Enregistre le contrat (montant loyer, dates, dépôt). Les échéances déjà créées et suivies comme « impayé » ou « en retard » sont actualisées au nouveau loyer. Les mois déjà marqués payés ne changent pas."
            />
          </div>
          <form onSubmit={(e) => void saveLeaseConditions(e)} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="lease-edit-rent">{INPUT_AMOUNT_FCFA_LABEL} — loyer mensuel</Label>
              <AmountFcfaInput
                id="lease-edit-rent"
                min={0}
                step={1}
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                required
                placeholder={formatAmountDigitsGrouped('250000')}
              />
            </div>
            <div>
              <Label htmlFor="lease-edit-due">Jour d&apos;échéance (1–31)</Label>
              <Input
                id="lease-edit-due"
                type="number"
                min={1}
                max={31}
                value={rentDueDay}
                onChange={(e) => setRentDueDay(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="lease-edit-deposit">{INPUT_AMOUNT_FCFA_LABEL} — dépôt / caution (optionnel)</Label>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                <AmountFcfaInput
                  id="lease-edit-deposit"
                  wrapperClassName="sm:max-w-xs"
                  min={0}
                  step={1}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Laisser vide si aucun"
                />
                <div className="flex flex-wrap gap-2">
                  <span className="self-center text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                    Raccourcis :
                  </span>
                  <Button type="button" variant="secondary" className="py-1.5 text-xs" onClick={() => applyDepositFromRent(1)}>
                    ×1 loyer
                  </Button>
                  <Button type="button" variant="secondary" className="py-1.5 text-xs" onClick={() => applyDepositFromRent(2)}>
                    ×2
                  </Button>
                  <Button type="button" variant="secondary" className="py-1.5 text-xs" onClick={() => applyDepositFromRent(3)}>
                    ×3
                  </Button>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="lease-edit-start">Début du bail</Label>
              <Input
                id="lease-edit-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="lease-edit-end">Fin du bail (optionnel)</Label>
              <Input id="lease-edit-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            {leaseErr ? <p className="text-sm text-red-600 sm:col-span-2">{leaseErr}</p> : null}
            <div className="sm:col-span-2">
              <Button type="submit" className="py-2 text-sm" disabled={savingLease}>
                {savingLease ? 'Enregistrement…' : 'Enregistrer les conditions du bail'}
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton to="/baux" variant="secondary" className="py-2 text-xs">
            Baux & génération loyers
          </LinkButton>
          <LinkButton
            to={`/paiements?leaseId=${data.leaseId}&year=all&month=all`}
            variant="primary"
            className="py-2 text-xs"
          >
            Paiements (ce bail)
          </LinkButton>
        </div>
      </Card>

      <Card className="border-red-200/90 dark:border-red-900/40">
        <h2 className="text-sm font-semibold text-red-900 dark:text-red-200">Supprimer cette location</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Retire le bail, toutes les échéances de loyer enregistrées et le contrat joint. L’unité redevient libre pour un nouveau
          bail ; le locataire reste dans l’annuaire.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 border-red-200 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
          onClick={() => void requestDeleteLocation()}
        >
          Supprimer définitivement le bail…
        </Button>
      </Card>
    </div>
  );
}
