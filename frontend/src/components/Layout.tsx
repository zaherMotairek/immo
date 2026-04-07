import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { GlobalSearchBar } from './GlobalSearchBar';
import { Button } from './ui';

const links = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/locations', label: 'Locations' },
  { to: '/biens', label: 'Biens' },
  { to: '/locataires', label: 'Locataires' },
  { to: '/baux', label: 'Baux' },
  { to: '/paiements', label: 'Paiements' },
  { to: '/charges', label: 'Charges' },
  { to: '/exports', label: 'Exports' },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-xl px-3 py-2 text-sm font-medium transition ${
    isActive
      ? 'bg-brand-500/20 text-white shadow-inner'
      : 'text-slate-300 hover:bg-slate-700/80 hover:text-white'
  }`;

const navClassMobile = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
    isActive ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'
  }`;

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-dvh flex flex-col md:flex-row">
      <aside className="border-b border-slate-700 bg-slate-900 text-slate-100 md:w-56 md:border-b-0 md:border-r md:border-slate-700 md:min-h-dvh md:sticky md:top-0 md:self-start md:shadow-xl">
        <div className="flex items-center justify-between gap-2 p-4 md:flex-col md:items-stretch">
          <div className="md:mb-6">
            <div className="text-lg font-bold tracking-tight text-white">ImmoPilot</div>
            <p className="hidden text-xs text-slate-400 md:block">Gestion locative · CI</p>
          </div>
          <nav className="hidden flex-1 flex-col gap-0.5 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={navClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:block md:mt-auto md:border-t md:border-slate-700 md:pt-4">
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
            <Button
              variant="ghost"
              className="mt-2 w-full justify-start border border-slate-600 px-3 text-slate-200 hover:bg-slate-800"
              onClick={logout}
            >
              Déconnexion
            </Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-800 bg-slate-950/50 px-2 py-2 md:hidden">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={navClassMobile}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="sticky top-0 z-30 -mx-4 mb-5 border-b border-slate-300/50 bg-slate-100/90 px-4 pb-3 pt-1 shadow-sm shadow-slate-900/5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <GlobalSearchBar />
          </div>
          <Outlet />
        </div>
      </main>
      <div className="flex items-center justify-between border-t border-slate-700 bg-slate-900 px-3 py-3 text-slate-200 md:hidden">
        <span className="truncate text-xs text-slate-400">{user?.email}</span>
        <Button
          variant="secondary"
          className="border-slate-600 bg-slate-800 py-1.5 text-xs text-white hover:bg-slate-700"
          onClick={logout}
        >
          Sortir
        </Button>
      </div>
    </div>
  );
}
