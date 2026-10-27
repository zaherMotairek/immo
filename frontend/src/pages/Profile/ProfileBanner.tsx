import { Card, StatusBadge } from '@/components/ui/index';
import type { AuthUser } from '@/auth/AuthContext';
import { initialsFromDisplay } from './profileUtils';

type ProfileBannerProps = {
  user: AuthUser | null;
  displayName: string;
};

/** Bandeau identité (initiales, rôle, e-mail, organisation). */
export function ProfileBanner({ user, displayName }: ProfileBannerProps) {
  const initials = user ? initialsFromDisplay(displayName, user.email) : '—';

  return (
    <Card className="overflow-hidden border-[var(--odoo-border)] p-0" padding="none">
      <div className="h-28 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black sm:h-32" aria-hidden />
      <div className="relative px-5 pb-6 pt-0 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6">
          <div
            className="-mt-14 flex size-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-white text-2xl font-bold tracking-tight text-brand-700 shadow-[var(--shadow-lift)] dark:border-[var(--color-surface)] dark:bg-zinc-900 dark:text-brand-300 sm:size-28 sm:text-3xl"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 pb-1 pt-2 sm:pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-bold text-[var(--color-ink)]">{displayName || 'Votre profil'}</h2>
              {user?.role === 'PLATFORM_ADMIN' ? (
                <StatusBadge status="WAIVED" label="Admin plateforme" size="sm" />
              ) : (
                <StatusBadge status="CANCELLED" label="Compte bailleur" size="sm" />
              )}
            </div>
            <p className="mt-1 truncate text-sm text-[var(--color-muted)]">{user?.email ?? '—'}</p>
            {user?.organizationName ? (
              <p className="mt-0.5 truncate text-xs font-medium text-[var(--color-muted)]">{user.organizationName}</p>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
