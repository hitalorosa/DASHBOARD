'use client';

import { useState, useCallback, useEffect } from 'react';
import Header from '@/components/Header';
import { useBrand } from '@/lib/brand-context';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { RefreshCw, Crown, ShoppingBag, TrendingUp, Users, AlertTriangle, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { YampiOrder, YampiCart } from '@/lib/yampi';
import { aggregateOrders, cartValue, orderValue, toIso, unwrapArray } from '@/lib/yampi';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1)   return 'agora';
  if (mins < 60)  return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `há ${days}d`;
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  paid:                { label: 'Pago',             bg: '#0F2E1A', color: '#4ADE80' },
  payment_approved:    { label: 'Pagto. aprovado',  bg: '#0F2E1A', color: '#4ADE80' },
  approved:            { label: 'Aprovado',          bg: '#0F2E1A', color: '#4ADE80' },
  handling_products:   { label: 'Em produção',       bg: '#1C1A09', color: '#FCD34D' },
  in_separation:       { label: 'Em separação',      bg: '#1C1A09', color: '#FCD34D' },
  invoiced:            { label: 'Faturado',          bg: '#1C1A09', color: '#FCD34D' },
  ready_for_shipping:  { label: 'Pronto p/ envio',   bg: '#0D1A2E', color: '#60A5FA' },
  on_carriage:         { label: 'Saiu p/ entrega',   bg: '#0D1A2E', color: '#60A5FA' },
  shipped:             { label: 'Enviado',            bg: '#0D1A2E', color: '#60A5FA' },
  delivered:           { label: 'Entregue',          bg: '#0A2020', color: '#34D399' },
  cancelled:           { label: 'Cancelado',         bg: '#2E0F0F', color: '#F87171' },
};

// ── Ícones de forma de pagamento ─────────────────────────────────────────────

function PaymentIcon({ method, brand }: { method?: string; brand?: string }) {
  const b = (brand ?? '').toLowerCase().replace(/[^a-z]/g, '');
  const m = (method ?? '').toLowerCase();

  const isMaster = b.includes('master');
  const isVisa   = b.includes('visa');
  const isElo    = b === 'elo';
  const isAmex   = b.includes('amex') || b.includes('american');
  const isHiper  = b.includes('hiper');
  const isPix    = m === 'pix' || b === 'pix';
  const isBoleto = m === 'boleto' || b === 'boleto';

  if (isMaster) return (
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
      <rect x="0.5" y="0.5" width="31" height="21" rx="3.5" fill="#1A1A1A" stroke="#2A2A2A"/>
      <circle cx="13" cy="11" r="5.5" fill="#EB001B"/>
      <circle cx="19" cy="11" r="5.5" fill="#F79E1B"/>
      <path d="M16 6.8a5.5 5.5 0 0 1 0 8.4A5.5 5.5 0 0 1 16 6.8z" fill="#FF5F00"/>
    </svg>
  );

  if (isVisa) return (
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
      <rect x="0.5" y="0.5" width="31" height="21" rx="3.5" fill="#1A1A1A" stroke="#2A2A2A"/>
      <text x="16" y="15" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="9" fill="#1A6BB5" letterSpacing="0.5">VISA</text>
    </svg>
  );

  if (isElo) return (
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
      <rect x="0.5" y="0.5" width="31" height="21" rx="3.5" fill="#1A1A1A" stroke="#2A2A2A"/>
      <text x="16" y="15" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="800" fontSize="9" fill="#FFD700">ELO</text>
    </svg>
  );

  if (isAmex) return (
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
      <rect x="0.5" y="0.5" width="31" height="21" rx="3.5" fill="#016FD0" stroke="#2A2A2A"/>
      <text x="16" y="15" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="7.5" fill="#FFFFFF" letterSpacing="0.3">AMEX</text>
    </svg>
  );

  if (isHiper) return (
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
      <rect x="0.5" y="0.5" width="31" height="21" rx="3.5" fill="#1A1A1A" stroke="#2A2A2A"/>
      <text x="16" y="15" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="700" fontSize="6.5" fill="#CC1720">HIPERCARD</text>
    </svg>
  );

  if (isPix) return (
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
      <rect x="0.5" y="0.5" width="31" height="21" rx="3.5" fill="#1A1A1A" stroke="#2A2A2A"/>
      <path d="M16 5.5 l3.5 3.5 -3.5 3.5 -3.5-3.5Z M16 9.5 l3.5 3.5 -3.5 3.5 -3.5-3.5Z" fill="#32BCAD" opacity="0.9"/>
      <path d="M12.5 9 l3.5 3.5 -3.5 3.5Z M19.5 9 l-3.5 3.5 3.5 3.5Z" fill="#32BCAD" opacity="0.5"/>
    </svg>
  );

  if (isBoleto) return (
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
      <rect x="0.5" y="0.5" width="31" height="21" rx="3.5" fill="#1A1A1A" stroke="#2A2A2A"/>
      {[6,8,10,12,14,16,18,20,22,24,26].map((x, i) => (
        <rect key={i} x={x} y="6" width={i % 3 === 0 ? 1.5 : 1} height="10" fill="#9CA3AF" opacity="0.8"/>
      ))}
    </svg>
  );

  // Genérico / crédito sem bandeira identificada
  return (
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
      <rect x="0.5" y="0.5" width="31" height="21" rx="3.5" fill="#1A1A1A" stroke="#2A2A2A"/>
      <rect x="4" y="7" width="24" height="3" rx="1" fill="#2A2A2A"/>
      <rect x="4" y="13" width="8" height="2" rx="0.5" fill="#2A2A2A"/>
      <rect x="14" y="13" width="6" height="2" rx="0.5" fill="#2A2A2A"/>
    </svg>
  );
}

function StatusBadge({ alias }: { alias?: string }) {
  if (!alias) return null;
  const cfg = STATUS_CFG[alias] ?? { label: alias, bg: '#1A1A1A', color: '#9CA3AF' };
  return (
    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.color, letterSpacing: '0.01em' }}>
      {cfg.label}
    </span>
  );
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

// ── Skeleton loader ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="kpi-card">
            <div className="h-3 rounded mb-4" style={{ backgroundColor: '#2A2A2A', width: '60%' }} />
            <div className="h-8 rounded" style={{ backgroundColor: '#2A2A2A', width: '80%' }} />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border p-5 h-48" style={{ backgroundColor: '#1A1A1A', borderColor: '#262626' }}>
        <div className="h-3 rounded mb-4" style={{ backgroundColor: '#2A2A2A', width: '30%' }} />
        <div className="h-32 rounded" style={{ backgroundColor: '#1F1F1F' }} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-2xl border p-5 h-48" style={{ backgroundColor: '#1A1A1A', borderColor: '#262626' }}>
            <div className="h-3 rounded mb-4" style={{ backgroundColor: '#2A2A2A', width: '40%' }} />
            {[...Array(4)].map((_, j) => (
              <div key={j} className="h-4 rounded mb-3" style={{ backgroundColor: '#2A2A2A', width: `${70 - j * 10}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VipPage() {
  const { brand, month, year } = useBrand();

  // ── Guard: apenas Nouê tem integração VIP ────────────────────────────────────
  if (brand.id !== 'noue') {
    return (
      <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
        <Header title="Grupo VIP" />
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="flex flex-col items-center gap-4 text-center" style={{ maxWidth: 400 }}>
            <div className="flex items-center justify-center w-16 h-16 rounded-full"
              style={{ backgroundColor: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.18)' }}>
              <Crown size={28} style={{ color: GOLD, opacity: 0.6 }} />
            </div>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#ECECEC', letterSpacing: '-0.01em' }}>
              Em breve
            </p>
            <p style={{ fontSize: 13, color: '#5E5E5E', lineHeight: 1.6 }}>
              A integração do Grupo VIP com a <strong style={{ color: '#8A8A8A' }}>{brand.name}</strong> ainda não foi configurada.
              <br />Em breve você poderá acompanhar os dados aqui.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 'idle' = ainda não carregou, 'loading' = carregando, 'done' = tem dados, 'error' = falhou
  const [status, setStatus]     = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [syncing, setSyncing]   = useState(false); // atualização manual pelo botão
  const [error, setError]       = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const [orders, setOrders] = useState<YampiOrder[]>([]);
  const [carts, setCarts]   = useState<YampiCart[]>([]);
  const [agg, setAgg]       = useState<ReturnType<typeof aggregateOrders> | null>(null);

  // ── Paginação da tabela de pedidos ───────────────────────────────────────────
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage]         = useState(1);
  const [showSizeMenu, setShowSizeMenu] = useState(false);

  const m = month + 1; // useBrand é 0-indexed

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (force = false) => {
    const url = `/api/yampi?month=${m}&year=${year}${force ? '&force=1' : ''}`;

    // Timeout de 30s — evita loading infinito se a API travar
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    let res: Response;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (e: unknown) {
      clearTimeout(timer);
      const msg = e instanceof Error && e.name === 'AbortError'
        ? 'Timeout — a API demorou mais de 30s para responder.'
        : (e instanceof Error ? e.message : String(e));
      throw new Error(msg);
    }
    clearTimeout(timer);

    let json: Record<string, unknown>;
    try {
      json = await res.json();
    } catch {
      throw new Error(`Resposta inválida do servidor (HTTP ${res.status})`);
    }

    if (!json.ok) {
      throw new Error((json.error as string) ?? `HTTP ${res.status}`);
    }

    setOrders((json.orders as YampiOrder[])   ?? []);
    setCarts((json.carts   as YampiCart[])    ?? []);
    setAgg(aggregateOrders((json.orders as YampiOrder[]) ?? []));
    setPage(1); // reset paginação a cada nova sincronização
    setFetchedAt(json.fetchedAt as string);
    setError(null);
  }, [m, year]);

  // ── Carga inicial ────────────────────────────────────────────────────────────

  useEffect(() => {
    setStatus('loading');
    setError(null);
    fetchData()
      .then(() => setStatus('done'))
      .catch(e => {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      });
  }, [fetchData]);


  // ── Sincronização manual ──────────────────────────────────────────────────

  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      await fetchData(true); // force=1 ignora cache servidor
      setStatus('done');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
    } finally {
      setSyncing(false);
    }
  }, [fetchData]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const hasData    = orders.length > 0;
  const monthLabel = format(new Date(year, month), 'MMMM yyyy', { locale: ptBR });

  const hourlyData = (agg?.byHour ?? Array(24).fill(0)).map((count, h) => ({
    hora: `${String(h).padStart(2, '0')}h`,
    pedidos: count,
  }));
  const peakHour = agg ? agg.byHour.indexOf(Math.max(...agg.byHour)) : -1;

  // ── Render ────────────────────────────────────────────────────────────────

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
            {fetchedAt && !syncing && (
              <span style={{ fontSize: 11, color: '#5E5E5E' }}>
                Atualizado às {format(parseISO(fetchedAt), 'HH:mm', { locale: ptBR })}
              </span>
            )}
            {(status === 'loading' || syncing) && (
              <span style={{ fontSize: 11, color: '#5E5E5E' }}>
                {syncing ? 'Atualizando…' : 'Carregando…'}
              </span>
            )}
          </div>
          <button
            onClick={sync}
            disabled={syncing || status === 'loading'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              backgroundColor: (syncing || status === 'loading') ? '#1A1A1A' : GOLD,
              color:           (syncing || status === 'loading') ? '#5E5E5E' : '#0D0D0D',
              border:          (syncing || status === 'loading') ? '1px solid #2A2A2A' : 'none',
              cursor:          (syncing || status === 'loading') ? 'wait' : 'pointer',
            }}>
            <RefreshCw size={14} className={(syncing || status === 'loading') ? 'animate-spin' : ''} />
            {syncing ? 'Atualizando…' : 'Sincronizar VIP'}
          </button>
        </div>

        {/* ── Erro ── */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <AlertTriangle size={16} style={{ color: '#F87171', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#F87171' }}>Erro ao carregar dados</p>
              <p className="text-xs mt-1" style={{ color: '#8A8A8A' }}>{error}</p>
            </div>
          </div>
        )}

        {/* ── Skeleton (carga inicial) ── */}
        {status === 'loading' && <Skeleton />}

        {/* ── Sem dados após carregar ── */}
        {status !== 'loading' && !hasData && !error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4" style={{ color: '#5E5E5E' }}>
            <Crown size={40} style={{ color: '#2A2A2A' }} />
            <p className="text-sm">Nenhum pedido VIP encontrado em {monthLabel}</p>
            <p className="text-xs" style={{ color: '#3A3A3A' }}>utm_source=grupo_vip &amp; utm_campaign=whatsapp</p>
          </div>
        )}

        {/* ── Dados ── */}
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
          {(() => {
            const sorted     = [...orders].sort((a, b) => new Date(toIso(b.created_at)).getTime() - new Date(toIso(a.created_at)).getTime());
            const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
            const safePage   = Math.min(page, totalPages);
            const slice      = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

            // Gera array de botões de página com ellipsis
            function pageButtons(total: number, current: number): (number | '...')[] {
              if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
              const pages: (number | '...')[] = [1];
              if (current > 3) pages.push('...');
              for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
              if (current < total - 2) pages.push('...');
              pages.push(total);
              return pages;
            }

            // 7 colunas: Ícone pagto | Nº | Cliente(max 320px) | spacer(1fr) | Data | Total | Status
            const COLS = '44px 88px minmax(180px,320px) 1fr 175px 125px 200px';

            return (
              <Section title={`Todos os Pedidos VIP · ${orders.length} pedidos`}>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 720 }}>

                    {/* Header — 7 células */}
                    <div className="grid pb-3 mb-1 border-b items-center"
                      style={{ borderColor: '#262626', gridTemplateColumns: COLS }}>
                      <span /> {/* ícone — sem label */}
                      <p style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E' }}>Nº</p>
                      <p style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E' }}>Cliente</p>
                      <span /> {/* spacer */}
                      <p style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E' }}>Data</p>
                      <p style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E' }}>Total</p>
                      <p style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E' }}>Status</p>
                    </div>

                    {/* Rows */}
                    <div className="flex flex-col">
                      {slice.map((o) => {
                        const dt          = new Date(toIso(o.created_at));
                        const addrArr     = unwrapArray<{ uf?: string; state?: string }>(o.address);
                        const uf          = addrArr[0]?.uf ?? addrArr[0]?.state ?? '';
                        const statusAlias = (o.status as { data?: { alias?: string } } | undefined)?.data?.alias;
                        const utmSrc      = (o as unknown as Record<string, unknown>).utm_source as string | undefined;
                        const utmCamp     = (o as unknown as Record<string, unknown>).utm_campaign as string | undefined;
                        const utmTag      = utmSrc ? `${utmSrc}${utmCamp ? ' / ' + utmCamp : ''}` : null;
                        const txn      = o.transactions?.data?.[0];
                        const pay      = txn?.payment?.data;
                        const payBrand = pay?.alias;
                        const payMethod =
                          pay?.is_pix     ? 'pix'
                          : pay?.is_billet  ? 'boleto'
                          : pay?.is_credit_card ? 'credit_card'
                          : undefined;

                        return (
                          <div key={o.id}
                            className="grid items-center py-3 border-b"
                            style={{ gridTemplateColumns: COLS, borderColor: '#1C1C1C', transition: 'background-color .12s' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#161616')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>

                            {/* Ícone de pagamento */}
                            <div className="flex items-center">
                              <PaymentIcon method={payMethod} brand={payBrand} />
                            </div>

                            {/* Nº */}
                            <span style={{ ...MONO, fontSize: 12, color: '#8A8A8A', fontWeight: 600 }}>#{o.number}</span>

                            {/* Cliente + UF + tag UTM */}
                            <div className="flex flex-col gap-1 min-w-0 pr-4">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold truncate" style={{ fontSize: 13, color: '#F2F2F2' }}>
                                  {o.customer?.data?.name ?? '—'}
                                </span>
                                {uf && <span className="shrink-0 text-xs font-bold" style={{ color: '#5E5E5E' }}>{uf}</span>}
                              </div>
                              {utmTag && (
                                <span className="inline-flex self-start px-2 py-0.5 rounded"
                                  style={{ backgroundColor: '#1A1A1A', color: '#6B7280', border: '1px solid #242424', fontFamily: 'monospace', fontSize: 10, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {utmTag}
                                </span>
                              )}
                            </div>

                            {/* spacer vazio — absorve espaço extra */}
                            <span />

                            {/* Data + tempo atrás */}
                            <div className="flex flex-col gap-0.5">
                              <span style={{ fontSize: 12, color: '#D0D0D0' }}>{format(dt, 'dd/MM/yyyy HH:mm')}</span>
                              <span style={{ fontSize: 11, color: '#5E5E5E' }}>{timeAgo(dt)}</span>
                            </div>

                            {/* Total + tag -- */}
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold" style={{ fontSize: 13, color: GOLD }}>{fmtSmall(orderValue(o))}</span>
                              <span className="inline-flex self-start px-2 py-0.5 rounded text-xs"
                                style={{ backgroundColor: '#1A1A1A', color: '#5E5E5E', border: '1px solid #242424' }}>--</span>
                            </div>

                            {/* Status */}
                            <StatusBadge alias={statusAlias} />
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </div>

                {/* ── Rodapé de paginação ── */}
                <div className="flex items-center justify-between pt-4 mt-2 border-t" style={{ borderColor: '#262626' }}>

                  {/* Itens por página */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSizeMenu(v => !v)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
                      style={{ backgroundColor: '#111111', borderColor: showSizeMenu ? '#3A3A3A' : '#2A2A2A', color: '#9CA3AF', transition: 'border-color .15s' }}>
                      {pageSize} por página
                      <ChevronDown size={11} style={{ transform: showSizeMenu ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }} />
                    </button>
                    {/* Dropdown sempre montado — anima com opacity + translateY */}
                    <div
                      className="absolute bottom-full mb-2 left-0 rounded-xl border overflow-hidden z-20"
                      style={{
                        backgroundColor: '#161616', borderColor: '#2A2A2A', minWidth: 130,
                        opacity: showSizeMenu ? 1 : 0,
                        transform: showSizeMenu ? 'translateY(0)' : 'translateY(6px)',
                        pointerEvents: showSizeMenu ? 'auto' : 'none',
                        transition: 'opacity .18s ease, transform .18s ease',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      }}>
                      {[10, 20, 30, 50].map(s => (
                        <button key={s} onClick={() => { setPageSize(s); setPage(1); setShowSizeMenu(false); }}
                          className="w-full px-4 py-2.5 text-xs text-left flex items-center justify-between"
                          style={{ color: s === pageSize ? '#D4A843' : '#9CA3AF', backgroundColor: s === pageSize ? '#1E1E1E' : 'transparent', transition: 'background-color .1s' }}
                          onMouseEnter={e => { if (s !== pageSize) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A1A1A'; }}
                          onMouseLeave={e => { if (s !== pageSize) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}>
                          <span>{s} por página</span>
                          {s === pageSize && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#D4A843', display: 'inline-block' }} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Navegação de páginas */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="px-2.5 py-1.5 rounded-lg text-xs border transition-colors"
                      style={{ borderColor: '#2A2A2A', color: safePage === 1 ? '#3A3A3A' : '#9CA3AF', backgroundColor: '#111111' }}>
                      ‹
                    </button>
                    {pageButtons(totalPages, safePage).map((p, i) =>
                      p === '...'
                        ? <span key={`e${i}`} className="px-1 text-xs" style={{ color: '#5E5E5E' }}>…</span>
                        : (
                          <button key={p} onClick={() => setPage(p)}
                            className="w-8 py-1.5 rounded-lg text-xs border transition-colors"
                            style={{
                              borderColor: p === safePage ? '#D4A843' : '#2A2A2A',
                              color: p === safePage ? '#D4A843' : '#9CA3AF',
                              backgroundColor: p === safePage ? 'rgba(212,168,67,0.08)' : '#111111',
                              fontWeight: p === safePage ? 600 : 400,
                            }}>
                            {p}
                          </button>
                        )
                    )}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="px-2.5 py-1.5 rounded-lg text-xs border transition-colors"
                      style={{ borderColor: '#2A2A2A', color: safePage === totalPages ? '#3A3A3A' : '#9CA3AF', backgroundColor: '#111111' }}>
                      ›
                    </button>
                  </div>

                  {/* Contador */}
                  <p style={{ ...MONO, fontSize: 10, color: '#5E5E5E' }}>
                    {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, orders.length)} de {orders.length}
                  </p>
                </div>
              </Section>
            );
          })()}

          {/* ── Quebra Faturado vs Líquido ── */}
          {carts.length > 0 && (() => {
            const totalCarts   = carts.length;
            const totalOrders  = orders.length;
            const totalEntries = totalCarts + totalOrders;
            const convRate     = totalEntries > 0 ? (totalOrders / totalEntries) * 100 : 0;
            const cartTotalValue = carts.reduce((s, c) => s + cartValue(c), 0);

            return (
              <Section title="Quebra · Faturado vs Líquido (Grupo VIP)">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Pedidos Pagos',         value: totalOrders.toString(),    color: GOLD,      sub: 'faturados com UTM VIP' },
                    { label: 'Carrinhos Abandonados',  value: totalCarts.toString(),     color: '#F87171', sub: 'não converteram' },
                    { label: 'Taxa de Conversão',      value: `${convRate.toFixed(1)}%`, color: convRate >= 50 ? '#4ADE80' : '#F87171', sub: 'pedidos ÷ total' },
                    { label: 'Valor em Risco',         value: fmt(cartTotalValue),       color: '#8A8A8A', sub: 'valor dos carrinhos' },
                  ].map(({ label, value, color, sub }) => (
                    <div key={label} className="rounded-xl p-4" style={{ backgroundColor: '#111111', border: '1px solid #262626' }}>
                      <p style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E', marginBottom: 8 }}>{label}</p>
                      <p style={{ fontSize: 26, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</p>
                      <p style={{ fontSize: 10, color: '#5E5E5E', marginTop: 4 }}>{sub}</p>
                    </div>
                  ))}
                </div>
              </Section>
            );
          })()}

        </>)}
      </main>
    </div>
  );
}
