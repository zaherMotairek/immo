import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { LinkButton } from '@/components/LinkButton';
import { PageDetailBackLink, PageDetailHero } from '@/components/PageDetailHero';
import { SidebarNavIcon } from '@/components/SidebarNavIcons';
import { api } from '@/lib/api';
import { fcfa, formatAmountDigitsGrouped, INPUT_AMOUNT_FCFA_LABEL } from '@/lib/format';
import { unitKindLabel } from '@/lib/unitKind';
import { LeaseContractSection } from '@/components/LeaseContractSection';
import { AmountFcfaInput, Button, Card, HelpHint, Input, Label, Select } from '@/components/ui';
import { resolveReturnTarget } from '@/lib/navigation';

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

function SectionHeader({ title, hintTitle }: { title: string; hintTitle?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-200/90 pb-3 dark:border-slate-700/80">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h2>
      {hintTitle ? <HelpHint title={hintTitle} className="shrink-0" /> : null}
    </div>
  );
}

function SummaryTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 shadow-sm dark:border-slate-600/80 dark:from-slate-800/60 dark:to-slate-900/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function DlField({ label, children, span2 }: { label: string; children: ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <dt className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="mt-1.5 text-[15px] font-medium leading-snug text-slate-900 dark:text-slate-100">{children}</dd>
    </div>
  );
}

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const back = useMemo(
    () => resolveReturnTarget(routerLocation.state, { fallbackHref: '/locations', fallbackLabel: 'Locations' }),
    [routerLocation.state],
  );
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

  const leaseFormDirty = useMemo(() => {
    if (!data) return false;
    const dep =
      depositAmount.trim() === '' ? null : Math.round(Number(depositAmount));
    const serverDep =
      data.financial.depositAmount != null
        ? Math.round(Number(data.financial.depositAmount))
        : null;
    return (
      monthlyRent !== String(Math.round(Number(data.financial.monthlyRent))) ||
      rentDueDay !== String(data.financial.rentDueDay) ||
      dep !== serverDep ||
      startDate !== data.startDate.slice(0, 10) ||
      (endDate.trim() || '') !== (data.endDate ? data.endDate.slice(0, 10) : '')
    );
  }, [data, monthlyRent, rentDueDay, depositAmount, startDate, endDate]);

  function resetLeaseEditForm() {
    if (!data) return;
    setMonthlyRent(String(Math.round(Number(data.financial.monthlyRent))));
    setRentDueDay(String(data.financial.rentDueDay));
    setDepositAmount(
      data.financial.depositAmount != null ? String(Math.round(Number(data.financial.depositAmount))) : '',
    );
    setStartDate(data.startDate.slice(0, 10));
    setEndDate(data.endDate ? data.endDate.slice(0, 10) : '');
    setLeaseErr(null);
  }

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
        `${res.monthsPaid} mois enregistré(s) comme payés (${res.periods.join(', ')}) — total ${fcfa(res.totalFcfa)}. Téléchargez le reçu PDF depuis Paiements (bouton Reçu PDF) si besoin.`,
      );
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
      <Card className="border-red-200/90 dark:border-red-900/40">
        <p className="font-medium text-red-800 dark:text-red-200">Impossible d’afficher cette location.</p>
        <p className="mt-2 text-sm text-red-700/90 dark:text-red-300/90">{err}</p>
        <PageDetailBackLink to={back.href}>Retour vers {back.label}</PageDetailBackLink>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="!py-10 text-center">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Chargement de la fiche location…</p>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Veuillez patienter.</p>
      </Card>
    );
  }

  const { localization, property, tenant, financial } = data;
  const locationHeadline = `${property.buildingName} — ${property.unitLabel}`;
  const buildingWithUnitFocusHref = `/biens/${encodeURIComponent(property.buildingId)}?unitId=${encodeURIComponent(property.unitId)}&hintUnitLabel=${encodeURIComponent(property.unitLabel)}&returnLocation=${encodeURIComponent(id ? `/locations/${id}` : '/locations')}`;
  const bauxWithLeaseFocusHref = `/baux?leaseId=${encodeURIComponent(data.leaseId)}&hintTenant=${encodeURIComponent(tenant.fullName)}&hintPlace=${encodeURIComponent(locationHeadline)}`;

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
        backHref={back.href}
        backLabel={back.label}
        breadcrumbCurrent={locationHeadline}
        breadcrumbTitle={locationHeadline}
      >
        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          <div
            className="flex size-[3.15rem] shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-gradient-to-br from-brand-50 via-white to-sky-50/90 text-brand-700 shadow-md shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.03] dark:border-slate-600 dark:from-brand-950/50 dark:via-slate-900 dark:to-slate-800/90 dark:text-brand-300 dark:ring-white/[0.04] sm:size-[3.35rem]"
            aria-hidden
            title="Locations"
          >
            <SidebarNavIcon to="/locations" className="size-6 sm:size-[1.6rem]" />
          </div>
          <div className="min-w-0 flex flex-1 flex-wrap items-center gap-3 pt-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">Fiche location</h1>
            {!data.active ? (
              <span className="rounded-full bg-slate-300/90 px-3 py-1 text-xs font-semibold text-slate-900 dark:bg-slate-600 dark:text-slate-100">
                Bail inactif
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                Bail actif
              </span>
            )}
          </div>
        </div>
        <p className="text-lg font-semibold leading-snug text-slate-900 dark:text-slate-100">{locationHeadline}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{unitKindLabel(property.kind)}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile label="Loyer mensuel">
            <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{fcfa(financial.monthlyRent)}</p>
          </SummaryTile>
          <SummaryTile label="Échéance loyer">
            <p className="text-lg font-bold text-slate-900 dark:text-white">Le {financial.rentDueDay}</p>
            <p className="mt-0.5 text-xs font-normal text-slate-600 dark:text-slate-400">chaque mois</p>
          </SummaryTile>
          <SummaryTile label="Mois en cours">
            <span
              className={`inline-flex rounded-lg px-2.5 py-1 text-sm font-semibold ${badge(financial.currentPaymentStatusFr)}`}
            >
              {financial.currentPaymentStatusFr}
            </span>
          </SummaryTile>
          <SummaryTile label="Période suivie">
            <p className="text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {String(financial.currentPeriodMonth).padStart(2, '0')}/{financial.currentPeriodYear}
            </p>
          </SummaryTile>
        </div>

        <div className="mt-5 border-t border-slate-200/80 pt-4 dark:border-slate-700/80">
          <div className="flex flex-wrap gap-2">
            <LinkButton
              to={`/paiements?leaseId=${encodeURIComponent(data.leaseId)}&year=all&month=all&hintTenant=${encodeURIComponent(tenant.fullName)}&hintPlace=${encodeURIComponent(locationHeadline)}`}
              variant="primary"
              className="py-2.5 text-sm"
            >
              Échéances & paiements (ce bail)
            </LinkButton>
            <LinkButton to={buildingWithUnitFocusHref} variant="secondary" className="py-2.5 text-sm">
              Fiche du bien (cette unité)
            </LinkButton>
            <LinkButton to={bauxWithLeaseFocusHref} variant="secondary" className="py-2.5 text-sm">
              Baux & génération (ce bail)
            </LinkButton>
          </div>
          <p className="mt-2.5 max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <strong className="font-semibold text-slate-700 dark:text-slate-300">Paiements</strong> : échéances de ce bail.{' '}
            <strong className="font-semibold text-slate-700 dark:text-slate-300">Fiche du bien</strong> : unité mise en avant.{' '}
            <strong className="font-semibold text-slate-700 dark:text-slate-300">Baux</strong> : génération des loyers et contrat.
          </p>
        </div>
      </PageDetailHero>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Localisation" />
          <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <DlField label="Ville">{localization.city}</DlField>
            <DlField label="Commune / zone">{localization.commune}</DlField>
            {localization.address ? (
              <DlField label="Adresse ou précision" span2>
                {localization.address}
              </DlField>
            ) : null}
            {localization.postalCode ? <DlField label="Code postal">{localization.postalCode}</DlField> : null}
            <DlField label="Pays">{localization.country}</DlField>
          </dl>
          <p className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2.5 text-sm font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-200">
            {localization.shortLabel}
          </p>
        </Card>

        <Card>
          <SectionHeader title="Logement loué" />
          <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <DlField label="Site (immeuble / terrain)">{property.buildingName}</DlField>
            <DlField label="Unité / lot">{property.unitLabel}</DlField>
            <DlField label="Type">{unitKindLabel(property.kind)}</DlField>
            <DlField label="Étage">{property.floor != null ? property.floor : '—'}</DlField>
            <DlField label="Pièces">{property.rooms != null ? property.rooms : '—'}</DlField>
            <DlField label="Surface">{property.surfaceM2 != null ? `${property.surfaceM2} m²` : '—'}</DlField>
            {(property.description || property.notes) && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-slate-600 dark:text-slate-400">Description</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                  {property.description || property.notes}
                </dd>
              </div>
            )}
          </dl>
          <LinkButton to={buildingWithUnitFocusHref} variant="secondary" className="mt-5 py-2.5 text-sm">
            Ouvrir la fiche du bien (unité {property.unitLabel})
          </LinkButton>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Locataire" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-sky-500/25 text-base font-bold uppercase tracking-wide text-brand-800 shadow-sm dark:from-brand-500/25 dark:to-sky-500/20 dark:text-brand-200"
            aria-hidden
          >
            {`${tenant.firstName?.[0] ?? ''}${tenant.lastName?.[0] ?? ''}`.trim() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-semibold leading-snug text-slate-900 dark:text-slate-100">{tenant.fullName}</p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-600 dark:bg-slate-800/50">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-400">Téléphone</dt>
                  <dd className="mt-1.5 text-[15px] font-medium text-slate-900 dark:text-slate-100">
                    {tenant.phone?.trim() ? (
                      <a
                        href={`tel:${tenant.phone.replace(/\s/g, '')}`}
                        className="text-brand-700 hover:underline dark:text-brand-400"
                      >
                        {tenant.phone}
                      </a>
                    ) : (
                      <span className="font-normal text-slate-500 dark:text-slate-400">Non renseigné</span>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2 sm:max-w-xl">
                  <dt className="text-xs font-semibold text-slate-600 dark:text-slate-400">E-mail</dt>
                  <dd className="mt-1.5 break-all text-[15px] font-medium text-slate-900 dark:text-slate-100">
                    {tenant.email?.trim() ? (
                      <a href={`mailto:${tenant.email}`} className="text-brand-700 hover:underline dark:text-brand-400">
                        {tenant.email}
                      </a>
                    ) : (
                      <span className="font-normal text-slate-500 dark:text-slate-400">Non renseigné</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <LinkButton to={`/locataires?edit=${tenant.id}`} variant="secondary" className="py-2.5 text-sm">
                Modifier la fiche locataire
              </LinkButton>
              <LinkButton to="/locataires" variant="ghost" className="py-2.5 text-sm">
                Tous les locataires
              </LinkButton>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Pièce jointe : contrat"
          hintTitle="PDF ou image du contrat signé (15 Mo max). Un nouveau fichier remplace l’ancien."
        />
        <LeaseContractSection leaseId={data.leaseId} contract={data.contract} onChanged={reload} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionHeader
            title="Suivi du mois"
            hintTitle="Statut et échéance pour la période affichée en tête de page. Détail des encaissements : Paiements (bouton ci-dessus)."
          />
          <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <DlField label="Statut loyer">
              <span className={`inline-flex rounded-lg px-2.5 py-1 text-sm font-semibold ${badge(financial.currentPaymentStatusFr)}`}>
                {financial.currentPaymentStatusFr}
              </span>
            </DlField>
            {financial.currentPaymentDueDate ? (
              <DlField label="Échéance">{financial.currentPaymentDueDate.slice(0, 10)}</DlField>
            ) : (
              <DlField label="Échéance">
                <span className="font-normal text-slate-500 dark:text-slate-400">—</span>
              </DlField>
            )}
          </dl>
        </Card>

        <Card>
          <SectionHeader title="Dépôt de garantie" hintTitle="Montant contractuel et date d’encaissement enregistrée dans l’application." />
          {financial.depositAmount != null && financial.depositAmount > 0 ? (
            <>
              <dl className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                <DlField label="Montant" span2>
                  <span className="block text-[15px] font-semibold">{fcfa(financial.depositAmount)}</span>
                  {financial.depositPaidAt ? (
                    <span className="mt-2 block text-sm font-normal text-emerald-700 dark:text-emerald-400">
                      Encaissée le {financial.depositPaidAt}
                    </span>
                  ) : (
                    <span className="mt-2 block text-sm font-normal text-amber-800 dark:text-amber-300">
                      Encaissement non enregistré
                    </span>
                  )}
                </DlField>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="py-2.5 text-sm"
                  disabled={depositActBusy || !!financial.depositPaidAt}
                  onClick={() => void markDepositReceived(new Date().toISOString().slice(0, 10))}
                >
                  Marquer comme encaissée (aujourd’hui)
                </Button>
                {financial.depositPaidAt ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="py-2.5 text-sm"
                    disabled={depositActBusy}
                    onClick={() => void clearDepositReceived()}
                  >
                    Effacer la date d’encaissement
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">Aucun montant renseigné sur ce bail. Indiquez-le dans « Modifier le bail ».</p>
          )}
        </Card>
      </div>

      {data.active ? (
        <Card className="border-brand-200/60 bg-gradient-to-br from-brand-50/90 to-slate-50/80 dark:border-brand-500/25 dark:from-brand-950/30 dark:to-slate-900/40">
          <SectionHeader
            title="Paiement groupé (plusieurs mois)"
            hintTitle="Enregistre les prochaines échéances impayées dans l’ordre du calendrier. Les lignes doivent exister (page Baux)."
          />
          <div className="mt-1 flex flex-wrap items-end gap-3">
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
            <Button type="button" className="py-2.5 text-sm" disabled={prepayBusy} onClick={() => void prepayRent()}>
              {prepayBusy ? 'Enregistrement…' : 'Marquer ces mois comme payés'}
            </Button>
          </div>
          {prepayErr ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{prepayErr}</p> : null}
        </Card>
      ) : null}

      <Card>
        <SectionHeader
          title="Modifier le bail"
          hintTitle="Loyer, dates et dépôt. Les échéances impayées ou en retard suivent le nouveau loyer ; les mois déjà payés sont inchangés."
        />
        <form onSubmit={(e) => void saveLeaseConditions(e)} className="grid gap-4 sm:grid-cols-2">
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
            {leaseErr ? <p className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">{leaseErr}</p> : null}
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <Button type="submit" className="py-2.5 text-sm" disabled={savingLease}>
                {savingLease ? 'Enregistrement…' : 'Enregistrer les conditions du bail'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="py-2.5 text-sm"
                disabled={savingLease || !leaseFormDirty}
                onClick={resetLeaseEditForm}
              >
                Annuler
              </Button>
            </div>
          </form>
      </Card>

      <Card className="border-red-200/90 bg-red-50/30 dark:border-red-900/45 dark:bg-red-950/20">
        <h2 className="text-base font-semibold text-red-900 dark:text-red-200">Zone sensible — supprimer la location</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          Retire le bail, toutes les échéances de loyer enregistrées et le contrat joint. L’unité redevient libre pour un nouveau
          bail ; le locataire reste dans l’annuaire.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 border-red-300 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-100 dark:border-red-800/60 dark:text-red-300 dark:hover:bg-red-950/50"
          onClick={() => void requestDeleteLocation()}
        >
          Supprimer définitivement le bail…
        </Button>
      </Card>
    </div>
  );
}
