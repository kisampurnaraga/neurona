/**
 * Grafik durasi per adegan.
 *
 * Sengaja dipisah dari NeuronaDirectorCore dan dimuat secara lazy: `recharts`
 * beserta dependensinya (d3, immer) berukuran ~470 kB mentah / ~140 kB gzip —
 * hampir separuh payload awal aplikasi. Grafik ini hanya muncul setelah
 * storyboard punya adegan, jadi tidak ada alasan memuatnya di layar pertama.
 */

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface SceneDurationsChartProps {
  scenes: Array<{ duration?: number | string | null }>;
}

export default function SceneDurationsChart({ scenes }: SceneDurationsChartProps) {
  const data = scenes.map((s, i) => ({ name: `S${i + 1}`, duration: s.duration }));

  return (
    <div className="h-40 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={20} />
          <Tooltip
            cursor={{ fill: '#1e293b', opacity: 0.4 }}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px', color: '#f8fafc' }}
            itemStyle={{ color: '#818cf8' }}
            formatter={(val: number) => [`${val}s`, 'Durasi']}
          />
          <Bar dataKey="duration" radius={[4, 4, 0, 0]}>
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#a855f7'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
