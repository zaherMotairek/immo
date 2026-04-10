import type { SVGAttributes } from 'react';

const stroke = { strokeWidth: 1.75 as const };

/** Icônes du menu latéral (traits, currentColor — même esprit que le reste du projet). */
export function SidebarNavIcon({ to, className = '' }: { to: string; className?: string }) {
  const c = `size-[1.125rem] shrink-0 ${className}`;

  const svg = (p: SVGAttributes<SVGSVGElement>) => (
    <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden {...stroke} {...p} />
  );

  switch (to) {
    case '/':
      return svg({
        children: (
          <>
            <rect x="3" y="3" width="7" height="9" rx="1.2" />
            <rect x="14" y="3" width="7" height="5" rx="1.2" />
            <rect x="14" y="12" width="7" height="9" rx="1.2" />
            <rect x="3" y="14" width="7" height="7" rx="1.2" />
          </>
        ),
      });
    case '/biens':
      return svg({
        children: (
          <>
            <path d="M3 21h18M6 21V10l6-4 6 4v11" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 21v-6h4v6" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ),
      });
    case '/locataires':
      return svg({
        children: (
          <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" strokeLinecap="round" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
          </>
        ),
      });
    case '/baux':
      return svg({
        children: (
          <>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 2v6h6M10 13h8M10 17h8M10 9h4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ),
      });
    case '/locations':
      return svg({
        children: (
          <>
            <path d="M12 22s8-5.33 8-12a8 8 0 1 0-16 0c0 6.67 8 12 8 12z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="3" />
          </>
        ),
      });
    case '/paiements':
      return svg({
        children: (
          <>
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
            <path d="M6 15h4" strokeLinecap="round" />
          </>
        ),
      });
    case '/cautions':
      return svg({
        children: (
          <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ),
      });
    case '/charges':
      return svg({
        children: (
          <>
            <path d="M4 7h16M4 12h10M4 17h14" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="18" cy="7" r="2" />
            <circle cx="15" cy="17" r="2" />
          </>
        ),
      });
    case '/exports':
      return svg({
        children: (
          <>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ),
      });
    default:
      return svg({ children: <circle cx="12" cy="12" r="9" /> });
  }
}
