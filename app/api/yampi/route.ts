import { NextRequest, NextResponse } from 'next/server';
import { fetchVipOrders, fetchVipCarts, aggregateOrders, getMonthRange } from '@/lib/yampi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Cache em memória (15 min por chave mês/ano) ───────────────────────────────
// Evita re-buscar a API a cada refresh de página enquanto o servidor está ativo.

interface CacheEntry {
  orders:    Awaited<ReturnType<typeof fetchVipOrders>>;
  carts:     Awaited<ReturnType<typeof fetchVipCarts>>;
  fetchedAt: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL   = 15 * 60 * 1000; // 15 minutos

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month  = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10);
    const year   = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()),  10);
    const force  = searchParams.get('force') === '1'; // ?force=1 ignora cache

    const key    = `${year}-${String(month).padStart(2, '0')}`;
    const cached = cache.get(key);

    // Serve do cache se ainda válido e não foi pedido forçar
    if (cached && !force && Date.now() < cached.expiresAt) {
      const agg = aggregateOrders(cached.orders);
      console.log(`[API] Cache hit: ${key}`);
      return NextResponse.json({
        ok: true, source: 'cache',
        fetchedAt: cached.fetchedAt,
        orders: cached.orders,
        carts:  cached.carts,
        ...agg,
      });
    }

    // Busca direta na Dooki v2
    console.log(`[API] Buscando Dooki v2 para ${month}/${year}…`);
    const { dateMin, dateMax } = getMonthRange(month, year);

    const [orders, carts] = await Promise.all([
      fetchVipOrders(dateMin, dateMax),
      fetchVipCarts(dateMin, dateMax),
    ]);

    const fetchedAt = new Date().toISOString();

    // Atualiza cache
    cache.set(key, { orders, carts, fetchedAt, expiresAt: Date.now() + TTL });

    const agg = aggregateOrders(orders);
    console.log(`[API] ${key} → ${orders.length} pedidos | ${carts.length} carrinhos`);

    return NextResponse.json({
      ok: true, source: 'live',
      fetchedAt, orders, carts,
      ...agg,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API] Erro:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
