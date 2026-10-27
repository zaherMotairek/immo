export type ChargeRow = {
  id: string;
  category: string;
  label: string;
  amount: unknown;
  periodYear: number;
  periodMonth: number | null;
  paid: boolean;
  notes?: string | null;
  building: { id: string; name: string };
  unit: { id: string; label: string; kind?: string } | null;
};

export type ChargesSummaryData = {
  year: number;
  month?: number | null;
  scope?: 'year' | 'month';
  totalCharges: number;
  unpaidCharges: number;
  highlights: {
    impotsEtTaxes: number;
    chargesCoproEtHonoraires: number;
    securite: number;
    personnel: number;
  };
  byCategory: Record<string, number>;
};

export type BuildingOpt = {
  id: string;
  name: string;
  units: { id: string; label: string; kind: string }[];
};

export type ViewMonth = number | 'all';
