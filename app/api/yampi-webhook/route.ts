/**
 * POST /api/yampi-webhook?token=TOKEN
 *
 * Recebe webhooks da Yampi (pedidos pagos + carrinhos abandonados).
 * OBRIGATÓRIO: utm_source=grupo_vip E utm_campaign=whatsapp
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROXY_URL     = process.env.YAMPI_PROXY_URL     ?? '';
const PROXY_SECRET  = process.env.YAMPI_PROXY_SECRET  ?? '';
const WEBHOOK_TOKEN = process.env.YAMPI_WEBHOOK_TOKEN ?? 'noue-yampi-wh-2026';

const VIP_SOURCE   = 'grupo_vip';
const VIP_CAMPAIGN = 'whatsapp';

function isVip(tracking: Record<string, string> | undefined): boolean {
  return (
    tracking?.utm_source   === VIP_SOURCE &&
    tracking?.utm_campaign === VIP_CAMPAIGN
  );
}

function getMonthYear(dateStr: string): { month: number; year: number } {
  const d = new Date(dateStr);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

async function sendToWorker(endpoint: string, body: Record<string, unknown>) {
  const res = await fetch(`${PROXY_URL.replace(/\/$/, '')}/${endpoint}`, {
    method:  'POST',
    headers: { 'X-Dashboard-Key': PROXY_SECRET, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return res;
}

export async function POST(req: NextRequest) {
  // ── Verifica token ────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  if (searchParams.get('token') !== WEBHOOK_TOKEN) {
    console.warn('[Webhook] Token inválido');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const event    = ((body.event ?? body.type ?? '') as string).toLowerCase();
  const resource = (
    (body.resource as Record<string, unknown>) ??
    (body.data    as Record<string, unknown>) ??
    body
  ) as Record<string, unknown>;

  console.log(`[Webhook] event="${event}" resource_id=${resource.id}`);

  if (!PROXY_URL) {
    return NextResponse.json({ error: 'YAMPI_PROXY_URL não configurado' }, { status: 500 });
  }

  const tracking  = (resource.tracking as Record<string, string>) ?? {};
  const createdAt = (resource.created_at as string) ?? new Date().toISOString();

  // ── Carrinho abandonado ───────────────────────────────────────────────────
  const isCartEvent = event.includes('cart') || event.includes('carrinho');
  if (isCartEvent) {
    if (!isVip(tracking)) {
      console.log(`[Webhook] Carrinho ignorado — UTMs: source=${tracking.utm_source} campaign=${tracking.utm_campaign}`);
      return NextResponse.json({ ok: true, skipped: 'not_vip_utm' });
    }

    const { month, year } = getMonthYear(createdAt);
    const workerRes = await sendToWorker('add-cart', { cart: resource, month, year });

    if (!workerRes.ok) {
      const txt = await workerRes.text();
      console.error('[Webhook] Erro Worker /add-cart:', txt);
      return NextResponse.json({ error: txt.slice(0, 200) }, { status: 500 });
    }

    const result = await workerRes.json();
    console.log(`[Webhook] Carrinho #${resource.id} salvo:`, result);
    return NextResponse.json({ ok: true, type: 'cart', ...result });
  }

  // ── Pedido pago ───────────────────────────────────────────────────────────
  const status = (resource.status as string) ?? '';
  if (status !== 'paid' && !event.includes('paid')) {
    console.log(`[Webhook] Pedido ignorado — status=${status} event=${event}`);
    return NextResponse.json({ ok: true, skipped: `status=${status}` });
  }

  if (!isVip(tracking)) {
    console.log(`[Webhook] Pedido ignorado — UTMs: source=${tracking.utm_source} campaign=${tracking.utm_campaign}`);
    return NextResponse.json({ ok: true, skipped: 'not_vip_utm' });
  }

  const { month, year } = getMonthYear(createdAt);
  const workerRes = await sendToWorker('add-order', { order: resource, month, year });

  if (!workerRes.ok) {
    const txt = await workerRes.text();
    console.error('[Webhook] Erro Worker /add-order:', txt);
    return NextResponse.json({ error: txt.slice(0, 200) }, { status: 500 });
  }

  const result = await workerRes.json();
  console.log(`[Webhook] Pedido #${resource.number} salvo:`, result);
  return NextResponse.json({ ok: true, type: 'order', ...result });
}
