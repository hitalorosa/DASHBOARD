'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import CampaignBadge from '@/components/CampaignBadge';
import { useStore } from '@/lib/store';
import { META_MENSAL } from '@/lib/data';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function RoasChip({ roas }: { roas: number }) {
  if (roas === 0) return <span style={{ color: '#4B5563', fontSize: 12 }}>A preencher</span>;
  let bg = '#3F1010', color = '#F87171';
  if (roas >= 7) { bg = '#0F2E1A'; color = '#4ADE80'; }
  else if (roas >= 4) { bg = '#2D2208'; color = '#FCD34D'; }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: bg, color }}>{roas.toFixed(1)}x</span>;
}

function KpiCard({ label, value, sub, gold, roasColor, progress }: {
  label: string; value: string; sub?: string; gold?: boolean;
  roasColor?: 'green' | 'yellow' | 'red' | 'muted'; progress?: number;
}) {
  const col = roasColor ? ({ green: '#4ADE80', yellow: '#FCD34D', red: '#F87171', muted: '#4B5563' } as Record<string, string>)[roasColor]
    : gold ? '#D4A843' : '#F9FAFB';
  return (
    <div className="rounded-2xl p-5 border" style={{ backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }}>
      <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#4B5563' }}>{label}</p>
      <p className="text-2xl font-bold truncate" style={{ color: col }}>{value}</p>
      {sub && <p className="text-xs mt-1 truncate" style={{ color: '#374151' }}>{sub}</p>}
      {progress !== undefined && (
        <div className="mt-3 rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: '#2A2A2A' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg,#D4A843,#F0C060)' }} />
        </div>
      )}
    </div>
  );
}

export default function CentralPage() {
  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2025);
  const { getDisparos } = useStore();
  const disparos = getDisparos(month, year);

  const totalInvest = disparos.reduce((s, d) => s + d.investimentoBrl, 0);
  const totalFat = disparos.reduce((s, d) => s + d.faturamentoPago, 0);
  const roasGeral = totalInvest > 0 && totalFat > 0 ? totalFat / totalInvest : 0;
  const metaPct = (totalFat / META_MENSAL) * 100;

  const melhor = disparos.filter((d) => d.roas > 0).sort((a, b) => b.roas - a.roas)[0] ?? null;

  const hasFinancialData = disparos.some((d) => d.faturamentoPago > 0 || d.investimentoBrl > 0);

  const chartData = disparos.map((d) => ({
    label: format(parseISO(d.data), 'dd/MM'),
    campanha: d.campanha,
    investimento: d.investimentoBrl > 0 ? Math.round(d.investimentoBrl) : 0,
    faturamento: d.faturamentoPago > 0 ? Math.round(d.faturamentoPago) : 0,
    roas: d.roas > 0 ? d.roas : null,
  }));

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
      <Header title="Central" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
      <main className="p-8 flex flex-col gap-6">

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard label="Investimento Total" value={totalInvest > 0 ? fmt(totalInvest) : 'A preencher'} sub="BRL acumulado" />
          <KpiCard label="Faturamento Total" value={totalFat > 0 ? fmt(totalFat) : 'A preencher'} sub="Status Pago" gold />
          <KpiCard label="ROAS Geral" value={roasGeral > 0 ? `${roasGeral.toFixed(1)}x` : 'A preencher'} sub="Meta: 7x"
            roasColor={roasGeral >= 7 ? 'green' : roasGeral >= 4 ? 'yellow' : roasGeral > 0 ? 'red' : 'muted'} />
          <KpiCard label="Meta %" value={metaPct > 0 ? `${metaPct.toFixed(1)}%` : '0%'} sub={`de ${fmt(META_MENSAL)}`} progress={metaPct} />
          <KpiCard label="Disparos" value={String(disparos.length)} sub="no mes" />
          <KpiCard label="Melhor Disparo" value={melhor ? `${melhor.roas.toFixed(1)}x` : 'A preencher'} sub={melhor ? melhor.campanha : 'Aguardando dados'} />
        </div>

        <div className="rounded-2xl p-6 border" style={{ backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-6" style={{ color: '#4B5563' }}>
            Investimento x Faturamento por Disparo
          </p>
          {hasFinancialData ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#4B5563' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#4B5563' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#D4A843' }} tickFormatter={(v) => `${v}x`} />
                <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, color: '#F9FAFB' }}
                  formatter={(value, name) => {
                    if (name === 'roas') return value ? [`${Number(value).toFixed(1)}x`, 'ROAS'] : ['—', 'ROAS'];
                    return [fmt(Number(value)), name === 'investimento' ? 'Investimento' : 'Faturamento'];
                  }}
                  labelFormatter={(label, p) => `${label} — ${p?.[0]?.payload?.campanha ?? ''}`}
                />
                <Legend wrapperStyle={{ color: '#6B7280', fontSize: 12 }}
                  formatter={(v) => v === 'investimento' ? 'Investimento' : v === 'faturamento' ? 'Faturamento' : 'ROAS'} />
                <Bar yAxisId="left" dataKey="investimento" fill="#2A2A2A" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="faturamento" fill="#D4A843" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="roas" stroke="#F9FAFB" strokeWidth={2} dot={{ r: 3, fill: '#F9FAFB' }} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: '#374151' }}>
              <p className="text-sm">Nenhum dado financeiro preenchido ainda.</p>
              <p className="text-xs" style={{ color: '#2A2A2A' }}>Va em Disparos e clique em Preencher Resultado para adicionar os dados de cada disparo.</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-6 border" style={{ backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: '#4B5563' }}>Disparos do Mes</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: '#2A2A2A' }}>
                  {['Data','Campanha','Tipo','Base','Invest. R$','Fat. R$','ROAS'].map((h, i) => (
                    <th key={h} className={`pb-3 text-xs font-medium ${i >= 4 ? 'text-right' : 'text-left'}`} style={{ color: '#4B5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disparos.map((d) => (
                  <tr key={d.id} className="border-b" style={{ borderColor: '#1F1F1F' }}>
                    <td className="py-3 font-medium whitespace-nowrap" style={{ color: '#D4A843' }}>
                      {format(parseISO(d.data), "dd 'de' MMM", { locale: ptBR })}
                    </td>
                    <td className="py-3 whitespace-nowrap" style={{ color: '#E5E7EB' }}>{d.campanha}</td>
                    <td className="py-3"><CampaignBadge type={d.tipo} /></td>
                    <td className="py-3 text-xs max-w-[140px] truncate" style={{ color: '#6B7280' }}>{d.base}</td>
                    <td className="py-3 text-right" style={{ color: d.investimentoBrl > 0 ? '#9CA3AF' : '#374151' }}>
                      {d.investimentoBrl > 0 ? fmt(d.investimentoBrl) : '—'}
                    </td>
                    <td className="py-3 text-right" style={{ color: d.faturamentoPago > 0 ? '#D4A843' : '#374151' }}>
                      {d.faturamentoPago > 0 ? fmt(d.faturamentoPago) : '—'}
                    </td>
                    <td className="py-3 text-right"><RoasChip roas={d.roas} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
