import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { fcfa } from '@/lib/format';

export type CoveragePieSlice = { key: string; name: string; value: number; fill: string };

/** Anneau encaissé / reste isolé pour code-split de recharts. */
export function CoveragePieChart({ data }: { data: CoveragePieSlice[] }) {
  return (
    <PieChart width={200} height={200}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        innerRadius={62}
        outerRadius={88}
        paddingAngle={data.filter((d) => d.value > 0).length > 1 ? 2 : 0}
        stroke="none"
      >
        {data.map((slice) => (
          <Cell key={slice.key} fill={slice.fill} />
        ))}
      </Pie>
      <Tooltip formatter={(v) => [fcfa(Number(v)), 'Montant']} />
    </PieChart>
  );
}
