import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppNavigation } from '@/context/NavigationContext';
import { Card, Tabs } from '@/components/ui/index';
import { confirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { resolveReturnTarget } from '@/lib/navigation';
import { useEscapeCancel } from '@/lib/useEscapeCancel';
import { BuildingDetailError, BuildingDetailSkeleton } from './BuildingDetailState';
import { BuildingHero } from './BuildingHero';
import { NewUnitTab } from './NewUnitTab';
import { OrganisationTab } from './OrganisationTab';
import { UnitFocusNotice } from './UnitFocusNotice';
import { UnitsTab } from './UnitsTab';
import { useAddUnitForm } from './useAddUnitForm';
import { useAddUnitSubmit } from './useAddUnitSubmit';
import { useBuildingData } from './useBuildingData';
import { useBuildingLayout } from './useBuildingLayout';
import { useBuildingProfile } from './useBuildingProfile';
import { useBuildingProfileDrafts } from './useBuildingProfileDrafts';
import { useUnitActions } from './useUnitActions';
import { useUnitsList } from './useUnitsList';

const TABS = [
  { id: 'organisation', label: 'Organisation' },
  { id: 'nouvelle-unite', label: 'Nouvelle unité' },
  { id: 'unites', label: 'Unités' },
];

/** Fiche d'un bien : chargement → brouillons / formulaires → en-tête, notice de mise en avant et onglets. */
export function BuildingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const focusUnitId = params.get('unitId')?.trim() ?? '';
  const hintUnitLabel = params.get('hintUnitLabel')?.trim() ?? '';
  const returnLocation = params.get('returnLocation')?.trim() ?? '';
  const location = useLocation();
  const { setReturnFallback } = useAppNavigation();
  const back = useMemo(
    () =>
      resolveReturnTarget(
        location.state,
        { fallbackHref: '/biens', fallbackLabel: 'Biens' },
        { returnLocationQuery: returnLocation },
      ),
    [location.state, returnLocation],
  );
  useEffect(() => {
    setReturnFallback(back.href);
    return () => setReturnFallback('/');
  }, [back.href, setReturnFallback]);

  const [buildingTab, setBuildingTab] = useState('organisation');
  const [organizationOpen, setOrganizationOpen] = useState(true);

  const drafts = useBuildingProfileDrafts();
  const { b, setB, loading, loadError, load } = useBuildingData(id, drafts.applyLoaded);
  const layout = useBuildingLayout(b);
  const profile = useBuildingProfile({ id, b, immeubleLocked: layout.immeubleLocked, drafts, load });
  const form = useAddUnitForm({ b, layout, setBuildingTab });
  const { addUnit, addUnitsBatch } = useAddUnitSubmit({ id, b, form, layout, load });
  const list = useUnitsList({ id, b, focusUnitId, hintUnitLabel, setParams, setBuildingTab });
  const actions = useUnitActions({ id, b, setB, layout, unitDrafts: list.unitDrafts, setErr: form.setErr, load });

  useEscapeCancel(!!b && (profile.buildingProfileDirty || form.addUnitFormOpen), () => {
    if (!b) return;
    if (form.addUnitFormOpen) {
      form.resetAddUnitForm();
      form.setAddUnitFormOpen(false);
    } else if (profile.buildingProfileDirty) {
      profile.resetBuildingProfileFromLoaded();
    }
  });

  async function removeBuilding() {
    const okDelete = await confirmDialog({
      title: 'Supprimer le bien',
      message: 'Supprimer ce bien et toutes ses unités, baux et loyers associés ? Cette action est définitive.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!okDelete) {
      return;
    }
    if (!id) return;
    try {
      await api(`/buildings/${id}`, { method: 'DELETE' });
      navigate('/biens', { replace: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Suppression impossible.', { variant: 'error' });
    }
  }

  if (loading) return <BuildingDetailSkeleton />;
  if (loadError || !b) {
    return <BuildingDetailError message={loadError} backHref={back.href} backLabel={back.label} />;
  }

  return (
    <div className="space-y-6">
      <BuildingHero
        b={b}
        stats={layout.buildingStats}
        backHref={back.href}
        backLabel={back.label}
        actions={actions}
        onAddUnit={form.openAddUnitForm}
        onDeleteBuilding={removeBuilding}
      />

      {focusUnitId ? (
        <UnitFocusNotice
          focusUnitId={focusUnitId}
          unitFocusTitle={list.unitFocusTitle}
          returnLocation={returnLocation}
          onClear={list.clearUnitFocus}
        />
      ) : null}

      <Card padding="none" className="overflow-hidden">
        <Tabs tabs={TABS} activeId={buildingTab} onChange={setBuildingTab} ariaLabel="Sections" />
        <div className="odoo-notebook-content p-4 sm:p-5">
          {buildingTab === 'nouvelle-unite' ? (
            <NewUnitTab b={b} form={form} layout={layout} onSubmit={addUnit} onSubmitBatch={addUnitsBatch} />
          ) : buildingTab === 'unites' ? (
            <UnitsTab b={b} stats={layout.buildingStats} list={list} actions={actions} onAddUnit={form.openAddUnitForm} />
          ) : (
            <OrganisationTab
              b={b}
              layout={layout}
              drafts={drafts}
              profile={profile}
              open={organizationOpen}
              onToggleOpen={() => setOrganizationOpen((v) => !v)}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
