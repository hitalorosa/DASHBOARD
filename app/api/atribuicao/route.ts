/**
 * GET /api/atribuicao?month=5&year=2026
 *
 * Cruza pedidos da Yampi com os disparos do Supabase e retorna
 * faturamento + pedidos atribuídos a cada disparo do mês.
 *
 * Hierarquia de atribuição:
 *   1. UTM sovereignty  → utm_source + utm_campaign batem com o disparo → atribui direto
 *   2. Coupon window    → cupom presente, sem UTM mapeada → janela temporal dinâmica
 *   3. Sem atribuição   → pedido ignorado (não salvo em lugar nenhum)
 *
 * Fuso horário: America/Sao_Paulo (UTC-3, sem DST desde 2019)
 */

import { createClient }  from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { toIso, unwrapArray, orderValue, type YampiOrder } from '@/lib/yampi';
import type { Disparo } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Constantes ───────────────────────────────────────────────────────────────

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Configuração por marca — adicionar vars no .env.local e na Vercel
const BRAND_CONFIG: Record<string, { alias: string; token: string; secret: string; supabaseId: number }> = {
  noue: {
    alias:      process.env.YAMPI_ALIAS!,
    token:      process.env.YAMPI_TOKEN!,
    secret:     process.env.YAMPI_SECRET_KEY!,
    supabaseId: 1,
  },
  dryskin: {
    alias:      process.env.DRYSKIN_YAMPI_ALIAS!,
    token:      process.env.DRYSKIN_YAMPI_TOKEN!,
    secret:     process.env.DRYSKIN_YAMPI_SECRET_KEY!,
    supabaseId: 2,
  },
};

// SP é sempre UTC-3 (Brasil aboliu horário de verão em 2019)
const SP_OFFSET_MS = 3 * 60 * 60 * 1000;

// Status da Yampi considerados como "pago" — lista completa do fluxo logístico
const PAID = new Set([
  'paid', 'payment_approved', 'approved',
  'handling_products', 'in_separation',
  'invoiced', 'ready_for_shipping',
  'on_carriage', 'shipped', 'delivered',
]);

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface AtribuicaoItem {
  id:           string;
  faturamento:  number;
  pedidos:      number;
}

interface CouponWindow {
  disparo_id: string;
  from:       number; // timestamp UTC — início da janela (00:00 SP do dia do disparo)
  to:         number; // timestamp UTC — fim da janela   (23:59:59 SP do dia anterior ao próximo)
}

// Shape mínimo do disparoContent salvo no Supabase
interface StoredContent {
  utms?: string[];
  cupom?: string;
}

// ─── Parse de UTM a partir de URL completa ────────────────────────────────────

/**
 * Extrai utm_source e utm_campaign de uma URL completa.
 * Ex: "https://oferta.dryskin.com.br/?utm_source=car&utm_campaign=21-05"
 *     → { source: "car", campaign: "21-05" }
 */
function parseUtmUrl(url: string): { source: string; campaign: string } | null {
  try {
    const u = new URL(url.trim());
    const source   = u.searchParams.get('utm_source');
    const campaign = u.searchParams.get('utm_campaign');
    if (source && campaign) return { source: source.toLowerCase(), campaign: campaign.toLowerCase() };
  } catch { /* URL inválida — ignora */ }
  return null;
}

// ─── Helpers de timezone ──────────────────────────────────────────────────────

/**
 * Converte "YYYY-MM-DD" + hora SP → timestamp UTC em ms.
 * Midnight SP (00:00) = UTC+3h.
 */
function spDateToUtcMs(dateStr: string, hour = 0, min = 0, sec = 0): number {
  // Cria como se fosse UTC, depois desconta o offset SP
  const utcMs = Date.UTC(
    parseInt(dateStr.slice(0, 4)),
    parseInt(dateStr.slice(5, 7)) - 1,
    parseInt(dateStr.slice(8, 10)),
    hour,
    min,
    sec,
  );
  return utcMs + SP_OFFSET_MS; // SP = UTC - 3h, então midnight SP = 03:00 UTC
}

/**
 * Dado o created_at de um pedido Yampi (objeto Dooki { date, timezone }),
 * retorna o timestamp UTC em ms.
 *
 * ATENÇÃO: toIso() retorna a string sem offset (ex: "2026-05-21T22:16:19"),
 * que o Node.js interpreta como UTC. Mas o date da Dooki está em SP (UTC-3),
 * então precisamos somar 3h para obter o UTC real.
 */
function orderUtcMs(createdAt: unknown): number {
  const iso = toIso(createdAt);
  if (!iso) return 0;
  // Se a string não tem offset explícito, assume SP (UTC-3) e converte para UTC
  const hasOffset = /[Z+\-]\d{2}:?\d{2}$/.test(iso) || iso.endsWith('Z');
  const ms = new Date(iso).getTime();
  return hasOffset ? ms : ms + SP_OFFSET_MS; // +3h para corrigir SP → UTC
}

// ─── Paginação Yampi ──────────────────────────────────────────────────────────

async function fetchAllOrders(
  month: number,
  year: number,
  cfg: typeof BRAND_CONFIG[string],
): Promise<unknown[]> {
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const dateFrom = `${year}-${pad(month)}-01`;
  const dateTo   = `${year}-${pad(month)}-${pad(lastDay)}`;

  const base = new URLSearchParams({
    include: 'status,promocode',
    limit:   '100',
  });
  base.set('date', `created_at:${dateFrom}|${dateTo}`);

  const headers = {
    'User-Token':      cfg.token,
    'User-Secret-Key': cfg.secret,
    'Accept':          'application/json',
  };

  const all: unknown[] = [];
  let page     = 1;
  let scrollId = '';
  let hasMore  = true;

  while (hasMore) {
    const params = new URLSearchParams(base);
    if (scrollId) {
      params.set('scroll_id', scrollId);
    } else {
      params.set('page', String(page));
    }

    const res = await fetch(
      `https://api.dooki.com.br/v2/${cfg.alias}/orders?${params.toString()}`,
      { headers },
    );

    // Sem retry — 429 fail-fast
    if (res.status === 429) throw new Error('Rate limit Yampi (429) — aguarde e tente novamente.');
    if (!res.ok)            throw new Error(`Yampi respondeu ${res.status}`);

    const json = await res.json() as {
      scroll_id?: string | null;
      data?: unknown[];
      meta?: { pagination?: { total_pages?: number } };
    };

    const batch = json.data ?? [];
    all.push(...batch);

    if (json.scroll_id) {
      scrollId = json.scroll_id;
    } else {
      const totalPages = json.meta?.pagination?.total_pages ?? 1;
      if (page < totalPages) {
        page++;
      } else {
        hasMore = false;
      }
    }

    if (batch.length === 0) hasMore = false;
  }

  return all;
}

// ─── Lógica de janelas de cupom ───────────────────────────────────────────────

/**
 * Para cada cupom, constrói as janelas temporais de "posse":
 *   - Cada disparo é dono do cupom desde sua data (00:00 SP)
 *     até 23:59:59 SP do dia ANTERIOR ao próximo disparo com o mesmo cupom.
 *   - O último disparo com aquele cupom não tem limite superior.
 */
function buildCouponWindows(disparos: Disparo[]): Map<string, CouponWindow[]> {
  // Agrupa por cupom (uppercase para comparação case-insensitive)
  const byCoupon = new Map<string, Disparo[]>();

  for (const d of disparos) {
    if (!d.cupom_usado?.trim()) continue;
    const key = d.cupom_usado.trim().toUpperCase();
    if (!byCoupon.has(key)) byCoupon.set(key, []);
    byCoupon.get(key)!.push(d);
  }

  const result = new Map<string, CouponWindow[]>();

  for (const [coupon, group] of byCoupon) {
    // Ordena por data crescente
    const sorted = [...group].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
    );

    const windows: CouponWindow[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      const next    = sorted[i + 1];

      // Início: 00:00 SP do dia do disparo atual
      const from = spDateToUtcMs(current.data, 0, 0, 0);

      // Fim: se existe próximo, 23:59:59 SP do dia ANTERIOR ao próximo
      //      senão, sem limite (Number.MAX_SAFE_INTEGER)
      let to: number;
      if (next) {
        // Midnight SP do próximo - 1 segundo = 23:59:59 SP do dia anterior
        to = spDateToUtcMs(next.data, 0, 0, 0) - 1000;
      } else {
        to = Number.MAX_SAFE_INTEGER;
      }

      windows.push({ disparo_id: current.id, from, to });
    }

    result.set(coupon, windows);
  }

  return result;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const now   = new Date();
    const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1));
    const year  = parseInt(searchParams.get('year')  ?? String(now.getFullYear()));
    const brand = searchParams.get('brand') ?? 'dryskin'; // padrão dryskin enquanto em teste

    const cfg = BRAND_CONFIG[brand];
    if (!cfg) {
      return NextResponse.json({ ok: false, error: `Marca desconhecida: ${brand}` }, { status: 400 });
    }

    // 1. Busca disparos do mês no Supabase ─────────────────────────────────
    const supabase = createClient(SB_URL, SB_KEY);
    const { data: row, error } = await supabase
      .from('dash_store')
      .select('data')
      .eq('id', cfg.supabaseId) // id=1 Nouê | id=2 DrySkin
      .single();

    if (error) throw new Error(`Supabase: ${error.message}`);

    // O store salva os disparos customizados em 'customDisparos' (não 'disparos')
    const todosDisparos: Disparo[] = (row?.data?.customDisparos ?? []) as Disparo[];

    // disparoContent: { [disparo_id]: { utms: string[], cupom: string } }
    const disparoContent = (row?.data?.disparoContent ?? {}) as Record<string, StoredContent>;

    // month chega 0-indexed do context (4 = maio) → converter para 1-indexed
    const month1 = month + 1;

    // Filtra apenas os disparos do mês solicitado
    const pad         = (n: number) => String(n).padStart(2, '0');
    const monthPrefix = `${year}-${pad(month1)}`;
    const disparos    = todosDisparos.filter(d => d.data?.startsWith(monthPrefix));

    const debug = searchParams.get('debug') === '1';

    if (disparos.length === 0) {
      if (debug) {
        return NextResponse.json({
          _debug: true,
          month_recebido: month,
          month_usado: month1,
          monthPrefix,
          totalCustomDisparos: todosDisparos.length,
          todosDisparos: todosDisparos.map(d => ({ id: d.id, data: d.data })),
          disparoContent: Object.keys(disparoContent),
        });
      }
      return NextResponse.json([] as AtribuicaoItem[]);
    }

    // 2. Mapa UTM → disparo_id ─────────────────────────────────────────────
    // Parseia as URLs de cada disparo para extrair utm_source e utm_campaign
    const utmMap = new Map<string, string>();
    for (const d of disparos) {
      const content = disparoContent[d.id] ?? {};
      for (const url of (content.utms ?? [])) {
        if (!url?.trim()) continue;
        const parsed = parseUtmUrl(url);
        if (parsed) {
          utmMap.set(`${parsed.source}|${parsed.campaign}`, d.id);
        }
      }
    }

    // 3. Janelas temporais de cupom ────────────────────────────────────────
    // Resolve o cupom do content (prioridade) ou do campo cupom_usado do disparo
    const disparosComCupom: Disparo[] = disparos.map(d => {
      const cupomContent = (disparoContent[d.id]?.cupom ?? '').trim();
      return { ...d, cupom_usado: cupomContent || d.cupom_usado };
    });
    const couponWindows = buildCouponWindows(disparosComCupom);

    // 4. Busca pedidos Yampi do mês ────────────────────────────────────────
    const orders = await fetchAllOrders(month1, year, cfg);

    // 5. Atribuição em memória ─────────────────────────────────────────────
    // Inicializa acumuladores zerados para cada disparo do mês
    const acc = new Map<string, { faturamento: number; pedidos: number }>();
    for (const d of disparos) acc.set(d.id, { faturamento: 0, pedidos: 0 });

    for (const raw of orders) {
      const order = raw as Record<string, unknown>;

      // Apenas pedidos pagos
      const statusAlias = (order.status as Record<string, unknown> | undefined)
        ?.data as Record<string, unknown> | undefined;
      if (!PAID.has((statusAlias?.alias ?? '') as string)) continue;

      let attributedId: string | null = null;

      // ── Regra 1: Soberania da UTM ──────────────────────────────────────
      const utmSrc  = ((order.utm_source  ?? '') as string).trim().toLowerCase();
      const utmCamp = ((order.utm_campaign ?? '') as string).trim().toLowerCase();

      if (utmSrc && utmCamp) {
        attributedId = utmMap.get(`${utmSrc}|${utmCamp}`) ?? null;
      }

      // ── Regra 2: Recência do Cupom (fallback) ─────────────────────────
      if (!attributedId) {
        // O código do cupom está em promocode.data.code (não em promocode_id que é um número)
        const promocode = order.promocode as { data?: { code?: string } | unknown[] } | undefined;
        const promoData = Array.isArray(promocode?.data) ? null : promocode?.data as { code?: string } | undefined;
        const couponRaw = promoData?.code ?? '';
        const coupon    = couponRaw.trim().toUpperCase();

        if (coupon && couponWindows.has(coupon)) {
          const orderTs = orderUtcMs(order.created_at);
          const windows = couponWindows.get(coupon)!;

          for (const w of windows) {
            if (orderTs >= w.from && orderTs <= w.to) {
              attributedId = w.disparo_id;
              break;
            }
          }
        }
      }

      // ── Regra 3: Sem atribuição → ignora ──────────────────────────────
      if (!attributedId || !acc.has(attributedId)) continue;

      const valor   = orderValue(order as unknown as YampiOrder);
      const current = acc.get(attributedId)!;
      acc.set(attributedId, {
        faturamento: current.faturamento + valor,
        pedidos:     current.pedidos + 1,
      });
    }

    // 6. Monta resposta ────────────────────────────────────────────────────
    const result: AtribuicaoItem[] = disparos.map(d => {
      const totals = acc.get(d.id)!;
      return {
        id:          d.id,
        faturamento: Math.round(totals.faturamento * 100) / 100,
        pedidos:     totals.pedidos,
      };
    });

    if (debug) {
      const paidOrders = orders.filter(o => {
        const r = o as Record<string, unknown>;
        const s = (r.status as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined;
        return PAID.has((s?.alias ?? '') as string);
      }) as Record<string, unknown>[];

      // ── Reconciliação ─────────────────────────────────────────────────────
      // Para cada pedido pago, descobre qual regra o atribuiu (ou não)
      const atribDetalhe: {
        id: unknown; valor: number; status: string;
        created_at_sp: string; ts_utc: string;
        utm_source: unknown; utm_campaign: unknown; cupom: string;
        regra: 'utm' | 'cupom' | 'nao_atribuido'; disparo_id: string | null;
      }[] = [];

      for (const raw of paidOrders) {
        const o = raw;
        const valor = orderValue(o as unknown as YampiOrder);
        const statusAlias = ((o.status as Record<string, unknown> | undefined)
          ?.data as Record<string, unknown> | undefined)?.alias as string ?? '';

        const utmSrc  = ((o.utm_source  ?? '') as string).trim().toLowerCase();
        const utmCamp = ((o.utm_campaign ?? '') as string).trim().toLowerCase();

        let regra: 'utm' | 'cupom' | 'nao_atribuido' = 'nao_atribuido';
        let disparoId: string | null = null;

        if (utmSrc && utmCamp) {
          const matched = utmMap.get(`${utmSrc}|${utmCamp}`);
          if (matched) { regra = 'utm'; disparoId = matched; }
        }

        const promocode = o.promocode as { data?: { code?: string } | unknown[] } | undefined;
        const promoData = Array.isArray(promocode?.data) ? null : promocode?.data as { code?: string } | undefined;
        const cupom = (promoData?.code ?? '').trim().toUpperCase();

        if (regra === 'nao_atribuido' && cupom && couponWindows.has(cupom)) {
          const tsUtc = orderUtcMs(o.created_at);
          const win = (couponWindows.get(cupom) ?? []).find(w => tsUtc >= w.from && tsUtc <= w.to);
          if (win) { regra = 'cupom'; disparoId = win.disparo_id; }
        }

        atribDetalhe.push({
          id: o.id, valor, status: statusAlias,
          created_at_sp: toIso(o.created_at),
          ts_utc: new Date(orderUtcMs(o.created_at)).toISOString(),
          utm_source: o.utm_source, utm_campaign: o.utm_campaign, cupom,
          regra, disparo_id: disparoId,
        });
      }

      const totalYampi     = Math.round(paidOrders.reduce((s, o) => s + orderValue(o as unknown as YampiOrder), 0) * 100) / 100;
      const totalAtribuido = Math.round(result.reduce((s, r) => s + r.faturamento, 0) * 100) / 100;
      const naoAtribuidos  = atribDetalhe.filter(x => x.regra === 'nao_atribuido');

      return NextResponse.json({
        _debug: true,
        month_recebido: month,
        month_usado: month1,
        monthPrefix,
        disparos_encontrados: disparos.map(d => ({ id: d.id, data: d.data })),
        utmMap: Object.fromEntries(utmMap),
        couponWindows: Object.fromEntries(
          Array.from(couponWindows.entries()).map(([k, v]) => [k, v.map(w => ({
            disparo_id: w.disparo_id,
            from: new Date(w.from).toISOString(),
            to: w.to === Number.MAX_SAFE_INTEGER ? 'sem limite' : new Date(w.to).toISOString(),
          }))])
        ),
        // ── Reconciliação — responde "meu 804,43 está 100% correto?" ──────
        reconciliacao: {
          total_pedidos_yampi:  orders.length,
          total_pedidos_pagos:  paidOrders.length,
          total_faturamento_yampi:     totalYampi,
          total_faturamento_atribuido: totalAtribuido,
          diferenca_nao_atribuida:     Math.round((totalYampi - totalAtribuido) * 100) / 100,
          pedidos_por_regra: {
            utm:           atribDetalhe.filter(x => x.regra === 'utm').length,
            cupom:         atribDetalhe.filter(x => x.regra === 'cupom').length,
            nao_atribuido: naoAtribuidos.length,
          },
        },
        // Pedidos pagos que não matcharam nenhum disparo — onde está a diferença
        pedidos_nao_atribuidos: naoAtribuidos.map(x => ({
          id: x.id, valor: x.valor, status: x.status,
          utm_source: x.utm_source, utm_campaign: x.utm_campaign, cupom: x.cupom,
        })),
        atribuicao: result,
        // Detalhe de TODOS os pedidos atribuídos — qual regra e qual disparo
        pedidos_atribuidos: atribDetalhe
          .filter(x => x.regra !== 'nao_atribuido')
          .map(x => ({
            id: x.id, valor: x.valor, regra: x.regra,
            disparo_id: x.disparo_id, cupom: x.cupom,
            created_at_sp: x.created_at_sp, ts_utc: x.ts_utc,
            utm_source: x.utm_source, utm_campaign: x.utm_campaign,
          })),
      });
    }

    return NextResponse.json(result);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[atribuicao]', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
