import type { ReactNode } from 'react';
import { HelpHint } from '@/components/ui';
import { Label, cn } from '@/components/ui/index';

type HintedFieldProps = {
  label: ReactNode;
  htmlFor: string;
  /** Info-bulle « ? » à côté du libellé (reste hors du `<label>`). */
  help?: string;
  /** Élément additionnel à droite du libellé (ex. compteur de lots libres). */
  aside?: ReactNode;
  /** Aide permanente sous le champ. */
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * Variante de `Field` pour les champs dont le libellé porte une info-bulle ou un badge :
 * le bouton d'aide ne doit pas être imbriqué dans le `<label>`.
 */
export function HintedField({ label, htmlFor, help, aside, hint, className, children }: HintedFieldProps) {
  return (
    <div className={cn('grid', className)}>
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <Label htmlFor={htmlFor} className="mb-0">
          {label}
        </Label>
        {help ? <HelpHint className="align-middle" title={help} /> : null}
        {aside}
      </div>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-[var(--color-muted)]">{hint}</p> : null}
    </div>
  );
}
