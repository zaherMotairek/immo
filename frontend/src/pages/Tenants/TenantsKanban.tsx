import { useNavigate } from 'react-router-dom';
import { OdooKanbanBoard, OdooKanbanCard, OdooKanbanColumn } from '@/components/OdooKit';
import type { Tenant } from './types';

type TenantsKanbanProps = {
  withLease: Tenant[];
  withoutLease: Tenant[];
};

/** Vue Kanban : colonnes « Avec bail » / « Sans bail » ; un clic ouvre la fiche (`?edit=`). */
export function TenantsKanban({ withLease, withoutLease }: TenantsKanbanProps) {
  const navigate = useNavigate();
  return (
    <div className="p-4">
      <OdooKanbanBoard>
        <OdooKanbanColumn title="Avec bail" count={withLease.length}>
          {withLease.map((t) => {
            const l = t.leases[0];
            return (
              <OdooKanbanCard key={t.id} onClick={() => navigate(`/locataires?edit=${t.id}`)}>
                <p className="font-semibold text-[var(--color-ink)]">
                  {t.firstName} {t.lastName}
                </p>
                {l ? (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {l.unit.building.name} · {l.unit.label}
                  </p>
                ) : null}
                {t.phone?.trim() ? (
                  <p className="mt-1 text-xs text-brand-800 dark:text-brand-300">{t.phone}</p>
                ) : null}
              </OdooKanbanCard>
            );
          })}
        </OdooKanbanColumn>
        <OdooKanbanColumn title="Sans bail" count={withoutLease.length}>
          {withoutLease.map((t) => (
            <OdooKanbanCard key={t.id} onClick={() => navigate(`/locataires?edit=${t.id}`)}>
              <p className="font-semibold text-[var(--color-ink)]">
                {t.firstName} {t.lastName}
              </p>
              {t.email?.trim() ? <p className="mt-1 text-xs text-[var(--color-muted)]">{t.email}</p> : null}
            </OdooKanbanCard>
          ))}
        </OdooKanbanColumn>
      </OdooKanbanBoard>
    </div>
  );
}
