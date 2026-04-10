import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { GlobalSearchBar } from './GlobalSearchBar';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui';

const links = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/biens', label: 'Biens' },
  { to: '/locataires', label: 'Locataires' },
  { to: '/baux', label: 'Baux' },
  { to: '/locations', label: 'Locations' },
  { to: '/paiements', label: 'Paiements' },
  { to: '/cautions', label: 'Cautions' },
  { to: '/charges', label: 'Charges' },
  { to: '/exports', label: 'Exports' },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md border-l-2 py-2 pl-2.5 pr-3 text-sm font-medium transition ${
    isActive
      ? 'border-brand-400 bg-white/[0.08] text-white'
      : 'border-transparent text-slate-400 hover:border-slate-600 hover:bg-white/[0.04] hover:text-slate-100'
  }`;

const navClassMobile = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
    isActive ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-800/80 text-slate-400'
  }`;

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-dvh flex flex-col md:flex-row">
      <aside className="border-b border-slate-800/80 bg-[#0f1419] text-slate-100 md:w-56 md:shrink-0 md:border-b-0 md:border-r md:border-slate-800/80 md:min-h-dvh md:sticky md:top-0 md:self-start">
        <div className="flex items-center justify-between gap-2 p-4 md:flex-col md:items-stretch">
          <div className="flex w-full items-start justify-between gap-2 md:mb-5">
            <div>
              <div className="text-[15px] font-semibold tracking-tight text-white">ImmoPilot</div>
              <p className="hidden text-[11px] font-medium text-slate-500 md:mt-0.5 md:block">Gestion locative</p>
            </div>
            <ThemeToggle className="shrink-0" />
          </div>
          <nav className="hidden flex-1 flex-col gap-0.5 md:flex md:pr-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:block md:mt-auto md:border-t md:border-slate-800/80 md:pt-4">
            <p className="truncate text-[11px] text-slate-500" title={user?.email ?? undefined}>
              {user?.email}
            </p>
            <Button
              variant="ghost"
              className="mt-2 w-full justify-start rounded-lg border border-slate-700/90 px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white"
              onClick={logout}
            >
              Déconnexion
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-800/80 bg-[#0c1014] px-2 py-2 md:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navClassMobile}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex min-h-dvh min-w-0 flex-1 flex-col text-slate-800 dark:text-slate-200">
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 px-4 pb-3 pt-3 backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/90 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <GlobalSearchBar />
          </div>
        </div>
        <div className="flex-1 p-4 sm:p-6 lg:px-8 lg:pb-10 lg:pt-6">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </div>
      </main>
      <div className="flex items-center justify-between border-t border-slate-800/80 bg-[#0f1419] px-3 py-3 text-slate-200 md:hidden">
        <span className="truncate text-[11px] text-slate-500">{user?.email}</span>
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
