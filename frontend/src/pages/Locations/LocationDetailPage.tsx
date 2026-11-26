import { useEffect, useMemo, useState } from 'react';
import { useAppNavigation } from '@/context/NavigationContext';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PageDetailBackLink } from '@/components/PageDetailHero';
import { Button, Callout, Card, Skeleton, Tabs } from '@/components/ui/index';
import { inferBackLabelFromPath, resolveReturnTarget, type AppNavigateState } from '@/lib/navigation';
import { LocationBailTab } from './LocationBailTab';
import { LocationDetailHero } from './LocationDetailHero';
import { LocationPlaceTab } from './LocationPlaceTab';
import { LocationWaiveModal } from './LocationWaiveModal';
import { useLocationFiche } from './useLocationFiche';

/** Fiche location (page pleine ou panneau) : hero, onglets kit, actions bail. */
export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const isSheet = Boolean((routerLocation.state as AppNavigateState | null)?.backgroundLocation);
  const { setReturnFallback } = useAppNavigation();
  const back = useMemo(
    () => resolveReturnTarget(routerLocation.state, { fallbackHref: '/locations', fallbackLabel: 'Locations' }),
    [routerLocation.state],
  );
  const [tab, setTab] = useState('lieu');
  const fiche = useLocationFiche(id);

  function openLocationFullPage() {
    if (!id) return;
    const bg = (routerLocation.state as AppNavigateState | null)?.backgroundLocation;
    navigate(`/locations/${id}`, {
      replace: true,
      state: bg
        ? {
            from: bg.pathname + bg.search,
            fromLabel: inferBackLabelFromPath(bg.pathname + bg.search),
          }
        : { from: '/locations', fromLabel: 'Locations' },
    });
  }

  useEffect(() => {
    setReturnFallback(back.href);
    return () => setReturnFallback('/');
  }, [back.href, setReturnFallback]);

  if (fiche.err) {
    return (
      <Callout variant="danger" title="Impossible d’afficher cette location.">
        <p>{fiche.err}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={fiche.reload}>
            Réessayer
          </Button>
          <PageDetailBackLink to={back.href}>Retour vers {back.label}</PageDetailBackLink>
        </div>
      </Callout>
    );
  }

  if (!fiche.data) {
    return (
      <div className="space-y-4" role="status" aria-busy="true" aria-label="Chargement de la fiche location">
        <span className="sr-only">Chargement de la fiche location…</span>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-52 w-full rounded-[var(--radius-card)]" />
      </div>
    );
  }

  const { property, tenant } = fiche.data;
  const locationHeadline = `${property.buildingName} — ${property.unitLabel}`;
  const buildingWithUnitFocusHref = `/biens/${encodeURIComponent(property.buildingId)}?unitId=${encodeURIComponent(property.unitId)}&hintUnitLabel=${encodeURIComponent(property.unitLabel)}&returnLocation=${encodeURIComponent(id ? `/locations/${id}` : '/locations')}`;
  const paymentsHref = `/paiements?leaseId=${encodeURIComponent(fiche.data.leaseId)}&year=all&month=all&hintTenant=${encodeURIComponent(tenant.fullName)}&hintPlace=${encodeURIComponent(locationHeadline)}`;

  return (
    <div className="space-y-5">
      <LocationDetailHero
        data={fiche.data}
        backHref={back.href}
        backLabel={back.label}
        isSheet={isSheet}
        locationHeadline={locationHeadline}
        paymentsHref={paymentsHref}
        buildingWithUnitFocusHref={buildingWithUnitFocusHref}
      />

      {isSheet ? (
        <Callout variant="info" title="Vue panneau latéral">
          <p className="text-sm">Pour plus d’espace ou une impression plus confortable :</p>
          <Button type="button" variant="secondary" className="mt-3 py-2.5 text-sm font-semibold" onClick={() => openLocationFullPage()}>
            Ouvrir la fiche en pleine page
          </Button>
        </Callout>
      ) : null}

      <Card padding="none" className="overflow-hidden">
        <Tabs
          tabs={[
            { id: 'lieu', label: 'Lieu & finances' },
            { id: 'bail', label: 'Contrat & bail' },
          ]}
          activeId={tab}
          onChange={setTab}
          ariaLabel="Sections"
        />
        <div className="odoo-notebook-content p-4 sm:p-5">
          {tab === 'lieu' ? (
            <LocationPlaceTab
              data={fiche.data}
              schedule={fiche.schedule}
              deposit={fiche.deposit}
              prepay={fiche.prepay}
            />
          ) : (
            <LocationBailTab
              data={fiche.data}
              lease={fiche.lease}
              revise={fiche.revise}
              onReload={fiche.reload}
              onDelete={() => void fiche.requestDeleteLocation(locationHeadline, tenant.fullName)}
            />
          )}
        </div>
      </Card>

      <LocationWaiveModal waive={fiche.waive} />
    </div>
  );
}
