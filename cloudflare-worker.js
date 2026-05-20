/**
 * Cloudflare Worker — Yampi Cache via KV
 *
 * Endpoints:
 *   GET  /ping        → health check
 *   POST /store       → salva dataset completo (GitHub Action / sync manual)
 *   POST /add-order   → adiciona/atualiza 1 pedido (webhook em tempo real)
 *   GET  /cache       → lê dados do KV para o dashboard
 */

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

    // ── POST /store — substitui dataset completo (sync manual / GitHub Action)
    if (url.pathname === '/store' && request.method === 'POST') {
      if (!authorized) return unauth();

      let body;
      try { body = await request.json(); } catch {
        return err400('invalid_json');
      }

      const { orders = [], carts = [], month, year } = body;
      const key  = `vip-${year}-${String(month).padStart(2, '0')}`;
      const data = { orders, carts, fetchedAt: new Date().toISOString() };

      await env.YAMPI_CACHE.put(key, JSON.stringify(data));

      return new Response(JSON.stringify({ ok: true, key, orders: orders.length, carts: carts.length }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // ── POST /add-order — adiciona 1 pedido via webhook (tempo real) ─────────
    if (url.pathname === '/add-order' && request.method === 'POST') {
      if (!authorized) return unauth();

      let body;
      try { body = await request.json(); } catch {
        return err400('invalid_json');
      }

      const { order, month, year } = body;
      if (!order || !month || !year) return err400('missing_fields');

      const key     = `vip-${year}-${String(month).padStart(2, '0')}`;
      const raw     = await env.YAMPI_CACHE.get(key);
      const current = raw
        ? JSON.parse(raw)
        : { orders: [], carts: [], fetchedAt: null };

      const exists = current.orders.some(o => o.id === order.id);
      if (!exists) current.orders.push(order);
      current.fetchedAt = new Date().toISOString();

      await env.YAMPI_CACHE.put(key, JSON.stringify(current));

      console.log(`[Worker] /add-order key=${key} total=${current.orders.length} dup=${exists}`);

      return new Response(JSON.stringify({
        ok: true, key,
        total_orders: current.orders.length,
        duplicate: exists,
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
    }

    // ── GET /cache — lê dados do KV ──────────────────────────────────────────
    if (url.pathname === '/cache') {
      if (!authorized) return unauth();

      const month = url.searchParams.get('month') ?? String(new Date().getMonth() + 1);
      const year  = url.searchParams.get('year')  ?? String(new Date().getFullYear());
      const key   = `vip-${year}-${String(month).padStart(2, '0')}`;
      const raw   = await env.YAMPI_CACHE.get(key);

      if (!raw) {
        return new Response(JSON.stringify({
          error:   'no_data',
          message: `Nenhum dado para ${month}/${year}. Aguarde o próximo pedido VIP ou use o sync manual.`,
        }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
      }

      return new Response(raw, {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Dashboard-Key',
  };
}
function unauth() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: { 'Content-Type': 'application/json' },
  });
}
function err400(msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
