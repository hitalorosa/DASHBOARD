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
      tokenPrefix:  TOKEN     ? TOKEN.slice(0, 6)      + '...' : '(vazio)',
      secretPrefix: SECRET_KEY ? SECRET_KEY.slice(0, 6) + '...' : '(vazio)',
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

  // Teste 1 — pedido simples sem filtros (só limit=1)
  try {
    const url = `${base}/orders?limit=1`;
    const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
    const raw = await res.text();
    results['test1_orders_no_filter'] = {
      url,
      status:  res.status,
      ok:      res.ok,
      body:    raw.slice(0, 800),
    };
  } catch (e) {
    results['test1_orders_no_filter'] = { error: String(e) };
  }

  // Teste 2 — pedidos com filtro de data usando filters[date]
  try {
    const params = new URLSearchParams();
    params.set('filters[date]', 'created_at:2026-05-01|2026-05-31');
    params.set('limit', '1');
    const url = `${base}/orders?${params}`;
    const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
    const raw = await res.text();
    results['test2_orders_date_filter'] = {
      url,
      status:  res.status,
      ok:      res.ok,
      body:    raw.slice(0, 800),
    };
  } catch (e) {
    results['test2_orders_date_filter'] = { error: String(e) };
  }

  // Teste 3 — pedidos com include=status
  try {
    const params = new URLSearchParams();
    params.set('filters[date]', 'created_at:2026-05-01|2026-05-31');
    params.set('include', 'status');
    params.set('limit', '1');
    const url = `${base}/orders?${params}`;
    const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
    const raw = await res.text();
    results['test3_orders_with_include'] = {
      url,
      status:  res.status,
      ok:      res.ok,
      body:    raw.slice(0, 800),
    };
  } catch (e) {
    results['test3_orders_with_include'] = { error: String(e) };
  }

  // Teste 4 — carrinhos abandonados
  try {
    const params = new URLSearchParams();
    params.set('date', 'created_at:2026-05-01|2026-05-31');
    params.set('limit', '1');
    const url = `${base}/checkout/carts?${params}`;
    const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
    const raw = await res.text();
    results['test4_carts'] = {
      url,
      status:  res.status,
      ok:      res.ok,
      body:    raw.slice(0, 800),
    };
  } catch (e) {
    results['test4_carts'] = { error: String(e) };
  }

  return NextResponse.json(results, { status: 200 });
}
