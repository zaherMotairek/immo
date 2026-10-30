import { LegalPageShell } from './LegalPageShell';

export function CookiesPage() {
  return (
    <LegalPageShell title="Notice cookies">
      <p>
        ImmoPilot utilise le stockage local du navigateur pour la session (`immopilot_token`,
        préférences UI) — équivalent fonctionnel à des cookies techniques indispensables.
      </p>
      <p>
        Pas de publicité tierce. Si Sentry front est activé, des données techniques d’erreur peuvent
        être envoyées au prestataire d’observabilité.
      </p>
      <p>Vous pouvez effacer les données du site via les réglages du navigateur (déconnexion).</p>
    </LegalPageShell>
  );
}
