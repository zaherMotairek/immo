import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BottomSheet,
  Button,
  Callout,
  Card,
  CardList,
  Checkbox,
  CollectionMethodBadge,
  DataTable,
  DateInput,
  EmptyState,
  Field,
  IconButton,
  Input,
  ListRow,
  Modal,
  MoneyInput,
  PageHeader,
  SegmentedControl,
  Select,
  Skeleton,
  StatTile,
  StatusBadge,
  Stepper,
  StickyActionBar,
  Switch,
  Tabs,
  Textarea,
  Toolbar,
  confirmDialog,
  toast,
} from '@/components/ui/index';
import { useTheme } from '@/theme/ThemeContext';
import {
  DESIGN_OPTIONS,
  applyDesignOption,
  getStoredDesignOption,
  persistDesignOption,
  type DesignOption,
} from '@/theme/designPreview';

/**
 * Page DEV — galerie tokens + états du kit Calm ledger.
 * Non liée dans la navigation.
 */
export function DesignSystemPage() {
  const { theme, toggle } = useTheme();
  const [option, setOptionState] = useState<DesignOption>(() => getStoredDesignOption());
  const [tab, setTab] = useState('kit');
  const [amount, setAmount] = useState('250000');
  const [seg, setSeg] = useState('m');
  const [sw, setSw] = useState(true);
  const [cb, setCb] = useState(false);
  const [selectVal, setSelectVal] = useState('a');
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState('2');

  const setOption = useCallback((next: DesignOption) => {
    setOptionState(next);
    applyDesignOption(next);
    persistDesignOption(next);
  }, []);

  useEffect(() => {
    applyDesignOption(option);
  }, [option]);

  return (
    <div className="min-h-[100dvh] bg-[var(--color-app-bg)] pb-24 text-[var(--color-ink)]" data-testid="design-system-page">
      <header className="odoo-chrome-bar sticky top-0 z-[var(--z-sticky)] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Calm ledger · DEV · Option B figée
            </p>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Design system</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={toggle}>
              Thème {theme === 'dark' ? 'sombre' : 'clair'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOption('b')}>
              Reset Option B
            </Button>
            <Link
              to="/"
              className="inline-flex min-h-10 items-center rounded-[var(--radius-input)] border border-[var(--odoo-border)] bg-[var(--color-surface)] px-3 text-sm font-medium"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <section className="rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <h2 className="text-base font-semibold">Direction produit</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Option B (Emerald + sidebar claire) est la direction figée. L’option A reste disponible en DEV pour
            comparaison.
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
                    active ? 'border-brand-600 ring-2 ring-brand-600/35' : 'border-[var(--odoo-border)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="size-10 shrink-0 rounded-full border border-[var(--odoo-border)]"
                      style={{ background: opt.accentHex }}
                      aria-hidden
                    />
                    <div>
                      <p className="font-semibold">{opt.title}</p>
                      <p className="text-[12px] text-[var(--color-muted)]">
                        {opt.accent} · {opt.sidebar}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-[var(--color-muted)]">{opt.summary}</p>
                  {opt.locked ? (
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-brand-700">Figée</p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <Tabs
          tabs={[
            { id: 'kit', label: 'Kit' },
            { id: 'overlay', label: 'Overlays' },
            { id: 'data', label: 'Données' },
            { id: 'status', label: 'Statuts' },
          ]}
          activeId={tab}
          onChange={setTab}
        />

        {tab === 'kit' ? (
          <div className="space-y-8">
            <PageHeader
              title="En-tête de page"
              subtitle="Money hero · ex. 1 250 000 FCFA"
              actions={
                <Button type="button" variant="primary">
                  Action principale
                </Button>
              }
              kpis={
                <>
                  <StatTile label="Dû" value="1 250 000" />
                  <StatTile label="Payé" value="900 000" />
                  <StatTile label="Reste" value="350 000" emphasize />
                </>
              }
            />

            <Toolbar
              left={<p className="text-sm font-medium">Toolbar</p>}
              right={
                <>
                  <Button type="button" variant="secondary">
                    Filtrer
                  </Button>
                  <Button type="button" variant="primary">
                    Ajouter
                  </Button>
                </>
              }
            />

            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-muted)]">Boutons</h2>
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
                <Button type="button" variant="primary" loading>
                  Chargement
                </Button>
                <Button type="button" variant="primary" disabled>
                  Disabled
                </Button>
                <IconButton
                  aria-label="Modifier"
                  variant="ghost"
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  }
                />
              </div>
            </section>

            <Card className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--color-muted)]">Champs</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nom" htmlFor="ds-name" hint="Texte libre">
                  <Input id="ds-name" placeholder="Ex. Appartement A1" />
                </Field>
                <Field label="Montant" htmlFor="ds-money">
                  <MoneyInput id="ds-money" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <Field label="Date" htmlFor="ds-date">
                  <DateInput id="ds-date" />
                </Field>
                <Field label="Notes" htmlFor="ds-notes">
                  <Textarea id="ds-notes" rows={3} placeholder="Commentaire…" />
                </Field>
                <Field label="Liste" htmlFor="ds-select">
                  <Select
                    id="ds-select"
                    value={selectVal}
                    onValueChange={setSelectVal}
                    options={[
                      { id: 'a', label: 'Option Alpha' },
                      { id: 'b', label: 'Option Beta' },
                      { id: 'c', label: 'Option Gamma', disabled: true },
                    ]}
                  />
                </Field>
                <Field label="Recherche" htmlFor="ds-search">
                  <Select
                    id="ds-search"
                    searchable
                    value={selectVal}
                    onValueChange={setSelectVal}
                    options={[
                      { id: 'a', label: 'Option Alpha' },
                      { id: 'b', label: 'Option Beta' },
                    ]}
                    placeholder="Rechercher…"
                  />
                </Field>
                <Field label="Erreur" htmlFor="ds-err" error="Ce champ est obligatoire.">
                  <Input id="ds-err" aria-invalid defaultValue="valeur" />
                </Field>
                <div className="flex flex-col gap-3">
                  <Checkbox checked={cb} onChange={(e) => setCb(e.target.checked)} label="Case à cocher" />
                  <Switch checked={sw} onChange={setSw} label="Interrupteur" />
                </div>
              </div>
              <SegmentedControl
                value={seg}
                onChange={setSeg}
                options={[
                  { id: 'j', label: 'Jour' },
                  { id: 'm', label: 'Mois' },
                  { id: 'a', label: 'Année' },
                ]}
              />
              <Stepper
                activeId={step}
                steps={[
                  { id: '1', label: 'Infos' },
                  { id: '2', label: 'Montant' },
                  { id: '3', label: 'Validation' },
                ]}
              />
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setStep('1')}>
                  Étape 1
                </Button>
                <Button type="button" variant="secondary" onClick={() => setStep('2')}>
                  Étape 2
                </Button>
                <Button type="button" variant="secondary" onClick={() => setStep('3')}>
                  Étape 3
                </Button>
              </div>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2">
              <Callout variant="info">Information neutre pour guider l’utilisateur.</Callout>
              <Callout variant="success">Action réussie.</Callout>
              <Callout variant="warning">Attention : vérifiez les montants.</Callout>
              <Callout variant="danger">Erreur bloquante.</Callout>
            </div>

            <EmptyState
              title="Aucun élément"
              description="Créez votre premier enregistrement pour commencer."
              action={
                <Button type="button" variant="primary">
                  Créer
                </Button>
              }
            />

            <div className="space-y-2">
              <p className="text-sm font-medium">Skeleton</p>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : null}

        {tab === 'overlay' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setModalOpen(true)}>
                Ouvrir Modal
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSheetOpen(true)}>
                Ouvrir BottomSheet
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  void confirmDialog({
                    title: 'Confirmer ?',
                    message: 'Exemple de dialogue de confirmation.',
                    confirmLabel: 'Oui',
                  }).then((ok) => toast(ok ? 'Confirmé' : 'Annulé', { variant: ok ? 'success' : 'info' }))
                }
              >
                ConfirmDialog
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() =>
                  void confirmDialog({
                    title: 'Supprimer ?',
                    message: 'Cette action est irréversible.',
                    tone: 'danger',
                    confirmLabel: 'Supprimer',
                  })
                }
              >
                Confirm danger
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => toast('Info', { variant: 'info' })}>
                Toast info
              </Button>
              <Button type="button" variant="ghost" onClick={() => toast('Succès', { variant: 'success' })}>
                Toast success
              </Button>
              <Button type="button" variant="ghost" onClick={() => toast('Attention', { variant: 'warning' })}>
                Toast warning
              </Button>
              <Button type="button" variant="ghost" onClick={() => toast('Erreur', { variant: 'error' })}>
                Toast error
              </Button>
            </div>
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Exemple de modal" size="md">
              <p className="text-sm text-[var(--color-muted)]">Contenu de démonstration. Échap ou fond pour fermer.</p>
            </Modal>
            <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Feuille basse">
              <p className="text-sm text-[var(--color-muted)]">Adapté mobile — actions secondaires.</p>
            </BottomSheet>
          </div>
        ) : null}

        {tab === 'data' ? (
          <div className="space-y-6">
            <DataTable
              getRowId={(r) => r.id}
              columns={[
                { id: 'name', header: 'Nom', cell: (r) => r.name },
                {
                  id: 'amount',
                  header: 'Montant',
                  align: 'right',
                  cell: (r) => <span className="tabular-nums font-semibold">{r.amount}</span>,
                },
                { id: 'status', header: 'Statut', cell: (r) => <StatusBadge status={r.status} /> },
              ]}
              rows={[
                { id: '1', name: 'Loyer mars', amount: '250 000', status: 'PAID' },
                { id: '2', name: 'Loyer avril', amount: '250 000', status: 'LATE' },
                { id: '3', name: 'Loyer mai', amount: '250 000', status: 'PENDING' },
              ]}
            />
            <CardList>
              <ListRow title="Loyer mars" subtitle="Payé le 5" meta="250 000 FCFA" trailing={<StatusBadge status="PAID" />} />
              <ListRow title="Loyer avril" subtitle="Échéance dépassée" meta="250 000 FCFA" trailing={<StatusBadge status="LATE" />} />
            </CardList>
          </div>
        ) : null}

        {tab === 'status' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['PAID', 'LATE', 'PENDING', 'WAIVED', 'CANCELLED'] as const).map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(['CASH', 'TRANSFER', 'MOBILE_MONEY', 'CHECK', 'OTHER'] as const).map((m) => (
                <CollectionMethodBadge key={m} method={m} />
              ))}
            </div>
          </div>
        ) : null}
      </main>

      <StickyActionBar>
        <Button type="button" variant="secondary" className="flex-1 sm:flex-none">
          Annuler
        </Button>
        <Button type="button" variant="primary" className="flex-1 sm:flex-none">
          Enregistrer
        </Button>
      </StickyActionBar>
    </div>
  );
}
