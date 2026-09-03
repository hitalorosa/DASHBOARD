'use client';

/**
 * Roleta Recovery — tela nativa do dash.
 *
 * O robô e os números vivem noutro projeto (`hitalorosa/RoletaRecovery`, na Vercel), que
 * expõe o mesmo `dash_dados` do painel de lá em `?view=json`. Aqui só desenhamos: o fetch
 * passa por `/api/roleta` porque o CSP do dash não deixa o browser sair para outro domínio.
 *
 * A lista de leads já chega mascarada da origem (é uma página pública) — não remascaramos.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBrand } from '@/lib/brand-context';
import { C, FONT, eyebrow, heading, metric, fmtBRL, BTN_PRIMARY, BTN_GHOST, INPUT } from '@/lib/theme';

const CARD: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20 };

// ── Contrato do JSON da roleta ───────────────────────────────────────────────
// As chaves 1/2/3 chegam como string: o Python monta com chave int e o json.dumps converte.
type PorMsg = Record<string, number>;

interface DiaRoleta {
  data: string;
  leads: number | null;
  controle: number | null;
  msgs: number;
  env: PorMsg;
  pedidos: number;
  receita: number;
  gasto: number;
  roas: number | null;
  /** A origem passou a devolver o recorte pedido; `data` continua sendo o dia inicial. */
  de?: string;
  ate?: string;
  dias?: number;
}

interface LeadDia {
  phone: string;
  email: string;
  data: string;
  cupom: string;
  status: string;
}

interface Dados {
  mode: string;
  agora: string;
  erro: string | null;
  yampi: number;
  leads_mes: number | null;
  leads_total: number | null;
  env_total: PorMsg;
  env_hoje: PorMsg;
  msgs_total: number;
  msgs_hoje: number;
  controle: number;
  pedidos: number;
  receita: number;
  recebidos: number;
  ctrl_comprou: number;
  ped: PorMsg;
  custo_msg_usd: number;
  usd_brl: number;
  gasto: number;
  /** null quando não houve gasto — razão sem denominador não é zero, é indefinida. */
  roas: number | null;
  dia: DiaRoleta;
  leads_dia_lista: LeadDia[];
}

/** Mesma régua do robô: abaixo disso a diferença contra o controle ainda é ruído. */
const AMOSTRA_MIN_CTRL = 200;
const AMOSTRA_MIN_RECEB = 50;
const POR_PAGINA = 10;
const COLS = '120px 150px minmax(0,1fr) 110px 96px';

const JANELAS = [
  { n: '1', nome: 'Mensagem 1', quando: '15 min a 6 h depois de girar' },
  { n: '2', nome: 'Mensagem 2', quando: '3 h a 24 h depois de girar' },
  { n: '3', nome: 'Mensagem 3', quando: '24 h a 72 h depois de girar' },
];

function num(n: number | null | undefined): string {
  return n == null ? '—' : n.toLocaleString('pt-BR');
}

function dataBr(iso: string | undefined): string {
  return iso ? iso.split('-').reverse().join('/') : '—';
}

/** Meio-dia para o passo de um dia não virar a data por causa do fuso. */
function deslocar(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// ── Peças ────────────────────────────────────────────────────────────────────
type Periodo = { de: string; ate: string };

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Atalhos de recorte. Meio-dia para o fuso não empurrar a data. */
function preset(k: 'hoje' | '7' | '30' | 'mes' | 'mespassado'): Periodo {
  const h = new Date();
  h.setHours(12, 0, 0, 0);
  if (k === 'hoje') return { de: iso(h), ate: iso(h) };
  if (k === '7' || k === '30') {
    const a = new Date(h);
    a.setDate(a.getDate() - (k === '7' ? 6 : 29));
    return { de: iso(a), ate: iso(h) };
  }
  if (k === 'mes') return { de: iso(new Date(h.getFullYear(), h.getMonth(), 1, 12)), ate: iso(h) };
  return {
    de: iso(new Date(h.getFullYear(), h.getMonth() - 1, 1, 12)),
    ate: iso(new Date(h.getFullYear(), h.getMonth(), 0, 12)),
  };
}

/** ROAS sem gasto é indefinido, não zero — por isso o traço em vez de "0,0x". */
function fmtRoas(v: number | null | undefined): string {
  return v ? `${v.toFixed(1).replace('.', ',')}x` : '—';
}

function Kpi({ rotulo, valor, sub, icone, destaque }: {
  rotulo: string; valor: string; sub: string; icone?: string; destaque?: boolean;
}) {
  return (
    <div style={{ ...CARD, borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span style={eyebrow(C.inkSoft)}>{rotulo}</span>
        {icone && (
          <span style={{
            width: 26, height: 26, borderRadius: 8, background: C.surfaceAlt, display: 'grid',
            placeItems: 'center', fontSize: 12, color: C.primaryDeep, flex: 'none',
          }}>
            {icone}
          </span>
        )}
      </div>
      <div style={{ ...metric(28), marginTop: 8, color: destaque ? C.primaryDeep : C.ink }}>{valor}</div>
      <div style={{ fontSize: 11.5, color: C.inkSoft }}>{sub}</div>
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, background: C.warnBg,
      border: `1px solid ${C.warn}`, borderRadius: 14, padding: '13px 16px',
      fontSize: 13, lineHeight: 1.55, color: C.warnInk,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.warnBorder, flex: 'none', marginTop: 6 }} />
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
    </div>
  );
}

function Secao({ children }: { children: React.ReactNode }) {
  return <h2 style={{ ...heading(19), marginTop: 4 }}>{children}</h2>;
}

function Esqueleto() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 12.5, color: C.inkSoft }}>
        Consultando Supabase e Yampi… a primeira chamada leva de 10 a 15 segundos.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(212px,1fr))', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ ...CARD, borderRadius: 16, padding: 18, opacity: .6 }}>
            <div style={{ height: 9, width: '55%', background: C.surfaceMut, borderRadius: 999 }} />
            <div style={{ height: 26, width: '75%', background: C.surfaceMut, borderRadius: 8, marginTop: 12 }} />
          </div>
        ))}
      </div>
      <div style={{ ...CARD, height: 150, opacity: .6 }} />
      <div style={{ ...CARD, height: 260, opacity: .6 }} />
    </div>
  );
}

// ── Painel ───────────────────────────────────────────────────────────────────
function RoletaPainel() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  // null = deixa a origem escolher (hoje no fuso de Brasília)
  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [pagina, setPagina] = useState(1);

  const buscar = useCallback(async (alvo: Periodo | null, force = false) => {
    const qs = new URLSearchParams();
    if (alvo) { qs.set('de', alvo.de); qs.set('ate', alvo.ate); }
    if (force) qs.set('force', '1');
    const query = qs.toString();

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 40_000);

    let res: Response;
    try {
      res = await fetch(`/api/roleta${query ? `?${query}` : ''}`, { signal: ctrl.signal });
    } catch (e: unknown) {
      clearTimeout(timer);
      throw new Error(e instanceof Error && e.name === 'AbortError'
        ? 'Timeout — a roleta não respondeu em 40s.'
        : (e instanceof Error ? e.message : String(e)));
    }
    clearTimeout(timer);

    let json: Record<string, unknown>;
    try { json = await res.json(); }
    catch { throw new Error(`Resposta inválida do servidor (HTTP ${res.status})`); }
    if (!json.ok) throw new Error((json.error as string) ?? `HTTP ${res.status}`);

    setDados(json.dados as Dados);
    setFetchedAt(json.fetchedAt as string);
    setPagina(1);
    setErro(null);
  }, []);

  useEffect(() => {
    let vivo = true;
    setAtualizando(true);
    buscar(periodo)
      .catch((e) => { if (vivo) setErro(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (vivo) { setCarregando(false); setAtualizando(false); } });
    return () => { vivo = false; };
  }, [buscar, periodo]);

  async function atualizar() {
    setAtualizando(true);
    try { await buscar(periodo, true); }
    catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setAtualizando(false); }
  }

  const leads = useMemo(() => dados?.leads_dia_lista ?? [], [dados]);
  const totalPaginas = Math.max(1, Math.ceil(leads.length / POR_PAGINA));
  const daPagina = leads.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  if (!dados) {
    if (carregando) return <Esqueleto />;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Aviso><strong>Não deu para carregar a roleta.</strong> {erro}</Aviso>
        <button type="button" onClick={atualizar} disabled={atualizando} style={{ ...BTN_GHOST, alignSelf: 'flex-start' }}>
          {atualizando ? 'Tentando…' : 'Tentar de novo'}
        </button>
      </div>
    );
  }

  const live = dados.mode === 'live';
  const ticket = dados.pedidos ? dados.receita / dados.pedidos : 0;
  const convRec = dados.recebidos ? (dados.pedidos / dados.recebidos) * 100 : 0;
  const convCtl = dados.controle ? (dados.ctrl_comprou / dados.controle) * 100 : 0;
  const ganho = convRec - convCtl;
  const amostraOk = dados.controle >= AMOSTRA_MIN_CTRL && dados.recebidos >= AMOSTRA_MIN_RECEB;
  const pDe  = dados.dia?.de ?? dados.dia?.data ?? '';
  const pAte = dados.dia?.ate ?? pDe;
  const umDia = pDe === pAte;
  const nDias = dados.dia?.dias ?? 1;
  const rotuloPeriodo = umDia
    ? `Visão do dia · ${dataBr(pDe)}`
    : `Período · ${dataBr(pDe)} a ${dataBr(pAte)} · ${nDias} dias`;
  /** As setas andam pelo tamanho da janela: num recorte de 7 dias, pulam 7 dias. */
  const andar = (n: number) => setPeriodo({
    de: deslocar(pDe, n * nDias), ate: deslocar(pAte, n * nDias),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, opacity: atualizando ? .65 : 1, transition: 'opacity .15s' }}>

      {/* Barra de estado — o título da página é do Header, aqui só o status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: live ? C.ink : C.warnBg, color: live ? '#fff' : C.warnInk,
          border: live ? undefined : `1px solid ${C.warn}`,
          borderRadius: 999, padding: '8px 16px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: live ? C.accent : C.warnBorder }} />
          {live ? 'Roleta no ar' : 'Roleta em dry-run'}
        </span>
        <span style={{ fontSize: 12.5, color: C.inkSoft }}>
          {atualizando ? 'Atualizando…' : fetchedAt
            ? `Atualizado às ${new Date(fetchedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
            : ''}
        </span>
        <button
          type="button" onClick={atualizar} disabled={atualizando}
          style={{
            ...BTN_PRIMARY, marginLeft: 'auto', fontSize: 13.5, padding: '11px 18px',
            borderRadius: 11, boxShadow: `0 4px 0 ${C.primaryDeep}`, opacity: atualizando ? .6 : 1,
          }}
        >
          {atualizando ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {erro && (
        <Aviso>
          <strong>Falha ao atualizar.</strong> {erro} Os números abaixo são da última leitura que deu certo.
        </Aviso>
      )}
      {dados.erro && <Aviso><strong>Não deu para cruzar a Yampi agora.</strong> {dados.erro}</Aviso>}
      {!live && (
        <Aviso>
          Em <strong>dry-run</strong> o robô só mede, não envia. Receita, pedidos e mensagens enviadas
          ficam zerados até virar <strong>live</strong>.
        </Aviso>
      )}

      {/* Resultado acumulado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(212px,1fr))', gap: 14 }}>
        <Kpi rotulo="Receita recuperada" valor={fmtBRL(dados.receita)} sub={`${num(dados.pedidos)} pedidos atribuídos`} icone="↗" destaque />
        <Kpi rotulo="Pedidos recuperados" valor={num(dados.pedidos)} sub={`de ${num(dados.recebidos)} que receberam`} icone="◫" />
        <Kpi rotulo="Ticket médio" valor={fmtBRL(ticket, true)} sub="por pedido recuperado" icone="◎" />
        <Kpi rotulo="Conversão" valor={`${convRec.toFixed(1)}%`} sub="de quem recebeu mensagem" icone="⌾" destaque />
        <Kpi
          rotulo="Gasto" valor={fmtBRL(dados.gasto ?? 0, true)}
          sub={`${num(dados.msgs_total)} mensagens × US$ ${(dados.custo_msg_usd ?? 0).toFixed(2).replace('.', ',')}`}
          icone="◇"
        />
        <Kpi rotulo="ROAS" valor={fmtRoas(dados.roas)} sub="receita ÷ gasto" icone="⇅" destaque />
      </div>

      {/* Como funciona */}
      <div style={{ ...CARD, padding: '20px 22px' }}>
        <div style={{ ...eyebrow(C.primaryDeep), marginBottom: 8 }}>como a atribuição é feita</div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: C.inkSoft }}>
          Follow-up automático no WhatsApp para quem gira a roleta e não compra. A cada 5 minutos o robô
          cruza o Supabase (leads) com a Yampi (compras) e envia pela Nextags só para quem não converteu.
        </p>
        <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.65, color: C.inkSoft }}>
          O pedido é atribuído <strong style={{ color: C.ink }}>por telefone</strong>, quando a compra vem
          depois da mensagem — não depende da UTM sobreviver até o checkout. Cada pessoa recebe no máximo
          três mensagens e para assim que compra.
        </p>
      </div>

      {/* Operação */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(212px,1fr))', gap: 14 }}>
        <Kpi rotulo="Leads no mês" valor={num(dados.leads_mes)} sub="giraram a roleta" icone="◍" />
        <Kpi rotulo="Mensagens enviadas" valor={num(dados.msgs_total)} sub={`hoje ${num(dados.msgs_hoje)}`} icone="➤" />
        <Kpi rotulo="Leads no total" valor={num(dados.leads_total)} sub="desde o início" icone="◧" />
        <Kpi rotulo="Yampi indexada" valor={num(dados.yampi)} sub="pedidos lidos para atribuir" icone="▦" />
      </div>

      {/* As três mensagens */}
      <Secao>As três mensagens</Secao>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 14, marginTop: -4 }}>
        {JANELAS.map((j) => (
          <div key={j.n} style={{ ...CARD, borderRadius: 16, padding: '16px 18px', borderLeft: `3px solid ${live ? C.primary : C.borderMid}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ fontFamily: FONT.display, fontSize: 15 }}>{j.nome}</strong>
              <span style={{
                fontFamily: FONT.mono, fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase',
                padding: '3px 8px', borderRadius: 999,
                background: live ? C.surfaceAlt : C.surfaceMut,
                color: live ? C.primaryDeep : C.inkSoft,
                border: live ? undefined : `1px solid ${C.border}`,
              }}>
                {live ? 'ativa' : 'dry-run'}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: C.inkSoft, margin: '4px 0 14px' }}>{j.quando}</div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={eyebrow(C.inkSoft)}>enviadas</div>
                <div style={{ ...metric(22), marginTop: 3 }}>{num(dados.env_total?.[j.n] ?? 0)}</div>
                <div style={{ fontSize: 11, color: C.inkMut }}>hoje {num(dados.env_hoje?.[j.n] ?? 0)}</div>
              </div>
              <div>
                <div style={eyebrow(C.inkSoft)}>pedidos</div>
                <div style={{ ...metric(22), marginTop: 3, color: dados.ped?.[j.n] ? C.primaryDeep : C.inkMut }}>
                  {dados.ped?.[j.n] ? num(dados.ped[j.n]) : '—'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ganho contra o grupo de controle — sem controle não existe comparação, só a
          conversão bruta disfarçada de ganho, então o bloco inteiro some. */}
      {dados.controle > 0 && (
        <div style={{ ...CARD, padding: '22px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <h2 style={heading(18)}>Ganho contra o grupo de controle</h2>
            <span style={{ fontSize: 11.5, color: C.inkSoft }}>· quem recebeu mensagem contra quem ficou de fora</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
            {[
              { r: 'Quem recebeu', v: `${convRec.toFixed(1)}%`, s: `${num(dados.pedidos)} de ${num(dados.recebidos)} compraram` },
              { r: 'Grupo de controle', v: `${convCtl.toFixed(1)}%`, s: `${num(dados.ctrl_comprou)} de ${num(dados.controle)} compraram` },
              { r: 'Diferença', v: `${ganho >= 0 ? '+' : ''}${ganho.toFixed(1)} pp`, s: 'pontos percentuais' },
            ].map((k) => (
              <div key={k.r} style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMid}`, borderRadius: 16, padding: 16 }}>
                <div style={{ ...eyebrow(C.primaryDeep), letterSpacing: '.12em' }}>{k.r}</div>
                <div style={{ ...metric(24), marginTop: 5, color: amostraOk ? C.ink : C.inkSoft }}>{k.v}</div>
                <div style={{ fontSize: 11.5, color: C.inkSoft }}>{k.s}</div>
              </div>
            ))}
          </div>
          {!amostraOk && (
            <div style={{ marginTop: 14 }}>
              <Aviso>
                Amostra ainda pequena — controle em {num(dados.controle)} de {AMOSTRA_MIN_CTRL}, e{' '}
                {num(dados.recebidos)} de {AMOSTRA_MIN_RECEB} que precisam ter recebido. A diferença acima
                ainda é ruído, não resultado.
              </Aviso>
            </div>
          )}
        </div>
      )}

      {/* Visão diária */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
        <Secao>{rotuloPeriodo}</Secao>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <button
            type="button" aria-label="Período anterior" disabled={!pDe || atualizando}
            onClick={() => andar(-1)}
            style={{ ...BTN_GHOST, padding: '8px 12px', opacity: atualizando ? .5 : 1 }}
          >
            ‹
          </button>
          <input
            type="date" value={pDe} disabled={atualizando} aria-label="Data inicial"
            onChange={(e) => { if (e.target.value) setPeriodo({ de: e.target.value, ate: pAte }); }}
            style={{ ...INPUT, width: 'auto', padding: '8px 10px', fontSize: 13 }}
          />
          <span style={{ color: C.inkMut, fontSize: 12 }}>até</span>
          <input
            type="date" value={pAte} disabled={atualizando} aria-label="Data final"
            onChange={(e) => { if (e.target.value) setPeriodo({ de: pDe, ate: e.target.value }); }}
            style={{ ...INPUT, width: 'auto', padding: '8px 10px', fontSize: 13 }}
          />
          <button
            type="button" aria-label="Próximo período" disabled={!pDe || atualizando}
            onClick={() => andar(1)}
            style={{ ...BTN_GHOST, padding: '8px 12px', opacity: atualizando ? .5 : 1 }}
          >
            ›
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: -4 }}>
        {([['hoje', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'],
           ['mes', 'Este mês'], ['mespassado', 'Mês passado']] as const).map(([k, rot]) => (
          <button
            key={k} type="button" disabled={atualizando}
            onClick={() => setPeriodo(preset(k))}
            style={{ ...BTN_GHOST, padding: '6px 13px', fontSize: 12.5, borderRadius: 999 }}
          >
            {rot}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(212px,1fr))', gap: 14 }}>
        <Kpi rotulo={umDia ? 'Leads do dia' : 'Leads no período'} valor={num(dados.dia?.leads)} sub="giraram a roleta" icone="◍" />
        <Kpi
          rotulo="Mensagens enviadas" valor={num(dados.dia?.msgs)}
          sub={`M1 ${num(dados.dia?.env?.['1'] ?? 0)} · M2 ${num(dados.dia?.env?.['2'] ?? 0)} · M3 ${num(dados.dia?.env?.['3'] ?? 0)}`}
          icone="➤"
        />
        <Kpi rotulo="Pedidos recuperados" valor={num(dados.dia?.pedidos)} sub="receberam e compraram" icone="◫" destaque />
        <Kpi rotulo="Receita recuperada" valor={fmtBRL(dados.dia?.receita ?? 0)} sub={umDia ? 'no dia' : 'no período'} icone="↗" destaque />
        <Kpi rotulo={umDia ? 'Gasto do dia' : 'Gasto no período'} valor={fmtBRL(dados.dia?.gasto ?? 0, true)} sub={`${num(dados.dia?.msgs)} mensagens`} icone="◇" />
        <Kpi rotulo={umDia ? 'ROAS do dia' : 'ROAS no período'} valor={fmtRoas(dados.dia?.roas)} sub="receita ÷ gasto" icone="⇅" destaque />
      </div>

      {/* Leads do dia */}
      <div style={{ ...CARD, overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 14px' }}>
          <h2 style={heading(19)}>
            Leads que giraram a roleta{' '}
            <span style={{ fontWeight: 600, fontSize: 14, color: C.inkSoft }}>· {leads.length} no dia</span>
          </h2>
          <p style={{ fontSize: 11.5, color: C.inkMut, margin: '6px 0 0' }}>
            Telefone e e-mail chegam mascarados da origem, que é uma página pública.
          </p>
        </div>

        {leads.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: C.inkSoft, fontSize: 13.5, borderTop: `1px solid ${C.border}` }}>
            Nenhum lead girou a roleta {umDia ? `em ${dataBr(pDe)}` : `entre ${dataBr(pDe)} e ${dataBr(pAte)}`}.
          </div>
        ) : (
          <>
            <div className="scroll-x">
              <div style={{ minWidth: 640 }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: COLS, gap: 8, padding: '10px 18px',
                  background: C.rail, borderTop: `1px solid ${C.railBorder}`, borderBottom: `1px solid ${C.railBorder}`,
                  ...eyebrow(C.inkRail), letterSpacing: '.12em', whiteSpace: 'nowrap',
                }}>
                  <span>Girou em</span><span>Telefone</span><span>E-mail</span><span>Cupom</span>
                  <span style={{ textAlign: 'right' }}>Recovery</span>
                </div>

                {daPagina.map((l, i) => (
                  <div
                    key={`${l.data}-${l.phone}-${i}`}
                    className="row-hover"
                    style={{
                      display: 'grid', gridTemplateColumns: COLS, gap: 8, padding: '12px 18px',
                      alignItems: 'center', fontSize: 13, borderBottom: `1px solid ${C.borderSoft}`,
                    }}
                  >
                    <span style={{ fontFamily: FONT.mono, fontSize: 11.5, color: C.inkSoft }}>{l.data}</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 11.5 }}>{l.phone}</span>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.inkSoft }}>{l.email}</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 11, color: l.cupom === '—' ? C.inkMut : C.primaryDeep }}>{l.cupom}</span>
                    <span style={{
                      justifySelf: 'end', fontFamily: FONT.mono, fontSize: 10.5, padding: '3px 9px', borderRadius: 999,
                      background: l.status === 'na fila' ? C.surfaceMut : C.surfaceAlt,
                      color: l.status === 'na fila' ? C.inkSoft : C.primaryDeep,
                      whiteSpace: 'nowrap',
                    }}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}
                  style={{ ...BTN_GHOST, padding: '7px 11px', opacity: pagina <= 1 ? .4 : 1 }}>‹</button>
                <span style={{ fontFamily: FONT.mono, fontSize: 11.5, color: C.inkSoft, minWidth: 96, textAlign: 'center' }}>
                  página {pagina} de {totalPaginas}
                </span>
                <button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}
                  style={{ ...BTN_GHOST, padding: '7px 11px', opacity: pagina >= totalPaginas ? .4 : 1 }}>›</button>
              </div>
              <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.inkSoft }}>
                {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, leads.length)} de {leads.length}
              </span>
            </div>
          </>
        )}
      </div>

      <p style={{ fontSize: 11.5, color: C.inkMut, margin: 0, lineHeight: 1.6 }}>
        Leitura da roleta em {dados.agora} · {num(dados.leads_total)} leads desde o início.
      </p>
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function RoletaPage() {
  const { brand } = useBrand();

  if (brand.id !== 'dryskin') {
    return (
      <div style={{ ...CARD, padding: 28, maxWidth: 560 }}>
        <div style={{ ...eyebrow(C.inkMut), marginBottom: 8 }}>roleta recovery</div>
        <p style={{ color: C.inkSoft, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          A roleta roda só na DrySkin. Troque a marca no seletor da barra lateral para ver o painel.
        </p>
      </div>
    );
  }

  return <RoletaPainel />;
}
