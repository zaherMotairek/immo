import { LegalPageShell } from './LegalPageShell';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@immopilot.ci';

export function SupportPage() {
  return (
    <LegalPageShell title="Contact support">
      <p>
        Pour toute question produit, facturation plateforme ou exercice de droits sur vos données :
      </p>
      <p>
        E-mail :{' '}
        <a className="font-semibold underline" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>
      </p>
      <p className="text-[var(--color-muted)]">
        Indiquez l’e-mail du compte, le nom de l’organisation et une description claire. Délai de
        réponse cible : 2 jours ouvrés (hors incidents majeurs).
      </p>
    </LegalPageShell>
  );
}
