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

function headers() {
  return {
    'Authorization': `Bearer ${TOKEN}`,
    'User-Token': TOKEN,
    'User-Secret-Key': SECRET_KEY,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'DashNoue/1.0',
  };
}

async function fetchAllPages<T>(
  endpoint: string,
  params: Record<string, string>,
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;

  while (true) {
    const qs = new URLSearchParams({ ...params, page: String(page), limit: '100' });
    const url = `${BASE_URL}/${endpoint}?${qs}`;
    const res = await fetch(url, { headers: headers(), next: { revalidate: 0 } });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const isHtml = text.trim().startsWith('<');
      const detail = isHtml
        ? `bloqueado pelo servidor (Cloudflare/WAF) — status ${res.status}`
        : text.slice(0, 300);
      throw new Error(`Yampi API ${res.status}: ${detail}`);
    }

    const json = await res.json();

    // Yampi wraps in data.data or data.items or items
    const items: T[] =
      json?.data?.data ??
      json?.data?.items ??
      json?.items ??
      json?.data ??
      [];

    results.push(...items);

    const totalPages: number =
      json?.data?.last_page ??
      json?.data?.pagination?.total_pages ??
      json?.meta?.last_page ??
      1;

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
