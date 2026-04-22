import type { CSSProperties } from 'react';

/** Fond et structure communs aux écrans connexion / mot de passe. */
export const AUTH_PAGE_SHELL_CLASS =
  'relative flex min-h-dvh flex-col justify-center bg-gradient-to-br from-slate-100/98 via-[#e6eaf2] to-slate-200/92 px-4 py-8 dark:from-slate-950 dark:via-[#0b0c0f] dark:to-slate-950 sm:py-10';

/** Encoches iOS / Android : padding sûr pour le contenu. */
export const authSafePaddingStyle: CSSProperties = {
  paddingTop: 'max(2rem, env(safe-area-inset-top, 0px))',
  paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px))',
  paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
  paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
};

export const authThemeTogglePositionStyle: CSSProperties = {
  top: 'max(1rem, env(safe-area-inset-top, 0px))',
  right: 'max(1rem, env(safe-area-inset-right, 0px))',
};

/** Carte formulaire : ombre et bordure homogènes avec le reste de l’app. */
export const AUTH_CARD_CLASS =
  'shadow-[0_1px_2px_rgb(15_23_42/0.05),0_8px_28px_rgb(15_23_42/0.07)] ring-1 ring-slate-900/[0.04] dark:shadow-[0_2px_12px_rgb(0_0_0/0.28)] dark:ring-slate-600/35';
