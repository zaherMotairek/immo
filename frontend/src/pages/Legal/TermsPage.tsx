import { LegalPageShell } from './LegalPageShell';

export function TermsPage() {
  return (
    <LegalPageShell title="Conditions générales d’utilisation">
      <p>
        ImmoPilot est un service de gestion locative proposé en SaaS. En créant un compte, vous
        acceptez les présentes conditions.
      </p>
      <h2 className="text-base font-semibold">1. Objet</h2>
      <p>
        Le service permet de gérer biens, locataires, baux, loyers et documents associés pour votre
        organisation.
      </p>
      <h2 className="text-base font-semibold">2. Compte</h2>
      <p>
        Vous êtes responsable de la confidentialité de vos identifiants et des données que vous
        saisissez (y compris pièces d’identité des locataires).
      </p>
      <h2 className="text-base font-semibold">3. Abonnement</h2>
      <p>
        Les plans Essai / Gratuit / Pro, les paiements manuels (Wave, Orange, etc.) et les délais de
        grâce sont décrits dans l’interface admin et peuvent évoluer avec préavis raisonnable.
      </p>
      <h2 className="text-base font-semibold">4. Disponibilité</h2>
      <p>
        Nous visons une disponibilité élevée sans garantir une absence d’interruption. Les sauvegardes
        et procédures d’incident sont décrites pour l’opérateur dans la documentation interne.
      </p>
      <h2 className="text-base font-semibold">5. Résiliation</h2>
      <p>
        Vous pouvez demander la clôture du compte (voir « Export & suppression »). L’opérateur peut
        suspendre l’accès en cas d’impayé ou d’usage abusif.
      </p>
    </LegalPageShell>
  );
}
