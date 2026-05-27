import type { ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { AppLoadingScreen } from './components/AppLoadingScreen';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BuildingsPage } from './pages/BuildingsPage';
import { BuildingDetailPage } from './pages/BuildingDetailPage';
import { TenantsPage } from './pages/TenantsPage';
import { LeasesPage } from './pages/LeasesPage';
import { LocationsPage } from './pages/LocationsPage';
import { LocationDetailPage } from './pages/LocationDetailPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { YearlyRentActivityPage } from './pages/YearlyRentActivityPage';
import { CautionsChargesPage } from './pages/CautionsChargesPage';
import { ExportsPage } from './pages/ExportsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AdminClientsPage } from './pages/AdminClientsPage';
import { ComptabilitePage } from './pages/ComptabilitePage';
import { AuditLogPage } from './pages/AuditLogPage';
import { CollectorsPage } from './pages/CollectorsPage';
import { LocationFicheSheet } from './components/LocationFicheSheet';
import { NavigationProvider } from './context/NavigationContext';
import type { AppNavigateState } from './lib/navigation';

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
    <LocationFicheSheet>
      <LocationDetailPage />
    </LocationFicheSheet>
  );
}

export default function App() {
  const location = useLocation();
  const backgroundLocation = (location.state as AppNavigateState | null)?.backgroundLocation;

  return (
    <NavigationProvider>
    <>
    <Routes location={backgroundLocation ?? location}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/mot-de-passe-oubli" element={<ForgotPasswordPage />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />
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
        <Route path="activite-loyers" element={<YearlyRentActivityPage />} />
        <Route path="cautions" element={<CautionsChargesPage />} />
        <Route path="charges" element={<Navigate to="/cautions?tab=charges" replace />} />
        <Route path="exports" element={<ExportsPage />} />
        <Route path="comptabilite" element={<ComptabilitePage />} />
        <Route path="journal-securite" element={<AuditLogPage />} />
        <Route path="collecteurs" element={<CollectorsPage />} />
        <Route path="profil" element={<ProfilePage />} />
        <Route
          path="admin"
          element={
            <PlatformAdminOnly>
              <AdminClientsPage />
            </PlatformAdminOnly>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>

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
