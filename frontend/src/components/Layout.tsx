import { Fragment, useCallback, useState, type CSSProperties } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { saveScrollForPath } from '@/lib/navigation';
import { useAuth } from '@/auth/AuthContext';
import { NavigationProvider } from '@/context/NavigationContext';
import { ScrollRestoration } from '@/components/ScrollRestoration';
import { GlobalSearchBar } from './GlobalSearchBar';
import { MiniAssistantPanel } from './MiniAssistantPanel';
import { SidebarNavIcon } from './SidebarNavIcons';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui';

type NavItem = { to: string; label: string; end?: boolean };

/** Groupement métier : plus lisible pour un utilisateur non technique. */
const navGroups: { title?: string; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Tableau de bord', end: true }] },
  {
    title: 'Exploitation',
    items: [
      { to: '/biens', label: 'Biens' },
      { to: '/locataires', label: 'Locataires' },
      { to: '/baux', label: 'Baux' },
      { to: '/locations', label: 'Locations' },
    ],
  },
  {
    title: 'Finances',
    items: [
      { to: '/paiements', label: 'Paiements' },
      { to: '/activite-loyers', label: 'Activité loyers' },
      { to: '/cautions', label: 'Cautions' },
      { to: '/charges', label: 'Charges' },
      { to: '/exports', label: 'Exports' },
    ],
  },
];

const flatNavItems = navGroups.flatMap((g) => g.items);

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg border-l-2 py-2.5 pl-2.5 pr-3 text-[13px] font-medium transition ${
    isActive
      ? 'border-sky-400 bg-white/[0.09] text-white shadow-sm shadow-black/10'
      : 'border-transparent text-slate-300 hover:border-slate-500 hover:bg-white/[0.06] hover:text-white'
  }`;

const navClassMobile = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition ${
    isActive ? 'bg-brand-600 text-white shadow-md shadow-brand-900/30' : 'bg-slate-800/90 text-slate-300'
  }`;

const MOBILE_NAV_KEY = 'immopilot-mobile-nav-open';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem(MOBILE_NAV_KEY) !== '0';
  });

  function setMobileNavOpenPersist(next: boolean) {
    setMobileNavOpen(next);
    try {
      sessionStorage.setItem(MOBILE_NAV_KEY, next ? '1' : '0');
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
        className={`border-b border-slate-800/80 bg-[#0c0f14] text-slate-100 print:hidden lg:flex lg:h-[100dvh] lg:max-h-[100dvh] lg:w-[15.5rem] lg:shrink-0 lg:flex-col lg:overflow-hidden lg:border-b-0 lg:border-r lg:border-slate-800/70 lg:sticky lg:top-0 lg:self-start ${!mobileNavOpen ? 'max-lg:hidden' : ''} ${
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
                  <p className="hidden text-[11px] font-medium text-slate-400 lg:mt-0.5 lg:block">Gestion locative</p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle className="shrink-0" />
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
          {navGroups.map((group, gi) => (
            <Fragment key={`nav-g-${gi}`}>
              {group.title ? (
                <p className="mb-1.5 mt-5 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 first:mt-0">
                  {group.title}
                </p>
              ) : null}
              <div className="flex flex-col gap-0.5">
                {group.items.map((l) => (
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
            </Fragment>
          ))}
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
        <nav
          className="flex touch-pan-x gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain border-t border-slate-800/80 bg-[#0a0c10] px-2 py-2.5 lg:hidden [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as CSSProperties}
          aria-label="Navigation rapide"
        >
          {flatNavItems.map((l) => (
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
        <div className="print:hidden">
          <MiniAssistantPanel />
        </div>
        <div className="sticky top-0 z-30 max-lg:static max-lg:z-auto border-b border-slate-300/80 bg-slate-100/90 px-3 pb-3 pt-3 shadow-[0_4px_24px_rgb(15_23_42/0.07)] backdrop-blur-md print:hidden dark:border-slate-700/80 dark:bg-slate-900/92 dark:shadow-[0_4px_24px_rgb(0_0_0/0.2)] sm:px-6 sm:pb-3.5 sm:pt-3.5 lg:px-6 xl:px-8">
          <div className="mx-auto w-full max-w-[min(100%,96rem)]">
            <GlobalSearchBar />
          </div>
        </div>
        <div className="flex-1 p-3 print:p-4 sm:p-6 lg:px-6 lg:pb-12 lg:pt-6 xl:px-8 xl:pt-8">
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
