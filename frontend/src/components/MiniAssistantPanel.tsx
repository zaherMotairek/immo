import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { saveScrollForPath, type AppNavigateState } from '@/lib/navigation';
import { api } from '@/lib/api';
import { runPaymentAssistantCommand } from '@/lib/assistantPaymentActions';
import {
  ASSISTANT_HELP_FR,
  NAV_ROUTE_LABELS,
  parseAssistantCommand,
  type ParsedAssistantCommand,
} from '@/lib/assistantCommands';
import { COMMUNE_SUGGESTIONS, IVORY_COAST_CITIES } from '@/lib/ciLocation';
import { Button, Input, Label } from '@/components/ui';

type Msg = { role: 'user' | 'assistant'; text: string };

const DEFAULT_CITY = IVORY_COAST_CITIES[0];
const DEFAULT_COMMUNE = COMMUNE_SUGGESTIONS[0];

async function executeCommand(parsed: ParsedAssistantCommand): Promise<string> {
  switch (parsed.kind) {
    case 'help':
      return ASSISTANT_HELP_FR;
    case 'navigate':
      return `Ouverture de la page « ${NAV_ROUTE_LABELS[parsed.path] ?? parsed.path} ».`;
    case 'payFull':
    case 'payPartial':
    case 'prepayMonths':
      return (await runPaymentAssistantCommand(parsed)).message;
    case 'tenant': {
      await api<{ id: string }>('/tenants', {
        method: 'POST',
        json: {
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          phone: parsed.phone || undefined,
        },
      });
      return `Locataire « ${parsed.firstName} ${parsed.lastName} » créé. Onglet Locataires pour la suite.`;
    }
    case 'building':
      if (parsed.mode === 'multi') {
        await api('/buildings', {
          method: 'POST',
          json: {
            name: parsed.name,
            city: DEFAULT_CITY,
            commune: DEFAULT_COMMUNE,
            structureKind: 'IMMEUBLE',
            floorCount: parsed.units,
            hasRezDeChaussee: true,
            apartmentCount: parsed.units,
          },
        });
        return `Bien « ${parsed.name} » créé (immeuble indicatif ${parsed.units} étages, même nombre de places carnet — ajustez sur la fiche si besoin). Ouvrez Biens pour les unités.`;
      }
      await api('/buildings', {
        method: 'POST',
        json: {
          name: parsed.name,
          city: DEFAULT_CITY,
          commune: DEFAULT_COMMUNE,
          structureKind: 'MONO_LOT',
        },
      });
      return `Bien « ${parsed.name} » créé (un seul lot). Page Biens pour ajouter l’unité.`;
    case 'none':
      return `Je n’ai pas compris. Tapez « aide » pour des exemples (navigation, payer pour…, créer locataire / bien).`;
  }
}

export function MiniAssistantPanel() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      text: 'Prototype « Demandez-moi » : phrases simples en français. Tapez aide pour des exemples.',
    },
  ]);
  const listRef = useRef<HTMLDivElement | null>(null);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const parsed = parseAssistantCommand(text);
      const reply = await executeCommand(parsed);
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
      const from = routerLocation.pathname + routerLocation.search;
      const navState: AppNavigateState = { from };
      const navTo = (path: string) => {
        saveScrollForPath(from);
        navigate(path, { state: navState });
      };
      if (parsed.kind === 'navigate') {
        navTo(parsed.path);
      } else if (parsed.kind === 'payFull' || parsed.kind === 'payPartial' || parsed.kind === 'prepayMonths') {
        navTo('/paiements');
      } else if (parsed.kind === 'tenant') {
        navTo('/locataires');
      } else if (parsed.kind === 'building') {
        navTo('/biens');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      setMessages((m) => [...m, { role: 'assistant', text: `Erreur : ${msg}` }]);
    } finally {
      setBusy(false);
      window.requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [busy, input, navigate, routerLocation.pathname, routerLocation.search]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-global-search-open="true"]')) return;
      const otherModals = [...document.querySelectorAll('[data-escape-modal="true"]')].filter(
        (el) => el.id !== 'mini-assistant-panel',
      );
      if (otherModals.length > 0) return;
      e.preventDefault();
      setOpen(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-4 z-[48] flex items-center gap-2 rounded-full border border-brand-500/40 bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-900/20 transition hover:bg-brand-700 md:left-[calc(15.5rem+1rem)] ${
          open ? 'left-4 opacity-90' : 'left-4'
        }`}
        aria-expanded={open}
        aria-controls="mini-assistant-panel"
      >
        <span aria-hidden>✨</span>
        Demandez-moi
      </button>

      {open ? (
        <div
          id="mini-assistant-panel"
          data-escape-modal="true"
          className="fixed inset-y-0 left-0 z-[47] flex w-[min(100%,20rem)] max-w-[100vw] flex-col border-r border-slate-200/90 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 md:left-[15.5rem]"
          role="dialog"
          aria-label="Assistant prototype"
        >
          <div className="border-b border-slate-200/90 px-3 py-3 dark:border-slate-700">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Demandez-moi</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Prototype sans IA cloud — analyse de phrases.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => setOpen(false)}
              >
                Fermer
              </button>
            </div>
          </div>
          <div
            ref={listRef}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm"
          >
            {messages.map((msg, i) => (
              <div
                key={`${i}-${msg.role}`}
                className={`rounded-xl px-2.5 py-2 ${
                  msg.role === 'user'
                    ? 'ml-4 bg-brand-100/90 text-slate-900 dark:bg-brand-950/50 dark:text-brand-100'
                    : 'mr-2 bg-slate-100/95 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200'
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  {msg.role === 'user' ? 'Vous' : 'Assistant'}
                </span>
                <p className="mt-1 whitespace-pre-wrap leading-snug">{msg.text}</p>
              </div>
            ))}
          </div>
          <form
            className="border-t border-slate-200/90 p-3 dark:border-slate-700"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Label htmlFor="mini-assistant-input" className="sr-only">
              Message
            </Label>
            <Input
              id="mini-assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex. crée un locataire Jean Kouassi…"
              disabled={busy}
              className="text-sm"
              autoComplete="off"
            />
            <Button type="submit" className="mt-2 w-full py-2 text-sm" disabled={busy}>
              {busy ? '…' : 'Envoyer'}
            </Button>
          </form>
        </div>
      ) : null}

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-[46] bg-black/25 md:left-[15.5rem]"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
