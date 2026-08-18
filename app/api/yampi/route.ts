import { NextRequest, NextResponse } from 'next/server';
import { fetchVipOrders, fetchVipCarts, aggregateOrders, getMonthRange, getBrandCreds } from '@/lib/yampi';
import { findBrand, DEFAULT_BRAND } from '@/lib/brands';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CacheEntry {
  orders:    Awaited<ReturnType<typeof fetchVipOrders>>;
  carts:     Awaited<ReturnType<typeof fetchVipCarts>>;
  fetchedAt: string;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const TTL   = 30 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Marca sempre validada contra a lista conhecida — nunca vira lookup de env arbitrário
    const brand = findBrand(searchParams.get('brand')) ?? DEFAULT_BRAND;

    const creds = getBrandCreds(brand.yampiEnvPrefix);
    if (!creds) {
      return NextResponse.json(
        { ok: false, error: `Credenciais da Yampi não configuradas para ${brand.name}` },
        { status: 503 },
      );
    }

    const month  = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10);
    const year   = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()),  10);
    const force  = searchParams.get('force') === '1';

    // Cache por marca — sem o id, DrySkin leria o cache da Nouê
    const key    = `${brand.id}:${year}-${String(month).padStart(2, '0')}`;
    const cached = cache.get(key);

    if (cached && !force && Date.now() < cached.expiresAt) {
      const agg = aggregateOrders(cached.orders);
      return NextResponse.json({
        ok: true, source: 'cache', brand: brand.id,
        fetchedAt: cached.fetchedAt,
        orders: cached.orders, carts: cached.carts,
        ...agg,
      });
    }

    const { dateMin, dateMax } = getMonthRange(month, year);
    const [orders, carts] = await Promise.all([
      fetchVipOrders(creds, dateMin, dateMax),
      fetchVipCarts(creds, dateMin, dateMax),
    ]);

    const fetchedAt = new Date().toISOString();
    cache.set(key, { orders, carts, fetchedAt, expiresAt: Date.now() + TTL });

    const agg = aggregateOrders(orders);
    return NextResponse.json({ ok: true, source: 'live', brand: brand.id, fetchedAt, orders, carts, ...agg });

  } catch {
    return NextResponse.json({ ok: false, error: 'Erro interno' }, { status: 500 });
  }
}
