import { useRef, useState } from 'react';
import { Button, Card } from '@/components/ui/index';
import { api, ApiError } from '@/lib/api';
import { toast } from '@/components/ui/Toast';

type Suggestion = {
  line: { index: number; amount: number; phone?: string; reference?: string; raw: string };
  paymentId: string | null;
  tenantName: string | null;
  periodLabel: string | null;
  amountDue: number | null;
  score: number;
  reasons: string[];
};

type Props = { onDone: () => void };

/** C4 : import CSV Mobile Money → suggestions à confirmer (jamais auto-pay). */
export function PaymentsStatementImport({ onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    const text = await file.text();
    setBusy(true);
    try {
      const res = await api<{ suggestions: Suggestion[] }>('/payments/statement-match', {
        method: 'POST',
        json: { csv: text },
      });
      setSuggestions(res.suggestions);
      const next = new Set<string>();
      for (const s of res.suggestions) {
        if (s.paymentId && s.score >= 70) next.add(s.paymentId);
      }
      setSelected(next);
      setPanelOpen(true);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Import impossible', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    const items = suggestions
      .filter((s) => s.paymentId && selected.has(s.paymentId))
      .map((s) => ({
        id: s.paymentId!,
        amountPaid: s.amountDue ?? s.line.amount,
        collectionReference: s.line.reference,
        collectionMethod: 'ORANGE_MONEY' as const,
      }));
    if (items.length === 0) {
      toast('Sélectionnez au moins une suggestion.', { variant: 'warning' });
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ ok: number; failed: number }>('/payments/statement-confirm', {
        method: 'POST',
        json: { items },
      });
      toast(`${res.ok} encaissement(s) confirmé(s)`, { variant: 'success' });
      setPanelOpen(false);
      setSuggestions([]);
      onDone();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Confirmation impossible', { variant: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding="sm" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--color-ink)]">Relevé Mobile Money</p>
          <p className="text-xs text-[var(--color-muted)]">
            CSV (montant ; téléphone ; référence) → suggestions à valider, jamais d’encaissement auto.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = '';
          }}
        />
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'Analyse…' : 'Importer un CSV'}
        </Button>
      </div>

      {panelOpen ? (
        <div className="space-y-3 border-t border-[var(--odoo-border)] pt-3">
          <p className="text-sm font-medium">Suggestions ({suggestions.length})</p>
          <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
            {suggestions.map((s) => (
              <li
                key={s.line.index}
                className="flex items-start gap-2 rounded-md border border-[var(--odoo-border)] p-2"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  disabled={!s.paymentId}
                  checked={!!s.paymentId && selected.has(s.paymentId)}
                  onChange={() => {
                    if (!s.paymentId) return;
                    setSelected((prev) => {
                      const n = new Set(prev);
                      if (n.has(s.paymentId!)) n.delete(s.paymentId!);
                      else n.add(s.paymentId!);
                      return n;
                    });
                  }}
                />
                <div className="min-w-0">
                  <p>
                    {s.line.amount.toLocaleString('fr-FR')} FCFA
                    {s.line.phone ? ` · ${s.line.phone}` : ''}
                    {s.line.reference ? ` · ${s.line.reference}` : ''}
                  </p>
                  {s.paymentId ? (
                    <p className="text-xs text-[var(--color-muted)]">
                      → {s.tenantName} · {s.periodLabel} (score {s.score} · {s.reasons.join(', ')})
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--color-danger)]">{s.reasons.join(', ')}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void confirm()}>
              Confirmer la sélection
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setPanelOpen(false);
                setSuggestions([]);
              }}
            >
              Fermer
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
