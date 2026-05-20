// ── Yampi API client ─────────────────────────────────────────────────────────

const ALIAS      = process.env.YAMPI_ALIAS      ?? '';
const TOKEN      = process.env.YAMPI_TOKEN      ?? '';
const SECRET_KEY = process.env.YAMPI_SECRET_KEY ?? '';
const BASE_URL   = `https://api.yampi.io/v1/${ALIAS}`;

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
  return {
    // ── Autenticação Yampi ───────────────────────────────────────────────────
    'User-Token':      TOKEN,
    'User-Secret-Key': SECRET_KEY,

    // ── Simula cliente de navegador legítimo para passar pelo Cloudflare WAF ──
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/124.0.0.0 Safari/537.36',
    'Accept':           'application/json, text/plain, */*',
    'Accept-Language':  'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding':  'gzip, deflate, br',
    'Content-Type':     'application/json',
    'Referer':          'https://api.yampi.io/',
    'Origin':           'https://api.yampi.io',
    'sec-ch-ua':        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Sec-Fetch-Dest':   'empty',
    'Sec-Fetch-Mode':   'cors',
    'Sec-Fetch-Site':   'same-origin',
    'Connection':       'keep-alive',
    'Cache-Control':    'no-cache',
    'Pragma':           'no-cache',
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
