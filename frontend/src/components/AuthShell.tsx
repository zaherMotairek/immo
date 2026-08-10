import type { ReactNode } from 'react';
import { ImmoPilotLogo } from '@/components/ImmoPilotLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { authThemeTogglePositionStyle } from '@/lib/authLayout';

type Props = {
  children: ReactNode;
  /** Titre court sous la marque (panneau gauche). */
  panelLead?: string;
};

/**
 * Coquille auth : panneau marque plein bord + zone formulaire.
 */
export function AuthShell({
  children,
  panelLead = 'Biens, locataires et loyers — un seul espace de travail.',
}: Props) {
  return (
    <div className="auth-shell relative flex min-h-dvh flex-col lg:flex-row">
      <div className="absolute z-20" style={authThemeTogglePositionStyle}>
        <ThemeToggle tone="onLight" />
      </div>

      <aside
        className="auth-shell__brand relative flex shrink-0 flex-col justify-between overflow-hidden px-6 py-8 text-zinc-50 sm:px-10 sm:py-10 lg:w-[46%] lg:min-h-dvh lg:px-12 lg:py-14 xl:w-[42%]"
        style={{
          paddingTop: 'max(2rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))',
        }}
      >
        <div className="auth-shell__glow" aria-hidden />
        <div className="auth-shell__grid" aria-hidden />

        <div className="auth-shell__brand-in relative z-10">
          <div className="auth-shell__logo-mark inline-flex rounded-[1.15rem] shadow-[0_12px_40px_-12px_rgb(0_0_0/0.55)] ring-1 ring-white/10">
            <ImmoPilotLogo className="[&>svg]:size-14 sm:[&>svg]:size-[4.25rem]" />
          </div>
          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">Gestion locative</p>
          <h1 className="auth-shell__wordmark mt-3 text-[2.75rem] font-extrabold leading-[0.95] tracking-tight sm:text-5xl lg:text-[3.35rem]">
            ImmoPilot
          </h1>
          <span className="auth-shell__rule mt-5 block h-0.5 w-12 bg-amber-400/90" aria-hidden />
          <p className="mt-5 max-w-[18rem] text-[0.95rem] font-medium leading-relaxed text-zinc-300 lg:max-w-[20rem]">
            {panelLead}
          </p>
        </div>

        <p className="auth-shell__brand-in relative z-10 mt-10 text-[11px] leading-relaxed text-zinc-500 lg:mt-0">
          Côte d’Ivoire · bailleurs &amp; gestionnaires
        </p>
      </aside>

      <main
        className="auth-shell__main relative flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 sm:py-12 lg:px-14 xl:px-20"
        style={{
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <div className="auth-shell__form-in mx-auto w-full max-w-[24rem]">{children}</div>
      </main>
    </div>
  );
}
