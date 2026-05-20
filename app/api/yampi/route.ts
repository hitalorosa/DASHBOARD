import { NextRequest, NextResponse } from 'next/server';
import { fetchVipOrders, fetchVipCarts, aggregateOrders } from '@/lib/yampi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateMin = searchParams.get('dateMin') ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const dateMax = searchParams.get('dateMax') ?? new Date().toISOString();

    const [orders, carts] = await Promise.all([
      fetchVipOrders(dateMin, dateMax),
      fetchVipCarts(dateMin, dateMax),
    ]);

    const agg = aggregateOrders(orders);

    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      orders,
      carts,
      ...agg,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
