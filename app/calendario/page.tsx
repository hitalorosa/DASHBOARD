'use client';

import { useState, useMemo } from 'react';
import { useStore, DisparoContent } from '@/lib/store';
import { datasazonais2025 } from '@/lib/data';
import { Disparo, CampaignType } from '@/lib/types';
import { useBrand } from '@/lib/brand-context';
import {
  format, parseISO, startOfMonth, startOfWeek, addDays,
  eachDayOfInterval, isSameDay, isSameMonth, differenceInDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { C, FONT, eyebrow, heading, tipoPill, fmtBRL, BTN_PRIMARY, BTN_GHOST, INPUT } from '@/lib/theme';

const TIPO_LABELS: Record<CampaignType, string> = {
  sazonal: 'Sazonal', esquenta: 'Esquenta', ressaca: 'Ressaca',
  comportamental: 'Comportamental', produto: 'LP Produto', brinde: 'Brinde', fimmes: 'Fim de Mês',
};

const CAT_LABEL: Record<string, string> = {
  diad: 'Dia D', ecommerce: 'E-commerce', feriado: 'Feriado', relevante: 'Relevante',
};
const REL_LABEL: Record<string, string> = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

// ── Chip: a definir → pronto → executado ─────────────────────────────────────
type ChipKind = 'executado' | 'pronto' | 'aDefinir' | 'aDefinirForte';

const CHIP: Record<ChipKind, { style: React.CSSProperties; marcador: string; rotulo: string }> = {
  executado:     { marcador: '✓', rotulo: 'executado',              style: { background: C.surfaceAlt, border: `1px solid ${C.borderMid}`, color: C.primaryDeep } },
  pronto:        { marcador: '●', rotulo: 'pronto · copy e cupom',  style: { background: C.primary,    border: `1px solid ${C.primary}`,   color: '#fff' } },
  aDefinir:      { marcador: '◆', rotulo: 'a definir',              style: { background: 'transparent', border: `1px dashed ${C.borderMid}`, color: C.inkSoft } },
  aDefinirForte: { marcador: '◆', rotulo: 'a definir · fim de mês', style: { background: C.warnBg,     border: `1px dashed ${C.warnBorder}`, color: C.warnInk } },
};

function chipFor(d: Disparo, content: Partial<DisparoContent>): { kind: ChipKind; texto: string } {
  const executado = d.faturamentoPago > 0 || d.enviados > 0;
  const cupom = (content.cupom ?? '').trim();
  const temCopy = [content.msg1, content.msg2, content.msg3].some((m) => (m ?? '').trim().length > 0);

  if (executado) return { kind: 'executado', texto: cupom || 'sem cupom' };
  if (temCopy && cupom) return { kind: 'pronto', texto: cupom };
  return { kind: d.tipo === 'fimmes' ? 'aDefinirForte' : 'aDefinir', texto: 'a definir' };
}

// ── Modal ────────────────────────────────────────────────────────────────────
function NovoDisparoModal({ month, year, onSave, onClose }: {
  month: number; year: number; onSave: (d: Disparo) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    data: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    campanha: '', tipo: 'sazonal' as CampaignType, base: '',
  });
  const podeSalvar = form.campanha.trim() && form.base.trim() && form.data;

  function salvar() {
    if (!podeSalvar) return;
    onSave({
      id: `c-${Date.now()}`,
      data: form.data, campanha: form.campanha.trim(), tipo: form.tipo, base: form.base.trim(),
      tamanhoBase: 0, enviados: 0, taxaEntrega: 0, entregas: 0, taxaLeitura: 0,
      cliques: 0, cotacaoUsd: 0, investimentoUsd: 0, investimentoBrl: 0,
      faturamentoPago: 0, pedidos: 0, ticketMedio: 0, roas: 0, observacoes: '',
    });
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(23,48,44,.42)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="entra"
        style={{ width: '100%', maxWidth: 512, background: C.surface, borderRadius: 24, padding: 28, boxShadow: '0 24px 60px rgba(23,48,44,.24)' }}
      >
        <h2 style={{ ...heading(22), marginBottom: 20 }}>Novo disparo</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Data</span>
            <input type="date" value={form.data} onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
              style={{ ...INPUT, padding: '11px 12px', colorScheme: 'light' }} />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Tipo</span>
            <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as CampaignType }))}
              style={{ ...INPUT, padding: '11px 12px', cursor: 'pointer' }}>
              {(Object.entries(TIPO_LABELS) as [CampaignType, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ display: 'block', marginTop: 14 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nome da campanha</span>
          <input type="text" placeholder="ex.: Esquenta Dia do Cliente" value={form.campanha}
            onChange={(e) => setForm((p) => ({ ...p, campanha: e.target.value }))} style={{ ...INPUT, padding: '11px 12px' }} />
        </label>

        <label style={{ display: 'block', marginTop: 14 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Base</span>
          <input type="text" placeholder="ex.: Carrinho Abandonado" value={form.base}
            onChange={(e) => setForm((p) => ({ ...p, base: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') salvar(); }} style={{ ...INPUT, padding: '11px 12px' }} />
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
          <button type="button" onClick={salvar} disabled={!podeSalvar}
            style={{ ...BTN_PRIMARY, opacity: podeSalvar ? 1 : .5, cursor: podeSalvar ? 'pointer' : 'not-allowed' }}>
            Criar disparo
          </button>
          <button type="button" onClick={onClose} style={BTN_GHOST}>Cancelar</button>
        </div>

        <p style={{ fontSize: 12, color: C.inkSoft, margin: '16px 0 0' }}>
          O disparo nasce como <strong style={{ color: C.ink }}>a definir</strong>. A copy e o cupom
          são preenchidos depois, na aba Conteúdo.
        </p>
      </div>
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function CalendarioPage() {
  const { month, year, setMonth, setYear } = useBrand();
  const [selecionado, setSelecionado] = useState<Disparo | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);
  const { getDisparos, addDisparo, getDisparoContent } = useStore();

  const dataAtual = useMemo(() => new Date(year, month, 1), [year, month]);
  const gridStart = useMemo(() => startOfWeek(startOfMonth(dataAtual), { weekStartsOn: 0 }), [dataAtual]);
  const dias = useMemo(() => eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) }), [gridStart]);

  const disparosDoMes = useMemo(() => getDisparos(month, year), [month, year, getDisparos]);
  const disparosDoDia = (dia: Date) => disparosDoMes.filter((d) => isSameDay(new Date(d.data + 'T12:00:00'), dia));

  const hoje = new Date();
  const sazonais = datasazonais2025.filter((s) => parseISO(s.data) >= hoje).slice(0, 8);
  const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function irHoje() { setMonth(hoje.getMonth()); setYear(hoje.getFullYear()); }
  function mudarMes(delta: number) {
    const d = new Date(year, month + delta, 1);
    setMonth(d.getMonth()); setYear(d.getFullYear());
  }

  const navBtn: React.CSSProperties = {
    height: 38, minWidth: 38, padding: '0 12px', border: `1px solid ${C.borderMid}`,
    background: C.surface, borderRadius: 10, cursor: 'pointer', color: C.ink, fontSize: 13, fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {novoAberto && (
        <NovoDisparoModal
          month={month} year={year}
          onSave={(d) => { addDisparo(d); setNovoAberto(false); }}
          onClose={() => setNovoAberto(false)}
        />
      )}

      {/* Grade */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: '22px 20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <div style={eyebrow(C.inkSoft)}>Calendário de disparos</div>
            <h2 style={{ ...heading(26), marginTop: 4, textTransform: 'capitalize' }}>
              {format(dataAtual, 'MMMM', { locale: ptBR })} <span style={{ color: C.inkSoft }}>{year}</span>
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior" style={navBtn}>‹</button>
            <button type="button" onClick={irHoje} style={navBtn}>hoje</button>
            <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês" style={navBtn}>›</button>
            <button
              type="button" onClick={() => setNovoAberto(true)}
              style={{ ...BTN_PRIMARY, height: 38, padding: '0 18px', fontSize: 14, borderRadius: 11, boxShadow: `0 4px 0 ${C.primaryDeep}`, marginLeft: 6 }}
            >
              + Novo
            </button>
          </div>
        </div>

        <div style={{ background: C.rail, border: `1px solid ${C.railBorder}`, borderRadius: 16, padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6, marginBottom: 8 }}>
            {SEMANA.map((d) => (
              <div key={d} style={{ ...eyebrow(C.inkRail), letterSpacing: '.14em', padding: '0 4px 2px' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 6 }}>
            {dias.map((dia) => {
              const doDia = disparosDoDia(dia);
              const noMes = isSameMonth(dia, dataAtual);
              const ehHoje = isSameDay(dia, hoje);

              return (
                <div
                  key={dia.toISOString()}
                  style={{
                    minHeight: 76, borderRadius: 10, padding: '7px 7px 8px',
                    background: noMes ? C.surface : 'transparent',
                    border: ehHoje ? `1.5px solid ${C.accent}` : `1px solid ${noMes ? C.borderSoft : 'transparent'}`,
                  }}
                  className="md:min-h-[104px]"
                >
                  <div style={{
                    fontFamily: FONT.mono, fontSize: 11,
                    color: !noMes ? C.inkMut : ehHoje ? C.primaryDeep : C.inkSoft,
                    fontWeight: ehHoje ? 700 : 400,
                  }}>
                    {format(dia, 'd')}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                    {doDia.map((d) => {
                      const { kind, texto } = chipFor(d, getDisparoContent(d.id));
                      const cfg = CHIP[kind];
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelecionado(selecionado?.id === d.id ? null : d)}
                          title={`${d.campanha} — ${d.base}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4, width: '100%',
                            fontFamily: FONT.mono, fontSize: 9.5, fontWeight: 600,
                            borderRadius: 6, padding: '3px 5px', cursor: 'pointer', textAlign: 'left',
                            ...cfg.style,
                          }}
                        >
                          <span style={{ flex: 'none', fontSize: 9 }}>{cfg.marcador}</span>
                          <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{texto}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.borderSoft}` }}>
          {(Object.keys(CHIP) as ChipKind[]).map((k) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: C.inkSoft }}>
              <span style={{
                display: 'inline-grid', placeItems: 'center', width: 20, height: 20, borderRadius: 6,
                fontSize: 10, ...CHIP[k].style,
              }}>
                {CHIP[k].marcador}
              </span>
              {CHIP[k].rotulo}
            </span>
          ))}
        </div>
      </div>

      {/* Detalhe do dia */}
      {selecionado && (
        <div className="entra" style={{ background: C.surface, border: `2px solid ${C.accent}`, borderRadius: 20, padding: '22px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={eyebrow(C.inkSoft)}>
                {format(parseISO(selecionado.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                <h2 style={heading(21)}>{selecionado.campanha}</h2>
                <span style={tipoPill(selecionado.tipo === 'fimmes')}>{TIPO_LABELS[selecionado.tipo]}</span>
              </div>
              <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>{selecionado.base}</div>
            </div>
            <button type="button" onClick={() => setSelecionado(null)} style={{ ...BTN_GHOST, padding: '8px 14px' }}>fechar</button>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 1,
            background: C.surfaceMut, border: `1px solid ${C.surfaceMut}`, borderRadius: 14, overflow: 'hidden', marginTop: 18,
          }}>
            {[
              { rotulo: 'Base',         valor: selecionado.tamanhoBase > 0 ? selecionado.tamanhoBase.toLocaleString('pt-BR') : '—' },
              { rotulo: 'Entregas',     valor: selecionado.entregas > 0 ? `${(selecionado.entregas / 1000).toFixed(1)}k` : '—' },
              { rotulo: 'Investimento', valor: selecionado.investimentoBrl > 0 ? fmtBRL(selecionado.investimentoBrl) : '—' },
              { rotulo: 'Faturamento',  valor: selecionado.faturamentoPago > 0 ? fmtBRL(selecionado.faturamentoPago) : '—' },
              { rotulo: 'ROAS',         valor: selecionado.roas > 0 ? `${selecionado.roas.toFixed(1)}x` : '—' },
              { rotulo: 'Pedidos',      valor: selecionado.pedidos > 0 ? String(selecionado.pedidos) : '—' },
              { rotulo: 'Leitura',      valor: selecionado.taxaLeitura > 0 ? `${(selecionado.taxaLeitura * 100).toFixed(0)}%` : '—' },
              { rotulo: 'Cliques',      valor: selecionado.cliques > 0 ? String(selecionado.cliques) : '—' },
            ].map((m) => (
              <div key={m.rotulo} style={{ background: C.surface, padding: '14px 16px' }}>
                <div style={{ ...eyebrow(C.inkSoft), letterSpacing: '.12em' }}>{m.rotulo}</div>
                <div style={{
                  fontFamily: FONT.display, fontWeight: 700, fontSize: 17, marginTop: 4,
                  fontVariantNumeric: 'tabular-nums', color: m.valor === '—' ? C.inkMut : C.ink,
                }}>
                  {m.valor}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sazonais */}
      <div style={{ background: C.surfaceAlt, border: `1px solid ${C.borderMid}`, borderRadius: 20, padding: '22px 20px' }}>
        <div style={eyebrow(C.primaryDeep)}>Planejamento</div>
        <h2 style={{ ...heading(19), margin: '4px 0 16px' }}>Próximas datas sazonais</h2>

        {sazonais.length === 0 ? (
          <div style={{ fontSize: 13, color: C.primaryDeep }}>Nenhuma data sazonal futura cadastrada.</div>
        ) : (
          <div className="scroll-x">
            <div style={{ minWidth: 720 }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '76px 1.2fr 120px 96px 96px 1.4fr',
                padding: '0 14px 8px', ...eyebrow(C.primaryDeep), letterSpacing: '.12em',
              }}>
                <span>Data</span><span>Evento</span><span>Categoria</span>
                <span>Faltam</span><span>Relevância</span><span>Estrutura sugerida</span>
              </div>

              <div style={{ background: C.surface, borderRadius: 14, overflow: 'hidden' }}>
                {sazonais.map((s) => {
                  const faltam = differenceInDays(parseISO(s.data), hoje);
                  const urgente = faltam <= 15;
                  return (
                    <div key={s.data} style={{
                      display: 'grid', gridTemplateColumns: '76px 1.2fr 120px 96px 96px 1.4fr',
                      alignItems: 'center', padding: '13px 14px', borderBottom: `1px solid ${C.borderSoft}`, fontSize: 13.5,
                    }}>
                      <span style={{ fontFamily: FONT.mono, color: C.inkSoft }}>{format(parseISO(s.data), 'dd/MM')}</span>
                      <span style={{ fontWeight: 600, paddingRight: 12 }}>{s.evento}</span>
                      <span><span style={tipoPill(false)}>{CAT_LABEL[s.categoria] ?? s.categoria}</span></span>
                      <span style={{ fontWeight: 700, color: urgente ? C.primaryDeep : C.ink, fontVariantNumeric: 'tabular-nums' }}>
                        {faltam === 0 ? 'hoje' : `${faltam}d`}
                      </span>
                      <span style={{ color: C.inkSoft }}>{REL_LABEL[s.relevancia]}</span>
                      <span style={{ fontSize: 12.5, color: C.inkSoft }}>
                        {s.relevancia === 'alta'
                          ? 'Esquenta (−3d) → Dia D → Ressaca (+1d)'
                          : s.relevancia === 'media' ? 'Dia D + Ressaca' : 'Disparo único'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
