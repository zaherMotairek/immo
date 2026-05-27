import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
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
    <section className="space-y-4">
      <Card className="!p-3 sm:!p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={activeTab === 'cautions' ? 'primary' : 'secondary'}
            className="py-1.5 text-xs"
            onClick={() => selectTab('cautions')}
          >
            Cautions
          </Button>
          <Button
            type="button"
            variant={activeTab === 'charges' ? 'primary' : 'secondary'}
            className="py-1.5 text-xs"
            onClick={() => selectTab('charges')}
          >
            Charges
          </Button>
        </div>
      </Card>

      {activeTab === 'cautions' ? <CautionsEncaisséesPage /> : <ChargesPage />}
    </section>
  );
}
