/**
 * GET /api/yampi-debug
 * Testa a conexão com a Dooki v2 e retorna a resposta bruta para diagnóstico.
 * DELETE este arquivo após resolver o problema.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALIAS      = process.env.YAMPI_ALIAS      ?? '';
const TOKEN      = process.env.YAMPI_TOKEN      ?? '';
const SECRET_KEY = process.env.YAMPI_SECRET_KEY ?? '';

export async function GET() {
  const results: Record<string, unknown> = {
    env: {
      hasAlias:     !!ALIAS,
      hasToken:     !!TOKEN,
      hasSecretKey: !!SECRET_KEY,
      alias:        ALIAS || '(vazio)',
    },
  };

  if (!ALIAS || !TOKEN || !SECRET_KEY) {
    return NextResponse.json({ ...results, error: 'Variáveis de ambiente faltando' }, { status: 500 });
  }

  const headers = {
    'User-Token':      TOKEN,
    'User-Secret-Key': SECRET_KEY,
    'Accept':          'application/json',
  };

  const base = `https://api.dooki.com.br/v2/${ALIAS}`;

  // Teste 1 — search/orders com UTM VIP (sem filtro de data)
  try {
    const params = new URLSearchParams();
    params.append('utm_source[]', 'grupo_vip');
    params.append('utm_campaign[]', 'whatsapp');
    params.set('include', 'status');
    params.set('limit', '2');
    const url = `${base}/search/orders?${params}`;
    const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
    const raw = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(raw); } catch { /* ignore */ }
    // Extrair apenas os campos de diagnóstico dos primeiros itens
    let sample: unknown = null;
    if (parsed && typeof parsed === 'object') {
      const p = parsed as Record<string, unknown>;
      const data = Array.isArray(p.data) ? p.data : [];
      sample = data.slice(0, 2).map((o: unknown) => {
        if (!o || typeof o !== 'object') return o;
        const obj = o as Record<string, unknown>;
        return {
          id:           obj.id,
          created_at:   obj.created_at,
          created_at_type: typeof obj.created_at,
          utm_source:   obj.utm_source,
          utm_campaign: obj.utm_campaign,
          status:       obj.status,
          value_total:  obj.value_total,
          tracking:     obj.tracking,
        };
      });
    }
    results['test1_search_orders'] = {
      url,
      status:  res.status,
      ok:      res.ok,
      body_raw: raw.slice(0, 600),
      sample,
    };
  } catch (e) {
    results['test1_search_orders'] = { error: String(e) };
  }

  // Teste 2 — orders normais com filtro de data (para comparar created_at format)
  try {
    const params = new URLSearchParams();
    params.set('filters[date]', 'created_at:2026-05-01|2026-05-31');
    params.set('include', 'status');
    params.set('limit', '2');
    const url = `${base}/orders?${params}`;
    const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
    const raw = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(raw); } catch { /* ignore */ }
    let sample: unknown = null;
    if (parsed && typeof parsed === 'object') {
      const p = parsed as Record<string, unknown>;
      const dataEnv = (p.data as Record<string, unknown> | undefined);
      const arr = Array.isArray(p.data) ? p.data : (Array.isArray(dataEnv?.data) ? dataEnv!.data as unknown[] : []);
      sample = arr.slice(0, 2).map((o: unknown) => {
        if (!o || typeof o !== 'object') return o;
        const obj = o as Record<string, unknown>;
        return {
          id:           obj.id,
          created_at:   obj.created_at,
          created_at_type: typeof obj.created_at,
          utm_source:   obj.utm_source,
          utm_campaign: obj.utm_campaign,
        };
      });
    }
    results['test2_orders_normal'] = {
      url,
      status:  res.status,
      ok:      res.ok,
      sample,
    };
  } catch (e) {
    results['test2_orders_normal'] = { error: String(e) };
  }

  return NextResponse.json(results, { status: 200 });
}
