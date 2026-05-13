'use client';

import Header from '@/components/Header';
import { useStore } from '@/lib/store';
import { useBrand } from '@/lib/brand-context';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function RoasChip({ roas }: { roas: number }) {
  if (roas === 0) return <span style={{ color: '#5E5E5E', fontSize: 12 }}>A preencher</span>;
  let bg = '#3F1010', color = '#F87171';
  if (roas >= 7) { bg = '#0F2E1A'; color = '#4ADE80'; }
  else if (roas >= 4) { bg = '#2D2208'; color = '#FCD34D'; }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: bg, color }}>{roas.toFixed(1)}x</span>;
}

function KpiCard({ label, value, sub, gold, roasColor, progress, centered }: {
  label: string; value: string; sub?: string; gold?: boolean;
  roasColor?: 'green' | 'yellow' | 'red' | 'muted'; progress?: number;
  centered?: boolean;
}) {
  const col = roasColor
    ? ({ green: '#4ADE80', yellow: '#FCD34D', red: '#F87171', muted: '#5E5E5E' } as Record<string, string>)[roasColor]
    : gold ? '#D4A843' : '#ECECEC';

  return (
    <div className={`kpi-card ${centered ? 'flex flex-col items-center justify-center text-center' : ''}`}
      style={centered ? { paddingTop: 18, paddingBottom: 18 } : undefined}>
      <p className={`flex items-center gap-2 mb-2 ${centered ? 'justify-center' : 'mb-3.5'}`} style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A8A8A',
      }}>
        <span style={{
          display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
          background: '#D4A843', boxShadow: '0 0 0 3px rgba(212,168,67,0.12)', flexShrink: 0,
        }} />
        {label}
      </p>
      <p className="truncate" style={{
        fontSize: 30, fontWeight: 600, lineHeight: 1.05,
        letterSpacing: '-0.02em', color: col,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</p>
      {sub && <p className="text-xs mt-1 truncate" style={{ color: '#5E5E5E' }}>{sub}</p>}
      {progress !== undefined && (
        <div className="mt-3 rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: '#2A2A2A' }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg,#D4A843,#F0C060)' }} />
        </div>
      )}
    </div>
  );
}

export default function CentralPage() {
  const { brand, month, year } = useBrand();
  const { getDisparos, getBases } = useStore();
  const disparos = getDisparos(month, year);

  const totalInvest = disparos.reduce((s, d) => s + d.investimentoBrl, 0);
  const totalFat = disparos.reduce((s, d) => s + d.faturamentoPago, 0);
  const totalPedidos = disparos.reduce((s, d) => s + d.pedidos, 0);
  const totalLeads = disparos.reduce((s, d) => s + d.tamanhoBase, 0);
  const roasGeral = totalInvest > 0 && totalFat > 0 ? totalFat / totalInvest : 0;
  const metaPct = (totalFat / brand.metaMensal) * 100;

  const melhor = disparos.filter((d) => d.roas > 0).sort((a, b) => b.roas - a.roas)[0] ?? null;
  const hasFinancialData = disparos.some((d) => d.faturamentoPago > 0 || d.investimentoBrl > 0);

  const chartData = disparos.map((d) => ({
    label: format(parseISO(d.data), 'dd/MM'),
    campanha: d.campanha,
    investimento: d.investimentoBrl > 0 ? Math.round(d.investimentoBrl) : 0,
    faturamento: d.faturamentoPago > 0 ? Math.round(d.faturamentoPago) : 0,
    roas: d.roas > 0 ? d.roas : null,
  }));

  // Top 3 bases by faturamento
  const allBases = getBases();
  const top3 = allBases.slice(0, 3).map((b) => {
    const investimento = b.roasMedio > 0 ? Math.round(b.faturamento / b.roasMedio) : 0;
    const shortName = b.nome.length > 14 ? b.nome.substring(0, 13) + '…' : b.nome;
    return {
      nome: shortName,
      faturamento: Math.round(b.faturamento),
      investimento,
      roas: b.roasMedio > 0 ? b.roasMedio : null,
    };
  });

  const MONO = { fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
      <Header title="Central" />
      <main className="p-4 md:p-8 flex flex-col gap-4 md:gap-6">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard label="Investimento" value={totalInvest > 0 ? fmt(totalInvest) : 'A preencher'} sub="BRL acumulado" />
          <KpiCard label="Faturamento" value={totalFat > 0 ? fmt(totalFat) : 'A preencher'} sub="Status Pago" gold />
          <KpiCard label="ROAS Geral" value={roasGeral > 0 ? `${roasGeral.toFixed(1)}x` : 'A preencher'} sub="Meta: 7x"
            roasColor={roasGeral >= 7 ? 'green' : roasGeral >= 4 ? 'yellow' : roasGeral > 0 ? 'red' : 'muted'} />
          <KpiCard label="Meta %" value={metaPct > 0 ? `${metaPct.toFixed(1)}%` : '0%'} sub={`de ${fmt(brand.metaMensal)}`} progress={metaPct} />
          <KpiCard label="Disparos" value={String(disparos.length)} sub="no mês" />
          <KpiCard label="Melhor Disparo" value={melhor ? `${melhor.roas.toFixed(1)}x` : 'A preencher'} sub={melhor ? melhor.campanha : 'Aguardando dados'} />
        </div>

        {/* Chart — full width */}
        <div className="rounded-2xl p-4 md:p-5 border" style={{ backgroundColor: '#1A1A1A', borderColor: '#262626' }}>
          <p style={{ ...MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5E5E5E', marginBottom: 16 }}>
            Investimento × Faturamento por Disparo
          </p>
          {hasFinancialData ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#5E5E5E' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#5E5E5E' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#D4A843' }} tickFormatter={(v) => `${v}x`} />
                <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #262626', borderRadius: 8, color: '#ECECEC' }}
                  formatter={(value, name) => {
                    if (name === 'roas') return value ? [`${Number(value).toFixed(1)}x`, 'ROAS'] : ['—', 'ROAS'];
                    return [fmt(Number(value)), name === 'investimento' ? 'Investimento' : 'Faturamento'];
                  }}
                  labelFormatter={(label, p) => `${label} — ${p?.[0]?.payload?.campanha ?? ''}`}
                />
                <Legend wrapperStyle={{ color: '#8A8A8A', fontSize: 11 }}
                  formatter={(v) => v === 'investimento' ? 'Investimento' : v === 'faturamento' ? 'Faturamento' : 'ROAS'} />
                <Bar yAxisId="left" dataKey="investimento" fill="#2A2A2A" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="faturamento" fill="#D4A843" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="roas" stroke="#ECECEC" strokeWidth={2} dot={{ r: 3, fill: '#ECECEC' }} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3" style={{ color: '#5E5E5E' }}>
              <p className="text-sm">Nenhum dado financeiro preenchido ainda.</p>
              <p className="text-xs" style={{ color: '#2A2A2A' }}>Vá em Disparos e clique em Preencher Resultado.</p>
            </div>
          )}
        </div>

        {/* Disparos do Mês + side cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Table — 2/3 */}
          <div className="lg:col-span-2 rounded-2xl border overflow-hidden" style={{ backgroundColor: '#1A1A1A', borderColor: '#262626' }}>
            <div className="px-5 pt-5 pb-3">
              <p style={{ ...MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5E5E5E' }}>
                Disparos do Mês
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="text-sm" style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 130 }} />
                  <col style={{ width: 210 }} />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 130 }} />
                  <col style={{ width: 100 }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid #262626' }}>
                    <th className="pb-3 pl-5 pr-3 text-left" style={{ ...MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 500 }}>Data</th>
                    <th className="pb-3 px-3 text-left" style={{ ...MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 500 }}>Campanha</th>
                    <th className="pb-3 px-3 text-right" style={{ ...MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 500 }}>Invest. R$</th>
                    <th className="pb-3 px-3 text-right" style={{ ...MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 500 }}>Fat. R$</th>
                    <th className="pb-3 pl-3 pr-5 text-right" style={{ ...MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 500 }}>ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {disparos.map((d) => (
                    <tr key={d.id} className="disparo-row" style={{ borderBottom: '1px solid #1c1c1c' }}>
                      <td className="py-2.5 pl-5 pr-3 font-medium whitespace-nowrap" style={{ color: '#D4A843' }}>
                        {format(parseISO(d.data), "dd 'de' MMM", { locale: ptBR })}
                      </td>
                      <td className="py-2.5 px-3 truncate" style={{ color: '#F2F2F2', fontWeight: 500 }}>{d.campanha}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap" style={{ color: d.investimentoBrl > 0 ? '#D8D8D8' : '#374151' }}>
                        {d.investimentoBrl > 0 ? fmt(d.investimentoBrl) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap" style={{ color: d.faturamentoPago > 0 ? '#D4A843' : '#374151' }}>
                        {d.faturamentoPago > 0 ? fmt(d.faturamentoPago) : '—'}
                      </td>
                      <td className="py-2.5 pl-3 pr-5 text-right"><RoasChip roas={d.roas} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side cards — 1/3 */}
          <div className="flex flex-col gap-4">
            <KpiCard
              label="Pedidos Gerados"
              value={totalPedidos > 0 ? totalPedidos.toLocaleString('pt-BR') : 'A preencher'}
              sub="pedidos via disparos no mês"
              centered
            />
            <KpiCard
              label="Leads Utilizados"
              value={totalLeads > 0 ? totalLeads.toLocaleString('pt-BR') : 'A preencher'}
              sub="contatos nas bases do mês"
              centered
            />

            {/* Top 3 Bases mini chart */}
            <div className="rounded-2xl border flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#1A1A1A', borderColor: '#262626' }}>
              <div className="px-4 pt-4 pb-2 shrink-0">
                <p style={{ ...MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5E5E5E' }}>
                  Top 3 Bases
                </p>
              </div>
              <div className="flex-1 min-h-0 pb-3 px-1">
                {top3.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={top3} margin={{ top: 8, right: 42, left: -4, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                      <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#8A8A8A', fontWeight: 500 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#5E5E5E' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#818CF8' }} tickFormatter={(v) => `${v}x`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #262626', borderRadius: 8, color: '#ECECEC', fontSize: 12 }}
                        formatter={(value, name) => {
                          if (name === 'roas') return value ? [`${Number(value).toFixed(1)}x`, 'ROAS'] : ['—', 'ROAS'];
                          return [fmt(Number(value)), name === 'investimento' ? 'Investimento' : 'Faturamento'];
                        }}
                      />
                      <Legend wrapperStyle={{ color: '#8A8A8A', fontSize: 11 }}
                        formatter={(v) => v === 'investimento' ? 'Invest.' : v === 'faturamento' ? 'Fat.' : 'ROAS'} />
                      <Bar yAxisId="left" dataKey="investimento" fill="#3A3A3A" radius={[4, 4, 0, 0]} barSize={40} />
                      <Bar yAxisId="left" dataKey="faturamento" fill="#D4A843" radius={[4, 4, 0, 0]} barSize={40} />
                      <Bar yAxisId="right" dataKey="roas" fill="#818CF8" radius={[4, 4, 0, 0]} barSize={40} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full" style={{ color: '#5E5E5E' }}>
                    <p className="text-xs text-center">Preencha resultados<br />nos disparos para ver as bases</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
