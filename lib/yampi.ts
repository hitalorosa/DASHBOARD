// Yampi / Dooki v2 API client
// Docs: https://docs.yampi.com.br
// Base: https://api.dooki.com.br/v2/{alias}

const ALIAS      = process.env.YAMPI_ALIAS      ?? '';
const TOKEN      = process.env.YAMPI_TOKEN      ?? '';
const SECRET_KEY = process.env.YAMPI_SECRET_KEY ?? '';

const BASE_URL = `https://api.dooki.com.br/v2/${ALIAS}`;

export const VIP_UTM = { source: 'grupo_vip', campaign: 'whatsapp' } as const;

const PAID_STATUS_ALIASES = new Set([
  'paid', 'payment_approved', 'approved',
  'handling_products', 'in_separation', 'invoiced',
  'ready_for_shipping', 'on_carriage', 'shipped', 'delivered',
]);

// Formato real da Dooki v2: { date: "2026-05-20 09:39:07.000000", timezone: "America/Sao_Paulo", timezone_type: 3 }
type DookiDate = { date: string; timezone?: string; timezone_type?: number };

// Normaliza created_at para string ISO, suportando todos os formatos da Dooki
export function toIso(createdAt: string | number | DookiDate | unknown): string {
  if (!createdAt) return '';
  // Objeto Dooki: { date: "YYYY-MM-DD HH:MM:SS...", timezone: "..." }
  if (typeof createdAt === 'object' && 'date' in (createdAt as object)) {
    return (createdAt as DookiDate).date.replace(' ', 'T');
  }
  // Unix timestamp em segundos
  if (typeof createdAt === 'number') {
    return new Date(createdAt * 1000).toISOString();
  }
  // String ISO normal
  if (typeof createdAt === 'string') return createdAt;
  return String(createdAt);
}

// Helpers de data
export function getMonthRange(month: number, year: number) {
  const pad  = (n: number) => String(n).padStart(2, '0');
  const last = new Date(year, month, 0).getDate();
  return {
    dateMin: `${year}-${pad(month)}-01`,
    dateMax: `${year}-${pad(month)}-${last}`,
  };
}

// Types
export interface YampiOrder {
  id:              number;
  number:          number | string;
  utm_source?:     string;
  utm_campaign?:   string;
  utm_medium?:     string;
  value_total?:    number;
  value_products?: number;
  total?:          string;
  created_at:      string | number | DookiDate;
  status?: {
    data?: { id: number; name: string; alias: string };
  };
  customer?: {
    data?: { id: number; name: string; email?: string };
  };
  address?: { street?: string; city?: string; uf?: string; state?: string }[];
  items?: {
    id?:       number;
    name?:     string;
    quantity?: number;
    price?:    number | string;
    sku_id?:   number;
    sku?:      { title?: string; sku?: string };
  }[];
  tracking?: { utm_source?: string; utm_campaign?: string };
}

export interface YampiCart {
  id:            number;
  created_at?:   string | number | DookiDate;
  utm_source?:   string;
  utm_campaign?: string;
  totalizers?: {
    total?:          number;
    total_formated?: string;
    subtotal?:       number;
  };
  total?:    string | number;
  tracking?: { utm_source?: string; utm_campaign?: string };
  items?: { name?: string; quantity?: number; price?: number | string }[];
}

export interface VipStats {
  orders:    YampiOrder[];
  carts:     YampiCart[];
  fetchedAt: string;
}

// Auth
function authHeaders(): HeadersInit {
  return {
    'User-Token':      TOKEN,
    'User-Secret-Key': SECRET_KEY,
    'Accept':          'application/json',
  };
}

// Filtros client-side
function orderIsVip(o: YampiOrder): boolean {
  const src  = o.utm_source   ?? o.tracking?.utm_source;
  const camp = o.utm_campaign ?? o.tracking?.utm_campaign;
  return src === VIP_UTM.source && camp === VIP_UTM.campaign;
}

function orderIsPaid(o: YampiOrder): boolean {
  return PAID_STATUS_ALIASES.has(o.status?.data?.alias ?? '');
}

function cartIsVip(c: YampiCart): boolean {
  const src  = c.utm_source   ?? c.tracking?.utm_source;
  const camp = c.utm_campaign ?? c.tracking?.utm_campaign;
  return src === VIP_UTM.source && camp === VIP_UTM.campaign;
}

// Fetch simples — sem retry para nao causar timeout
async function doFetch(url: string): Promise<Response> {
  return fetch(url, { method: 'GET', headers: authHeaders(), cache: 'no-store' });
}

// Extrai items do envelope Dooki: { scroll_id, data: [...] }
function extractItems<T>(json: unknown): T[] {
  if (!json || typeof json !== 'object') return [];
  const j = json as Record<string, unknown>;
  if (Array.isArray(j.data)) return j.data as T[];
  const d = j.data as Record<string, unknown> | undefined;
  if (d && Array.isArray(d.data))  return d.data  as T[];
  if (d && Array.isArray(d.items)) return d.items as T[];
  if (Array.isArray(j.items))      return j.items as T[];
  return [];
}

function getScrollId(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const j = json as Record<string, unknown>;
  return typeof j.scroll_id === 'string' ? j.scroll_id : null;
}

function getTotalPages(json: unknown): number {
  if (!json || typeof json !== 'object') return 1;
  const j  = json as Record<string, unknown>;
  const pg = ((j.meta as Record<string, unknown> | undefined)?.pagination) as Record<string, unknown> | undefined;
  if (pg?.total_pages) return Number(pg.total_pages);
  const d = j.data as Record<string, unknown> | undefined;
  if (d?.last_page) return Number(d.last_page);
  return 1;
}

async function fetchAllPages<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T[]> {
  const LIMIT = 100;
  const results: T[] = [];

  const p1   = new URLSearchParams({ ...params, limit: String(LIMIT) });
  const url1 = `${BASE_URL}/${endpoint}?${p1}`;
  console.log(`[Dooki] GET ${url1}`);

  const r1 = await doFetch(url1);
  if (!r1.ok) {
    const raw = await r1.text().catch(() => '');
    console.error(`[Dooki] ${endpoint} ${r1.status}: ${raw.slice(0, 400)}`);
    if (r1.status === 429) {
      throw new Error('Limite de requisicoes atingido (429). Aguarde 1-2 minutos e tente novamente.');
    }
    throw new Error(`Dooki API ${r1.status}: ${raw.slice(0, 200)}`);
  }

  const j1     = await r1.json() as Record<string, unknown>;
  const items1 = extractItems<T>(j1);
  results.push(...items1);
  console.log(`[Dooki] /${endpoint} p1 — ${items1.length} itens`);

  // Paginacao por scroll_id (cursor)
  let scrollId = getScrollId(j1);
  if (scrollId) {
    let page = 2;
    while (scrollId) {
      const pN   = new URLSearchParams({ ...params, limit: String(LIMIT), scroll_id: scrollId });
      const urlN = `${BASE_URL}/${endpoint}?${pN}`;
      const rN   = await doFetch(urlN);
      if (!rN.ok) { console.error(`[Dooki] scroll p${page} ${rN.status}`); break; }
      const jN     = await rN.json() as Record<string, unknown>;
      const itemsN = extractItems<T>(jN);
      results.push(...itemsN);
      console.log(`[Dooki] /${endpoint} scroll p${page} — ${itemsN.length} itens`);
      scrollId = getScrollId(jN);
      page++;
      if (itemsN.length === 0) break;
    }
    return results;
  }

  // Fallback: paginacao por page number
  const total = getTotalPages(j1);
  if (total <= 1) return results;

  const BATCH = 3;
  for (let start = 2; start <= total; start += BATCH) {
    const pages = Array.from({ length: Math.min(BATCH, total - start + 1) }, (_, i) => start + i);
    const batch = await Promise.all(
      pages.map(p => {
        const pP   = new URLSearchParams({ ...params, limit: String(LIMIT), page: String(p) });
        const urlP = `${BASE_URL}/${endpoint}?${pP}`;
        return doFetch(urlP)
          .then(async r => {
            if (!r.ok) { console.error(`[Dooki] p${p} ${r.status}`); return [] as T[]; }
            const j  = await r.json() as Record<string, unknown>;
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

// API publica
export async function fetchVipOrders(dateMin: string, dateMax: string): Promise<YampiOrder[]> {
  // /search/orders filtra UTM no servidor — retorna so pedidos VIP (resultado pequeno, rapido)
  // Filtra data e status paid no cliente
  const all = await fetchAllPages<YampiOrder>('search/orders', {
    'utm_source[]':   VIP_UTM.source,
    'utm_campaign[]': VIP_UTM.campaign,
    'include':        'status',
  });

  const vip = all.filter(o => {
    if (!orderIsPaid(o)) return false;
    if (!o.created_at) return false;
    const date = toIso(o.created_at).slice(0, 10); // YYYY-MM-DD
    return date >= dateMin && date <= dateMax;
  });

  console.log(`[Dooki] ${all.length} pedidos VIP historicos -> ${vip.length} pagos no mes`);
  return vip;
}

export async function fetchVipCarts(dateMin: string, dateMax: string): Promise<YampiCart[]> {
  try {
    const all = await fetchAllPages<YampiCart>('checkout/carts', {
      'date': `created_at:${dateMin}|${dateMax}`,
    });
    const vip = all.filter(c => cartIsVip(c));
    console.log(`[Dooki] ${all.length} carrinhos no mes -> ${vip.length} VIP`);
    return vip;
  } catch (e) {
    console.warn('[Dooki] /checkout/carts indisponivel:', e);
    return [];
  }
}

// Agregacoes
function orderValue(o: YampiOrder): number {
  if (typeof o.value_total === 'number') return o.value_total;
  if (typeof o.total       === 'string') return parseFloat(o.total) || 0;
  return 0;
}

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

  const byHour: number[] = Array(24).fill(0);
  for (const o of orders) {
    if (!o.created_at) continue;
    const h = parseInt(
      new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false,
      }).format(new Date(toIso(o.created_at))),
      10,
    );
    if (h >= 0 && h < 24) byHour[h]++;
  }

  const byState = new Map<string, { pedidos: number; faturamento: number }>();
  for (const o of orders) {
    const addr = o.address?.[0];
    const st   = addr?.uf ?? addr?.state ?? 'N/A';
    const cur  = byState.get(st) ?? { pedidos: 0, faturamento: 0 };
    cur.pedidos++;
    cur.faturamento += orderValue(o);
    byState.set(st, cur);
  }

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
        name: name.length > 30 ? name.slice(0, 29) + '...' : name, ...v,
      }))
      .sort((a, b) => b.faturamento - a.faturamento),
  };
}

export { cartValue };
