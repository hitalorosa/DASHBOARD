// ── Yampi / Dooki v2 API client ───────────────────────────────────────────────
//
// Endpoint correto: https://api.dooki.com.br/v2/{ALIAS}
// (api.yampi.io/v1 é obsoleto e bloqueado por WAF em datacenters)
//
// Estratégia de cache:
//   Cloudflare KV → leitura rápida pelo dashboard
//   Sincronização via webhook (tempo real) + GitHub Actions (3x/dia)

const ALIAS      = process.env.YAMPI_ALIAS      ?? '';
const TOKEN      = process.env.YAMPI_TOKEN      ?? '';
const SECRET_KEY = process.env.YAMPI_SECRET_KEY ?? '';

const BASE_URL = `https://api.dooki.com.br/v2/${ALIAS}`;

export const VIP_UTM = { source: 'grupo_vip', campaign: 'whatsapp' } as const;

// Statuses que indicam pedido pago / em processamento
const PAID_STATUSES = new Set([
  'paid',
  'payment_approved',
  'approved',
  'handling_products',
  'in_separation',
  'invoiced',
  'ready_for_shipping',
  'on_carriage',
  'shipped',
  'delivered',
]);

// ── Timezone helpers ─────────────────────────────────────────────────────────

/** Retorna a data atual no fuso de Brasília no formato YYYY-MM-DD */
export function getBRTDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(d);
}

/** Primeiro e último dia do mês em BRT */
export function getMonthRange(month: number, year: number): { dateMin: string; dateMax: string } {
  const pad   = (n: number) => String(n).padStart(2, '0');
  const last  = new Date(year, month, 0).getDate(); // dia 0 do próximo mês = último dia do mês atual
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
  carts: YampiCart[];
  fetchedAt: string;
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

function buildHeaders(): HeadersInit {
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

/** Fetch com retry automático em 429 (rate-limit) — backoff de 2s, 4s, 6s, 8s */
async function fetchWithRetry(url: string, options: RequestInit, retries = 4): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { ...options, cache: 'no-store' });

    if (res.status !== 429) return res;

    if (attempt < retries) {
      const delay = (attempt + 1) * 2000;
      console.warn(`[Dooki] 429 rate-limit — aguardando ${delay}ms (tentativa ${attempt + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  // Última tentativa esgotada — retorna a resposta 429 para o chamador tratar
  return fetch(url, { ...options, cache: 'no-store' });
}

/**
 * Busca todas as páginas de um endpoint da Dooki v2.
 * Lotes de 3 páginas em paralelo para não estourar o rate-limit.
 */
async function fetchAllPages<T>(
  endpoint: string,
  extraParams: Record<string, string>,
): Promise<T[]> {
  const results: T[] = [];
  const LIMIT        = 50;
  const BATCH        = 3;

  const headers = buildHeaders();

  // Busca a página 1 para descobrir o total de páginas
  const firstParams = new URLSearchParams({
    ...extraParams,
    page:       '1',
    limit:      String(LIMIT),
    skipCache:  'true',
    include:    'customer,status,transactions',
  });
  const firstUrl = `${BASE_URL}/${endpoint}?${firstParams}`;
  console.log(`[Dooki] GET ${firstUrl}`);

  const firstRes = await fetchWithRetry(firstUrl, { method: 'GET', headers });
  if (!firstRes.ok) {
    const raw = await firstRes.text().catch(() => '');
    console.error(`[Dooki] ${firstRes.status} — body: ${raw.slice(0, 500)}`);
    throw new Error(`Dooki API ${firstRes.status}: ${raw.slice(0, 300)}`);
  }

  const firstJson = await firstRes.json();
  const firstItems: T[] = extractItems(firstJson);
  results.push(...firstItems);

  const totalPages: number =
    firstJson?.data?.last_page ??
    firstJson?.meta?.last_page ??
    1;

  console.log(`[Dooki] /${endpoint} — ${totalPages} página(s)`);
  if (totalPages <= 1) return results;

  // Percorre as demais páginas em lotes de BATCH
  for (let start = 2; start <= totalPages; start += BATCH) {
    const batch = [];
    for (let p = start; p < start + BATCH && p <= totalPages; p++) {
      const params = new URLSearchParams({
        ...extraParams,
        page:      String(p),
        limit:     String(LIMIT),
        skipCache: 'true',
        include:   'customer,status,transactions',
      });
      const url = `${BASE_URL}/${endpoint}?${params}`;
      batch.push(
        fetchWithRetry(url, { method: 'GET', headers })
          .then(async r => {
            if (!r.ok) {
              console.error(`[Dooki] p${p} → ${r.status}`);
              return [] as T[];
            }
            const j = await r.json();
            const items = extractItems<T>(j);
            console.log(`[Dooki] p${p}/${totalPages} — ${items.length} itens`);
            return items;
          })
          .catch(e => {
            console.error(`[Dooki] p${p} erro:`, e);
            return [] as T[];
          }),
      );
    }
    const batchResults = await Promise.all(batch);
    results.push(...batchResults.flat());
  }

  return results;
}

function extractItems<T>(json: Record<string, unknown>): T[] {
  return (
    (json?.data as Record<string, unknown>)?.data  as T[] ??
    (json?.data as Record<string, unknown>)?.items as T[] ??
    (json?.items as T[])                                   ??
    (Array.isArray(json?.data) ? (json.data as T[]) : null) ??
    []
  );
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Busca pedidos VIP pagos via Dooki v2.
 * Filtra por UTMs no lado do cliente (além do filtro de servidor).
 * dateMin/dateMax: YYYY-MM-DD
 */
export async function fetchVipOrders(
  dateMin: string,
  dateMax: string,
): Promise<YampiOrder[]> {
  const all = await fetchAllPages<YampiOrder>('orders', {
    'date':          `created_at:${dateMin}|${dateMax}`,
    'utm_source':    VIP_UTM.source,
    'utm_campaign':  VIP_UTM.campaign,
  });

  // Filtra pelo lado do cliente: somente pagos com AMBAS as UTMs
  return all.filter(
    o => PAID_STATUSES.has(o.status) && isVip(o.tracking),
  );
}

/**
 * Busca carrinhos abandonados VIP via Dooki v2.
 * Retorna [] se o endpoint não estiver disponível no plano.
 */
export async function fetchVipCarts(
  dateMin: string,
  dateMax: string,
): Promise<YampiCart[]> {
  try {
    const all = await fetchAllPages<YampiCart>('carts', {
      'date':         `created_at:${dateMin}|${dateMax}`,
      'utm_source':   VIP_UTM.source,
      'utm_campaign': VIP_UTM.campaign,
    });
    return all.filter(c => isVip(c.tracking));
  } catch (e) {
    console.warn('[Dooki] /carts indisponível:', e);
    return [];
  }
}

// ── Aggregation helpers ──────────────────────────────────────────────────────

export function aggregateOrders(orders: YampiOrder[]) {
  const totalFat = orders.reduce((s, o) => s + parseFloat(o.total || '0'), 0);
  const totalPed = orders.length;
  const ticket   = totalPed > 0 ? totalFat / totalPed : 0;

  // Pedidos por hora (0-23) em BRT
  const byHour: number[] = Array(24).fill(0);
  for (const o of orders) {
    const brtStr = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour:     'numeric',
      hour12:   false,
    }).format(new Date(o.created_at));
    const h = parseInt(brtStr, 10);
    if (h >= 0 && h < 24) byHour[h]++;
  }

  // Pedidos por estado
  const byState = new Map<string, { pedidos: number; faturamento: number }>();
  for (const o of orders) {
    const state = o.customer?.addresses?.[0]?.state ?? 'N/A';
    const cur   = byState.get(state) ?? { pedidos: 0, faturamento: 0 };
    cur.pedidos++;
    cur.faturamento += parseFloat(o.total || '0');
    byState.set(state, cur);
  }

  // Produtos mais vendidos
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
