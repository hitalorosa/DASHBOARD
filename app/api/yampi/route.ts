import { NextRequest, NextResponse } from 'next/server';
import { fetchVipOrders, fetchVipCarts, aggregateOrders, getMonthRange } from '@/lib/yampi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cache em memória por 15 minutos
interface CacheEntry {
  orders:    Awaited<ReturnType<typeof fetchVipOrders>>;
  carts:     Awaited<ReturnType<typeof fetchVipCarts>>;
  fetchedAt: string;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const TTL   = 30 * 60 * 1000; // 30 min — reduz chamadas à Dooki

const ALIAS      = process.env.YAMPI_ALIAS      ?? '';
const TOKEN      = process.env.YAMPI_TOKEN      ?? '';
const SECRET_KEY = process.env.YAMPI_SECRET_KEY ?? '';

export async function GET(req: NextRequest) {
  // Diagnóstico de variáveis de ambiente
  if (!ALIAS || !TOKEN || !SECRET_KEY) {
    return NextResponse.json({
      ok: false,
      error: `Variáveis de ambiente faltando: ${[
        !ALIAS      && 'YAMPI_ALIAS',
        !TOKEN      && 'YAMPI_TOKEN',
        !SECRET_KEY && 'YAMPI_SECRET_KEY',
      ].filter(Boolean).join(', ')}`,
    }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const month  = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10);
    const year   = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()),  10);
    const force  = searchParams.get('force') === '1';

    const key    = `${year}-${String(month).padStart(2, '0')}`;
    const cached = cache.get(key);

    if (cached && !force && Date.now() < cached.expiresAt) {
      const agg = aggregateOrders(cached.orders);
      console.log(`[API] cache hit: ${key}`);
      return NextResponse.json({
        ok: true, source: 'cache',
        fetchedAt: cached.fetchedAt,
        orders: cached.orders, carts: cached.carts,
        ...agg,
      });
    }

    console.log(`[API] buscando Dooki v2 — alias=${ALIAS} mês=${month}/${year}`);
    const { dateMin, dateMax } = getMonthRange(month, year);

    const [orders, carts] = await Promise.all([
      fetchVipOrders(dateMin, dateMax),
      fetchVipCarts(dateMin, dateMax),
    ]);

    const fetchedAt = new Date().toISOString();
    cache.set(key, { orders, carts, fetchedAt, expiresAt: Date.now() + TTL });

    const agg = aggregateOrders(orders);
    console.log(`[API] ${key} → ${orders.length} pedidos | ${carts.length} carrinhos`);

    // DEBUG: verifica cobertura de items e preços
    let totalItems = 0, ordersWithItems = 0, sumItemRevenue = 0, sumOrderRevenue = 0;
    for (const o of orders) {
      const rawItems = (o as unknown as Record<string,unknown>).items as unknown;
      const items = Array.isArray(rawItems) ? rawItems
        : Array.isArray((rawItems as Record<string,unknown>)?.data) ? (rawItems as Record<string,unknown>).data as unknown[]
        : [];
      if (items.length > 0) ordersWithItems++;
      totalItems += items.length;
      for (const it of items as Record<string,unknown>[]) {
        const p = parseFloat(String(it.price ?? 0));
        const q = Number(it.quantity ?? 1);
        sumItemRevenue += p * q;
      }
      sumOrderRevenue += typeof o.value_total === 'number' ? o.value_total : parseFloat(String(o.total ?? 0));
    }
    console.log(`[API] items: ${ordersWithItems}/${orders.length} pedidos com items | total=${totalItems} | soma_items=R$${sumItemRevenue.toFixed(2)} | soma_orders=R$${sumOrderRevenue.toFixed(2)}`);

    return NextResponse.json({
      ok: true, source: 'live',
      fetchedAt, orders, carts,
      ...agg,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API] erro:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
