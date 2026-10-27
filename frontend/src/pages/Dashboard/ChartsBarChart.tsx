import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { fcfa } from '@/lib/format';

export type DashboardBarPoint = {
  key: string;
  label: string;
  value: number;
  color: string;
};

/** Graphique à barres isolé pour code-split de recharts. */
export function ChartsBarChart({ width, data }: { width: number; data: DashboardBarPoint[] }) {
  return (
    <BarChart width={width} height={240} data={data} margin={{ top: 12, right: 8, left: 8, bottom: 4 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--odoo-border)" opacity={0.6} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-ink)', fontSize: 12, fontWeight: 600 }} />
      <YAxis
        tickLine={false}
        axisLine={false}
        tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
        tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
      />
      <Tooltip
        cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
        formatter={(v) => [fcfa(Number(v)), 'Montant']}
        labelStyle={{ fontWeight: 700 }}
      />
      <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={58}>
        {data.map((entry) => (
          <Cell key={entry.key} fill={entry.color} />
        ))}
      </Bar>
    </BarChart>
  );
}
