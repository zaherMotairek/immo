/**
 * Pont de compatibilité : les pages importent encore `{ Button, Input, … } from '@/components/ui'`.
 * Les implémentations vivent désormais dans `./ui/*` (kit « Calm ledger »).
 * Phase 4 : migrer les imports vers `@/components/ui/<Composant>` (ou `./ui/index`) puis supprimer ce pont.
 */
export { Button } from './ui/Button';
export type { ButtonProps } from './ui/Button';
export { Card } from './ui/Card';
export { Input } from './ui/Input';
export { Label } from './ui/Field';
export { MoneyInput as AmountFcfaInput } from './ui/MoneyInput';
export type { MoneyInputProps as AmountFcfaInputProps } from './ui/MoneyInput';
export { StatTile } from './ui/StatTile';

/** Ancien Select (menu personnalisé, enfants `<option>`) — inchangé pour compatibilité. */
export { Select } from '@/components/Select';

/** Aide discrète : détail au survol / focus (title), sans alourdir la page. */
export function HelpHint({ title, className = '' }: { title: string; className?: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-300/90 bg-white text-slate-600 transition hover:border-slate-400 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-400 dark:hover:text-slate-100 ${className}`}
    >
      <svg aria-hidden className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    </button>
  );
}
