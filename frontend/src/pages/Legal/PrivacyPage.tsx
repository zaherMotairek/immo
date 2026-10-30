import { LegalPageShell } from './LegalPageShell';

export function PrivacyPage() {
  return (
    <LegalPageShell title="Politique de confidentialité">
      <h2 className="text-base font-semibold">Données traitées</h2>
      <p>
        Identité et contact des utilisateurs ; données locatives (biens, locataires, baux, paiements) ;
        pièces d’identité éventuellement téléversées ; journaux techniques (IP, logs, audit).
      </p>
      <h2 className="text-base font-semibold">Finalités</h2>
      <p>
        Fourniture du service, facturation plateforme, sécurité, support, obligations légales.
      </p>
      <h2 className="text-base font-semibold">Conservation</h2>
      <p>
        Données de compte et locatives : durée de la relation + délais légaux applicables. Documents
        d’identité : conservation limitée au besoin métier ; suppression sur demande motivée ou à la
        clôture du compte selon procédure.
      </p>
      <h2 className="text-base font-semibold">Droits</h2>
      <p>
        Accès, rectification, effacement, limitation, opposition, portabilité — via support. Cadre CI :
        loi 2013-450 et autorités compétentes (dont ARTCI) pour les traitements concernés.
      </p>
      <h2 className="text-base font-semibold">Sous-traitants</h2>
      <p>
        Hébergement (ex. Render, Neon), e-mail transactionnel, stockage fichiers (S3 si activé),
        monitoring (Sentry si activé).
      </p>
    </LegalPageShell>
  );
}
