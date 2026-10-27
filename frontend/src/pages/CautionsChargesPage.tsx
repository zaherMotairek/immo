import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Tabs } from '@/components/ui/index';
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
    <Card padding="none" className="overflow-hidden">
      <Tabs
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
    </Card>
  );
}
