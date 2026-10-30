import { LegalPageShell } from './LegalPageShell';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@immopilot.ci';

export function DataRightsPage() {
  return (
    <LegalPageShell title="Export des données & suppression de compte">
      <h2 className="text-base font-semibold">Export</h2>
      <p>
        Depuis l’application connectée : menu <strong>Fichiers Excel</strong> — export PDF/Excel de
        synthèse, locataires, baux, biens, paiements, charges. Conservez une copie avant toute
        demande de suppression.
      </p>
      <h2 className="text-base font-semibold">Suppression</h2>
      <p>
        Envoyez une demande à{' '}
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>{' '}
        depuis l’e-mail du titulaire du compte, objet « Suppression compte ImmoPilot », avec le nom
        de l’organisation. Après vérification d’identité, suppression ou anonymisation sous 30 jours,
        sauf obligations légales de conservation (facturation, litiges).
      </p>
      <h2 className="text-base font-semibold">Organisations démo</h2>
      <p>Les espaces `/demo` sont purgés automatiquement sous 24 h.</p>
    </LegalPageShell>
  );
}
