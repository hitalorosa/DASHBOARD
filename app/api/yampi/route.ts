import { NextRequest, NextResponse } from 'next/server';
import { aggregateOrders, fetchVipOrders, fetchVipCarts, getMonthRange } from '@/lib/yampi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROXY_URL    = process.env.YAMPI_PROXY_URL    ?? '';
const PROXY_SECRET = process.env.YAMPI_PROXY_SECRET ?? '';
const YAMPI_ALIAS  = process.env.YAMPI_ALIAS        ?? '';
const YAMPI_TOKEN  = process.env.YAMPI_TOKEN        ?? '';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month  = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10);
    const year   = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()),  10);

    // ── 1. Tenta ler do cache (Cloudflare KV via Worker) ─────────────────────
    if (PROXY_URL) {
      const cacheUrl = `${PROXY_URL.replace(/\/$/, '')}/cache?month=${month}&year=${year}`;
      console.log(`[API] Lendo cache → ${cacheUrl}`);

      const res = await fetch(cacheUrl, {
        method:  'GET',
        headers: { 'X-Dashboard-Key': PROXY_SECRET, 'Accept': 'application/json' },
        cache:   'no-store',
      });

      if (res.ok) {
        const { orders = [], carts = [], fetchedAt } = await res.json();
        const agg = aggregateOrders(orders);
        return NextResponse.json({ ok: true, source: 'cache', fetchedAt, orders, carts, ...agg });
      }

      if (res.status !== 404) {
        const raw = await res.text().catch(() => '');
        console.error(`[API] Worker erro ${res.status}: ${raw.slice(0, 200)}`);
      }
    }

    // ── 2. Sem cache → tenta Dooki v2 direto ────────────────────────────────
    if (!YAMPI_ALIAS || !YAMPI_TOKEN) {
      return NextResponse.json(
        { ok: false, error: 'Sem dados em cache e credenciais Yampi não configuradas.' },
        { status: 404 },
      );
    }

    console.log(`[API] Cache vazio — buscando Dooki v2 para ${month}/${year}`);
    const { dateMin, dateMax } = getMonthRange(month, year);

    const [orders, carts] = await Promise.all([
      fetchVipOrders(dateMin, dateMax),
      fetchVipCarts(dateMin, dateMax),
    ]);

    const fetchedAt = new Date().toISOString();

    // Salva no KV para próximas leituras
    if (PROXY_URL) {
      fetch(`${PROXY_URL.replace(/\/$/, '')}/store`, {
        method:  'POST',
        headers: { 'X-Dashboard-Key': PROXY_SECRET, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orders, carts, month, year }),
      }).catch(e => console.error('[API] Erro ao salvar KV:', e));
    }

    const agg = aggregateOrders(orders);
    return NextResponse.json({ ok: true, source: 'live', fetchedAt, orders, carts, ...agg });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[API] Erro:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
