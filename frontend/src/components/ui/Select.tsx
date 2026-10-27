import { forwardRef, useMemo } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { SearchableSelect } from '@/components/SearchableSelect';
import { inputBaseClass, inputInvalidClass } from './Input';
import { cn } from './cn';

/** Compat : ancien `<Select><option/></Select>` (menu personnalisé) — utile pour migrer page par page. */
export { Select as NativeSelectCompat, Select as LegacySelect } from '@/components/Select';

export type UiSelectOption = { id: string; label: string; disabled?: boolean };

export type SelectProps = {
  options: UiSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  /** Liste filtrable (utilise `SearchableSelect`). */
  searchable?: boolean;
  /** Libellé de l'option vide (valeur `''`). */
  emptyLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  className?: string;
};

function ChevronDown() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Select basé sur des `options`. Mode natif (par défaut) ou `searchable`.
 * En mode `searchable`, les options `disabled` sont masquées (sauf la valeur sélectionnée).
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    options,
    value,
    onValueChange,
    searchable = false,
    emptyLabel,
    placeholder,
    disabled,
    invalid,
    id,
    name,
    required,
    'aria-label': ariaLabel,
    'aria-describedby': describedBy,
    className,
  },
  ref,
) {
  const searchableOptions = useMemo(
    () => options.filter((o) => !o.disabled || o.id === value).map(({ id: oid, label }) => ({ id: oid, label })),
    [options, value],
  );

  if (searchable) {
    return (
      <SearchableSelect
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={onValueChange}
        options={searchableOptions}
        emptyLabel={emptyLabel}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
    );
  }

  const blankLabel = emptyLabel ?? placeholder;
  const nativeProps: SelectHTMLAttributes<HTMLSelectElement> = {
    id,
    name,
    required,
    disabled,
    'aria-label': ariaLabel,
    'aria-describedby': describedBy,
    'aria-invalid': invalid || undefined,
  };

  return (
    <div className={cn('relative w-full', className)}>
      <select
        ref={ref}
        {...nativeProps}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(inputBaseClass, 'cursor-pointer appearance-none pr-9', invalid && inputInvalidClass)}
      >
        {blankLabel !== undefined ? <option value="">{blankLabel}</option> : null}
        {options.map((o) => (
          <option key={o.id} value={o.id} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown />
    </div>
  );
});
