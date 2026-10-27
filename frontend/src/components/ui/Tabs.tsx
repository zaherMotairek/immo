import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from './cn';

export type TabItem = {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
};

export type TabsVariant = 'underline' | 'chip';

export type TabsProps = {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  right?: ReactNode;
  className?: string;
  variant?: TabsVariant;
  ariaLabel?: string;
};

/** Onglets — API identique à `OdooTabBar`, avec navigation clavier (← → Début Fin). */
export function Tabs({ tabs, activeId, onChange, right, className, variant = 'underline', ariaLabel }: TabsProps) {
  if (!tabs.length) return null;

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
    if (!nodes.length) return;
    const current = nodes.indexOf(document.activeElement as HTMLButtonElement);
    let next = current;
    if (e.key === 'ArrowRight') next = (current + 1) % nodes.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + nodes.length) % nodes.length;
    else if (e.key === 'Home') next = 0;
    else next = nodes.length - 1;
    e.preventDefault();
    nodes[next]?.focus();
  }

  return (
    <div className={cn('odoo-tab-bar', `odoo-tab-bar--${variant}`, className)}>
      <div className="odoo-tab-bar__scroll" role="tablist" aria-label={ariaLabel} onKeyDown={handleKeyDown}>
        {tabs.map((t) => {
          const isActive = t.id === activeId;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              disabled={t.disabled}
              onClick={() => onChange(t.id)}
              className={cn('odoo-tab', `odoo-tab--${variant}`, 'min-h-10', isActive && 'odoo-tab--active')}
            >
              <span>{t.label}</span>
              {t.count !== undefined ? <span className="odoo-tab__count">{t.count}</span> : null}
            </button>
          );
        })}
      </div>
      {right ? <div className="odoo-tab-bar__right">{right}</div> : null}
    </div>
  );
}
