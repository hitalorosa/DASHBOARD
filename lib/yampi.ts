// ── Yampi / Dooki v2 API client ───────────────────────────────────────────────
//
// Chamada direta: Vercel → https://api.dooki.com.br/v2/{ALIAS}
// Sem proxy, sem Cloudflare Worker, sem webhook.

const ALIAS      = process.env.YAMPI_ALIAS      ?? '';
const TOKEN      = process.env.YAMPI_TOKEN      ?? '';
const SECRET_KEY = process.env.YAMPI_SECRET_KEY ?? '';

const BASE_URL = `https://api.dooki.com.br/v2/${ALIAS}`;

export const VIP_UTM = { source: 'grupo_vip', campaign: 'whatsapp' } as const;

// Todos os statuses que representam pedido pago / em produção
const PAID_STATUSES = new Set([
  'paid', 'payment_approved', 'approved',
  'handling_products', 'in_separation', 'invoiced',
  'ready_for_shipping', 'on_carriage', 'shipped', 'delivered',
]);

// ── Timezone ─────────────────────────────────────────────────────────────────

/** Primeiro e último dia do mês em BRT no formato YYYY-MM-DD */
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
  transactions?: {
    data?: { captured_at?: string; status?: string }[];
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

// ── Helpers internos ─────────────────────────────────────────────────────────

function headers(): HeadersInit {
  return {
    'User-Token':      TOKEN,
    'User-Secret-Key': SECRET_KEY,
    'Accept':          'application/json',
    'Content-Type':    'application/json',
  };
}

function isVip(tracking?: { utm_source?: string; utm_campaign?: string }): boolean {
  return (
    tracking?.utm_source   === VIP_UTM.source &&
    tracking?.utm_campaign === VIP_UTM.campaign
  );
}

function extractItems<T>(json: Record<string, unknown>): T[] {
  const d = json?.data as Record<string, unknown> | T[] | undefined;
  if (Array.isArray(d)) return d as T[];
  return (
    (d as Record<string, unknown>)?.data  as T[] ??
    (d as Record<string, unknown>)?.items as T[] ??
    (json?.items as T[])                          ??
    []
  );
}

function lastPage(json: Record<string, unknown>): number {
  const d = json?.data as Record<string, unknown> | undefined;
  return (
    (d?.last_page as number)                   ??
    (json?.meta as Record<string, unknown>)?.last_page as number ??
    1
  );
}

/** Fetch com retry automático em 429 — backoff 2s, 4s, 6s, 8s */
async function fetchRetry(url: string, retries = 4): Promise<Response> {
  const opts: RequestInit = { method: 'GET', headers: headers(), cache: 'no-store' };
  for (let i = 0; i <= retries; i++) {
    const res = await fetch(url, opts);
    if (res.status !== 429) return res;
    if (i < retries) {
      const wait = (i + 1) * 2000;
      console.warn(`[Dooki] 429 — aguardando ${wait}ms (tentativa ${i + 1})`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  return fetch(url, opts);
}

/** Busca todas as páginas em lotes de 3 paralelas */
async function fetchAllPages<T>(endpoint: string, params: Record<string, string>): Promise<T[]> {
  const LIMIT = 50;
  const BATCH = 3;

  const build = (page: number) => {
    const qs = new URLSearchParams({
      ...params,
      page:      String(page),
      limit:     String(LIMIT),
      skipCache: 'true',
      include:   'customer,status,transactions',
    });
    return `${BASE_URL}/${endpoint}?${qs}`;
  };

  // Página 1 — descobre total de páginas
  const first = await fetchRetry(build(1));
  if (!first.ok) {
    const raw = await first.text().catch(() => '');
    console.error(`[Dooki] /${endpoint} ${first.status}: ${raw.slice(0, 400)}`);
    throw new Error(`Dooki API ${first.status} ao buscar ${endpoint}`);
  }
  const firstJson = await first.json() as Record<string, unknown>;
  const results: T[] = [...extractItems<T>(firstJson)];
  const total = lastPage(firstJson);
  console.log(`[Dooki] /${endpoint} — ${total} página(s), ${results.length} itens na p1`);

  if (total <= 1) return results;

  // Demais páginas em lotes
  for (let start = 2; start <= total; start += BATCH) {
    const batch = Array.from(
      { length: Math.min(BATCH, total - start + 1) },
      (_, i) => start + i,
    );
    const pages = await Promise.all(
      batch.map(p =>
        fetchRetry(build(p))
          .then(async r => {
            if (!r.ok) { console.error(`[Dooki] p${p} → ${r.status}`); return [] as T[]; }
            const j = await r.json() as Record<string, unknown>;
            const items = extractItems<T>(j);
            console.log(`[Dooki] p${p}/${total} — ${items.length} itens`);
            return items;
          })
          .catch(e => { console.error(`[Dooki] p${p} erro:`, e); return [] as T[]; }),
      ),
    );
    results.push(...pages.flat());
  }

  return results;
}

// ── API pública ───────────────────────────────────────────────────────────────

/** Busca pedidos VIP pagos para o período dado (YYYY-MM-DD). */
export async function fetchVipOrders(dateMin: string, dateMax: string): Promise<YampiOrder[]> {
  const all = await fetchAllPages<YampiOrder>('orders', {
    date:         `created_at:${dateMin}|${dateMax}`,
    utm_source:   VIP_UTM.source,
    utm_campaign: VIP_UTM.campaign,
  });
  return all.filter(o => PAID_STATUSES.has(o.status) && isVip(o.tracking));
}

/** Busca carrinhos abandonados VIP. Retorna [] se não disponível no plano. */
export async function fetchVipCarts(dateMin: string, dateMax: string): Promise<YampiCart[]> {
  try {
    const all = await fetchAllPages<YampiCart>('carts', {
      date:         `created_at:${dateMin}|${dateMax}`,
      utm_source:   VIP_UTM.source,
      utm_campaign: VIP_UTM.campaign,
    });
    return all.filter(c => isVip(c.tracking));
  } catch (e) {
    console.warn('[Dooki] /carts indisponível:', e);
    return [];
  }
}

// ── Agregações (usadas pelo dashboard) ────────────────────────────────────────

export function aggregateOrders(orders: YampiOrder[]) {
  const totalFat = orders.reduce((s, o) => s + parseFloat(o.total || '0'), 0);
  const totalPed = orders.length;
  const ticket   = totalPed > 0 ? totalFat / totalPed : 0;

  // Pedidos por hora (BRT)
  const byHour: number[] = Array(24).fill(0);
  for (const o of orders) {
    const brtHour = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false,
    }).format(new Date(o.created_at));
    const h = parseInt(brtHour, 10);
    if (h >= 0 && h < 24) byHour[h]++;
  }

  // Por estado
  const byState = new Map<string, { pedidos: number; faturamento: number }>();
  for (const o of orders) {
    const st  = o.customer?.addresses?.[0]?.state ?? 'N/A';
    const cur = byState.get(st) ?? { pedidos: 0, faturamento: 0 };
    cur.pedidos++;
    cur.faturamento += parseFloat(o.total || '0');
    byState.set(st, cur);
  }

  // Por produto
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
    totalFat,
    totalPed,
    ticket,
    byHour,
    byState: [...byState.entries()]
      .map(([state, v]) => ({ state, ...v }))
      .sort((a, b) => b.faturamento - a.faturamento),
    byProduct: [...byProduct.entries()]
      .map(([name, v]) => ({
        name: name.length > 30 ? name.slice(0, 29) + '…' : name,
        ...v,
      }))
      .sort((a, b) => b.faturamento - a.faturamento),
  };
}
