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
 * Coquille auth : panneau marque immersif + zone formulaire (Calm ledger Option B).
 */
export function AuthShell({
  children,
  panelLead = 'Biens, locataires et loyers — un seul espace de travail.',
}: Props) {
  return (
    <div className="auth-shell relative flex min-h-dvh flex-col lg:flex-row">
      <div className="absolute z-30" style={authThemeTogglePositionStyle}>
        <ThemeToggle tone="onLight" />
      </div>

      <aside
        className="auth-shell__brand relative flex shrink-0 flex-col justify-between overflow-hidden px-6 py-8 text-zinc-50 sm:px-10 sm:py-10 lg:w-[48%] lg:min-h-dvh lg:px-12 lg:py-14 xl:w-[44%]"
        style={{
          paddingTop: 'max(2rem, env(safe-area-inset-top, 0px))',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))',
        }}
      >
        <div className="auth-shell__glow" aria-hidden />
        <div className="auth-shell__glow auth-shell__glow--2" aria-hidden />
        <div className="auth-shell__grid" aria-hidden />
        <div className="auth-shell__skyline" aria-hidden>
          <svg viewBox="0 0 640 160" className="h-full w-full" preserveAspectRatio="xMidYMax slice">
            <path
              fill="currentColor"
              d="M0 160V98h28V72h22v26h18V54h36v44h14V88h24v20h20V40h42v68h16V62h30v46h12V78h26v30h18V96h22v28h14V84h34v44h20V70h28v58h16V52h40v76h24V90h32v38h20V108h28v52H0Z"
            />
          </svg>
        </div>
        <div className="auth-shell__edge" aria-hidden />

        <div className="auth-shell__brand-in relative z-10">
          <div className="auth-shell__logo-mark inline-flex rounded-[1.25rem] p-0.5">
            <ImmoPilotLogo className="[&>svg]:size-[3.75rem] sm:[&>svg]:size-[4.5rem]" />
          </div>
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-200/80">
            Gestion locative
          </p>
          <h1 className="auth-shell__wordmark mt-3 text-[2.85rem] font-extrabold leading-[0.92] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            Immo<span className="text-brand-300">Pilot</span>
          </h1>
          <span
            className="auth-shell__rule mt-6 block h-[3px] w-14 rounded-full bg-gradient-to-r from-brand-400 to-brand-200/40"
            aria-hidden
          />
          <p className="mt-6 max-w-[20rem] text-[1.02rem] font-medium leading-relaxed text-zinc-300/95 lg:max-w-[22rem]">
            {panelLead}
          </p>
          <ul className="auth-shell__perks mt-8 hidden space-y-3 lg:block">
            <li>Parc &amp; unités, clairs et à jour</li>
            <li>Loyers, retards et quittances PDF</li>
            <li>Vue d’ensemble du mois en un coup d’œil</li>
          </ul>
        </div>

        <p className="auth-shell__brand-in relative z-10 mt-10 text-[11px] leading-relaxed tracking-wide text-zinc-500 lg:mt-0">
          Côte d’Ivoire · bailleurs &amp; gestionnaires
        </p>
      </aside>

      <main
        className="auth-shell__main relative flex flex-1 flex-col justify-center px-4 py-9 sm:px-8 sm:py-12 lg:px-14 xl:px-20"
        style={{
          paddingBottom: 'max(2.25rem, env(safe-area-inset-bottom, 0px))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <div className="auth-shell__form-in mx-auto w-full max-w-[26rem]">{children}</div>
      </main>
    </div>
  );
}
