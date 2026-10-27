import { Button, Toolbar } from '@/components/ui/index';

type PaymentsToolbarProps = {
  yearFilter: number | 'all';
  monthFilter: number | 'all';
  overdueOnly: boolean;
  panelOpen: boolean;
  onClosePanel: () => void;
};

/** Barre d'outils : rappel des filtres actifs + fermeture du panneau de détail. */
export function PaymentsToolbar({ yearFilter, monthFilter, overdueOnly, panelOpen, onClosePanel }: PaymentsToolbarProps) {
  return (
    <Toolbar
      left={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-muted)]">
          <span className="font-semibold">Filtres</span>
          <span>Année : {yearFilter === 'all' ? 'Toutes' : yearFilter}</span>
          <span>Mois : {monthFilter === 'all' ? 'Tous' : monthFilter}</span>
          {overdueOnly ? <span className="font-semibold text-[var(--status-late)]">Impayés</span> : null}
        </div>
      }
      right={
        <Button variant="secondary" size="sm" onClick={onClosePanel} disabled={!panelOpen}>
          Fermer panneau
        </Button>
      }
    />
  );
}
