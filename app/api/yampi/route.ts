import { NextRequest, NextResponse } from 'next/server';
import { aggregateOrders } from '@/lib/yampi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROXY_URL    = process.env.YAMPI_PROXY_URL    ?? '';
const PROXY_SECRET = process.env.YAMPI_PROXY_SECRET ?? '';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') ?? String(new Date().getMonth() + 1);
    const year  = searchParams.get('year')  ?? String(new Date().getFullYear());

    if (!PROXY_URL) {
      return NextResponse.json(
        { ok: false, error: 'YAMPI_PROXY_URL não configurado no Vercel.' },
        { status: 500 },
      );
    }

    // Lê dados do Cloudflare KV via Worker
    const cacheUrl = `${PROXY_URL.replace(/\/$/, '')}/cache?month=${month}&year=${year}`;

    console.log(`[API] Lendo cache → ${cacheUrl}`);

    const res = await fetch(cacheUrl, {
      method:  'GET',
      headers: {
        'X-Dashboard-Key': PROXY_SECRET,
        'Accept':          'application/json',
      },
      cache: 'no-store',
    });

    if (res.status === 404) {
      const body = await res.json();
      return NextResponse.json(
        { ok: false, error: body.message ?? 'Sem dados. Execute o script Python para sincronizar.' },
        { status: 404 },
      );
    }

    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      return NextResponse.json(
        { ok: false, error: `Worker retornou ${res.status}: ${raw.slice(0, 200)}` },
        { status: 500 },
      );
    }

    const { orders = [], carts = [], fetchedAt } = await res.json();
    const agg = aggregateOrders(orders);

    return NextResponse.json({
      ok: true,
      fetchedAt,
      orders,
      carts,
      ...agg,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
