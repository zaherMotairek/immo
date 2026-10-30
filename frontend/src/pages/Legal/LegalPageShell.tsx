import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

/** Coquille pages légales / support (E2) — templates à faire valider par un juriste CI. */
export function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        <Link to="/login" className="underline-offset-2 hover:underline">
          ImmoPilot
        </Link>
      </p>
      <h1 className="text-2xl font-bold text-[var(--color-ink)]">{title}</h1>
      <p className="rounded-[var(--radius-card)] border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        Document modèle — à faire revoir par un avocat en Côte d’Ivoire avant usage commercial.
        Références utiles : ARTCI, loi n° 2013-450 relative à la protection des données à caractère
        personnel.
      </p>
      <div className="prose-legal space-y-4 text-sm leading-relaxed text-[var(--color-ink)]">{children}</div>
      <nav className="flex flex-wrap gap-3 border-t border-[var(--odoo-border)] pt-4 text-sm">
        <Link to="/cgu" className="underline">
          CGU
        </Link>
        <Link to="/confidentialite" className="underline">
          Confidentialité
        </Link>
        <Link to="/cookies" className="underline">
          Cookies
        </Link>
        <Link to="/support" className="underline">
          Support
        </Link>
        <Link to="/mes-donnees" className="underline">
          Export & suppression
        </Link>
      </nav>
    </div>
  );
}
