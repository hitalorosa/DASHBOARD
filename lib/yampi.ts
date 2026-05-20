// ── Yampi API client ─────────────────────────────────────────────────────────
//
// Fluxo:
//   Vercel (Next.js API route)
//     → Cloudflare Worker  (YAMPI_PROXY_URL)   ← resolve bloqueio de IP datacenter
//       → api.yampi.io
//
// Se YAMPI_PROXY_URL não estiver definido, tenta direto (funciona em dev local).

const ALIAS        = process.env.YAMPI_ALIAS        ?? '';
const TOKEN        = process.env.YAMPI_TOKEN        ?? '';
const SECRET_KEY   = process.env.YAMPI_SECRET_KEY   ?? '';
const PROXY_URL    = process.env.YAMPI_PROXY_URL    ?? '';   // URL do Cloudflare Worker
const PROXY_SECRET = process.env.YAMPI_PROXY_SECRET ?? '';   // segredo compartilhado

const BASE_URL = PROXY_URL
  ? `${PROXY_URL.replace(/\/$/, '')}/v1/${ALIAS}`   // via Worker
  : `https://api.yampi.io/v1/${ALIAS}`;             // direto (dev)

export const VIP_UTM = { source: 'grupo_vip', campaign: 'whatsapp' } as const;

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
  carts: YampiCart[];
  fetchedAt: string;
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

function buildHeaders(): HeadersInit {
  if (PROXY_URL) {
    // Chamada vai para o Worker — só precisa do segredo de autenticação
    return {
      'X-Dashboard-Key': PROXY_SECRET,
      'Accept':          'application/json',
      'Content-Type':    'application/json',
    };
  }

  // Fallback: chamada direta (dev local ou se Worker não estiver configurado)
  return {
    'User-Token':      TOKEN,
    'User-Secret-Key': SECRET_KEY,
    'Accept':          'application/json',
    'Content-Type':    'application/json',
  };
}

async function fetchAllPages<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;

  while (true) {
    const qs  = new URLSearchParams({ ...params, page: String(page), limit: '100' });
    const url = `${BASE_URL}/${endpoint}?${qs}`;

    console.log(`[Yampi] GET ${url}`);

    const res = await fetch(url, {
      method:  'GET',
      headers: buildHeaders(),
      cache:   'no-store',
    });

    if (!res.ok) {
      const raw  = await res.text().catch(() => '');
      const isHtml = raw.trim().startsWith('<');

      // Log completo no servidor para análise
      console.error(`[Yampi] ${res.status} ${res.statusText}`);
      console.error(`[Yampi] Headers:`, Object.fromEntries(res.headers.entries()));
      console.error(`[Yampi] Body (500 chars):`, raw.slice(0, 500));

      if (isHtml) {
        throw new Error(
          `Yampi bloqueou a requisição (${res.status}) — ` +
          `possível desafio Cloudflare. Verifique os logs do Vercel para o body completo.`,
        );
      }

      let detail = raw.slice(0, 400);
      try { detail = JSON.stringify(JSON.parse(raw), null, 2).slice(0, 400); } catch { /* keep raw */ }
      throw new Error(`Yampi API ${res.status}: ${detail}`);
    }

    const json = await res.json();
    console.log(`[Yampi] page ${page} ok — keys:`, Object.keys(json));

    // Yampi pode aninhar em data.data, data.items ou items
    const items: T[] =
      json?.data?.data  ??
      json?.data?.items ??
      json?.items       ??
      (Array.isArray(json?.data) ? json.data : null) ??
      [];

    results.push(...items);

    const totalPages: number =
      json?.data?.last_page              ??
      json?.data?.pagination?.total_pages ??
      json?.meta?.last_page              ??
      1;

    console.log(`[Yampi] page ${page}/${totalPages} — ${items.length} items`);
    if (page >= totalPages || items.length === 0) break;
    page++;
  }

  return results;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function fetchVipOrders(
  dateMin: string,
  dateMax: string,
): Promise<YampiOrder[]> {
  return fetchAllPages<YampiOrder>('orders', {
    utm_source:     VIP_UTM.source,
    utm_campaign:   VIP_UTM.campaign,
    status:         'paid',
    created_at_min: dateMin,
    created_at_max: dateMax,
  });
}

export async function fetchVipCarts(
  dateMin: string,
  dateMax: string,
): Promise<YampiCart[]> {
  try {
    return await fetchAllPages<YampiCart>('carts', {
      utm_source:   VIP_UTM.source,
      utm_campaign: VIP_UTM.campaign,
      created_at_min: dateMin,
      created_at_max: dateMax,
    });
  } catch {
    // carrinhos podem não estar disponíveis em todos os planos
    return [];
  }
}

// ── Aggregation helpers (used by both API route and page) ────────────────────

export function aggregateOrders(orders: YampiOrder[]) {
  const totalFat    = orders.reduce((s, o) => s + parseFloat(o.total || '0'), 0);
  const totalPed    = orders.length;
  const ticket      = totalPed > 0 ? totalFat / totalPed : 0;

  // Orders by hour (0-23)
  const byHour: number[] = Array(24).fill(0);
  for (const o of orders) {
    const h = new Date(o.created_at).getHours();
    byHour[h]++;
  }

  // Orders by state
  const byState = new Map<string, { pedidos: number; faturamento: number }>();
  for (const o of orders) {
    const state = o.customer?.addresses?.[0]?.state ?? 'N/A';
    const cur = byState.get(state) ?? { pedidos: 0, faturamento: 0 };
    cur.pedidos++;
    cur.faturamento += parseFloat(o.total || '0');
    byState.set(state, cur);
  }

  // Products most sold
  const byProduct = new Map<string, { quantidade: number; faturamento: number }>();
  for (const o of orders) {
    for (const item of o.items ?? []) {
      const name = item.sku?.title ?? item.name ?? 'Produto';
      const cur  = byProduct.get(name) ?? { quantidade: 0, faturamento: 0 };
      cur.quantidade  += item.quantity ?? 1;
      cur.faturamento += (parseFloat(item.price || '0')) * (item.quantity ?? 1);
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
      .map(([name, v]) => ({ name: name.length > 30 ? name.slice(0, 29) + '…' : name, ...v }))
      .sort((a, b) => b.faturamento - a.faturamento),
  };
}
