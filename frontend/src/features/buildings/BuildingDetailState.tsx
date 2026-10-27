import { PageDetailBackLink } from '@/components/PageDetailHero';
import { Callout, Card, Skeleton } from '@/components/ui/index';

/** Squelette affiché pendant le premier chargement de la fiche bien. */
export function BuildingDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement du bien">
      <Card padding="lg" className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 max-w-md" />
        <Skeleton className="h-4 max-w-sm" />
        <div className="flex flex-wrap gap-2 pt-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </Card>
      <Skeleton className="h-36 rounded-[var(--radius-card)]" />
      <Skeleton className="h-52 rounded-[var(--radius-card)]" />
      <p className="sr-only">Chargement du bien…</p>
    </div>
  );
}

type BuildingDetailErrorProps = {
  message: string | null;
  backHref: string;
  backLabel: string;
};

/** Erreur de chargement (ou bien introuvable) avec rappel de vérification et lien de retour. */
export function BuildingDetailError({ message, backHref, backLabel }: BuildingDetailErrorProps) {
  return (
    <Card>
      <Callout variant="danger" title={message ?? 'Bien introuvable.'}>
        <p className="text-sm text-[var(--color-muted)]">
          Vérifiez que l’API tourne, que vous êtes connecté, et que la base est à jour ({' '}
          <code className="rounded bg-[var(--odoo-table-head-bg)] px-1">npx prisma migrate deploy</code> ).
        </p>
      </Callout>
      <PageDetailBackLink to={backHref}>Retour vers {backLabel}</PageDetailBackLink>
    </Card>
  );
}
