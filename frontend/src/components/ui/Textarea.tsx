import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { inputInvalidClass, inputSurfaceClass } from './Input';
import { cn } from './cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || props['aria-invalid'] || undefined}
      className={cn(
        inputSurfaceClass,
        'min-h-24 resize-y px-3 py-2 text-base sm:px-3.5 sm:py-2.5 sm:text-sm',
        invalid && inputInvalidClass,
        className,
      )}
      {...props}
    />
  );
});
