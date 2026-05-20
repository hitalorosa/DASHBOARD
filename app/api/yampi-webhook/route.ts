/**
 * POST /api/yampi-webhook?token=TOKEN
 *
 * Recebe webhooks da Yampi quando um pedido é pago.
 * Filtra apenas pedidos com UTM do Grupo VIP e salva no KV via Worker.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROXY_URL     = process.env.YAMPI_PROXY_URL     ?? '';
const PROXY_SECRET  = process.env.YAMPI_PROXY_SECRET  ?? '';
const WEBHOOK_TOKEN = process.env.YAMPI_WEBHOOK_TOKEN ?? 'noue-yampi-wh-2026';

const VIP_SOURCE   = 'grupo_vip';
const VIP_CAMPAIGN = 'whatsapp';

export async function POST(req: NextRequest) {
  // ── Verifica token ────────────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  if (searchParams.get('token') !== WEBHOOK_TOKEN) {
    console.warn('[Webhook] Token inválido');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[Webhook] Evento recebido:', JSON.stringify(body).slice(0, 300));

  // ── Extrai o pedido (Yampi pode envolver em data ou resource) ─────────────
  const order = (
    (body.resource as Record<string, unknown>) ??
    (body.data    as Record<string, unknown>) ??
    body
  ) as Record<string, unknown>;

  const event = (body.event as string) ?? '';

  // ── Aceita apenas pedidos pagos ───────────────────────────────────────────
  const status = (order.status as string) ?? '';
  if (status !== 'paid' && !event.includes('paid')) {
    console.log(`[Webhook] Ignorado — status: ${status} | event: ${event}`);
    return NextResponse.json({ ok: true, skipped: `status=${status}` });
  }

  // ── Filtra UTM do Grupo VIP ───────────────────────────────────────────────
  const tracking = (order.tracking as Record<string, string>) ?? {};
  const utmSource   = tracking.utm_source   ?? '';
  const utmCampaign = tracking.utm_campaign ?? '';

  if (utmSource !== VIP_SOURCE || utmCampaign !== VIP_CAMPAIGN) {
    console.log(`[Webhook] Ignorado — utm_source=${utmSource} utm_campaign=${utmCampaign}`);
    return NextResponse.json({ ok: true, skipped: 'not_vip_utm' });
  }

  // ── Extrai mês/ano do pedido ──────────────────────────────────────────────
  const createdAt = (order.created_at as string) ?? new Date().toISOString();
  const orderDate = new Date(createdAt);
  const month     = orderDate.getMonth() + 1;
  const year      = orderDate.getFullYear();

  console.log(`[Webhook] Pedido VIP #${order.number} — ${month}/${year} — R$${order.total}`);

  // ── Envia para Worker → KV ────────────────────────────────────────────────
  if (!PROXY_URL) {
    return NextResponse.json({ error: 'YAMPI_PROXY_URL não configurado' }, { status: 500 });
  }

  const workerRes = await fetch(`${PROXY_URL.replace(/\/$/, '')}/add-order`, {
    method:  'POST',
    headers: { 'X-Dashboard-Key': PROXY_SECRET, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ order, month, year }),
  });

  if (!workerRes.ok) {
    const txt = await workerRes.text();
    console.error('[Webhook] Erro no Worker:', txt);
    return NextResponse.json({ error: `Worker: ${txt.slice(0, 200)}` }, { status: 500 });
  }

  const result = await workerRes.json();
  console.log('[Webhook] Salvo no KV:', result);

  return NextResponse.json({ ok: true, ...result });
}
