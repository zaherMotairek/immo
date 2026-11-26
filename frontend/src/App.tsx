import { lazy, Suspense, useEffect, type ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { AppLoadingScreen } from './components/AppLoadingScreen';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { NavigationProvider } from './context/NavigationContext';
import type { AppNavigateState } from './lib/navigation';
import {
  applyDesignOption,
  isDesignOption,
  persistDesignOption,
} from './theme/designPreview';

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const BuildingsPage = lazy(() =>
  import('./pages/BuildingsPage').then((m) => ({ default: m.BuildingsPage })),
);
const BuildingDetailPage = lazy(() =>
  import('./pages/BuildingDetailPage').then((m) => ({ default: m.BuildingDetailPage })),
);
const TenantsPage = lazy(() =>
  import('./pages/TenantsPage').then((m) => ({ default: m.TenantsPage })),
);
const LeasesPage = lazy(() =>
  import('./pages/LeasesPage').then((m) => ({ default: m.LeasesPage })),
);
const LocationsPage = lazy(() =>
  import('./pages/LocationsPage').then((m) => ({ default: m.LocationsPage })),
);
const LocationDetailPage = lazy(() =>
  import('./pages/LocationDetailPage').then((m) => ({ default: m.LocationDetailPage })),
);
const PaymentsPage = lazy(() =>
  import('./pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
);
const YearlyRentActivityPage = lazy(() =>
  import('./pages/YearlyRentActivityPage').then((m) => ({ default: m.YearlyRentActivityPage })),
);
const CautionsChargesPage = lazy(() =>
  import('./pages/CautionsChargesPage').then((m) => ({ default: m.CautionsChargesPage })),
);
const ExportsPage = lazy(() =>
  import('./pages/ExportsPage').then((m) => ({ default: m.ExportsPage })),
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const RemindersPage = lazy(() =>
  import('./pages/RemindersPage').then((m) => ({ default: m.RemindersPage })),
);
const AdminClientsPage = lazy(() =>
  import('./pages/AdminClientsPage').then((m) => ({ default: m.AdminClientsPage })),
);
const AdminClientDetailPage = lazy(() =>
  import('./pages/AdminClients/AdminClientDetailPage').then((m) => ({
    default: m.AdminClientDetailPage,
  })),
);
const DemoPage = lazy(() => import('./pages/DemoPage').then((m) => ({ default: m.DemoPage })));
const InscriptionPage = lazy(() =>
  import('./pages/InscriptionPage').then((m) => ({ default: m.InscriptionPage })),
);
const VerifyEmailPage = lazy(() =>
  import('./pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })),
);
const TermsPage = lazy(() => import('./pages/Legal/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() =>
  import('./pages/Legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const CookiesPage = lazy(() =>
  import('./pages/Legal/CookiesPage').then((m) => ({ default: m.CookiesPage })),
);
const SupportPage = lazy(() =>
  import('./pages/Legal/SupportPage').then((m) => ({ default: m.SupportPage })),
);
const DataRightsPage = lazy(() =>
  import('./pages/Legal/DataRightsPage').then((m) => ({ default: m.DataRightsPage })),
);
const ComptabilitePage = lazy(() =>
  import('./pages/ComptabilitePage').then((m) => ({ default: m.ComptabilitePage })),
);
const AuditLogPage = lazy(() =>
  import('./pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })),
);
const CollectorsPage = lazy(() =>
  import('./pages/CollectorsPage').then((m) => ({ default: m.CollectorsPage })),
);
const InspectionsPage = lazy(() =>
  import('./pages/InspectionsPage').then((m) => ({ default: m.InspectionsPage })),
);
const RepairsPage = lazy(() =>
  import('./pages/RepairsPage').then((m) => ({ default: m.RepairsPage })),
);
const DesignSystemPage = lazy(() =>
  import('./pages/DesignSystemPage').then((m) => ({ default: m.DesignSystemPage })),
);
const LocationFicheSheet = lazy(() =>
  import('./components/LocationFicheSheet').then((m) => ({ default: m.LocationFicheSheet })),
);

function RouteFallback() {
  return <AppLoadingScreen message="Chargement de la page…" />;
}

/** Sync preview Calm ledger depuis `?ds=a|b` (navigation client). */
function DesignPreviewSync() {
  const { search } = useLocation();
  useEffect(() => {
    const q = new URLSearchParams(search).get('ds');
    if (!isDesignOption(q)) return;
    applyDesignOption(q);
    persistDesignOption(q);
  }, [search]);
  return null;
}

function Protected({ children }: { children: ReactElement }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return <AppLoadingScreen message="Ouverture de la session…" />;
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PlatformAdminOnly({ children }: { children: ReactElement }) {
  const { user, ready } = useAuth();
  if (!ready) return <AppLoadingScreen message="Ouverture de la session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'PLATFORM_ADMIN') return <Navigate to="/" replace />;
  return children;
}

/** Ancienne URL /immeubles/:id → /biens/:id (favoris, liens partagés). */
function LegacyPathImmeublesToBiens() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/biens/${id}`} replace />;
}

/** Fiche location en panneau : même route que la page pleine, mais enveloppée pour garantir NavigationProvider + coquille. */
function LocationFicheModalRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <LocationFicheSheet>
        <LocationDetailPage />
      </LocationFicheSheet>
    </Suspense>
  );
}

export default function App() {
  const location = useLocation();
  const backgroundLocation = (location.state as AppNavigateState | null)?.backgroundLocation;

  return (
    <NavigationProvider>
    <>
    <DesignPreviewSync />
    <Suspense fallback={<RouteFallback />}>
    <Routes location={backgroundLocation ?? location}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/mot-de-passe-oubli" element={<ForgotPasswordPage />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
      <Route path="/demo" element={<DemoPage />} />
      <Route path="/inscription" element={<InscriptionPage />} />
      <Route path="/verifier-email" element={<VerifyEmailPage />} />
      <Route path="/cgu" element={<TermsPage />} />
      <Route path="/confidentialite" element={<PrivacyPage />} />
      <Route path="/cookies" element={<CookiesPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/mes-donnees" element={<DataRightsPage />} />
      {import.meta.env.DEV ? <Route path="/design" element={<DesignSystemPage />} /> : null}
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="locations/:id" element={<LocationDetailPage />} />
        <Route path="biens" element={<BuildingsPage />} />
        <Route path="biens/:id" element={<BuildingDetailPage />} />
        <Route path="immeubles" element={<Navigate to="/biens" replace />} />
        <Route path="immeubles/:id" element={<LegacyPathImmeublesToBiens />} />
        <Route path="locataires" element={<TenantsPage />} />
        <Route path="baux" element={<LeasesPage />} />
        <Route path="paiements" element={<PaymentsPage />} />
        <Route path="relances" element={<RemindersPage />} />
        <Route path="activite-loyers" element={<YearlyRentActivityPage />} />
        <Route path="cautions" element={<CautionsChargesPage />} />
        <Route path="charges" element={<Navigate to="/cautions?tab=charges" replace />} />
        <Route path="exports" element={<ExportsPage />} />
        <Route path="comptabilite" element={<ComptabilitePage />} />
        <Route path="journal-securite" element={<AuditLogPage />} />
        <Route path="collecteurs" element={<CollectorsPage />} />
        <Route path="etats-des-lieux" element={<InspectionsPage />} />
        <Route path="reparations" element={<RepairsPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route
          path="admin"
          element={
            <PlatformAdminOnly>
              <AdminClientsPage />
            </PlatformAdminOnly>
          }
        />
        <Route
          path="admin/clients/:id"
          element={
            <PlatformAdminOnly>
              <AdminClientDetailPage />
            </PlatformAdminOnly>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>

    {backgroundLocation ? (
      <Routes>
        <Route
          path="/locations/:id"
          element={
            <Protected>
              <LocationFicheModalRoute />
            </Protected>
          }
        />
      </Routes>
    ) : null}
    </>
    </NavigationProvider>
  );
}
