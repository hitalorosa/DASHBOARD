/**
 * Cloudflare Worker — Yampi Cache via KV
 *
 * Endpoints:
 *   GET  /ping        → health check
 *   POST /store       → salva dataset completo
 *   POST /add-order   → adiciona 1 pedido pago (webhook)
 *   POST /add-cart    → adiciona 1 carrinho abandonado (webhook)
 *   GET  /cache       → lê dados do KV para o dashboard
 */

const VIP_SOURCE   = 'grupo_vip';
const VIP_CAMPAIGN = 'whatsapp';

function isVip(tracking) {
  return (
    tracking?.utm_source   === VIP_SOURCE &&
    tracking?.utm_campaign === VIP_CAMPAIGN
  );
}

export default {
  async fetch(request, env) {

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // ── GET /ping ────────────────────────────────────────────────────────────
    if (url.pathname === '/ping') {
      return new Response(JSON.stringify({
        ok: true,
        hasToken:   !!env.YAMPI_TOKEN,
        hasSecret:  !!env.YAMPI_SECRET_KEY,
        hasDashKey: !!env.DASHBOARD_SECRET,
        hasKV:      !!env.YAMPI_CACHE,
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
    }

    // ── Auth ─────────────────────────────────────────────────────────────────
    const dashKey    = request.headers.get('X-Dashboard-Key') ?? '';
    const authorized = !!env.DASHBOARD_SECRET && dashKey === env.DASHBOARD_SECRET;

    // ── POST /store ───────────────────────────────────────────────────────────
    if (url.pathname === '/store' && request.method === 'POST') {
      if (!authorized) return unauth();
      let body;
      try { body = await request.json(); } catch { return err400('invalid_json'); }
      const { orders = [], carts = [], month, year } = body;
      const key = `vip-${year}-${String(month).padStart(2, '0')}`;
      await env.YAMPI_CACHE.put(key, JSON.stringify({ orders, carts, fetchedAt: new Date().toISOString() }));
      return json200({ ok: true, key, orders: orders.length, carts: carts.length });
    }

    // ── POST /add-order — pedido pago via webhook ─────────────────────────────
    if (url.pathname === '/add-order' && request.method === 'POST') {
      if (!authorized) return unauth();
      let body;
      try { body = await request.json(); } catch { return err400('invalid_json'); }
      const { order, month, year } = body;
      if (!order || !month || !year) return err400('missing_fields');

      // Garante as 2 UTMs
      if (!isVip(order.tracking)) {
        return json200({ ok: true, skipped: 'not_vip_utm' });
      }

      const key     = `vip-${year}-${String(month).padStart(2, '0')}`;
      const raw     = await env.YAMPI_CACHE.get(key);
      const current = raw ? JSON.parse(raw) : { orders: [], carts: [], fetchedAt: null };
      const exists  = current.orders.some(o => o.id === order.id);
      if (!exists) current.orders.push(order);
      current.fetchedAt = new Date().toISOString();
      await env.YAMPI_CACHE.put(key, JSON.stringify(current));

      console.log(`[Worker] /add-order key=${key} total=${current.orders.length} dup=${exists}`);
      return json200({ ok: true, key, total_orders: current.orders.length, duplicate: exists });
    }

    // ── POST /add-cart — carrinho abandonado via webhook ──────────────────────
    if (url.pathname === '/add-cart' && request.method === 'POST') {
      if (!authorized) return unauth();
      let body;
      try { body = await request.json(); } catch { return err400('invalid_json'); }
      const { cart, month, year } = body;
      if (!cart || !month || !year) return err400('missing_fields');

      // Garante as 2 UTMs
      if (!isVip(cart.tracking)) {
        return json200({ ok: true, skipped: 'not_vip_utm' });
      }

      const key     = `vip-${year}-${String(month).padStart(2, '0')}`;
      const raw     = await env.YAMPI_CACHE.get(key);
      const current = raw ? JSON.parse(raw) : { orders: [], carts: [], fetchedAt: null };
      const exists  = current.carts.some(c => c.id === cart.id);
      if (!exists) current.carts.push(cart);
      current.fetchedAt = new Date().toISOString();
      await env.YAMPI_CACHE.put(key, JSON.stringify(current));

      console.log(`[Worker] /add-cart key=${key} total=${current.carts.length} dup=${exists}`);
      return json200({ ok: true, key, total_carts: current.carts.length, duplicate: exists });
    }

    // ── GET /cache ────────────────────────────────────────────────────────────
    if (url.pathname === '/cache') {
      if (!authorized) return unauth();
      const month = url.searchParams.get('month') ?? String(new Date().getMonth() + 1);
      const year  = url.searchParams.get('year')  ?? String(new Date().getFullYear());
      const key   = `vip-${year}-${String(month).padStart(2, '0')}`;
      const raw   = await env.YAMPI_CACHE.get(key);
      if (!raw) {
        return new Response(JSON.stringify({ error: 'no_data', message: `Nenhum dado para ${month}/${year}.` }), {
          status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        });
      }
      return new Response(raw, { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
    }

    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Dashboard-Key',
  };
}
function json200(data) {
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
}
function unauth() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
}
function err400(msg) {
  return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
}
