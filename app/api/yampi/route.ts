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

    // DEBUG CUPOM: inspeciona campos relacionados a desconto/cupom no primeiro pedido com discount
    const orderWithDiscount = (orders as unknown as Record<string,unknown>[]).find(o => {
      const vd = o.value_discount as number | undefined;
      return vd && vd > 0;
    });
    if (orderWithDiscount) {
      const keys = Object.keys(orderWithDiscount);
      const couponKeys = keys.filter(k => /coupon|discount|promo|voucher|cash/i.test(k));
      console.log('[DEBUG cupom] keys com cupom/desconto:', couponKeys);
      console.log('[DEBUG cupom] coupons raw:', JSON.stringify(orderWithDiscount.coupons));
      console.log('[DEBUG cupom] coupon_code:', orderWithDiscount.coupon_code);
      console.log('[DEBUG cupom] value_discount:', orderWithDiscount.value_discount);
      console.log('[DEBUG cupom] value_cashback:', orderWithDiscount.value_cashback);
      console.log('[DEBUG cupom] value_wallet_discount:', orderWithDiscount.value_wallet_discount);
      console.log('[DEBUG cupom] delivery_date:', orderWithDiscount.delivery_date);
      console.log('[DEBUG cupom] shipping_carrier:', orderWithDiscount.shipping_carrier);
    }

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
