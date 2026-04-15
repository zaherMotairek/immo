import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useAppNavigation } from '@/context/NavigationContext';
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
import { useEscapeCancel } from '@/lib/useEscapeCancel';
import { monthTitle, statusLabel, statusStyle } from '@/lib/paymentStatusUi';

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
    currentPaymentStatus?: string | null;
    currentPaymentStatusFr: string;
    currentPaymentDueDate: string | null;
  };
  /** Dernières échéances du bail (ordre chronologique). */
  paymentSchedule?: Array<{
    id: string;
    periodYear: number;
    periodMonth: number;
    dueDate: string;
    amountDue: number;
    amountPaid: number | null;
    status: string;
    statusFr: string;
    waiveReason: string | null;
    waivedAt: string | null;
  }>;
  contract: {
    fileName: string | null;
    mimeType: string | null;
    size: number | null;
    uploadedAt: string | null;
  } | null;
};

function SectionHeader({ title, hintTitle }: { title: string; hintTitle?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-300/90 pb-3 dark:border-slate-600/80">
      <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</h2>
      {hintTitle ? <HelpHint title={hintTitle} className="shrink-0" /> : null}
    </div>
  );
}

function SubBlockTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2.5 text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">{children}</h3>
  );
}

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { setReturnFallback } = useAppNavigation();
  const back = useMemo(
    () => resolveReturnTarget(routerLocation.state, { fallbackHref: '/locations', fallbackLabel: 'Locations' }),
    [routerLocation.state],
  );
  useEffect(() => {
    setReturnFallback(back.href);
    return () => setReturnFallback('/');
  }, [back.href, setReturnFallback]);
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
  const [waiveTargetId, setWaiveTargetId] = useState<string | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiveBusy, setWaiveBusy] = useState(false);
  const [waiveErr, setWaiveErr] = useState<string | null>(null);

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

  useEscapeCancel(leaseFormDirty, resetLeaseEditForm);

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

  async function submitWaiveRent() {
    if (!waiveTargetId) return;
    const r = waiveReason.trim();
    if (r.length < 3) {
      setWaiveErr('Indiquez un motif d’au moins 3 caractères.');
      return;
    }
    setWaiveBusy(true);
    setWaiveErr(null);
    try {
      await api(`/payments/${waiveTargetId}/waive`, { method: 'POST', json: { reason: r } });
      setWaiveTargetId(null);
      setWaiveReason('');
      await reload();
    } catch (e2) {
      setWaiveErr(e2 instanceof Error ? e2.message : 'Enregistrement impossible.');
    } finally {
      setWaiveBusy(false);
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
  const paymentsHref = `/paiements?leaseId=${encodeURIComponent(data.leaseId)}&year=all&month=all&hintTenant=${encodeURIComponent(tenant.fullName)}&hintPlace=${encodeURIComponent(locationHeadline)}`;

  async function requestDeleteLocation() {
    if (!data) return;
    const msg = `Supprimer définitivement ce bail (${tenant.fullName} — ${locationHeadline}) ? Les paiements, échéances et le fichier de contrat seront supprimés. Le bien, l’unité et le locataire ne sont pas supprimés. Irréversible.`;
    if (!window.confirm(msg)) return;
    try {
      await api(`/leases/${data.leaseId}`, { method: 'DELETE' });
      navigate('/locations', { replace: true });
    } catch (e2) {
      alert(e2 instanceof Error ? e2.message : 'Suppression impossible.');
    }
  }

  return (
    <div className="space-y-5">
      <PageDetailHero
        backHref={back.href}
        backLabel={back.label}
        breadcrumbCurrent={locationHeadline}
        breadcrumbTitle={locationHeadline}
      >
        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-brand-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-brand-300 sm:size-12"
            aria-hidden
            title="Locations"
          >
            <SidebarNavIcon to="/locations" className="size-5 sm:size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Fiche location</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50 sm:text-[1.65rem]">{locationHeadline}</h1>
              {!data.active ? (
                <span className="rounded-md bg-slate-300/95 px-2.5 py-1 text-xs font-bold text-slate-900 dark:bg-slate-600 dark:text-slate-100">
                  Inactif
                </span>
              ) : (
                <span className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-100">
                  Actif
                </span>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-300/90 pt-4 text-base dark:border-slate-600/80">
              <span className="tabular-nums text-lg font-bold text-slate-950 dark:text-slate-50">{fcfa(financial.monthlyRent)}</span>
              <span className="text-slate-500 dark:text-slate-400">·</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">Échéance le {financial.rentDueDay} / mois</span>
              <span className="text-slate-500 dark:text-slate-400">·</span>
              <span
                className={`inline-flex rounded-md px-2.5 py-1 text-sm font-bold ${statusStyle(financial.currentPaymentStatus ?? '')}`}
              >
                {statusLabel(financial.currentPaymentStatus ?? '')}
              </span>
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

      <Card id="fiche-lieu" className="scroll-mt-24 !overflow-hidden !p-0 text-[15px] leading-relaxed text-slate-800 shadow-sm dark:text-slate-200">
        <div className="border-b border-slate-300/90 bg-slate-100/90 px-5 py-4 dark:border-slate-600/80 dark:bg-slate-800/90">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Lieu, locataire & finances</h2>
          <p className="mt-1.5 text-[15px] font-medium text-slate-700 dark:text-slate-300">
            Lieu & locataire · caution & règlements groupés.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-slate-300/90 dark:lg:divide-slate-600/70">
          <div className="p-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-100">Lieu & logement</h3>
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold leading-snug text-slate-950 dark:text-slate-50">
                  {localization.shortLabel?.trim() ||
                    [localization.commune, localization.city].filter(Boolean).join(', ') ||
                    '—'}
                </p>
                {localization.address?.trim() ? (
                  <p className="mt-2 text-[15px] font-medium text-slate-800 dark:text-slate-200">{localization.address}</p>
                ) : null}
                {localization.postalCode?.trim() ? (
                  <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{localization.postalCode}</p>
                ) : null}
              </div>

              {(() => {
                const bits: string[] = [];
                bits.push(unitKindLabel(property.kind));
                if (property.surfaceM2 != null) bits.push(`${property.surfaceM2} m²`);
                if (property.rooms != null) bits.push(`${property.rooms} pièce${property.rooms !== 1 ? 's' : ''}`);
                if (property.floor != null) bits.push(property.floor === 0 ? 'RDC' : `Étage ${property.floor}`);
                const line = bits.filter(Boolean).join(' · ');
                return line ? <p className="font-medium text-slate-800 dark:text-slate-200">{line}</p> : null;
              })()}

              {(property.description || property.notes)?.trim() ? (
                <p className="text-[15px] text-slate-800 dark:text-slate-200">{property.description || property.notes}</p>
              ) : null}

              <div className="border-t border-slate-300/90 pt-4 dark:border-slate-600/80">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-100">Locataire</p>
                <p className="mt-2 text-lg font-bold text-slate-950 dark:text-slate-50">{tenant.fullName}</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
                  {tenant.phone?.trim() ? (
                    <a
                      href={`tel:${tenant.phone.replace(/\s/g, '')}`}
                      className="text-base font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-300"
                    >
                      {tenant.phone}
                    </a>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400">—</span>
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

          <div id="fiche-finances" className="border-t border-slate-300/90 bg-slate-50/90 p-5 dark:border-slate-600/80 dark:bg-slate-900/75 lg:border-t-0">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-100">Finances sur ce bail</h3>
            <p className="mb-4 text-[15px] font-medium text-slate-800 dark:text-slate-200">
              Détail mois par mois : bouton <span className="font-bold text-slate-950 dark:text-white">Paiements</span> en haut de page.
            </p>

            {(data.paymentSchedule ?? []).length ? (
              <div className="mb-5 rounded-lg border-2 border-slate-200/95 bg-white p-4 dark:border-slate-500/60 dark:bg-slate-950/60">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-100">
                    Loyers & gestes commerciaux
                  </span>
                  <HelpHint title="Gratuité : le mois reste tracé avec son montant théorique, sans encaissement. Motif obligatoire." />
                </div>
                <div className="max-h-72 overflow-auto rounded-md border border-slate-200/90 dark:border-slate-600/70">
                  <table className="w-full min-w-[28rem] text-left text-sm">
                    <thead className="sticky top-0 bg-slate-100/95 text-xs font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800/95 dark:text-slate-300">
                      <tr>
                        <th className="px-3 py-2">Période</th>
                        <th className="px-3 py-2">Montant dû</th>
                        <th className="px-3 py-2">Statut</th>
                        <th className="px-3 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/90 dark:divide-slate-600/80">
                      {(data.paymentSchedule ?? []).map((row) => {
                        const canWaive =
                          data.active && (row.status === 'PENDING' || row.status === 'LATE');
                        return (
                          <tr key={row.id} className="bg-white/80 dark:bg-slate-950/40">
                            <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                              {monthTitle(row.periodYear, row.periodMonth)}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums text-slate-800 dark:text-slate-200">{fcfa(row.amountDue)}</td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold ${statusStyle(row.status)}`}
                              >
                                {statusLabel(row.status)}
                              </span>
                              {row.status === 'WAIVED' && row.waiveReason?.trim() ? (
                                <p className="mt-1 max-w-[14rem] text-xs text-slate-600 dark:text-slate-400" title={row.waiveReason}>
                                  {row.waiveReason}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {canWaive ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="py-1.5 text-xs"
                                  onClick={() => {
                                    setWaiveErr(null);
                                    setWaiveReason('');
                                    setWaiveTargetId(row.id);
                                  }}
                                >
                                  Offrir ce mois
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border-2 border-slate-200/95 bg-white p-4 dark:border-slate-500/60 dark:bg-slate-950/60">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold uppercase tracking-wide text-slate-800 dark:text-slate-100">Caution</span>
                <HelpHint title="Montant contractuel et date d’encaissement." />
              </div>
              {financial.depositAmount != null && financial.depositAmount > 0 ? (
                <>
                  <p className="text-xl font-bold tabular-nums text-slate-950 dark:text-slate-50">{fcfa(financial.depositAmount)}</p>
                  {financial.depositPaidAt ? (
                    <p className="mt-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">Encaissée le {financial.depositPaidAt}</p>
                  ) : (
                    <p className="mt-1.5 text-sm font-semibold text-amber-900 dark:text-amber-200">Encaissement non enregistré</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="py-2 text-sm"
                      disabled={depositActBusy || !!financial.depositPaidAt}
                      onClick={() => void markDepositReceived(new Date().toISOString().slice(0, 10))}
                    >
                      Marquer encaissée (aujourd’hui)
                    </Button>
                    {financial.depositPaidAt ? (
                      <Button type="button" variant="ghost" className="py-2 text-sm" disabled={depositActBusy} onClick={() => void clearDepositReceived()}>
                        Effacer la date
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-[15px] font-medium text-slate-800 dark:text-slate-200">
                  Aucun montant. Indiquez-le dans les conditions du bail.
                </p>
              )}
            </div>

            {data.active ? (
              <div className="mt-5 border-t border-slate-300/90 pt-5 dark:border-slate-600/80">
                <SubBlockTitle>Paiement groupé</SubBlockTitle>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <Label htmlFor="prepay-n">Nombre de mois</Label>
                    <Select id="prepay-n" className="mt-1 min-w-[10rem]" value={prepayMonths} onChange={(e) => setPrepayMonths(e.target.value)}>
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
          </div>
        </div>
      </Card>

      <Card id="fiche-bail" className="scroll-mt-24 !overflow-hidden !p-0 text-[15px] leading-relaxed text-slate-800 shadow-sm dark:text-slate-200">
        <div className="!p-5">
          <SectionHeader title="Contrat signé" hintTitle="PDF ou image, 15 Mo max." />
          <LeaseContractSection leaseId={data.leaseId} contract={data.contract} onChanged={reload} />
        </div>

        <div className="border-t border-slate-300/90 bg-slate-50/80 !px-5 !py-5 dark:border-slate-600/80 dark:bg-slate-900/60">
          <SectionHeader title="Conditions du bail" hintTitle="Loyer, dates, caution. Les mois déjà payés ne sont pas recalculés." />
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
                <span className="self-center text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">Raccourcis :</span>
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
            <Input id="lease-edit-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="lease-edit-end">Fin du bail (optionnel)</Label>
            <Input id="lease-edit-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          {leaseErr ? <p className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">{leaseErr}</p> : null}
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button type="submit" className="py-2.5 text-sm" disabled={savingLease}>
              {savingLease ? 'Enregistrement…' : 'Enregistrer'}
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
        </div>

        <div className="border-t border-red-300/80 bg-red-50/90 !px-5 !py-4 dark:border-red-800/60 dark:bg-red-950/80">
          <h2 className="text-base font-bold text-red-950 dark:text-red-100">Supprimer ce bail</h2>
          <p className="mt-1.5 text-sm font-medium text-slate-800 dark:text-slate-200">
            Retire échéances et contrat. Locataire et bien conservés.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 border-red-300 py-2.5 text-sm font-semibold text-red-900 hover:bg-red-100 dark:border-red-800/70 dark:text-red-100 dark:hover:bg-red-950/50"
            onClick={() => void requestDeleteLocation()}
          >
            Supprimer définitivement…
          </Button>
        </div>
      </Card>

      {waiveTargetId ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="waive-dialog-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xl dark:border-slate-600 dark:bg-slate-900">
            <h2 id="waive-dialog-title" className="text-lg font-bold text-slate-950 dark:text-slate-50">
              Gratuité de loyer
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              Le montant théorique du mois est conservé pour l’audit. Aucun encaissement n’est enregistré. Cette action est traçable via le motif ci-dessous.
            </p>
            <div className="mt-4">
              <Label htmlFor="waive-reason">Motif (obligatoire)</Label>
              <textarea
                id="waive-reason"
                rows={4}
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200/95 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm placeholder:font-normal placeholder:text-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/18 dark:border-slate-600 dark:bg-slate-950/50 dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus:bg-slate-950 dark:focus:ring-brand-500/22"
                placeholder="Ex. : arrangement travaux, geste commercial convenu avec le locataire…"
                autoFocus
              />
            </div>
            {waiveErr ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{waiveErr}</p> : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={waiveBusy}
                onClick={() => {
                  setWaiveTargetId(null);
                  setWaiveReason('');
                  setWaiveErr(null);
                }}
              >
                Annuler
              </Button>
              <Button type="button" disabled={waiveBusy} onClick={() => void submitWaiveRent()}>
                {waiveBusy ? 'Enregistrement…' : 'Confirmer la gratuité'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
