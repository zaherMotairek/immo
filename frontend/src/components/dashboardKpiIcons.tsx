import type { SVGAttributes } from 'react';

type Props = SVGAttributes<SVGSVGElement>;

const common: Pick<Props, 'aria-hidden' | 'fill' | 'stroke' | 'strokeWidth' | 'strokeLinecap' | 'strokeLinejoin' | 'viewBox'> = {
  'aria-hidden': true,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
};

/** Parc : immeubles / sites */
export function KpiIconBuilding({ className, ...rest }: Props) {
  return (
    <svg {...common} className={className} {...rest}>
      <path d="M3 21h18" />
      <path d="M5 21V8l7-4 7 4v13" />
      <path d="M9 21v-5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5" />
      <path d="M9 10h.01M12 10h.01M15 10h.01" />
    </svg>
  );
}

/** Lots / unités louables */
export function KpiIconUnits({ className, ...rest }: Props) {
  return (
    <svg {...common} className={className} {...rest}>
      <rect x="3" y="3" width="7" height="7" rx="1.25" />
      <rect x="14" y="3" width="7" height="7" rx="1.25" />
      <rect x="3" y="14" width="7" height="7" rx="1.25" />
      <rect x="14" y="14" width="7" height="7" rx="1.25" />
    </svg>
  );
}

/** Locataires */
export function KpiIconTenant({ className, ...rest }: Props) {
  return (
    <svg {...common} className={className} {...rest}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

/** Baux / contrats */
export function KpiIconLease({ className, ...rest }: Props) {
  return (
    <svg {...common} className={className} {...rest}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h6" />
    </svg>
  );
}

/** Montants / loyers attendus */
export function KpiIconMoney({ className, ...rest }: Props) {
  return (
    <svg {...common} className={className} {...rest}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

/** Encaissements positifs */
export function KpiIconTrendUp({ className, ...rest }: Props) {
  return (
    <svg {...common} className={className} {...rest}>
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M17 7h4v4" />
    </svg>
  );
}

/** Retards / alertes */
export function KpiIconAlert({ className, ...rest }: Props) {
  return (
    <svg {...common} className={className} {...rest}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
