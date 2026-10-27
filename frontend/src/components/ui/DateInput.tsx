import { forwardRef } from 'react';
import { Input } from './Input';
import type { InputProps } from './Input';

export type DateInputProps = Omit<InputProps, 'type'>;

/**
 * Champ date texte « jj/mm/aaaa » — présentation uniquement (aucune analyse de date ici).
 * Le formatage / la validation restent à la charge du formulaire appelant.
 */
export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(function DateInput(props, ref) {
  return (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="jj/mm/aaaa"
      maxLength={10}
      {...props}
    />
  );
});
