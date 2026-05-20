// ── Yampi / Dooki v2 API client ───────────────────────────────────────────────
//
// Chamada direta: Vercel → https://api.dooki.com.br/v2/{ALIAS}

const ALIAS      = process.env.YAMPI_ALIAS      ?? '';
const TOKEN      = process.env.YAMPI_TOKEN      ?? '';
const SECRET_KEY = process.env.YAMPI_SECRET_KEY ?? '';

const BASE_URL = `https://api.dooki.com.br/v2/${ALIAS}`;

export const VIP_UTM = { source: 'grupo_vip', campaign: 'whatsapp' } as const;

const PAID_STATUSES = new Set([
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

// ── Types ────────────────────────────────────────────────────────────────────

export interface YampiOrder {
  id: number;
  number: string;
  status: string;
  total: string;
  subtotal: string;
  created_at: string;
  customer: {
    name: string;
    email?: string;
    addresses?: { city: string; state: string }[];
  };
  tracking?: {
    utm_source?: string;
    utm_campaign?: string;
    utm_medium?: string;
  };
  items: {
    name: string;
    quantity: number;
    price: string;
    sku?: { title?: string; sku?: string };
  }[];
}

export interface YampiCart {
  id: number;
  total: string;
  created_at: string;
  tracking?: { utm_source?: string; utm_campaign?: string };
  items: { name: string; quantity: number; price: string }[];
}

export interface VipStats {
  orders: YampiOrder[];
  carts:  YampiCart[];
  fetchedAt: string;
}

// ── Fetch interno ────────────────────────────────────────────────────────────

function authHeaders(): HeadersInit {
  return {
    'User-Token':      TOKEN,
    'User-Secret-Key': SECRET_KEY,
    'Accept':          'application/json',
  };
}

function isVip(tracking?: { utm_source?: string; utm_campaign?: string }): boolean {
  return (
    tracking?.utm_source   === VIP_UTM.source &&
    tracking?.utm_campaign === VIP_UTM.campaign
  );
}

/** Extrai array de items do envelope de resposta da Dooki */
function extractItems<T>(json: Record<string, unknown>): T[] {
  const d = json?.data;
  if (Array.isArray(d)) return d as T[];
  if (d && typeof d === 'object') {
    const dd = (d as Record<string, unknown>);
    if (Array.isArray(dd.data))  return dd.data  as T[];
    if (Array.isArray(dd.items)) return dd.items as T[];
  }
  if (Array.isArray(json?.items)) return json.items as T[];
  return [];
}

function getLastPage(json: Record<string, unknown>): number {
  const d = json?.data as Record<string, unknown> | undefined;
  return (
    (d?.last_page as number) ??
    ((json?.meta as Record<string, unknown>)?.last_page as number) ??
    1
  );
}

/** Fetch com retry em 429 (backoff 2 s, 4 s, 6 s, 8 s) */
async function fetchRetry(url: string): Promise<Response> {
  const opts: RequestInit = { method: 'GET', headers: authHeaders(), cache: 'no-store' };
  for (let i = 0; i <= 4; i++) {
    const res = await fetch(url, opts);
    if (res.status !== 429) return res;
    const wait = (i + 1) * 2000;
    console.warn(`[Dooki] 429 rate-limit — aguardando ${wait}ms`);
    await new Promise(r => setTimeout(r, wait));
  }
  return fetch(url, opts);
}

/** Percorre todas as páginas — lotes de 3 paralelas */
async function fetchAllPages<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T[]> {
  const LIMIT = 50;
  const BATCH = 3;

  const buildUrl = (page: number) => {
    const qs = new URLSearchParams({ ...params, page: String(page), limit: String(LIMIT) });
    return `${BASE_URL}/${endpoint}?${qs}`;
  };

  // Página 1 — descobre total
  const r1 = await fetchRetry(buildUrl(1));
  if (!r1.ok) {
    const raw = await r1.text().catch(() => '');
    console.error(`[Dooki] /${endpoint} ${r1.status}: ${raw.slice(0, 600)}`);
    throw new Error(`Dooki API ${r1.status} ao buscar ${endpoint}`);
  }

  const j1    = await r1.json() as Record<string, unknown>;
  const items = extractItems<T>(j1);
  const total = getLastPage(j1);

  console.log(`[Dooki] /${endpoint} p1/${total} — ${items.length} itens`);
  if (total <= 1) return items;

  // Páginas restantes em lotes
  const rest: T[] = [];
  for (let start = 2; start <= total; start += BATCH) {
    const pages = Array.from(
      { length: Math.min(BATCH, total - start + 1) },
      (_, i) => start + i,
    );
    const results = await Promise.all(
      pages.map(p =>
        fetchRetry(buildUrl(p))
          .then(async r => {
            if (!r.ok) { console.error(`[Dooki] p${p} → ${r.status}`); return [] as T[]; }
            const j = await r.json() as Record<string, unknown>;
            const it = extractItems<T>(j);
            console.log(`[Dooki] /${endpoint} p${p}/${total} — ${it.length} itens`);
            return it;
          })
          .catch(e => { console.error(`[Dooki] p${p} erro:`, e); return [] as T[]; }),
      ),
    );
    rest.push(...results.flat());
  }

  return [...items, ...rest];
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Busca pedidos pagos VIP do mês.
 * Parâmetros mínimos para evitar 500 na Dooki — filtro UTM feito no cliente.
 */
export async function fetchVipOrders(dateMin: string, dateMax: string): Promise<YampiOrder[]> {
  const all = await fetchAllPages<YampiOrder>('orders', {
    'q[created_at_gteq]': dateMin,
    'q[created_at_lteq]': dateMax,
  });

  // Filtra no cliente: pago + ambas UTMs VIP
  return all.filter(o => PAID_STATUSES.has(o.status) && isVip(o.tracking));
}

/**
 * Busca carrinhos abandonados VIP do mês.
 * Retorna [] se endpoint não disponível no plano.
 */
export async function fetchVipCarts(dateMin: string, dateMax: string): Promise<YampiCart[]> {
  try {
    const all = await fetchAllPages<YampiCart>('carts', {
      'q[created_at_gteq]': dateMin,
      'q[created_at_lteq]': dateMax,
    });
    return all.filter(c => isVip(c.tracking));
  } catch (e) {
    console.warn('[Dooki] /carts indisponível:', e);
    return [];
  }
}

// ── Agregações ────────────────────────────────────────────────────────────────

export function aggregateOrders(orders: YampiOrder[]) {
  const totalFat = orders.reduce((s, o) => s + parseFloat(o.total || '0'), 0);
  const totalPed = orders.length;
  const ticket   = totalPed > 0 ? totalFat / totalPed : 0;

  const byHour: number[] = Array(24).fill(0);
  for (const o of orders) {
    const brtHour = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false,
    }).format(new Date(o.created_at));
    const h = parseInt(brtHour, 10);
    if (h >= 0 && h < 24) byHour[h]++;
  }

  const byState = new Map<string, { pedidos: number; faturamento: number }>();
  for (const o of orders) {
    const st  = o.customer?.addresses?.[0]?.state ?? 'N/A';
    const cur = byState.get(st) ?? { pedidos: 0, faturamento: 0 };
    cur.pedidos++;
    cur.faturamento += parseFloat(o.total || '0');
    byState.set(st, cur);
  }

  const byProduct = new Map<string, { quantidade: number; faturamento: number }>();
  for (const o of orders) {
    for (const item of o.items ?? []) {
      const name = item.sku?.title ?? item.name ?? 'Produto';
      const cur  = byProduct.get(name) ?? { quantidade: 0, faturamento: 0 };
      cur.quantidade  += item.quantity ?? 1;
      cur.faturamento += parseFloat(item.price || '0') * (item.quantity ?? 1);
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
