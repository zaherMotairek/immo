import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { fcfa } from '@/lib/format';
import {
  KpiIconAlert,
  KpiIconBuilding,
  KpiIconLease,
  KpiIconMoney,
  KpiIconTrendUp,
  KpiIconUnits,
} from '@/components/dashboardKpiIcons';
import { LinkButton } from '@/components/LinkButton';
import { Button, Card } from '@/components/ui';
import { unitKindLabel } from '@/lib/unitKind';
import {
  formatPhoneForWhatsApp,
  overdueReminderWhatsAppText,
  whatsAppWebUrl,
} from '@/lib/whatsappReminder';

type Overview = {
  kpis: {
    buildings: number;
    units: number;
    activeLeases: number;
    expectedMonthlyRent: number;
    collectedThisMonth: number;
    overdueCount: number;
    overdueAmount: number;
  };
  alerts: Array<{
    paymentId: string;
    tenantId: string;
    tenantFirstName: string;
    tenantEmail: string | null;
    tenantPhone: string | null;
    dueDate: string;
    amountDue: number;
    status: string;
    period: string;
    tenant: string;
    unit?: string;
    unitKind?: string;
    building?: string;
    commune?: string;
    city?: string;
  }>;
};

export function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function sendReminder(paymentId: string) {
    setSendingId(paymentId);
    try {
      const res = await api<{ message?: string }>(`/payments/${paymentId}/send-reminder`, { method: 'POST' });
      alert(res.message ?? 'Relance envoyée.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setSendingId(null);
    }
  }

  useEffect(() => {
    api<Overview>('/dashboard')
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : 'Erreur'));
  }, []);

  if (err) {
    return (
      <Card>
        <p className="text-red-600">{err}</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </Card>
    );
  }

  if (!data) {
    return <p className="text-slate-500">Chargement du tableau de bord…</p>;
  }

  const { kpis, alerts } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tableau de bord</h1>
        <p className="text-sm text-slate-600">Vue d’ensemble de votre parc et des loyers.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="!p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
            <KpiIconBuilding className="h-4 w-4 shrink-0 text-slate-400" />
            Biens
          </p>
          <p className="mt-1 text-2xl font-semibold">{kpis.buildings}</p>
        </Card>
        <Card className="!p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
            <KpiIconUnits className="h-4 w-4 shrink-0 text-slate-400" />
            Unités
          </p>
          <p className="mt-1 text-2xl font-semibold">{kpis.units}</p>
        </Card>
        <Card className="!p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
            <KpiIconLease className="h-4 w-4 shrink-0 text-slate-400" />
            Baux actifs
          </p>
          <p className="mt-1 text-2xl font-semibold">{kpis.activeLeases}</p>
        </Card>
        <Card className="!p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
            <KpiIconMoney className="h-4 w-4 shrink-0 text-slate-400" />
            Loyer mensuel attendu
          </p>
          <p className="mt-1 text-2xl font-semibold">{fcfa(kpis.expectedMonthlyRent)}</p>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <KpiIconTrendUp className="h-5 w-5 shrink-0 text-emerald-600" />
            Encaissements du mois
          </h2>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{fcfa(kpis.collectedThisMonth)}</p>
        </Card>
        <Card className={kpis.overdueCount > 0 ? 'border-amber-200 bg-amber-50/50' : ''}>
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <KpiIconAlert className="h-5 w-5 shrink-0 text-amber-600" />
            Impayés / retard
          </h2>
          <p className="mt-2 text-3xl font-bold text-amber-800">{fcfa(kpis.overdueAmount)}</p>
          <p className="text-sm text-slate-600">{kpis.overdueCount} échéance(s)</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link to="/locations" className="text-sm font-medium text-brand-700">
              Voir les locations →
            </Link>
            <Link to="/paiements?overdue=1" className="text-sm font-medium text-brand-700">
              Paiements en retard →
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-slate-900">Alertes loyers</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Relance e-mail (SMTP dans .env) et lien WhatsApp ouvrant l’app avec un texte prêt à envoyer.
            </p>
          </div>
          <LinkButton to="/paiements" variant="secondary" className="py-2 text-xs">
            Gérer les paiements
          </LinkButton>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-600">Aucune alerte : tous les loyers suivis sont à jour.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {alerts.map((a) => (
              <li
                key={a.paymentId}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{a.tenant || 'Locataire'}</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-600">
                      Période concernée : <span className="text-slate-900">{a.period}</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2.5 text-sm text-slate-800">
                    <p>
                      <span className="font-medium text-slate-500">Lieu :</span>{' '}
                      {[a.commune, a.city].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium text-slate-500">Bien & unité :</span>{' '}
                      <span className="font-medium text-slate-900">{a.building ?? '—'}</span>
                      {a.unit != null && a.unit !== '' && (
                        <>
                          {' '}
                          · <span className="font-medium text-slate-900">{unitKindLabel(a.unitKind)} — {a.unit}</span>
                        </>
                      )}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium text-slate-500">Échéance :</span>{' '}
                      <span className="font-semibold text-slate-900">{a.dueDate.slice(0, 10)}</span>
                    </p>
                  </div>
                  {!a.tenantEmail && !formatPhoneForWhatsApp(a.tenantPhone) && (
                    <p className="text-sm font-medium text-amber-800">
                      Pas d’e-mail ni de n° exploitable — complétez la fiche locataire.
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <div className="text-right sm:text-right">
                    <p className="text-sm font-medium text-slate-500">Montant dû</p>
                    <p className="text-lg font-bold text-amber-800">{fcfa(a.amountDue)}</p>
                    <span className="text-xs uppercase text-slate-500">{a.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.tenantEmail ? (
                      <Button
                        variant="secondary"
                        className="py-2 text-xs"
                        disabled={sendingId !== null}
                        onClick={() => sendReminder(a.paymentId)}
                      >
                        {sendingId === a.paymentId ? 'Envoi…' : 'Relance e-mail'}
                      </Button>
                    ) : null}
                    {(() => {
                      const waDigits = formatPhoneForWhatsApp(a.tenantPhone);
                      if (!waDigits || !a.building || !a.unit) return null;
                      const [py, pm] = a.period.split('-');
                      const periodLabel = py && pm ? `${pm}/${py}` : a.period;
                      const waHref = whatsAppWebUrl(
                        waDigits,
                        overdueReminderWhatsAppText({
                          firstName: a.tenantFirstName || a.tenant || '—',
                          periodLabel,
                          amountFcfa: a.amountDue,
                          dueDateStr: a.dueDate.slice(0, 10),
                          buildingName: a.building,
                          unitLabel: a.unit,
                        }),
                      );
                      return (
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-xl border border-emerald-600/90 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-900 shadow-sm hover:bg-emerald-100"
                        >
                          WhatsApp
                        </a>
                      );
                    })()}
                    <LinkButton to={`/locataires?edit=${a.tenantId}`} variant="ghost" className="py-2 text-xs">
                      Modifier locataire
                    </LinkButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
