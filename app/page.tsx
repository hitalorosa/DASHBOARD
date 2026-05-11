'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import CampaignBadge from '@/components/CampaignBadge';
import { disparosMaio, META_MENSAL } from '@/lib/data';
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function RoasChip({ roas }: { roas: number }) {
  let bg = '#FEE2E2', color = '#B91C1C';
  if (roas >= 7) { bg = '#DCFCE7'; color = '#15803D'; }
  else if (roas >= 4) { bg = '#FEF9C3'; color = '#CA8A04'; }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: bg, color }}>
      {roas.toFixed(1)}x
    </span>
  );
}

function KpiCard({
  label, value, sub, accent, roasColor, progress,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  roasColor?: 'green' | 'yellow' | 'red' | 'gray';
  progress?: number;
}) {
  const valueColor = roasColor
    ? ({ green: '#15803D', yellow: '#CA8A04', red: '#DC2626', gray: '#9CA3AF' } as Record<string, string>)[roasColor]
    : accent
    ? '#D4A843'
    : '#111827';

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold truncate" style={{ color: valueColor }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
      {progress !== undefined && (
        <div className="mt-3 bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg,#D4A843,#F0C060)' }}
          />
        </div>
      )}
    </div>
  );
}

export default function CentralPage() {
  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2025);

  const disparos = useMemo(() => {
    return disparosMaio.filter((d) => {
      const date = parseISO(d.data);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }, [month, year]);

  const totalInvest = disparos.reduce((s, d) => s + d.investimentoBrl, 0);
  const totalFat = disparos.reduce((s, d) => s + d.faturamentoPago, 0);
  const roasGeral = totalInvest > 0 && totalFat > 0 ? totalFat / totalInvest : 0;
  const metaPct = (totalFat / META_MENSAL) * 100;

  const melhor = useMemo(() => {
    const com = disparos.filter((d) => d.roas > 0);
    if (!com.length) return null;
    return com.reduce((best, d) => (d.roas > best.roas ? d : best), com[0]);
  }, [disparos]);

  const chartData = disparos.map((d) => ({
    label: format(parseISO(d.data), 'dd/MM'),
    campanha: d.campanha,
    investimento: Math.round(d.investimentoBrl),
    faturamento: Math.round(d.faturamentoPago),
    roas: d.roas,
  }));

  return (
    <div className="flex flex-col flex-1">
      <Header title="Central" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />

      <main className="p-8 flex flex-col gap-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard label="Investimento Total" value={fmt(totalInvest)} sub="BRL acumulado" />
          <KpiCard label="Faturamento Total" value={fmt(totalFat)} sub="Apenas status Pago" accent />
          <KpiCard
            label="ROAS Geral"
            value={roasGeral > 0 ? `${roasGeral.toFixed(1)}x` : '—'}
            sub="Meta: 7x"
            roasColor={roasGeral >= 7 ? 'green' : roasGeral >= 4 ? 'yellow' : roasGeral > 0 ? 'red' : 'gray'}
          />
          <KpiCard label="Meta %" value={`${metaPct.toFixed(1)}%`} sub={`de ${fmt(META_MENSAL)}`} progress={metaPct} />
          <KpiCard label="Disparos" value={String(disparos.length)} sub="no mês" />
          <KpiCard
            label="Melhor Disparo"
            value={melhor ? `${melhor.roas.toFixed(1)}x` : '—'}
            sub={melhor ? melhor.campanha : 'Aguardando dados'}
          />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">
            Investimento × Faturamento por Disparo
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#D4A843' }} tickFormatter={(v) => `${v}x`} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'roas') return [`${Number(value).toFixed(1)}x`, 'ROAS'];
                    return [fmt(Number(value)), name === 'investimento' ? 'Investimento' : 'Faturamento'];
                  }}
                  labelFormatter={(label, payload) => {
                    const camp = payload?.[0]?.payload?.campanha;
                    return `${label}${camp ? ` — ${camp}` : ''}`;
                  }}
                />
                <Legend formatter={(v) => v === 'investimento' ? 'Investimento' : v === 'faturamento' ? 'Faturamento' : 'ROAS'} />
                <Bar yAxisId="left" dataKey="investimento" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="faturamento" fill="#D4A843" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="roas" stroke="#0D0D0D" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Nenhum disparo encontrado para este período.
            </div>
          )}
        </div>

        {/* Quick dispatch list */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Disparos do Mês
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Data', 'Campanha', 'Tipo', 'Base', 'Invest. R$', 'Fat. R$', 'ROAS'].map((h, i) => (
                    <th key={h} className={`pb-3 text-xs text-gray-400 font-medium ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disparos.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 text-gray-700 font-medium whitespace-nowrap">
                      {format(parseISO(d.data), "dd 'de' MMM", { locale: ptBR })}
                    </td>
                    <td className="py-3 text-gray-800 whitespace-nowrap">{d.campanha}</td>
                    <td className="py-3"><CampaignBadge type={d.tipo} /></td>
                    <td className="py-3 text-gray-500 text-xs max-w-[140px] truncate">{d.base}</td>
                    <td className="py-3 text-right text-gray-700 whitespace-nowrap">{fmt(d.investimentoBrl)}</td>
                    <td className="py-3 text-right text-gray-700 whitespace-nowrap">
                      {d.faturamentoPago > 0 ? fmt(d.faturamentoPago) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-3 text-right">
                      {d.roas > 0 ? <RoasChip roas={d.roas} /> : <span className="text-gray-300 text-xs">Aguardando</span>}
                    </td>
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
