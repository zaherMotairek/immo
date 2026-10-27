import { AppPageTitle } from '@/components/AppPageTitle';
import { useRegisterRootSectionFallback } from '@/context/NavigationContext';
import { AdminNewClientForm } from './AdminNewClientForm';
import { AdminOrgAccessPanel } from './AdminOrgAccessPanel';
import { AdminOrgsTable } from './AdminOrgsTable';
import { useAdminClients } from './useAdminClients';

/** Page admin plateforme : organisations, accès, création client. */
export function AdminClientsPage() {
  useRegisterRootSectionFallback();
  const admin = useAdminClients();

  return (
    <div className="space-y-8">
      <AppPageTitle
        iconTo="/admin"
        title="Clients & accès plateforme"
        hintTitle="Liste des organisations : prolongez l’accès en indiquant « payé jusqu’au » (dernier jour inclus), ou coupez tout accès avec « suspendre ». Sans date, seul le blocage manuel s’applique. Les comptes USER sont bloqués à la connexion et sur toutes les requêtes API ; les administrateurs plateforme ne sont jamais bloqués."
        subtitle="Création des comptes clients et gestion des accès."
      />

      <AdminOrgsTable
        organizations={admin.organizations}
        listLoading={admin.listLoading}
        listErr={admin.listErr}
        onOpenAccess={admin.openEdit}
      />

      <AdminOrgAccessPanel admin={admin} />
      <AdminNewClientForm admin={admin} />
    </div>
  );
}
