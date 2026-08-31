import { NextRequest, NextResponse } from 'next/server';

/**
 * Ponte para o painel da Roleta Recovery (repo `hitalorosa/RoletaRecovery`).
 *
 * O robô vive noutro projeto na Vercel e expõe os mesmos números do painel em
 * `?view=json`. O fetch é feito aqui, no servidor, porque o CSP do dash tem
 * `connect-src 'self' https://*.supabase.co` — o browser não alcança o domínio de lá.
 *
 * A rota está mapeada em `API_AREA` (lib/nav.ts) na área `roleta`: sem isso qualquer
 * sessão válida leria os dados, mesmo sem acesso à tela.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORIGEM  = 'https://roletadry.vercel.app/';
const TTL     = 60 * 1000;   // o painel de origem também serve com max-age=60
const TIMEOUT = 30_000;      // a origem consulta Supabase + Yampi: 10 a 15s é normal

interface CacheEntry { dados: unknown; fetchedAt: string; expiresAt: number }
const cache = new Map<string, CacheEntry>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Mesma validação da origem: qualquer outra coisa vira "dia de hoje" lá
  const pedido = searchParams.get('dia') ?? '';
  const dia    = /^\d{4}-\d{2}-\d{2}$/.test(pedido) ? pedido : '';
  const force  = searchParams.get('force') === '1';

  const chave  = dia || 'hoje';
  const cached = cache.get(chave);
  if (cached && !force && Date.now() < cached.expiresAt) {
    return NextResponse.json({ ok: true, source: 'cache', fetchedAt: cached.fetchedAt, dados: cached.dados });
  }

  const url = new URL(ORIGEM);
  url.searchParams.set('view', 'json');
  if (dia) url.searchParams.set('dia', dia);
  // Opcional do outro lado: só existe se DASH_READ_TOKEN estiver setado lá
  const token = process.env.ROLETA_READ_TOKEN;
  if (token) url.searchParams.set('token', token);

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);

  let res: Response;
  try {
    res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
  } catch (e: unknown) {
    clearTimeout(timer);
    const abortou = e instanceof Error && e.name === 'AbortError';
    return NextResponse.json({
      ok: false,
      error: abortou
        ? 'A roleta demorou mais de 30s para responder. Ela consulta Supabase e Yampi a cada chamada.'
        : 'Não foi possível falar com o painel da roleta.',
    }, { status: 504 });
  }
  clearTimeout(timer);

  // Enquanto o PR que criou `?view=json` não for mergeado, a origem devolve o HTML do painel
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    return NextResponse.json({
      ok: false,
      error: 'O painel da roleta ainda não expõe ?view=json — falta mergear o PR #1 (branch dash-json) em hitalorosa/RoletaRecovery.',
    }, { status: 502 });
  }

  let json: unknown;
  try { json = await res.json(); }
  catch { return NextResponse.json({ ok: false, error: 'A roleta respondeu um JSON inválido.' }, { status: 502 }); }

  if (!res.ok) {
    const msg = (json as { erro?: string } | null)?.erro ?? `HTTP ${res.status}`;
    return NextResponse.json({ ok: false, error: `A roleta recusou a leitura: ${msg}` }, { status: res.status });
  }

  const fetchedAt = new Date().toISOString();
  cache.set(chave, { dados: json, fetchedAt, expiresAt: Date.now() + TTL });

  return NextResponse.json({ ok: true, source: 'live', fetchedAt, dados: json });
}
