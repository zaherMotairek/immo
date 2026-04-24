import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { saveScrollForPath } from '@/lib/navigation';
import { useAuth } from '@/auth/AuthContext';
import { NavigationProvider } from '@/context/NavigationContext';
import { ScrollRestoration } from '@/components/ScrollRestoration';
import { GlobalSearchBar } from './GlobalSearchBar';
import { SidebarNavIcon } from './SidebarNavIcons';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui';

type NavItem = { to: string; label: string; end?: boolean };

/** Ce qu’un bailleur ouvre 80 % du temps : le reste est sous « Plus d’outils ». */
const navPrimary: NavItem[] = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/biens', label: 'Mes biens' },
  { to: '/locataires', label: 'Locataires' },
  { to: '/baux', label: 'Baux' },
  { to: '/paiements', label: 'Paiements' },
];

const navSecondary: NavItem[] = [
  { to: '/locations', label: 'Carte des biens' },
  { to: '/activite-loyers', label: 'Calendrier loyers' },
  { to: '/cautions', label: 'Cautions' },
  { to: '/charges', label: 'Charges' },
  { to: '/exports', label: 'Fichiers Excel' },
];

const navAccount: NavItem[] = [{ to: '/profil', label: 'Mon compte' }];

const NAV_MORE_STORAGE = 'immopilot-nav-plus-open';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-[var(--radius-input)] border-l-[3px] py-2.5 pl-2.5 pr-3 text-[13px] font-medium transition ${
    isActive
      ? 'border-sky-400 bg-white/[0.1] text-white shadow-sm shadow-black/15'
      : 'border-transparent text-slate-300 hover:border-slate-500/80 hover:bg-white/[0.06] hover:text-white'
  }`;

const navClassMobile = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
    isActive ? 'bg-brand-600 text-white shadow-md shadow-brand-900/30' : 'bg-slate-800/90 text-slate-300'
  }`;

const moreToolsBtnClass = `w-full rounded-[var(--radius-input)] border border-slate-600/80 bg-slate-800/40 py-2.5 pl-2.5 pr-3 text-left text-[12px] font-semibold text-slate-200 transition hover:bg-white/[0.06] hover:text-white`;

const MOBILE_NAV_KEY = 'immopilot-mobile-nav-open';
const DESKTOP_NAV_KEY = 'immopilot-desktop-nav-open';

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`ml-auto size-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
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

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [moreToolsOpen, setMoreToolsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(NAV_MORE_STORAGE) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(NAV_MORE_STORAGE, moreToolsOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [moreToolsOpen]);

  /** Lien direct vers une page « secondaire » : ouvrir le bloc pour qu’on voie où on est. */
  useEffect(() => {
    const inSecondary = navSecondary.some((i) => location.pathname === i.to);
    const inAdmin = user?.role === 'PLATFORM_ADMIN' && location.pathname.startsWith('/admin');
    if (inSecondary || inAdmin) setMoreToolsOpen(true);
  }, [location.pathname, user?.role]);

  const adminItem: NavItem | null = useMemo(
    () => (user?.role === 'PLATFORM_ADMIN' ? { to: '/admin', label: 'Clients (admin)' } : null),
    [user?.role],
  );

  /** Bandeau mobile : accès rapide sans scroller 12 onglets. */
  const mobileChips = useMemo(() => {
    return [...navPrimary, ...navAccount];
  }, []);
  const [mobileNavOpen, setMobileNavOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem(MOBILE_NAV_KEY) !== '0';
  });
  const [desktopNavOpen, setDesktopNavOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem(DESKTOP_NAV_KEY) !== '0';
    } catch {
      return true;
    }
  });

  function setMobileNavOpenPersist(next: boolean) {
    setMobileNavOpen(next);
    try {
      sessionStorage.setItem(MOBILE_NAV_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

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

  return (
    <div className="safe-pt min-h-dvh flex flex-col print:min-h-0 lg:flex-row">
      <a
        href="#contenu-principal"
        className="sr-only rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        Aller au contenu principal
      </a>
      <aside
        id="navigation-mobile-aside"
        className={`border-b border-slate-800/80 bg-[#0c0f14] text-slate-100 print:hidden lg:h-[100dvh] lg:max-h-[100dvh] lg:w-[15.5rem] lg:shrink-0 lg:flex-col lg:overflow-hidden lg:border-b-0 lg:border-r lg:border-slate-800/70 lg:sticky lg:top-0 lg:self-start ${
          desktopNavOpen ? 'lg:flex' : 'lg:hidden'
        } ${!mobileNavOpen ? 'max-lg:hidden' : ''} ${
          mobileNavOpen
            ? 'max-lg:sticky max-lg:top-0 max-lg:z-40 max-lg:w-full max-lg:shrink-0 max-lg:shadow-[0_8px_30px_rgb(0_0_0/0.35)]'
            : ''
        }`}
        aria-label="Navigation principale"
      >
        {/* En-tête : logo + thème + Fermer (compact uniquement) */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-transparent p-4 lg:border-b-0 lg:px-3 lg:pt-5">
          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="hidden h-8 w-1 shrink-0 rounded-full bg-gradient-to-b from-sky-400 to-brand-600 lg:block" aria-hidden />
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold tracking-tight text-white">ImmoPilot</div>
                  <p className="hidden text-[11px] font-medium leading-tight text-slate-400 lg:mt-0.5 lg:block">
                    Loyers & biens — en clair
                  </p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle className="shrink-0" />
              <button
                type="button"
                className="hidden min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border border-slate-600/90 bg-slate-800/80 px-2.5 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-700 lg:flex"
                onClick={() => setDesktopNavOpenPersist(false)}
                aria-label="Masquer le menu latéral"
                title="Masquer le menu"
              >
                Masquer
              </button>
              <button
                type="button"
                className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-white/25 bg-brand-600/90 px-3 py-2 text-sm font-bold text-white shadow-md shadow-black/20 transition hover:bg-brand-500 active:scale-[0.98] lg:hidden"
                onClick={() => setMobileNavOpenPersist(false)}
                aria-expanded={mobileNavOpen}
                aria-controls="navigation-mobile-aside"
                aria-label="Fermer le menu de navigation"
                title="Fermer le menu"
              >
                <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
                <span className="whitespace-nowrap">Fermer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Menu vertical : visible seulement à partir de lg ; zone scrollable indépendante */}
        <nav
          className="hidden min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-3 pb-2 lg:flex lg:pr-1"
          aria-label="Navigation détaillée"
        >
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Menu</p>
          <div className="flex flex-col gap-0.5">
            {navPrimary.map((l) => (
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
              className={moreToolsBtnClass}
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
              <div className="mt-1.5 flex flex-col gap-0.5 border-l-2 border-slate-700/80 pl-2" role="region" aria-label="Outils supplémentaires">
                {navSecondary.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
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
            ) : null}
          </div>
          <p className="mb-1.5 mt-5 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Compte</p>
          <div className="flex flex-col gap-0.5">
            {navAccount.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={navClass}
                onClick={saveScrollBeforeMenuNav}
              >
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

        <div className="hidden shrink-0 border-t border-slate-800/80 px-3 pb-4 pt-4 lg:block">
          <p className="truncate px-1 text-[11px] text-slate-400" title={user?.email ?? undefined}>
            {user?.email}
          </p>
          <Button
            variant="ghost"
            className="mt-2 w-full justify-start rounded-xl border border-slate-700/90 px-3 py-2.5 text-[13px] font-medium text-slate-200 hover:bg-white/[0.06] hover:text-white"
            onClick={logout}
          >
            Déconnexion
          </Button>
        </div>

        {/* Pastilles horizontales : téléphone & tablette < lg */}
        <div className="border-t border-slate-800/80 bg-[#0a0c10] lg:hidden">
          <nav
            className="flex touch-pan-x gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain px-2 py-2.5 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as CSSProperties}
            aria-label="Navigation rapide"
          >
            {mobileChips.map((l) => (
              <NavLink
                key={`${l.to}-${l.end ? '1' : '0'}`}
                to={l.to}
                end={l.end}
                className={`${navClassMobile} flex min-h-[44px] shrink-0 items-center gap-1.5`}
                onClick={saveScrollBeforeMenuNav}
              >
                <SidebarNavIcon to={l.to} className="size-3.5 opacity-95" />
                {l.label}
              </NavLink>
            ))}
          </nav>
          <details className="group border-t border-slate-800/50 px-2 pb-2">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-xl bg-slate-800/60 py-2 text-center text-xs font-semibold text-slate-300 marker:hidden [&::-webkit-details-marker]:hidden">
              <span>Plus d&apos;outils</span>
              <span className="text-slate-500 group-open:rotate-180" aria-hidden>
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {navSecondary.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className="rounded-full border border-slate-600/80 bg-slate-800/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200"
                  onClick={saveScrollBeforeMenuNav}
                >
                  {l.label}
                </NavLink>
              ))}
              {adminItem ? (
                <NavLink
                  to={adminItem.to}
                  className="rounded-full border border-brand-600/50 bg-brand-900/30 px-2.5 py-1.5 text-[11px] font-semibold text-brand-100"
                  onClick={saveScrollBeforeMenuNav}
                >
                  {adminItem.label}
                </NavLink>
              ) : null}
            </div>
          </details>
        </div>
      </aside>

      <main
        id="contenu-principal"
        role="main"
        tabIndex={-1}
        className="relative flex min-h-dvh min-w-0 flex-1 flex-col text-slate-900 outline-none print:bg-white print:text-black dark:text-slate-100"
      >
        {!mobileNavOpen ? (
          <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-slate-800/90 bg-[#0c0f14] px-3 py-2.5 print:hidden lg:hidden">
            <button
              type="button"
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-800/90 text-slate-100 transition hover:bg-slate-700"
              onClick={() => setMobileNavOpenPersist(true)}
              aria-expanded={false}
              aria-controls="navigation-mobile-aside"
              aria-label="Afficher le menu de navigation"
              title="Afficher le menu"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>
            <span className="min-w-0 truncate text-sm font-semibold text-white">ImmoPilot</span>
          </div>
        ) : null}
        <div className="sticky top-0 z-30 max-lg:static max-lg:z-auto border-b border-slate-200/90 bg-white/80 px-3 pb-3 pt-3 shadow-[0_1px_0_rgb(15_23_42/0.06),0_8px_32px_rgb(15_23_42/0.05)] backdrop-blur-xl print:hidden dark:border-slate-700/75 dark:bg-slate-900/88 dark:shadow-[0_1px_0_rgb(0_0_0/0.25),0_8px_32px_rgb(0_0_0/0.2)] sm:px-6 sm:pb-3.5 sm:pt-3.5 lg:px-6 xl:px-8">
          <div className="mx-auto flex w-full max-w-[min(100%,96rem)] items-center gap-3">
            <button
              type="button"
              className="hidden min-h-[38px] shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 lg:inline-flex"
              onClick={() => setDesktopNavOpenPersist(!desktopNavOpen)}
              aria-label={desktopNavOpen ? 'Masquer le menu latéral' : 'Afficher le menu latéral'}
              title={desktopNavOpen ? 'Masquer le menu' : 'Afficher le menu'}
            >
              {desktopNavOpen ? 'Masquer menu' : 'Afficher menu'}
            </button>
            <div className="min-w-0 flex-1">
            <GlobalSearchBar />
            </div>
          </div>
        </div>
        <div className="flex-1 p-3 print:p-4 sm:p-6 lg:px-6 lg:pb-14 lg:pt-7 xl:px-8 xl:pt-8">
          <div className="mx-auto w-full max-w-[min(100%,96rem)]">
            <NavigationProvider>
              <ScrollRestoration />
              <Outlet />
            </NavigationProvider>
          </div>
        </div>
      </main>
      <div className="safe-pb flex items-center justify-between border-t border-slate-800/80 bg-[#0c0f14] px-3 py-3 text-slate-200 print:hidden lg:hidden">
        <span className="truncate text-[11px] text-slate-400">{user?.email}</span>
        <Button
          variant="secondary"
          className="rounded-lg border-slate-600 bg-slate-800 py-1.5 text-xs text-white hover:bg-slate-700"
          onClick={logout}
        >
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
