import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { saveScrollForPath } from '@/lib/navigation';
import { useAuth } from '@/auth/AuthContext';
import { ScrollRestoration } from '@/components/ScrollRestoration';
import { useOrgEntitlements } from '@/hooks/useOrgEntitlements';
import { GlobalSearchBar } from './GlobalSearchBar';
import { SidebarNavIcon } from './SidebarNavIcons';
import { ThemeToggle } from './ThemeToggle';
import { InstallAppButton } from './InstallAppButton';
import { BottomSheet, Button } from '@/components/ui/index';
import { exitImpersonation } from '@/pages/AdminClients/AdminClientDetailPage';

type NavItem = { to: string; label: string; end?: boolean; short?: string; perm?: string };

/** Ce qu’un bailleur ouvre 80 % du temps : le reste est sous « Plus ». */
const navPrimary: NavItem[] = [
  { to: '/', label: 'Accueil', short: 'Accueil', end: true },
  { to: '/biens', label: 'Mes biens', short: 'Biens', perm: 'buildings:read' },
  { to: '/locataires', label: 'Locataires', short: 'Locat.', perm: 'tenants:read' },
  { to: '/baux', label: 'Baux', short: 'Baux', perm: 'leases:read' },
  { to: '/paiements', label: 'Paiements', short: 'Loyers', perm: 'payments:read' },
];

const navSecondary: NavItem[] = [
  { to: '/relances', label: 'Relances', perm: 'reminders:write' },
  { to: '/locations', label: 'Carte des biens', perm: 'buildings:read' },
  { to: '/activite-loyers', label: 'Calendrier loyers', perm: 'payments:read' },
  { to: '/cautions', label: 'Cautions & charges', perm: 'charges:read' },
  { to: '/comptabilite', label: 'Comptabilité', perm: 'charges:read' },
  { to: '/collecteurs', label: 'Collecteurs loyers', perm: 'collectors:read' },
  { to: '/journal-securite', label: 'Journal sécurité' },
  { to: '/exports', label: 'Fichiers Excel', perm: 'exports:read' },
];

const navAccount: NavItem[] = [{ to: '/profil', label: 'Mon compte' }];

/** Onglets barre du bas (mobile) — locataires et le reste sous « Plus ». */
const mobileBottomTabs: NavItem[] = [
  { to: '/', label: 'Accueil', short: 'Accueil', end: true },
  { to: '/biens', label: 'Mes biens', short: 'Biens', perm: 'buildings:read' },
  { to: '/baux', label: 'Baux', short: 'Baux', perm: 'leases:read' },
  { to: '/paiements', label: 'Paiements', short: 'Loyers', perm: 'payments:read' },
];

const NAV_MORE_STORAGE = 'immopilot-nav-plus-open';
const DESKTOP_NAV_KEY = 'immopilot-desktop-nav-open';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `odoo-nav-item ${isActive ? 'odoo-nav-item-active' : ''}`;

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`ml-auto size-4 shrink-0 text-[var(--color-muted)] transition ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function pathMatches(pathname: string, item: NavItem): boolean {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function Layout() {
  const { user, logout } = useAuth();
  const { can } = useOrgEntitlements();
  const location = useLocation();

  const filterNav = useCallback((items: NavItem[]) => items.filter((i) => !i.perm || can(i.perm)), [can]);
  const primaryNav = useMemo(() => filterNav(navPrimary), [filterNav]);
  const secondaryNav = useMemo(() => filterNav(navSecondary), [filterNav]);
  const mobileTabs = useMemo(() => filterNav(mobileBottomTabs), [filterNav]);

  const [moreToolsOpen, setMoreToolsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(NAV_MORE_STORAGE) === '1';
    } catch {
      return false;
    }
  });

  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const sync = () => {
      setShowMobileNav(mq.matches);
      if (!mq.matches) setMobileMoreOpen(false);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(NAV_MORE_STORAGE, moreToolsOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [moreToolsOpen]);

  useEffect(() => {
    const inSecondary = secondaryNav.some((i) => location.pathname === i.to);
    const inAdmin = user?.role === 'PLATFORM_ADMIN' && location.pathname.startsWith('/admin');
    if (inSecondary || inAdmin) setMoreToolsOpen(true);
  }, [location.pathname, user?.role, secondaryNav]);

  /** Fermer le tiroir « Plus » à chaque navigation. */
  useEffect(() => {
    setMobileMoreOpen(false);
  }, [location.pathname]);

  const adminItem: NavItem | null = useMemo(
    () => (user?.role === 'PLATFORM_ADMIN' ? { to: '/admin', label: 'Clients (admin)' } : null),
    [user?.role],
  );

  const [desktopNavOpen, setDesktopNavOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem(DESKTOP_NAV_KEY) !== '0';
    } catch {
      return true;
    }
  });

  function setDesktopNavOpenPersist(next: boolean) {
    setDesktopNavOpen(next);
    try {
      localStorage.setItem(DESKTOP_NAV_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  const saveScrollBeforeMenuNav = useCallback(() => {
    saveScrollForPath(location.pathname + location.search);
  }, [location.pathname, location.search]);

  const moreIsActive = useMemo(() => {
    const paths = [...secondaryNav, ...navAccount, { to: '/locataires', label: 'Locataires' }];
    if (adminItem) paths.push(adminItem);
    return paths.some((i) => pathMatches(location.pathname, i));
  }, [location.pathname, adminItem, secondaryNav]);

  return (
    <div className="safe-pt app-shell min-h-dvh flex flex-col print:min-h-0 lg:flex-row">
      <a
        href="#contenu-principal"
        className="sr-only rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        Aller au contenu principal
      </a>

      {/* ——— Sidebar desktop (≥ lg) ——— */}
      <aside
        id="navigation-desktop-aside"
        className={`odoo-sidebar hidden border-r text-[var(--color-ink)] print:hidden lg:h-[100dvh] lg:max-h-[100dvh] lg:w-[15.5rem] lg:shrink-0 lg:flex-col lg:overflow-hidden lg:sticky lg:top-0 lg:self-start ${
          desktopNavOpen ? 'lg:flex' : 'lg:hidden'
        }`}
        aria-label="Navigation principale"
      >
        <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--odoo-border)] p-4 lg:px-3 lg:pt-5 lg:pb-4">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-8 w-1 shrink-0 rounded-sm bg-brand-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="odoo-sidebar-brand text-[15px] font-semibold leading-snug">ImmoPilot</div>
              <p className="mt-0.5 text-[11px] font-medium leading-tight text-[var(--color-muted)]">Gestion locative</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pl-3">
            <ThemeToggle className="shrink-0" tone="onLight" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11 shrink-0"
              onClick={() => setDesktopNavOpenPersist(false)}
              aria-label="Masquer le menu latéral"
              title="Masquer le menu"
            >
              Masquer
            </Button>
          </div>
        </div>

        <nav
          className="min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-3 pb-2 lg:pr-1"
          aria-label="Navigation détaillée"
        >
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Menu</p>
          <div className="flex flex-col gap-0.5">
            {primaryNav.map((l) => (
              <NavLink
                key={`${l.to}-${l.end ? '1' : '0'}`}
                to={l.to}
                end={l.end}
                className={navClass}
                onClick={saveScrollBeforeMenuNav}
              >
                <span className="flex items-center gap-2.5">
                  <SidebarNavIcon to={l.to} />
                  {l.label}
                </span>
              </NavLink>
            ))}
          </div>
          <div className="mt-2">
            <button
              type="button"
              className="odoo-nav-item w-full border border-[var(--odoo-border)] bg-[var(--color-surface)] py-2.5 pl-2.5 pr-3 text-left text-[12px] font-semibold"
              onClick={() => setMoreToolsOpen((o) => !o)}
              aria-expanded={moreToolsOpen}
              id="nav-plus-tools-toggle"
            >
              <span className="flex w-full min-w-0 items-center gap-2">
                <span className="min-w-0">Plus d&apos;outils</span>
                <Chevron open={moreToolsOpen} />
              </span>
            </button>
            {moreToolsOpen ? (
              <div
                className="mt-1.5 flex flex-col gap-0.5 border-l-2 border-brand-600/35 pl-2"
                role="region"
                aria-label="Outils supplémentaires"
              >
                {secondaryNav.map((l) => (
                  <NavLink key={l.to} to={l.to} className={navClass} onClick={saveScrollBeforeMenuNav}>
                    <span className="flex items-center gap-2.5">
                      <SidebarNavIcon to={l.to} />
                      {l.label}
                    </span>
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
          <p className="mb-1.5 mt-5 px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Compte
          </p>
          <div className="flex flex-col gap-0.5">
            {navAccount.map((l) => (
              <NavLink key={l.to} to={l.to} className={navClass} onClick={saveScrollBeforeMenuNav}>
                <span className="flex items-center gap-2.5">
                  <SidebarNavIcon to={l.to} />
                  {l.label}
                </span>
              </NavLink>
            ))}
            {adminItem ? (
              <NavLink to={adminItem.to} className={navClass} onClick={saveScrollBeforeMenuNav}>
                <span className="flex items-center gap-2.5">
                  <SidebarNavIcon to={adminItem.to} />
                  {adminItem.label}
                </span>
              </NavLink>
            ) : null}
          </div>
        </nav>

        <div className="shrink-0 border-t border-[var(--odoo-border)] px-3 pb-4 pt-4">
          <p className="truncate px-1 text-[11px] text-[var(--color-muted)]" title={user?.email ?? undefined}>
            {user?.email}
          </p>
          <InstallAppButton variant="sidebar" className="mt-2" />
          <Button variant="ghost" className="mt-2 w-full justify-start" onClick={logout}>
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* ——— Contenu ——— */}
      <main
        id="contenu-principal"
        role="main"
        tabIndex={-1}
        className="relative flex min-h-dvh min-w-0 flex-1 flex-col text-[var(--color-ink)] outline-none print:bg-white print:text-black max-lg:pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="odoo-chrome-bar sticky top-0 z-[var(--z-sticky)] px-3 py-2.5 print:hidden sm:px-6 sm:py-3.5 lg:px-6 xl:px-8">
          <div className="mx-auto flex w-full max-w-[min(100%,96rem)] items-center gap-2 sm:gap-3">
            <div className="hidden shrink-0 lg:block">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDesktopNavOpenPersist(!desktopNavOpen)}
                aria-label={desktopNavOpen ? 'Masquer le menu latéral' : 'Afficher le menu latéral'}
                title={desktopNavOpen ? 'Masquer le menu' : 'Afficher le menu'}
              >
                {desktopNavOpen ? 'Masquer menu' : 'Afficher menu'}
              </Button>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="min-w-0 flex-1">
                <GlobalSearchBar />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
              <ThemeToggle tone="onLight" className="shrink-0" />
            </div>
          </div>
        </div>

        <div className="app-main-pad flex-1 print:p-4">
          <div className="mx-auto w-full min-w-0 max-w-[min(100%,96rem)]">
            <ScrollRestoration />
            {user?.readOnly ? (
              <div
                className="mb-4 flex flex-col gap-2 rounded-[var(--radius-card)] border border-amber-500/40 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
                role="status"
              >
                <p>
                  <strong>Vue client (lecture seule)</strong>
                  {user.organizationName ? ` — ${user.organizationName}` : ''}. Modifications
                  bloquées · session 30 min.
                </p>
                <Button type="button" variant="secondary" className="shrink-0 text-xs" onClick={() => exitImpersonation()}>
                  Quitter la vue client
                </Button>
              </div>
            ) : null}
            {user?.isDemo && !user.readOnly ? (
              <div
                className="mb-4 flex flex-col gap-2 rounded-[var(--radius-card)] border border-sky-500/35 bg-sky-50 px-3 py-2.5 text-sm text-sky-950 sm:flex-row sm:items-center sm:justify-between"
                role="status"
              >
                <p>
                  <strong>Mode démo</strong> — les données ne sont pas conservées (purge sous 24 h).
                </p>
                <NavLink
                  to="/inscription"
                  className="shrink-0 text-xs font-semibold underline"
                  onClick={() => {
                    /* laisser la session démo jusqu’à inscription */
                  }}
                >
                  Créer mon compte
                </NavLink>
              </div>
            ) : null}
            <Outlet />
          </div>
        </div>
      </main>

      {/* ——— Bottom nav + tiroir Plus : mobile / tablette uniquement ——— */}
      {showMobileNav ? (
        <>
          <nav
            className="mobile-bottom-nav print:hidden"
            aria-label="Navigation principale mobile"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' } as CSSProperties}
          >
            {mobileTabs.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={saveScrollBeforeMenuNav}
                className={({ isActive }) => `mobile-bottom-nav__item ${isActive ? 'is-active' : ''}`}
              >
                <SidebarNavIcon to={l.to} className="size-5" />
                <span>{l.short ?? l.label}</span>
              </NavLink>
            ))}
            <button
              type="button"
              className={`mobile-bottom-nav__item ${moreIsActive || mobileMoreOpen ? 'is-active' : ''}`}
              aria-expanded={mobileMoreOpen}
              aria-controls="mobile-more-sheet"
              onClick={() => setMobileMoreOpen((o) => !o)}
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
              <span>Plus</span>
            </button>
          </nav>

          <BottomSheet
            open={mobileMoreOpen}
            onClose={() => setMobileMoreOpen(false)}
            title="Plus d’outils"
            className="print:hidden"
          >
            <div id="mobile-more-sheet">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Navigation
              </p>
              <div className="grid grid-cols-2 gap-2">
                <NavLink to="/locataires" className="mobile-more-link" onClick={saveScrollBeforeMenuNav}>
                  <SidebarNavIcon to="/locataires" />
                  Locataires
                </NavLink>
                {secondaryNav.map((l) => (
                  <NavLink key={l.to} to={l.to} className="mobile-more-link" onClick={saveScrollBeforeMenuNav}>
                    <SidebarNavIcon to={l.to} />
                    {l.label}
                  </NavLink>
                ))}
              </div>
              <p className="mb-2 mt-4 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Compte
              </p>
              <div className="flex flex-col gap-1.5">
                {navAccount.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className="mobile-more-link mobile-more-link--row"
                    onClick={saveScrollBeforeMenuNav}
                  >
                    <SidebarNavIcon to={l.to} />
                    {l.label}
                  </NavLink>
                ))}
                {adminItem ? (
                  <NavLink
                    to={adminItem.to}
                    className="mobile-more-link mobile-more-link--row"
                    onClick={saveScrollBeforeMenuNav}
                  >
                    <SidebarNavIcon to={adminItem.to} />
                    {adminItem.label}
                  </NavLink>
                ) : null}
                <p className="truncate px-2 pt-1 text-[11px] text-[var(--color-muted)]">{user?.email}</p>
                <InstallAppButton variant="auth" className="mt-1" />
                <Button
                  variant="danger"
                  className="mt-2 w-full justify-center"
                  onClick={() => {
                    setMobileMoreOpen(false);
                    logout();
                  }}
                >
                  Déconnexion
                </Button>
              </div>
            </div>
          </BottomSheet>
        </>
      ) : null}
    </div>
  );
}
