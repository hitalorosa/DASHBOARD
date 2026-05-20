/**
 * Cloudflare Worker — Yampi API Reverse Proxy
 *
 * Deploy em: https://workers.cloudflare.com
 *
 * Variáveis de ambiente (definir no painel Cloudflare → Worker → Settings → Variables):
 *   YAMPI_TOKEN       → seu token Yampi
 *   YAMPI_SECRET_KEY  → sua chave secreta Yampi
 *   DASHBOARD_SECRET  → string aleatória sua (ex: openssl rand -hex 32)
 *                       precisa ser a mesma que YAMPI_PROXY_SECRET no Vercel
 */

export default {
  async fetch(request, env) {

    // ── CORS preflight ───────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // ── Autenticação: só aceita chamadas do nosso backend Vercel ─────────────
    const dashKey = request.headers.get('X-Dashboard-Key') ?? '';
    if (!env.DASHBOARD_SECRET || dashKey !== env.DASHBOARD_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Constrói URL da Yampi a partir do path + query do request ────────────
    const incoming = new URL(request.url);

    // Remove o prefixo /yampi-proxy se existir (caso use rota customizada)
    const yampiPath = incoming.pathname.replace(/^\/yampi-proxy/, '');
    const yampiUrl  = `https://api.yampi.io${yampiPath}${incoming.search}`;

    console.log('[Worker] Proxying →', yampiUrl);

    // ── Faz a chamada para Yampi com as credenciais reais ────────────────────
    let yampiRes;
    try {
      yampiRes = await fetch(yampiUrl, {
        method: 'GET',
        headers: {
          'User-Token':      env.YAMPI_TOKEN,
          'User-Secret-Key': env.YAMPI_SECRET_KEY,
          'Accept':          'application/json',
          'Content-Type':    'application/json',
          // Worker roda na rede Cloudflare — não precisa de UA fake
        },
      });
    } catch (err) {
      console.error('[Worker] Fetch error:', err.message);
      return new Response(JSON.stringify({ error: 'proxy_fetch_failed', detail: err.message }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // ── Repassa a resposta da Yampi de volta para o Vercel ───────────────────
    const body        = await yampiRes.text();
    const contentType = yampiRes.headers.get('Content-Type') ?? 'application/json';

    console.log('[Worker] Yampi status:', yampiRes.status, '— body length:', body.length);

    return new Response(body, {
      status:  yampiRes.status,
      headers: {
        'Content-Type': contentType,
        ...corsHeaders(),
      },
    });
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Dashboard-Key',
  };
}
