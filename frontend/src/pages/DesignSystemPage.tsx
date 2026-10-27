import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AmountFcfaInput, Button, Card, Input, Label, StatTile } from '@/components/ui';
import { OdooActionBar, OdooFormSection, OdooFieldRow, OdooTabBar } from '@/components/OdooKit';
import { useTheme } from '@/theme/ThemeContext';
import {
  DESIGN_OPTIONS,
  applyDesignOption,
  getStoredDesignOption,
  persistDesignOption,
  type DesignOption,
} from '@/theme/designPreview';

const STATUS_SWATCHES = [
  { key: 'paid', label: 'Payé', color: 'var(--status-paid)', bg: 'var(--status-paid-bg)' },
  { key: 'late', label: 'En retard', color: 'var(--status-late)', bg: 'var(--status-late-bg)' },
  { key: 'pending', label: 'En attente', color: 'var(--status-pending)', bg: 'var(--status-pending-bg)' },
  { key: 'waived', label: 'Abandonné', color: 'var(--status-waived)', bg: 'var(--status-waived-bg)' },
  { key: 'cancelled', label: 'Annulé', color: 'var(--status-cancelled)', bg: 'var(--status-cancelled-bg)' },
] as const;

const BRAND_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

function Swatch({
  name,
  varName,
  hexHint,
}: {
  name: string;
  varName: string;
  hexHint?: string;
}) {
  return (
    <div className="min-w-0">
      <div
        className="h-14 rounded-[var(--radius-card)] border border-[var(--odoo-border)] shadow-[var(--shadow-soft)]"
        style={{ background: `var(${varName})` }}
        title={varName}
      />
      <p className="mt-1.5 truncate text-[11px] font-semibold text-[var(--color-ink)]">{name}</p>
      <p className="truncate font-mono text-[10px] text-[var(--color-muted)]">{hexHint ?? varName}</p>
    </div>
  );
}

/**
 * Page DEV uniquement — galerie tokens + états composants existants.
 * Non liée dans la navigation. Options A/B pour choix produit Phase 2.
 */
export function DesignSystemPage() {
  const { theme, toggle } = useTheme();
  const [option, setOptionState] = useState<DesignOption | null>(() => getStoredDesignOption());
  const [tab, setTab] = useState('tokens');
  const [amount, setAmount] = useState('250000');

  const setOption = useCallback((next: DesignOption | null) => {
    setOptionState(next);
    applyDesignOption(next);
    persistDesignOption(next);
  }, []);

  useEffect(() => {
    applyDesignOption(option);
  }, [option]);

  return (
    <div
      className="min-h-[100dvh] bg-[var(--color-app-bg)] text-[var(--color-ink)]"
      data-testid="design-system-page"
    >
      <header className="odoo-chrome-bar sticky top-0 z-[var(--z-sticky)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Calm ledger · DEV
            </p>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Design system</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={toggle}>
              Thème {theme === 'dark' ? 'sombre' : 'clair'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOption(null)}>
              Retirer preview
            </Button>
            <Link
              to={option ? `/?ds=${option}` : '/'}
              className="inline-flex min-h-9 items-center rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 text-sm font-medium"
            >
              Dashboard {option ? `(option ${option.toUpperCase()})` : ''}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <h2 className="text-base font-semibold">Choix produit — 2 options</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted)]">
            Preview locale uniquement (<code className="text-xs">data-ds-option</code> /{' '}
            <code className="text-xs">?ds=a|b</code>). Aucun changement métier. Répondez A ou B pour
            figer la direction.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {DESIGN_OPTIONS.map((opt) => {
              const active = option === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`ds-option-${opt.id}`}
                  onClick={() => setOption(opt.id)}
                  className={`rounded-[var(--radius-card)] border p-4 text-left transition ${
                    active
                      ? 'border-brand-600 ring-2 ring-brand-600/35'
                      : 'border-[var(--odoo-border)] hover:border-[var(--odoo-border-strong)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="size-10 shrink-0 rounded-full border border-[var(--odoo-border)]"
                      style={{ background: opt.accentHex }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="font-semibold">{opt.title}</p>
                      <p className="text-[12px] text-[var(--color-muted)]">
                        Accent {opt.accent} · {opt.sidebar}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-[var(--color-muted)]">{opt.summary}</p>
                  {active ? (
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-brand-700">
                      Preview active
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        {/* Mini chrome sidebar pour comparer sans quitter la page */}
        <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--odoo-border)] shadow-[var(--shadow-soft)]">
          <div className="flex min-h-[220px] flex-col sm:flex-row">
            <aside className="odoo-sidebar w-full shrink-0 p-4 sm:w-56" aria-label="Aperçu sidebar">
              <div className="flex items-center gap-2">
                <span className="h-8 w-1 shrink-0 rounded-sm bg-brand-600" aria-hidden />
                <div>
                  <div className="odoo-sidebar-brand text-[15px] font-semibold">ImmoPilot</div>
                  <p className="text-[11px] opacity-70">Gestion locative</p>
                </div>
              </div>
              <nav className="mt-4 flex flex-col gap-0.5">
                <span className="odoo-nav-item odoo-nav-item-active">Tableau de bord</span>
                <span className="odoo-nav-item">Paiements</span>
                <span className="odoo-nav-item">Locations</span>
              </nav>
            </aside>
            <div className="flex-1 bg-[var(--color-app-bg)] p-4">
              <div className="odoo-page-header">
                <div className="odoo-page-header__bar px-3 py-3">
                  <div>
                    <h3 className="odoo-page-header__title text-lg font-semibold">Aperçu coquille</h3>
                    <p className="odoo-page-header__subtitle text-sm text-[var(--color-muted)]">
                      Money hero · 1 250 000 FCFA
                    </p>
                  </div>
                  <div className="odoo-page-header__actions">
                    <Button type="button" variant="primary">
                      Enregistrer un paiement
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <StatTile label="Dû" value="1 250 000" />
                <StatTile label="Payé" value="900 000" />
                <StatTile label="Reste" value="350 000" emphasize className="col-span-2 sm:col-span-1" />
              </div>
            </div>
          </div>
        </section>

        <OdooTabBar
          tabs={[
            { id: 'tokens', label: 'Tokens' },
            { id: 'components', label: 'Composants' },
            { id: 'status', label: 'Statuts' },
          ]}
          activeId={tab}
          onChange={setTab}
        />

        {tab === 'tokens' ? (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--color-muted)]">
                Brand
              </h2>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-11">
                {BRAND_STEPS.map((step) => (
                  <Swatch key={step} name={`${step}`} varName={`--color-brand-${step}`} />
                ))}
              </div>
            </section>
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--color-muted)]">
                Surfaces & texte
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Swatch name="App bg" varName="--color-app-bg" />
                <Swatch name="Surface" varName="--color-surface" />
                <Swatch name="Ink" varName="--color-ink" />
                <Swatch name="Muted" varName="--color-muted" />
              </div>
            </section>
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--color-muted)]">
                Typo · rayons · ombre
              </h2>
              <Card className="space-y-3">
                <p className="text-3xl font-semibold tracking-tight">Titre 30 / 1.875rem</p>
                <p className="text-xl font-semibold">Sous-titre 20</p>
                <p className="text-base">Corps 16 — saisie mobile sans zoom iOS.</p>
                <p className="text-sm text-[var(--color-muted)]">Secondaire 14</p>
                <p className="text-xs text-[var(--color-muted)]">Minimum 12 — jamais en dessous.</p>
                <p className="text-2xl font-semibold tabular-nums tracking-tight">1 250 000 FCFA</p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <div
                    className="flex h-12 w-24 items-center justify-center border border-[var(--odoo-border)] bg-[var(--color-app-bg)] text-[11px]"
                    style={{ borderRadius: 'var(--radius-input)' }}
                  >
                    input 8px
                  </div>
                  <div
                    className="flex h-16 w-32 items-center justify-center border border-[var(--odoo-border)] bg-[var(--color-app-bg)] text-[11px] shadow-[var(--shadow-soft)]"
                    style={{ borderRadius: 'var(--radius-card)' }}
                  >
                    card 12px
                  </div>
                </div>
              </Card>
            </section>
          </div>
        ) : null}

        {tab === 'components' ? (
          <div className="space-y-6">
            <OdooActionBar
              left={<p className="text-sm font-medium">Barre d’actions (OdooKit)</p>}
              right={
                <>
                  <Button type="button" variant="secondary">
                    Secondaire
                  </Button>
                  <Button type="button" variant="primary">
                    Primaire
                  </Button>
                </>
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="primary">
                Primary
              </Button>
              <Button type="button" variant="primarySoft">
                Soft
              </Button>
              <Button type="button" variant="secondary">
                Secondary
              </Button>
              <Button type="button" variant="ghost">
                Ghost
              </Button>
              <Button type="button" variant="danger">
                Danger
              </Button>
              <Button type="button" variant="primary" disabled>
                Disabled
              </Button>
            </div>
            <OdooFormSection title="Champs (kit actuel)">
              <div className="grid gap-4 md:grid-cols-2">
                <OdooFieldRow label="Libellé">
                  <Label htmlFor="ds-input">Nom</Label>
                  <Input id="ds-input" placeholder="Ex. Appartement A1" defaultValue="" />
                </OdooFieldRow>
                <OdooFieldRow label="Montant" hint="FCFA tabular">
                  <AmountFcfaInput
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    aria-label="Montant FCFA"
                  />
                </OdooFieldRow>
                <OdooFieldRow label="Erreur">
                  <Input aria-invalid defaultValue="valeur" className="border-red-600 ring-1 ring-red-600/30" />
                  <p className="mt-1 text-[12px] text-red-700 dark:text-red-400">Ce champ est obligatoire.</p>
                </OdooFieldRow>
                <OdooFieldRow label="Désactivé">
                  <Input disabled defaultValue="Lecture seule" />
                </OdooFieldRow>
              </div>
            </OdooFormSection>
            <p className="text-sm text-[var(--color-muted)]">
              Kit unifié (Toast, ConfirmDialog, DataTable, etc.) : Phase 3. Ici : états du kit actuel.
            </p>
          </div>
        ) : null}

        {tab === 'status' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STATUS_SWATCHES.map((s) => (
              <div
                key={s.key}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--odoo-border)] px-3 py-3"
                style={{ background: s.bg }}
              >
                <span
                  className="inline-flex size-8 items-center justify-center rounded-full text-white"
                  style={{ background: s.color }}
                  aria-hidden
                >
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: s.color }}>
                    {s.label}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)]">Icône + texte + couleur</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
