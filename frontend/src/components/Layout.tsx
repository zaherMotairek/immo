import { Fragment, useCallback } from 'react';
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

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  /** Avant de changer de page via le menu : mémorise le scroll pour le retour (historique ou re-clic). */
  const saveScrollBeforeMenuNav = useCallback(() => {
    saveScrollForPath(location.pathname + location.search);
  }, [location.pathname, location.search]);
  return (
    <div className="min-h-dvh flex flex-col md:flex-row print:min-h-0">
      <a
        href="#contenu-principal"
        className="sr-only rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:outline-none focus:ring-2 focus:ring-brand-300"
      >
        Aller au contenu principal
      </a>
      <aside
        className="border-b border-slate-800/80 bg-[#0c0f14] text-slate-100 print:hidden md:w-[15.5rem] md:shrink-0 md:border-b-0 md:border-r md:border-slate-800/70 md:min-h-dvh md:sticky md:top-0 md:self-start"
        aria-label="Navigation principale"
      >
        <div className="flex items-center justify-between gap-2 p-4 md:flex-col md:items-stretch md:px-3 md:pt-5">
          <div className="flex w-full items-start justify-between gap-2 md:mb-6 md:px-1">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="hidden h-8 w-1 shrink-0 rounded-full bg-gradient-to-b from-sky-400 to-brand-600 md:block" aria-hidden />
                <div>
                  <div className="text-[15px] font-semibold tracking-tight text-white">ImmoPilot</div>
                  <p className="hidden text-[11px] font-medium text-slate-400 md:mt-0.5 md:block">Gestion locative</p>
                </div>
              </div>
            </div>
            <ThemeToggle className="shrink-0" />
          </div>
          <nav className="hidden flex-1 flex-col md:flex md:overflow-y-auto md:pr-1 md:pb-2">
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
          <div className="hidden md:mt-auto md:block md:border-t md:border-slate-800/80 md:px-1 md:pt-4">
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
        </div>
        <nav
          className="flex gap-1.5 overflow-x-auto border-t border-slate-800/80 bg-[#0a0c10] px-2 py-2.5 md:hidden [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          {flatNavItems.map((l) => (
            <NavLink
              key={`${l.to}-${l.end ? '1' : '0'}`}
              to={l.to}
              end={l.end}
              className={`${navClassMobile} flex items-center gap-1.5`}
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
        <div className="print:hidden">
          <MiniAssistantPanel />
        </div>
        <div className="sticky top-0 z-30 border-b border-slate-300/80 bg-slate-100/90 px-4 pb-3.5 pt-3.5 shadow-[0_4px_24px_rgb(15_23_42/0.07)] backdrop-blur-md print:hidden dark:border-slate-700/80 dark:bg-slate-900/92 dark:shadow-[0_4px_24px_rgb(0_0_0/0.2)] sm:px-6 lg:px-6 xl:px-8">
          <div className="mx-auto w-full max-w-[min(100%,96rem)]">
            <GlobalSearchBar />
          </div>
        </div>
        <div className="flex-1 p-4 print:p-4 sm:p-6 lg:px-6 lg:pb-12 lg:pt-6 xl:px-8 xl:pt-8">
          <div className="mx-auto w-full max-w-[min(100%,96rem)]">
            <NavigationProvider>
              <ScrollRestoration />
              <Outlet />
            </NavigationProvider>
          </div>
        </div>
      </main>
      <div className="flex items-center justify-between border-t border-slate-800/80 bg-[#0c0f14] px-3 py-3 text-slate-200 print:hidden md:hidden">
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
