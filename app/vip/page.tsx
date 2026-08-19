'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useBrand } from '@/lib/brand-context';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { YampiOrder, YampiCart } from '@/lib/yampi';
import { aggregateOrders, cartValue, orderValue, toIso, unwrapArray } from '@/lib/yampi';
import {
  C, FONT, eyebrow, heading, metric, statusPedidoPill, fmtBRL, BTN_PRIMARY, BTN_GHOST,
} from '@/lib/theme';

const CARD: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 };
const COLS = '58px 76px minmax(0,1.5fr) 104px 104px 128px';

const STATUS_LABEL: Record<string, string> = {
  paid: 'Pago', payment_approved: 'Pagto. aprovado', approved: 'Aprovado',
  handling_products: 'Em produção', in_separation: 'Em separação', invoiced: 'Faturado',
  ready_for_shipping: 'Pronto p/ envio', on_carriage: 'Saiu p/ entrega', shipped: 'Enviado',
  delivered: 'Entregue', cancelled: 'Cancelado',
};

function tempoRelativo(d: Date): string {
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function mascarar(valor: string | undefined, tipo: 'email' | 'fone' | 'cpf', revelar: boolean): string {
  if (!valor) return '—';
  if (revelar) return valor;
  if (tipo === 'email') {
    const [u, dom] = valor.split('@');
    if (!dom || u.length < 2) return valor;
    return `${u[0]}${'*'.repeat(Math.max(u.length - 2, 1))}${u[u.length - 1]}@${dom}`;
  }
  if (tipo === 'fone') {
    const d = valor.replace(/\D/g, '');
    return d.length >= 4 ? `(**) *****-${d.slice(-4)}` : '****';
  }
  const d = valor.replace(/\D/g, '');
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : '***.***.***-**';
}

function pagamentoDe(o: YampiOrder): { curto: string; longo: string; parcelas: string; cartao: string } {
  const t = o.transactions?.data?.[0];
  const p = t?.payment?.data;
  const alias = (p?.alias ?? '').toLowerCase();
  const curto = p?.is_pix ? 'PIX' : p?.is_billet ? 'BOLETO' : (alias || 'CARTÃO').toUpperCase().slice(0, 8);
  const parcelas = (t?.installments ?? 0) > 1 ? `${t?.installments}x` : 'à vista';
  return { curto, longo: p?.name ?? curto, parcelas, cartao: t?.truncated_card ?? '' };
}

function enderecoDe(o: YampiOrder) {
  const sa = o.shipping_address as Record<string, unknown> | undefined;
  const raw = ((sa?.data as Record<string, unknown> | undefined) ?? sa
    ?? unwrapArray<Record<string, unknown>>(o.address)[0]) as Record<string, string> | undefined;
  if (!raw) return null;
  const uf = raw.uf ?? raw.state_code ?? raw.state ?? '';
  return { rua: raw.street ?? '', cidade: raw.city ?? '', uf };
}

// ── Painel de espera para marcas sem integração ──────────────────────────────
function VipStandby({ onPreview }: { onPreview: () => void }) {
  const { brand } = useBrand();
  return (
    <div style={{ maxWidth: 440, margin: '60px auto', textAlign: 'center', ...CARD, borderRadius: 24, padding: '44px 36px' }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%', background: C.surfaceAlt,
        display: 'grid', placeItems: 'center', margin: '0 auto 20px', fontSize: 24, color: C.primaryDeep,
      }}>
        ♛
      </div>
      <h2 style={{ ...heading(24), marginBottom: 10 }}>Em preparação</h2>
      <p style={{ color: C.inkSoft, fontSize: 14, margin: '0 0 22px' }}>
        O painel do Grupo VIP já funciona para a <strong style={{ color: C.ink }}>{brand.name}</strong>, mas
        depende das credenciais <code style={{ fontFamily: FONT.mono, color: C.primaryDeep }}>{brand.yampiEnvPrefix}YAMPI_*</code>{' '}
        e dos pedidos marcados com a UTM{' '}
        <code style={{ fontFamily: FONT.mono, color: C.primaryDeep }}>grupo_vip / whatsapp</code>.
      </p>
      <button type="button" onClick={onPreview} style={BTN_GHOST}>Pré-visualizar mesmo assim</button>
      <p style={{ fontSize: 11, color: C.inkMut, marginTop: 14 }}>
        Sem credenciais, a pré-visualização abre o painel vazio ou com erro — é esperado.
      </p>
    </div>
  );
}

// ── Drawer ───────────────────────────────────────────────────────────────────
function DrawerPedido({ o, todos, onClose }: { o: YampiOrder; todos: YampiOrder[]; onClose: () => void }) {
  const [revelar, setRevelar] = useState(false);
  const cli = o.customer?.data;
  const pg = pagamentoDe(o);
  const end = enderecoDe(o);
  const status = STATUS_LABEL[o.status?.data?.alias ?? ''] ?? o.status?.data?.name ?? '—';
  const criado = new Date(toIso(o.created_at));

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [onClose]);

  const itens = o.items ?? [];
  const historico = todos.filter((x) =>
    x.id !== o.id && cli?.id && x.customer?.data?.id === cli.id
  ).sort((a, b) => toIso(b.created_at).localeCompare(toIso(a.created_at)));

  const valores: [string, string][] = [
    ['Produtos', fmtBRL(o.value_products ?? 0, true)],
    ...((o.value_discount ?? 0) > 0 ? [['Desconto', `− ${fmtBRL(o.value_discount ?? 0, true)}`] as [string, string]] : []),
    ['Frete', fmtBRL(o.value_shipment ?? o.value_shipping ?? 0, true)],
    ...((o.value_wallet_discount ?? 0) > 0 ? [['Saldo VIP', `− ${fmtBRL(o.value_wallet_discount ?? 0, true)}`] as [string, string]] : []),
  ];

  const bloco: React.CSSProperties = { ...CARD, borderRadius: 16, padding: 18 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(23,48,44,.42)' }} />
      <div className="desliza" style={{
        position: 'relative', width: 600, maxWidth: '95vw', height: '100%', background: C.bg,
        overflowY: 'auto', boxShadow: '-16px 0 48px rgba(23,48,44,.18)',
      }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 2, background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ ...eyebrow(C.inkSoft, 10), letterSpacing: '.14em' }}>Pedido #{o.number}</div>
            <div style={{ ...heading(20), marginTop: 2 }}>{cli?.name ?? 'Cliente'}</div>
          </div>
          <span style={statusPedidoPill(status)}>{status}</span>
          <button type="button" onClick={onClose} aria-label="Fechar" style={{ ...BTN_GHOST, width: 36, height: 36, padding: 0, flex: 'none' }}>✕</button>
        </div>

        <div style={{ padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Cliente · Pagamento · Entrega — auto-fit, não aperta no celular */}
          <div style={{ ...bloco, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 18 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <span style={{ ...eyebrow(C.inkSoft), letterSpacing: '.12em' }}>Cliente</span>
                <button type="button" onClick={() => setRevelar((v) => !v)}
                  style={{ background: 'transparent', border: 0, fontSize: 11, fontWeight: 600, color: C.primaryDeep, cursor: 'pointer', padding: 0 }}>
                  {revelar ? 'ocultar' : 'revelar'}
                </button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600 }}>{cli?.name ?? '—'}</div>
                <div style={{ color: C.inkSoft, fontFamily: FONT.mono, fontSize: 11.5 }}>{mascarar(cli?.email, 'email', revelar)}</div>
                <div style={{ color: C.inkSoft, fontFamily: FONT.mono, fontSize: 11.5 }}>
                  {mascarar(cli?.phone?.formated_number ?? cli?.phone?.number, 'fone', revelar)}
                </div>
                <div style={{ color: C.inkSoft, fontFamily: FONT.mono, fontSize: 11.5 }}>{mascarar(cli?.cpf, 'cpf', revelar)}</div>
              </div>
            </div>

            <div>
              <div style={{ ...eyebrow(C.inkSoft), letterSpacing: '.12em', marginBottom: 8 }}>Pagamento</div>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600 }}>{pg.longo}</div>
                <div style={{ color: C.inkSoft }}>{pg.parcelas}</div>
                {pg.cartao && <div style={{ color: C.inkSoft, fontFamily: FONT.mono, fontSize: 11.5 }}>•••• {pg.cartao}</div>}
                {o.promocode && (
                  <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.primaryDeep, marginTop: 2 }}>
                    CUPOM: {o.promocode}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div style={{ ...eyebrow(C.inkSoft), letterSpacing: '.12em', marginBottom: 8 }}>Entrega</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: C.inkSoft }}>
                {end ? (
                  <>
                    <div style={{ fontWeight: 600, color: C.ink }}>{end.cidade} · {end.uf}</div>
                    <div>{end.rua}</div>
                    {o.shipment_service && <div>{o.shipment_service}</div>}
                    {(o.days_delivery ?? 0) > 0 && <div>Prazo: {o.days_delivery} dias</div>}
                  </>
                ) : '—'}
              </div>
            </div>
          </div>

          <div style={bloco}>
            <div style={{ ...eyebrow(C.inkSoft), letterSpacing: '.12em', marginBottom: 12 }}>Valor total</div>
            {valores.map(([rot, val]) => (
              <div key={rot} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, color: C.inkSoft }}>
                <span>{rot}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{val}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', marginTop: 6,
              borderTop: `1px solid ${C.borderSoft}`, fontSize: 15, fontWeight: 700,
            }}>
              <span>Total</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(orderValue(o), true)}</span>
            </div>
            {(o.value_cashback ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontSize: 12.5, color: C.primaryDeep }}>
                <span>Cashback</span><span>+ {fmtBRL(o.value_cashback ?? 0, true)}</span>
              </div>
            )}
          </div>

          {itens.length > 0 && (
            <div style={bloco}>
              <div style={{ ...eyebrow(C.inkSoft), letterSpacing: '.12em', marginBottom: 12 }}>
                Produtos · {itens.length} {itens.length === 1 ? 'item' : 'itens'}
              </div>
              {itens.map((i, idx) => {
                const nome = i.sku?.data?.title ?? i.sku?.title ?? i.product?.data?.name ?? i.name ?? 'Produto';
                const sku = i.sku?.data?.sku ?? i.sku?.sku ?? '';
                const preco = typeof i.price === 'number' ? i.price : parseFloat(String(i.price ?? 0));
                const qtd = i.quantity ?? 1;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${C.borderSoft}` }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 500 }}>{nome}</span>
                      {sku && <span style={{ display: 'block', fontFamily: FONT.mono, fontSize: 10.5, color: C.inkSoft }}>SKU: {sku}</span>}
                    </span>
                    <span style={{ textAlign: 'right', flex: 'none' }}>
                      <span style={{ display: 'block', fontSize: 12.5, color: C.inkSoft }}>{qtd}x {fmtBRL(preco, true)}</span>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtBRL(preco * qtd, true)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ ...bloco, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
            <div>
              <div style={{ ...eyebrow(C.inkSoft), letterSpacing: '.12em' }}>Transportadora</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 3 }}>{o.shipment_service ?? '—'}</div>
            </div>
            <div>
              <div style={{ ...eyebrow(C.inkSoft), letterSpacing: '.12em' }}>Código</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 12.5, marginTop: 3, color: o.track_code ? C.ink : C.inkMut }}>
                {o.track_code ?? 'Não cadastrado'}
              </div>
            </div>
            {o.track_url && (
              <div>
                <div style={{ ...eyebrow(C.inkSoft), letterSpacing: '.12em' }}>Rastreio</div>
                <div style={{ marginTop: 3, fontSize: 13.5 }}>
                  <a href={o.track_url} target="_blank" rel="noopener noreferrer">abrir link</a>
                </div>
              </div>
            )}
          </div>

          <div style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMid}`, borderRadius: 16, padding: 18 }}>
            <div style={{ ...eyebrow(C.primaryDeep), letterSpacing: '.12em', marginBottom: 10 }}>
              Histórico do cliente {historico.length > 0 && `· ${historico.length} no período`}
            </div>
            {historico.length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.primaryDeep }}>
                Nenhum outro pedido VIP deste cliente neste período.
              </div>
            ) : historico.map((h) => (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                padding: '9px 0', borderTop: '1px solid rgba(23,48,44,.08)', fontSize: 13,
              }}>
                <span style={{ fontFamily: FONT.mono, fontSize: 12, color: C.inkSoft }}>#{h.number}</span>
                <span style={{ flex: 1, color: C.inkSoft }}>
                  {format(new Date(toIso(h.created_at)), 'dd/MM/yyyy HH:mm')}
                </span>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(orderValue(h), true)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Painel ───────────────────────────────────────────────────────────────────
function VipDashboard() {
  const { brand, month, year } = useBrand();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [sincronizando, setSincronizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const [orders, setOrders] = useState<YampiOrder[]>([]);
  const [carts, setCarts]   = useState<YampiCart[]>([]);
  const [agg, setAgg]       = useState<ReturnType<typeof aggregateOrders> | null>(null);

  const [selecionado, setSelecionado] = useState<YampiOrder | null>(null);
  const [porPagina, setPorPagina] = useState(10);
  const [pagina, setPagina] = useState(1);

  const m = month + 1;

  const buscar = useCallback(async (force = false) => {
    const url = `/api/yampi?brand=${brand.id}&month=${m}&year=${year}${force ? '&force=1' : ''}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);

    let res: Response;
    try {
      res = await fetch(url, { signal: ctrl.signal });
    } catch (e: unknown) {
      clearTimeout(timer);
      throw new Error(e instanceof Error && e.name === 'AbortError'
        ? 'Timeout — a API demorou mais de 30s para responder.'
        : (e instanceof Error ? e.message : String(e)));
    }
    clearTimeout(timer);

    let json: Record<string, unknown>;
    try { json = await res.json(); }
    catch { throw new Error(`Resposta inválida do servidor (HTTP ${res.status})`); }
    if (!json.ok) throw new Error((json.error as string) ?? `HTTP ${res.status}`);

    const novos = (json.orders as YampiOrder[]) ?? [];
    setOrders(novos);
    setCarts((json.carts as YampiCart[]) ?? []);
    setAgg(aggregateOrders(novos));
    setPagina(1);
    setFetchedAt(json.fetchedAt as string);
    setErro(null);
  }, [brand.id, m, year]);

  useEffect(() => {
    setStatus('loading');
    setErro(null);
    buscar()
      .then(() => setStatus('done'))
      .catch((e) => { setErro(e instanceof Error ? e.message : String(e)); setStatus('error'); });
  }, [buscar]);

  async function sincronizar() {
    setSincronizando(true);
    try { await buscar(true); }
    catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setSincronizando(false); }
  }

  const ordenados = useMemo(
    () => [...orders].sort((a, b) => toIso(b.created_at).localeCompare(toIso(a.created_at))),
    [orders],
  );

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / porPagina));
  const daPagina = ordenados.slice((pagina - 1) * porPagina, pagina * porPagina);

  const carrinhos = carts.length;
  const valorRisco = carts.reduce((s, c) => s + cartValue(c), 0);
  const conversao = agg && (agg.totalPed + carrinhos) > 0 ? (agg.totalPed / (agg.totalPed + carrinhos)) * 100 : 0;

  const maxHora = agg ? Math.max(...agg.byHour, 1) : 1;
  const horaPico = agg ? agg.byHour.indexOf(Math.max(...agg.byHour)) : 0;
  const maxEstado = agg?.byState[0]?.faturamento ?? 1;
  const maxProduto = agg?.byProduct[0]?.faturamento ?? 1;
  const totalProdutos = agg?.byProduct.reduce((s, p) => s + p.faturamento, 0) ?? 0;

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(212px,1fr))', gap: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ ...CARD, borderRadius: 16, padding: 18, opacity: .6 }}>
              <div style={{ height: 9, width: '55%', background: C.surfaceMut, borderRadius: 999 }} />
              <div style={{ height: 26, width: '75%', background: C.surfaceMut, borderRadius: 8, marginTop: 12 }} />
            </div>
          ))}
        </div>
        <div style={{ ...CARD, height: 260, opacity: .6 }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, background: C.ink, color: '#fff',
          borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.accent }} />
          Grupo VIP · {format(new Date(year, month, 1), 'MMMM', { locale: ptBR })} {year}
        </span>
        <span style={{ fontSize: 12.5, color: C.inkSoft }}>
          {sincronizando ? 'Atualizando…' : fetchedAt ? `Atualizado às ${format(new Date(fetchedAt), 'HH:mm')}` : ''}
        </span>
        <button
          type="button" onClick={sincronizar} disabled={sincronizando}
          style={{ ...BTN_PRIMARY, marginLeft: 'auto', fontSize: 13.5, padding: '11px 18px', borderRadius: 11, boxShadow: `0 4px 0 ${C.primaryDeep}`, opacity: sincronizando ? .6 : 1 }}
        >
          {sincronizando ? 'Atualizando…' : 'Sincronizar VIP'}
        </button>
      </div>

      {erro && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.warn, borderRadius: 14, padding: '13px 16px', fontSize: 13, flexWrap: 'wrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.ink, flex: 'none' }} />
          <span style={{ flex: 1, minWidth: 180 }}><strong>Falha ao sincronizar.</strong> {erro}</span>
          <button type="button" onClick={sincronizar} style={{ ...BTN_GHOST, padding: '7px 13px', fontSize: 12.5 }}>Tentar de novo</button>
        </div>
      )}

      {agg && orders.length > 0 ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(212px,1fr))', gap: 14 }}>
            {[
              { rotulo: 'Faturamento VIP', valor: fmtBRL(agg.totalFat), sub: 'status pago via UTM VIP', icone: '↗' },
              { rotulo: 'Pedidos',         valor: String(agg.totalPed), sub: 'atribuídos ao grupo',      icone: '◫' },
              { rotulo: 'Ticket médio',    valor: fmtBRL(agg.ticket, true), sub: 'faturamento ÷ pedidos', icone: '◎' },
              { rotulo: 'Carrinhos abandonados', valor: String(carrinhos), sub: 'UTM grupo_vip capturados', icone: '⌾' },
            ].map((k) => (
              <div key={k.rotulo} style={{ ...CARD, borderRadius: 16, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <span style={eyebrow(C.inkSoft)}>{k.rotulo}</span>
                  <span style={{
                    width: 26, height: 26, borderRadius: 8, background: C.surfaceAlt, display: 'grid',
                    placeItems: 'center', fontSize: 12, color: C.primaryDeep, flex: 'none',
                  }}>
                    {k.icone}
                  </span>
                </div>
                <div style={{ ...metric(28), marginTop: 8 }}>{k.valor}</div>
                <div style={{ fontSize: 11.5, color: C.inkSoft }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Pedidos por horário */}
          <div style={{ ...CARD, padding: '22px 20px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              <h2 style={heading(19)}>Pedidos por horário</h2>
              <span style={{ ...eyebrow(C.primaryDeep, 10), letterSpacing: '.1em' }}>· pico às {String(horaPico).padStart(2, '0')}h</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 200, paddingBottom: 22, borderBottom: `1px solid ${C.border}` }}>
              {agg.byHour.map((qtd, h) => (
                <div key={h} style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
                  <div
                    title={`${String(h).padStart(2, '0')}h · ${qtd} ${qtd === 1 ? 'pedido' : 'pedidos'}`}
                    style={{
                      height: `${(qtd / maxHora) * 100}%`, minHeight: qtd > 0 ? 3 : 0,
                      background: h === horaPico ? C.primary : C.accent, borderRadius: '4px 4px 0 0', opacity: h === horaPico ? 1 : .55,
                    }}
                  />
                  {h % 2 === 0 && (
                    <div style={{ position: 'absolute', bottom: -20, left: 0, right: 0, textAlign: 'center', fontFamily: FONT.mono, fontSize: 9, color: C.inkSoft }}>
                      {String(h).padStart(2, '0')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Rankings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 16, alignItems: 'start' }}>
            <div style={{ ...CARD, padding: '22px 20px' }}>
              <h2 style={{ ...heading(18), marginBottom: 16 }}>Faturamento por estado</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {agg.byState.slice(0, 8).map((e, i) => (
                  <div key={e.state} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.inkMut, width: 16 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, width: 26 }}>{e.state}</span>
                    <span style={{ flex: 1, height: 8, borderRadius: 999, background: C.surfaceMut, overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${(e.faturamento / maxEstado) * 100}%`, background: i === 0 ? C.primary : C.accent, borderRadius: 999 }} />
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: 74, textAlign: 'right' }}>{fmtBRL(e.faturamento)}</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 10.5, color: C.inkSoft, width: 32, textAlign: 'right' }}>{e.pedidos}p</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...CARD, padding: '22px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <h2 style={heading(18)}>Produtos mais vendidos</h2>
                {agg.totalFat > 0 && (
                  <span style={{ fontSize: 11.5, color: C.inkSoft }}>
                    · {((totalProdutos / agg.totalFat) * 100).toFixed(0)}% do faturamento VIP
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {agg.byProduct.slice(0, 12).map((p, i) => (
                  <div key={p.name}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.inkMut, width: 16 }}>{String(i + 1).padStart(2, '0')}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.inkSoft }}>{p.quantidade}un</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: 74, textAlign: 'right' }}>{fmtBRL(p.faturamento)}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: C.surfaceMut, overflow: 'hidden', margin: '6px 0 0 26px' }}>
                      <div style={{ height: '100%', width: `${(p.faturamento / maxProduto) * 100}%`, background: C.accent, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
              {agg.byProduct.length > 12 && (
                <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.borderSoft}` }}>
                  + {agg.byProduct.length - 12} produtos com menor faturamento
                </div>
              )}
            </div>
          </div>

          {/* Pedidos */}
          <div style={{ ...CARD, overflow: 'hidden' }}>
            <div style={{ padding: '20px 20px 14px' }}>
              <h2 style={heading(19)}>
                Todos os pedidos VIP <span style={{ fontWeight: 600, fontSize: 14, color: C.inkSoft }}>· {ordenados.length} pedidos</span>
              </h2>
            </div>

            <div className="scroll-x">
              <div style={{ minWidth: 700 }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: COLS, gap: 8, padding: '10px 18px',
                  background: C.rail, borderTop: `1px solid ${C.railBorder}`, borderBottom: `1px solid ${C.railBorder}`,
                  ...eyebrow(C.inkRail), letterSpacing: '.12em', whiteSpace: 'nowrap',
                }}>
                  <span /><span>Nº</span><span>Cliente</span><span>Data</span>
                  <span style={{ textAlign: 'right' }}>Total</span>
                  <span style={{ textAlign: 'right' }}>Status</span>
                </div>

                {daPagina.map((o) => {
                  const pg = pagamentoDe(o);
                  const end = enderecoDe(o);
                  const criado = new Date(toIso(o.created_at));
                  const st = STATUS_LABEL[o.status?.data?.alias ?? ''] ?? o.status?.data?.name ?? '—';
                  const utm = [o.utm_source ?? o.tracking?.utm_source, o.utm_campaign ?? o.tracking?.utm_campaign].filter(Boolean).join(' / ');

                  return (
                    <button
                      key={o.id} type="button" onClick={() => setSelecionado(o)}
                      className="row-hover"
                      style={{
                        width: '100%', display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', gap: 8,
                        padding: '13px 18px', border: 0, borderTop: `1px solid ${C.borderSoft}`,
                        background: C.surface, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      }}
                    >
                      <span style={{
                        fontFamily: FONT.mono, fontSize: 9, letterSpacing: '.06em', color: C.primaryDeep,
                        background: C.surfaceAlt, borderRadius: 5, padding: '3px 5px', justifySelf: 'start',
                      }}>
                        {pg.curto}
                      </span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 12.5, color: C.inkSoft }}>#{o.number}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {o.customer?.data?.name ?? '—'}
                          {end?.uf && <span style={{ fontWeight: 400, color: C.inkSoft }}> · {end.uf}</span>}
                        </span>
                        {utm && (
                          <span style={{
                            display: 'inline-block', fontFamily: FONT.mono, fontSize: 9.5, color: C.inkSoft,
                            background: C.surfaceMut, borderRadius: 4, padding: '2px 5px', marginTop: 3,
                          }}>
                            {utm}
                          </span>
                        )}
                      </span>
                      <span>
                        <span style={{ display: 'block', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{format(criado, 'dd/MM HH:mm')}</span>
                        <span style={{ display: 'block', fontSize: 11.5, color: C.inkSoft }}>{tempoRelativo(criado)}</span>
                      </span>
                      <span style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(orderValue(o), true)}</span>
                        {o.promocode && (
                          <span style={{
                            display: 'inline-block', fontFamily: FONT.mono, fontSize: 9.5, color: C.primaryDeep,
                            border: `1px solid ${C.borderMid}`, borderRadius: 4, padding: '1px 5px', marginTop: 3,
                          }}>
                            {o.promocode}
                          </span>
                        )}
                      </span>
                      <span style={{ minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={statusPedidoPill(st)}>{st}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
              padding: '14px 20px', borderTop: `1px solid ${C.borderSoft}`, background: C.bg,
            }}>
              <select
                value={porPagina}
                onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}
                style={{ padding: '8px 10px', fontSize: 12.5, fontWeight: 600, border: `1px solid ${C.borderMid}`, borderRadius: 9, background: C.surface, cursor: 'pointer' }}
              >
                {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n} por página</option>)}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button type="button" disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}
                  style={{ ...BTN_GHOST, padding: '7px 11px', opacity: pagina === 1 ? .4 : 1 }}>‹</button>
                <span style={{ fontFamily: FONT.mono, fontSize: 12, color: C.inkSoft, padding: '0 8px' }}>
                  {pagina} / {totalPaginas}
                </span>
                <button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}
                  style={{ ...BTN_GHOST, padding: '7px 11px', opacity: pagina >= totalPaginas ? .4 : 1 }}>›</button>
              </div>

              <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.inkSoft }}>
                {(pagina - 1) * porPagina + 1}–{Math.min(pagina * porPagina, ordenados.length)} de {ordenados.length}
              </span>
            </div>
          </div>

          {/* Quebra */}
          {carrinhos > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(212px,1fr))', gap: 14 }}>
              {[
                { rotulo: 'Pedidos pagos',         valor: String(agg.totalPed), sub: 'faturados com UTM VIP' },
                { rotulo: 'Carrinhos abandonados', valor: String(carrinhos),    sub: 'não converteram' },
                { rotulo: 'Taxa de conversão',     valor: `${conversao.toFixed(1)}%`, sub: 'pedidos ÷ total' },
                { rotulo: 'Valor em risco',        valor: fmtBRL(valorRisco),   sub: 'valor dos carrinhos' },
              ].map((q) => (
                <div key={q.rotulo} style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMid}`, borderRadius: 16, padding: 16 }}>
                  <div style={{ ...eyebrow(C.primaryDeep), letterSpacing: '.12em' }}>{q.rotulo}</div>
                  <div style={{ ...metric(24), marginTop: 5 }}>{q.valor}</div>
                  <div style={{ fontSize: 11.5, color: C.inkSoft }}>{q.sub}</div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : !erro && (
        <div style={{ ...CARD, padding: '72px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 30, color: C.borderMid, marginBottom: 12 }}>♛</div>
          <div style={{ ...heading(19) }}>
            Nenhum pedido VIP em {format(new Date(year, month, 1), 'MMMM', { locale: ptBR })} de {year}
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 11.5, color: C.inkMut, marginTop: 8 }}>
            utm_source=grupo_vip &amp; utm_campaign=whatsapp
          </div>
        </div>
      )}

      {selecionado && (
        <DrawerPedido o={selecionado} todos={orders} onClose={() => setSelecionado(null)} />
      )}
    </div>
  );
}

export default function VipPage() {
  const { brand } = useBrand();
  const [preview, setPreview] = useState(false);

  useEffect(() => { setPreview(false); }, [brand.id]);

  if (brand.vip === 'standby' && !preview) {
    return <VipStandby onPreview={() => setPreview(true)} />;
  }
  return <VipDashboard key={brand.id} />;
}
