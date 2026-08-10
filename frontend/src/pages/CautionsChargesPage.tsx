import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OdooTabBar } from '@/components/OdooKit';
import { CautionsEncaisséesPage } from './CautionsEncaisséesPage';
import { ChargesPage } from './ChargesPage';

type FinanceTab = 'cautions' | 'charges';

function normalizeTab(raw: string | null): FinanceTab {
  return raw === 'charges' ? 'charges' : 'cautions';
}

export function CautionsChargesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = useMemo(() => normalizeTab(searchParams.get('tab')), [searchParams]);

  function selectTab(next: FinanceTab) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', next);
        return p;
      },
      { replace: true },
    );
  }

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--odoo-border)] bg-[var(--color-surface)] shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-zinc-600 dark:bg-zinc-900">
      <OdooTabBar
        tabs={[
          { id: 'cautions', label: 'Cautions encaissées' },
          { id: 'charges', label: 'Charges & impôts' },
        ]}
        activeId={activeTab}
        onChange={(id) => selectTab(id as FinanceTab)}
        ariaLabel="Cautions et charges"
      />
      <div className="odoo-notebook-content p-3 sm:p-4">
        {activeTab === 'cautions' ? <CautionsEncaisséesPage embedded /> : <ChargesPage embedded />}
      </div>
    </section>
  );
}
