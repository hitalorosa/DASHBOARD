// ── Yampi / Dooki v2 API client ───────────────────────────────────────────────
//
// Docs: https://docs.yampi.com.br
// Base: https://api.dooki.com.br/v2/{alias}
//
// Endpoints usados:
//   GET /{alias}/orders?filters[date]=created_at:YYYY-MM-DD|YYYY-MM-DD&include=customer,status,items
//   GET /{alias}/checkout/carts?date=created_at:YYYY-MM-DD|YYYY-MM-DD&include=customer,items

const ALIAS      = process.env.YAMPI_ALIAS      ?? '';
const TOKEN      = process.env.YAMPI_TOKEN      ?? '';
const SECRET_KEY = process.env.YAMPI_SECRET_KEY ?? '';

const BASE_URL = `https://api.dooki.com.br/v2/${ALIAS}`;

export const VIP_UTM = { source: 'grupo_vip', campaign: 'whatsapp' } as const;

// Aliases de status que representam pedido pago/em produção
const PAID_STATUS_ALIASES = new Set([
  'paid', 'payment_approved', 'approved',
  'handling_products', 'in_separation', 'invoiced',
  'ready_for_shipping', 'on_carriage', 'shipped', 'delivered',
]);

// ── Helpers de data ───────────────────────────────────────────────────────────

export function getMonthRange(month: number, year: number) {
  const pad  = (n: number) => String(n).padStart(2, '0');
  const last = new Date(year, month, 0).getDate();
  return {
    dateMin: `${year}-${pad(month)}-01`,
    dateMax: `${year}-${pad(month)}-${last}`,
  };
}

// ── Types — estrutura real da Dooki v2 ────────────────────────────────────────

export interface YampiOrder {
  id:         number;
  number:     number | string;
  // UTMs ficam no nível raiz do pedido
  utm_source?:   string;
  utm_campaign?: string;
  utm_medium?:   string;
  // Campos financeiros
  value_total?:    number;
  value_products?: number;
  total?:          string; // fallback caso venha como string
  created_at: string;
  status?: {
    data?: { id: number; name: string; alias: string };
  };
  customer?: {
    data?: {
      id:     number;
      name:   string;
      email?: string;
    };
  };
  address?: {
    street?: string; city?: string; uf?: string; state?: string;
  }[];
  items?: {
    id?:       number;
    name?:     string;
    quantity?: number;
    price?:    number | string;
    sku_id?:   number;
    sku?:      { title?: string; sku?: string };
  }[];
  // Campos que a página usa via aggregateOrders
  tracking?: {
    utm_source?: string;
    utm_campaign?: string;
  };
}

export interface YampiCart {
  id:         number;
  created_at?: string;
  utm_source?:   string;
  utm_campaign?: string;
  totalizers?: {
    total?:           number;
    total_formated?:  string;
    subtotal?:        number;
  };
  total?: string | number;
  tracking?: { utm_source?: string; utm_campaign?: string };
  items?: { name?: string; quantity?: number; price?: number | string }[];
}

export interface VipStats {
  orders:    YampiOrder[];
  carts:     YampiCart[];
  fetchedAt: string;
}

// ── Auth headers ──────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  return {
    'User-Token':      TOKEN,
    'User-Secret-Key': SECRET_KEY,
    'Accept':          'application/json',
  };
}

// ── Filtros UTM/status (client-side) ──────────────────────────────────────────

function orderIsVip(o: YampiOrder): boolean {
  // UTMs podem vir top-level OU em o.tracking (fallback)
  const src  = o.utm_source   ?? o.tracking?.utm_source;
  const camp = o.utm_campaign ?? o.tracking?.utm_campaign;
  return src === VIP_UTM.source && camp === VIP_UTM.campaign;
}

function orderIsPaid(o: YampiOrder): boolean {
  const alias = o.status?.data?.alias ?? '';
  return PAID_STATUS_ALIASES.has(alias);
}

function cartIsVip(c: YampiCart): boolean {
  const src  = c.utm_source   ?? c.tracking?.utm_source;
  const camp = c.utm_campaign ?? c.tracking?.utm_campaign;
  return src === VIP_UTM.source && camp === VIP_UTM.campaign;
}

// ── Fetch com retry em 429 ────────────────────────────────────────────────────

async function fetchRetry(url: string): Promise<Response> {
  const opts: RequestInit = { method: 'GET', headers: authHeaders(), cache: 'no-store' };
  // Backoff generoso para não agravar o rate-limit: 10s, 30s (máx 2 retries)
  const BACKOFF = [10_000, 30_000];

  for (const wait of BACKOFF) {
    const res = await fetch(url, opts);
    if (res.status !== 429) return res;
    console.warn(`[Dooki] 429 Too Many Requests — aguardando ${wait / 1000}s`);
    await new Promise(r => setTimeout(r, wait));
  }
  return fetch(url, opts);
}

/** Extrai array de itens — envelope real da Dooki v2: { scroll_id, data: [...] } */
function extractItems<T>(json: unknown): T[] {
  if (!json || typeof json !== 'object') return [];
  const j = json as Record<string, unknown>;
  // Dooki v2: { scroll_id: ..., data: [ {...}, ... ] }
  if (Array.isArray(j.data)) return j.data as T[];
  // fallback para envelopes aninhados
  const d = j.data as Record<string, unknown> | undefined;
  if (d && Array.isArray(d.data))  return d.data  as T[];
  if (d && Array.isArray(d.items)) return d.items as T[];
  if (Array.isArray(j.items))      return j.items as T[];
  return [];
}

/**
 * Paginação da Dooki v2 usa scroll_id (cursor).
 * Quando scroll_id === null, não há mais páginas.
 * Também suporta meta.pagination.total_pages (fallback).
 */
function getScrollId(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const j = json as Record<string, unknown>;
  if (typeof j.scroll_id === 'string') return j.scroll_id;
  return null;
}

function getTotalPages(json: unknown): number {
  if (!json || typeof json !== 'object') return 1;
  const j  = json as Record<string, unknown>;
  const mt = (j.meta as Record<string, unknown> | undefined);
  const pg = mt?.pagination as Record<string, unknown> | undefined;
  if (pg?.total_pages) return Number(pg.total_pages);
  const d = j.data as Record<string, unknown> | undefined;
  if (d?.last_page) return Number(d.last_page);
  return 1;
}

/**
 * Busca todas as páginas de um endpoint Dooki v2.
 * Suporta paginação por scroll_id (cursor) e page-based.
 * Usa URLSearchParams para encoding correto dos parâmetros.
 */
async function fetchAllPages<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T[]> {
  const LIMIT = 100;
  const results: T[] = [];

  // Página 1
  const p1 = new URLSearchParams({ ...params, limit: String(LIMIT) });
  const url1 = `${BASE_URL}/${endpoint}?${p1}`;
  console.log(`[Dooki] GET ${url1}`);

  const r1 = await fetchRetry(url1);
  if (!r1.ok) {
    const raw = await r1.text().catch(() => '');
    console.error(`[Dooki] /${endpoint} ${r1.status}: ${raw.slice(0, 600)}`);
    throw new Error(`Dooki API ${r1.status}: ${raw.slice(0, 200)}`);
  }

  const j1 = await r1.json() as Record<string, unknown>;
  const items1 = extractItems<T>(j1);
  results.push(...items1);
  console.log(`[Dooki] /${endpoint} p1 — ${items1.length} itens`);

  // Tenta paginação por scroll_id primeiro
  let scrollId = getScrollId(j1);
  if (scrollId) {
    let page = 2;
    while (scrollId) {
      const pN = new URLSearchParams({ ...params, limit: String(LIMIT), scroll_id: scrollId });
      const urlN = `${BASE_URL}/${endpoint}?${pN}`;
      const rN = await fetchRetry(urlN);
      if (!rN.ok) { console.error(`[Dooki] scroll p${page} → ${rN.status}`); break; }
      const jN = await rN.json() as Record<string, unknown>;
      const itemsN = extractItems<T>(jN);
      results.push(...itemsN);
      console.log(`[Dooki] /${endpoint} scroll p${page} — ${itemsN.length} itens`);
      scrollId = getScrollId(jN);
      page++;
      if (itemsN.length === 0) break;
    }
    return results;
  }

  // Fallback: paginação por page number
  const total = getTotalPages(j1);
  if (total <= 1) return results;

  const BATCH = 3;
  for (let start = 2; start <= total; start += BATCH) {
    const pages = Array.from({ length: Math.min(BATCH, total - start + 1) }, (_, i) => start + i);
    const batch = await Promise.all(
      pages.map(p => {
        const pP = new URLSearchParams({ ...params, limit: String(LIMIT), page: String(p) });
        const urlP = `${BASE_URL}/${endpoint}?${pP}`;
        return fetchRetry(urlP)
          .then(async r => {
            if (!r.ok) { console.error(`[Dooki] p${p} → ${r.status}`); return [] as T[]; }
            const j = await r.json() as Record<string, unknown>;
            const it = extractItems<T>(j);
            console.log(`[Dooki] /${endpoint} p${p}/${total} — ${it.length} itens`);
            return it;
          })
          .catch(e => { console.error(`[Dooki] p${p} erro:`, e); return [] as T[]; });
      }),
    );
    results.push(...batch.flat());
  }

  return results;
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Busca todos os pedidos do mês e filtra VIP pagos no cliente.
 * Usa URLSearchParams para encoding correto (brackets, pipe, colon).
 */
export async function fetchVipOrders(dateMin: string, dateMax: string): Promise<YampiOrder[]> {
  // Só include=status (leve) — customer/items/address são joins pesados que travam
  const all = await fetchAllPages<YampiOrder>('orders', {
    'filters[date]': `created_at:${dateMin}|${dateMax}`,
    'include':       'status',
  });
  const vip = all.filter(o => orderIsPaid(o) && orderIsVip(o));
  console.log(`[Dooki] ${all.length} pedidos no mês → ${vip.length} VIP pagos`);
  return vip;
}

/**
 * Busca carrinhos abandonados VIP do mês.
 * Endpoint: GET /{alias}/checkout/carts?date=created_at:YYYY-MM-DD|YYYY-MM-DD
 */
export async function fetchVipCarts(dateMin: string, dateMax: string): Promise<YampiCart[]> {
  try {
    const all = await fetchAllPages<YampiCart>('checkout/carts', {
      'date': `created_at:${dateMin}|${dateMax}`,
    });
    const vip = all.filter(c => cartIsVip(c));
    console.log(`[Dooki] ${all.length} carrinhos no mês → ${vip.length} VIP`);
    return vip;
  } catch (e) {
    console.warn('[Dooki] /checkout/carts indisponível:', e);
    return [];
  }
}

// ── Agregações ────────────────────────────────────────────────────────────────

/** Valor total de um pedido — aceita number (value_total) ou string (total) */
function orderValue(o: YampiOrder): number {
  if (typeof o.value_total === 'number') return o.value_total;
  if (typeof o.total       === 'string') return parseFloat(o.total) || 0;
  return 0;
}

/** Valor total de um carrinho */
function cartValue(c: YampiCart): number {
  if (typeof c.totalizers?.total === 'number') return c.totalizers.total;
  if (typeof c.total             === 'number') return c.total;
  if (typeof c.total             === 'string') return parseFloat(c.total) || 0;
  return 0;
}

export function aggregateOrders(orders: YampiOrder[]) {
  const totalFat = orders.reduce((s, o) => s + orderValue(o), 0);
  const totalPed = orders.length;
  const ticket   = totalPed > 0 ? totalFat / totalPed : 0;

  // Pedidos por hora (BRT)
  const byHour: number[] = Array(24).fill(0);
  for (const o of orders) {
    if (!o.created_at) continue;
    const h = parseInt(
      new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false,
      }).format(new Date(o.created_at)),
      10,
    );
    if (h >= 0 && h < 24) byHour[h]++;
  }

  // Por estado — o campo correto é address[0].uf na Dooki v2
  const byState = new Map<string, { pedidos: number; faturamento: number }>();
  for (const o of orders) {
    const addr = o.address?.[0];
    const st   = addr?.uf ?? addr?.state ?? 'N/A';
    const cur  = byState.get(st) ?? { pedidos: 0, faturamento: 0 };
    cur.pedidos++;
    cur.faturamento += orderValue(o);
    byState.set(st, cur);
  }

  // Por produto
  const byProduct = new Map<string, { quantidade: number; faturamento: number }>();
  for (const o of orders) {
    for (const item of o.items ?? []) {
      const name  = item.sku?.title ?? item.name ?? 'Produto';
      const price = typeof item.price === 'number' ? item.price : parseFloat(String(item.price ?? 0));
      const qty   = item.quantity ?? 1;
      const cur   = byProduct.get(name) ?? { quantidade: 0, faturamento: 0 };
      cur.quantidade  += qty;
      cur.faturamento += price * qty;
      byProduct.set(name, cur);
    }
  }

  return {
    totalFat, totalPed, ticket, byHour,
    byState: [...byState.entries()]
      .map(([state, v]) => ({ state, ...v }))
      .sort((a, b) => b.faturamento - a.faturamento),
    byProduct: [...byProduct.entries()]
      .map(([name, v]) => ({
        name: name.length > 30 ? name.slice(0, 29) + '…' : name, ...v,
      }))
      .sort((a, b) => b.faturamento - a.faturamento),
  };
}

// Exporta helpers de valor para uso na página
export { cartValue };
