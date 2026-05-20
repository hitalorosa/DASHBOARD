'use client';

import { useState, useCallback, useEffect } from 'react';
import Header from '@/components/Header';
import { useBrand } from '@/lib/brand-context';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { RefreshCw, Crown, ShoppingBag, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { YampiOrder, YampiCart } from '@/lib/yampi';
import { aggregateOrders } from '@/lib/yampi';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
function fmtSmall(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const GOLD = '#D4A843';

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color = '#ECECEC' }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color?: string;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between mb-3">
        <p style={{ ...MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A8A8A' }}>
          {label}
        </p>
        <Icon size={15} style={{ color: GOLD, opacity: 0.7 }} />
      </div>
      <p style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.02em', color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: '#5E5E5E' }}>{sub}</p>}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4 md:p-5" style={{ backgroundColor: '#1A1A1A', borderColor: '#262626' }}>
      <p style={{ ...MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5E5E5E', marginBottom: 16 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VipPage() {
  const { month, year } = useBrand();

  const [loading, setLoading]       = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Sincronizando…');
  const [error, setError]           = useState<string | null>(null);
  const [fetchedAt, setFetchedAt]   = useState<string | null>(null);

  const [orders, setOrders] = useState<YampiOrder[]>([]);
  const [carts, setCarts]   = useState<YampiCart[]>([]);
  const [agg, setAgg]       = useState<ReturnType<typeof aggregateOrders> | null>(null);

  const m = month + 1; // useBrand é 0-indexed

  // Carrega dados em cache ao montar / trocar mês-ano
  const loadCache = useCallback(async () => {
    try {
      const res  = await fetch(`/api/yampi?month=${m}&year=${year}`);
      const json = await res.json();
      if (json.ok && json.fetchedAt) {
        setOrders(json.orders ?? []);
        setCarts(json.carts  ?? []);
        setAgg(aggregateOrders(json.orders ?? []));
        setFetchedAt(json.fetchedAt);
      }
    } catch { /* silencioso */ }
  }, [m, year]);

  useEffect(() => { loadCache(); }, [loadCache]);

  const sync = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadingMsg('Disparando sincronização…');

    try {
      // 1. Aciona o GitHub Action
      const trigRes  = await fetch('/api/yampi-trigger', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ month: m, year }),
      });
      const trigJson = await trigRes.json();
      if (!trigJson.ok) throw new Error(trigJson.error ?? 'Erro ao acionar GitHub Action');

      setLoadingMsg('Buscando dados na Yampi… (~20s)');

      // 2. Poll a cada 5s por até 2 min aguardando dado novo
      const syncStart = Date.now();
      while (Date.now() - syncStart < 120_000) {
        await new Promise(r => setTimeout(r, 5_000));

        const dataRes  = await fetch(`/api/yampi?month=${m}&year=${year}`);
        const dataJson = await dataRes.json();

        if (dataJson.ok && dataJson.fetchedAt) {
          const dataTime = new Date(dataJson.fetchedAt).getTime();
          if (dataTime >= syncStart - 10_000) {          // dado é desta sincronização
            setOrders(dataJson.orders ?? []);
            setCarts(dataJson.carts   ?? []);
            setAgg(aggregateOrders(dataJson.orders ?? []));
            setFetchedAt(dataJson.fetchedAt);
            return;
          }
        }
        setLoadingMsg(`Aguardando… (${Math.round((Date.now() - syncStart) / 1000)}s)`);
      }

      throw new Error('Timeout: sincronização demorou mais de 2 minutos.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [m, year]);

  const hasData = orders.length > 0;
  const monthLabel = format(new Date(year, month), 'MMMM yyyy', { locale: ptBR });

  // Hourly chart data
  const hourlyData = (agg?.byHour ?? Array(24).fill(0)).map((count, h) => ({
    hora: `${String(h).padStart(2, '0')}h`,
    pedidos: count,
  }));
  const peakHour = agg ? agg.byHour.indexOf(Math.max(...agg.byHour)) : -1;

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
      <Header title="Grupo VIP" />
      <main className="p-4 md:p-8 flex flex-col gap-4 md:gap-6">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.25)' }}>
              <Crown size={13} style={{ color: GOLD }} />
              <span style={{ ...MONO, fontSize: 10, color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Grupo VIP · {monthLabel}
              </span>
            </div>
            {fetchedAt && (
              <span style={{ fontSize: 11, color: '#5E5E5E' }}>
                Sincronizado às {format(parseISO(fetchedAt), 'HH:mm', { locale: ptBR })}
              </span>
            )}
          </div>
          <button
            onClick={sync}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              backgroundColor: loading ? '#1A1A1A' : GOLD,
              color: loading ? '#5E5E5E' : '#0D0D0D',
              border: loading ? '1px solid #2A2A2A' : 'none',
              cursor: loading ? 'wait' : 'pointer',
            }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? loadingMsg : 'Sincronizar VIP'}
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <AlertTriangle size={16} style={{ color: '#F87171', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F87171' }}>Erro ao sincronizar</p>
              <p className="text-xs mt-1" style={{ color: '#8A8A8A' }}>{error}</p>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!hasData && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4" style={{ color: '#5E5E5E' }}>
            <Crown size={40} style={{ color: '#2A2A2A' }} />
            <p className="text-sm">Clique em <strong style={{ color: GOLD }}>Sincronizar VIP</strong> para carregar os dados do mês</p>
          </div>
        )}

        {hasData && agg && (<>

          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="Faturamento VIP"
              value={fmt(agg.totalFat)}
              sub="status pago via UTM VIP"
              icon={TrendingUp}
              color={GOLD}
            />
            <KpiCard
              label="Pedidos"
              value={agg.totalPed.toLocaleString('pt-BR')}
              sub={`média ${fmtSmall(agg.ticket)} / pedido`}
              icon={ShoppingBag}
            />
            <KpiCard
              label="Ticket Médio"
              value={fmtSmall(agg.ticket)}
              sub="faturamento ÷ pedidos"
              icon={TrendingUp}
            />
            <KpiCard
              label="Carrinhos Abnd."
              value={carts.length.toLocaleString('pt-BR')}
              sub="UTM grupo_vip capturados"
              icon={Users}
              color={carts.length > 0 ? '#F87171' : '#5E5E5E'}
            />
          </div>

          {/* ── Hourly chart ── */}
          <Section title={`Pedidos por Horário${peakHour >= 0 ? ` · Pico às ${String(peakHour).padStart(2, '0')}h` : ''}`}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" />
                <XAxis dataKey="hora" tick={{ fontSize: 9, fill: '#5E5E5E' }} interval={1} />
                <YAxis tick={{ fontSize: 9, fill: '#5E5E5E' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #262626', borderRadius: 8, color: '#ECECEC', fontSize: 11 }}
                  formatter={(v) => [`${v} pedido${Number(v) !== 1 ? 's' : ''}`, 'Pedidos']}
                />
                <Bar dataKey="pedidos" radius={[3, 3, 0, 0]}>
                  {hourlyData.map((_, i) => (
                    <Cell key={i} fill={i === peakHour ? GOLD : '#2A2A2A'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Section>

          {/* ── States + Products ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* States */}
            <Section title="Faturamento por Estado">
              {agg.byState.slice(0, 8).map((s, i) => {
                const pct = agg.totalFat > 0 ? (s.faturamento / agg.totalFat) * 100 : 0;
                return (
                  <div key={s.state} className="flex items-center gap-3 mb-2.5">
                    <span style={{ ...MONO, fontSize: 10, color: '#5E5E5E', width: 28 }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-semibold text-sm" style={{ color: '#F2F2F2', width: 32 }}>{s.state}</span>
                    <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: '#2A2A2A' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: i === 0 ? GOLD : '#3A3A3A' }} />
                    </div>
                    <span style={{ ...MONO, fontSize: 11, color: GOLD, minWidth: 72, textAlign: 'right' }}>
                      {fmt(s.faturamento)}
                    </span>
                    <span style={{ fontSize: 10, color: '#5E5E5E', minWidth: 32, textAlign: 'right' }}>
                      {s.pedidos}p
                    </span>
                  </div>
                );
              })}
            </Section>

            {/* Products */}
            <Section title="Produtos Mais Vendidos">
              {agg.byProduct.slice(0, 8).map((p, i) => {
                const pct = agg.byProduct[0]?.faturamento > 0
                  ? (p.faturamento / agg.byProduct[0].faturamento) * 100 : 0;
                return (
                  <div key={p.name} className="mb-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs truncate" style={{ color: '#D8D8D8', maxWidth: '70%' }}>
                        <span style={{ ...MONO, fontSize: 10, color: '#5E5E5E', marginRight: 6 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {p.name}
                      </span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span style={{ fontSize: 10, color: '#5E5E5E' }}>{p.quantidade}un</span>
                        <span style={{ ...MONO, fontSize: 11, color: GOLD }}>{fmt(p.faturamento)}</span>
                      </div>
                    </div>
                    <div className="rounded-full h-1 overflow-hidden" style={{ backgroundColor: '#2A2A2A' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: i === 0 ? GOLD : '#3A3A3A' }} />
                    </div>
                  </div>
                );
              })}
            </Section>
          </div>

          {/* ── Orders table ── */}
          <Section title={`Todos os Pedidos VIP · ${orders.length} pedidos`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: 80 }} />
                  <col style={{ width: 80 }} />
                  <col style={{ width: 180 }} />
                  <col style={{ width: 40 }} />
                  <col />
                  <col style={{ width: 110 }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: '1px solid #262626' }}>
                    {['Horário', 'Pedido', 'Cliente', 'UF', 'Produto(s)', 'Total'].map((h, i) => (
                      <th key={h} className={`pb-3 ${i >= 5 ? 'text-right' : 'text-left'}`}
                        style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 500 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...orders]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((o) => {
                      const dt = new Date(o.created_at);
                      const prodNames = (o.items ?? [])
                        .map((it) => it.sku?.title ?? it.name ?? '').join(', ');
                      const state = o.customer?.addresses?.[0]?.state ?? '—';
                      return (
                        <tr key={o.id} className="disparo-row" style={{ borderBottom: '1px solid #1c1c1c' }}>
                          <td className="py-2.5 pr-2 whitespace-nowrap" style={{ color: '#D4A843' }}>
                            {format(dt, 'dd/MM HH:mm')}
                          </td>
                          <td className="py-2.5 pr-2" style={{ color: '#8A8A8A' }}>
                            #{o.number}
                          </td>
                          <td className="py-2.5 pr-2 truncate" style={{ color: '#F2F2F2' }}>
                            {o.customer?.name ?? '—'}
                          </td>
                          <td className="py-2.5 pr-2" style={{ color: '#9CA3AF', fontWeight: 600 }}>
                            {state}
                          </td>
                          <td className="py-2.5 pr-2 truncate" style={{ color: '#8A8A8A', fontSize: 12 }}>
                            {prodNames || '—'}
                          </td>
                          <td className="py-2.5 text-right font-semibold" style={{ color: GOLD }}>
                            {fmt(parseFloat(o.total || '0'))}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── Abandoned carts ── */}
          {carts.length > 0 && (
            <Section title={`Carrinhos Abandonados VIP · ${carts.length}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #262626' }}>
                      {['Data', 'Produto(s)', 'Valor'].map((h, i) => (
                        <th key={h} className={`pb-3 ${i === 2 ? 'text-right' : 'text-left'}`}
                          style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 500 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {carts.map((c) => (
                      <tr key={c.id} className="disparo-row" style={{ borderBottom: '1px solid #1c1c1c' }}>
                        <td className="py-2.5 pr-4 whitespace-nowrap" style={{ color: '#F87171' }}>
                          {format(new Date(c.created_at), 'dd/MM HH:mm')}
                        </td>
                        <td className="py-2.5 pr-4 truncate" style={{ color: '#8A8A8A', fontSize: 12 }}>
                          {(c.items ?? []).map((it) => it.name).join(', ') || '—'}
                        </td>
                        <td className="py-2.5 text-right font-semibold" style={{ color: '#F87171' }}>
                          {fmt(parseFloat(c.total || '0'))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

        </>)}
      </main>
    </div>
  );
}
