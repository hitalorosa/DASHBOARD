'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useStore, DisparoData, BaseEntryData, DisparoContent } from '@/lib/store';
import { Disparo, CampaignType } from '@/lib/types';
import { useBrand } from '@/lib/brand-context';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  C, FONT, eyebrow, heading, roasPill, roasTexto, tipoPill, fmtBRL,
  BTN_PRIMARY, BTN_GHOST, INPUT,
} from '@/lib/theme';

const TIPO_LABELS: Record<CampaignType, string> = {
  sazonal: 'Sazonal', esquenta: 'Esquenta', ressaca: 'Ressaca',
  comportamental: 'Comportamental', produto: 'LP Produto', brinde: 'Brinde', fimmes: 'Fim de Mês',
};

interface AtribItem { id: string; faturamento: number; pedidos: number }

const num = (v: number) => v.toLocaleString('pt-BR');

// ── Campo numérico reutilizável ──────────────────────────────────────────────
function Campo({ rotulo, valor, onChange, dica, somenteLeitura }: {
  rotulo: string; valor: number | string; onChange?: (v: string) => void; dica?: string; somenteLeitura?: boolean;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: C.inkSoft, marginBottom: 5 }}>
        {rotulo}{somenteLeitura && <span style={{ ...eyebrow(C.inkMut, 8), marginLeft: 6 }}>auto</span>}
      </span>
      {somenteLeitura ? (
        <div style={{ ...INPUT, background: C.surfaceMut, color: C.inkSoft, fontVariantNumeric: 'tabular-nums' }}>
          {valor || '—'}
        </div>
      ) : (
        <input
          type="number" value={valor === 0 ? '' : valor} placeholder={dica}
          onChange={(e) => onChange?.(e.target.value)}
          style={{ ...INPUT, fontVariantNumeric: 'tabular-nums' }}
        />
      )}
    </label>
  );
}

// ── Card de base individual ──────────────────────────────────────────────────
function BaseEntryCard({ entry, onUpdate, onRemove }: {
  entry: BaseEntryData; onUpdate: (d: Partial<BaseEntryData>) => void; onRemove: () => void;
}) {
  const investBrl = (entry.investimentoUsd ?? 0) * (entry.cotacaoUsd ?? 0);
  const roas = investBrl > 0 && (entry.faturamentoPago ?? 0) > 0 ? (entry.faturamentoPago ?? 0) / investBrl : 0;

  const campos: [string, keyof BaseEntryData, string][] = [
    ['Total da base', 'tamanhoBase', '15000'],
    ['Enviados', 'enviados', '12500'],
    ['Tx. entrega', 'taxaEntrega', '0.94'],
    ['Tx. leitura', 'taxaLeitura', '0.62'],
    ['Cliques', 'cliques', '890'],
    ['Investimento USD', 'investimentoUsd', '48.50'],
    ['Cotação USD/BRL', 'cotacaoUsd', '5.72'],
    ['Faturamento R$', 'faturamentoPago', '18400'],
    ['Pedidos', 'pedidos', '142'],
  ];

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <input
          type="text" value={entry.base} onChange={(e) => onUpdate({ base: e.target.value })}
          placeholder="Nome da base"
          style={{
            flex: 1, minWidth: 180, padding: '8px 10px', fontSize: 13.5, fontWeight: 600,
            border: '1px solid transparent', borderRadius: 8, background: C.bg, color: C.ink,
          }}
        />
        {roas > 0 && <span style={roasPill(roas)}>{roasTexto(roas)}</span>}
        {(entry.faturamentoPago ?? 0) > 0 && (
          <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {fmtBRL(entry.faturamentoPago ?? 0)}
          </span>
        )}
        <button type="button" onClick={onRemove} title="Remover base"
          style={{ background: 'transparent', border: 0, color: C.inkMut, fontSize: 13, cursor: 'pointer' }}>
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginTop: 14 }}>
        {campos.map(([rotulo, chave, dica]) => (
          <Campo
            key={chave} rotulo={rotulo} dica={dica}
            valor={(entry[chave] as number) ?? 0}
            onChange={(v) => onUpdate({ [chave]: v === '' ? 0 : parseFloat(v) } as Partial<BaseEntryData>)}
          />
        ))}
      </div>

      <label style={{ display: 'block', marginTop: 12 }}>
        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: C.inkSoft, marginBottom: 5 }}>Observações</span>
        <input
          type="text" value={entry.observacoes ?? ''} onChange={(e) => onUpdate({ observacoes: e.target.value })}
          placeholder="Insight sobre esta base..." style={INPUT}
        />
      </label>
    </div>
  );
}

// ── Botão de copiar com feedback ─────────────────────────────────────────────
function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1800);
      }}
      style={{
        background: copiado ? C.surfaceAlt : C.surface, border: `1px solid ${C.borderMid}`,
        borderRadius: 9, padding: '7px 13px', fontSize: 12, fontWeight: 600,
        color: copiado ? C.primaryDeep : C.ink, cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {copiado ? '✓ Copiado' : 'Copiar'}
    </button>
  );
}

// ── Painel de edição ─────────────────────────────────────────────────────────
function PainelEdicao({ d, onFechar, onRemover }: {
  d: Disparo; onFechar: () => void; onRemover: () => void;
}) {
  const {
    updateDisparo, addBaseEntry, updateBaseEntry, removeBaseEntry, getBaseEntries,
    updateDisparoContent, getDisparoContent,
  } = useStore();

  const [aba, setAba] = useState<'resultado' | 'conteudo'>('resultado');
  const [form, setForm] = useState<Partial<DisparoData>>({});
  const [salvo, setSalvo] = useState('');
  const [novaBase, setNovaBase] = useState('');

  const entries = getBaseEntries(d.id);
  const multiBase = entries.length >= 2;
  const content = getDisparoContent(d.id);

  const v = (k: keyof DisparoData): number => (form[k] as number) ?? (d[k as keyof Disparo] as number) ?? 0;
  const set = (k: keyof DisparoData) => (raw: string) =>
    setForm((p) => ({ ...p, [k]: raw === '' ? 0 : parseFloat(raw) }));

  // Com 2+ bases os totais viram soma das bases — os campos gerais ficam só leitura
  const soma = <K extends keyof BaseEntryData>(k: K) =>
    entries.reduce((s, e) => s + ((e[k] as number) ?? 0), 0);

  const investBrl = multiBase
    ? entries.reduce((s, e) => s + (e.investimentoUsd ?? 0) * (e.cotacaoUsd ?? 0), 0)
    : v('investimentoUsd') * v('cotacaoUsd');
  const fatTotal  = multiBase ? soma('faturamentoPago') : v('faturamentoPago');
  const pedTotal  = multiBase ? soma('pedidos') : v('pedidos');
  const enviados  = multiBase ? soma('enviados') : v('enviados');
  const entregas  = multiBase
    ? entries.reduce((s, e) => s + (e.enviados ?? 0) * (e.taxaEntrega ?? 0), 0)
    : enviados * v('taxaEntrega');
  const ticket = pedTotal > 0 ? fatTotal / pedTotal : 0;
  const roas   = investBrl > 0 && fatTotal > 0 ? fatTotal / investBrl : 0;

  function salvar() {
    updateDisparo(d.id, form);
    setSalvo('Resultado salvo.');
    setTimeout(onFechar, 400);
  }

  const secoes: { titulo: string; campos: [string, keyof DisparoData, string][] }[] = [
    { titulo: 'Dados da plataforma', campos: [
      ['Total da base', 'tamanhoBase', 'Ex: 15000'],
      ['Enviados', 'enviados', 'Ex: 12500'],
      ['Taxa de entrega (0–1)', 'taxaEntrega', 'Ex: 0.94'],
      ['Taxa de leitura (0–1)', 'taxaLeitura', 'Ex: 0.62'],
      ['Cliques', 'cliques', 'Ex: 890'],
    ]},
    { titulo: 'Custo da API', campos: [
      ['Investimento USD', 'investimentoUsd', 'Ex: 48.50'],
      ['Cotação USD/BRL', 'cotacaoUsd', 'Ex: 5.72'],
    ]},
    { titulo: 'Resultado (status pago)', campos: [
      ['Faturamento R$', 'faturamentoPago', 'Ex: 18400'],
      ['Pedidos', 'pedidos', 'Ex: 142'],
    ]},
  ];

  const mensagens: [string, keyof DisparoContent][] = [
    ['Mensagem 1', 'msg1'], ['Mensagem 2', 'msg2'], ['Mensagem 3', 'msg3'],
  ];

  const utms = content.utms ?? [''];
  const abaBtn = (ativa: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 9, border: 0, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: ativa ? C.surface : 'transparent', color: ativa ? C.ink : C.inkSoft,
    boxShadow: ativa ? '0 1px 3px rgba(23,48,44,.10)' : 'none',
  });

  return (
    <div className="entra" style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: '22px 18px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h3 style={heading(19)}>{d.campanha}</h3>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 3 }}>
            {format(parseISO(d.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} · {d.base}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" onClick={onRemover} style={{ ...BTN_GHOST, padding: '8px 14px', fontSize: 12.5 }}>
            Remover disparo
          </button>
          <button type="button" onClick={onFechar} aria-label="Fechar"
            style={{ ...BTN_GHOST, width: 36, height: 36, padding: 0 }}>✕</button>
        </div>
      </div>

      <div style={{ display: 'inline-flex', gap: 4, background: C.surfaceAlt, padding: 4, borderRadius: 12, marginBottom: 18 }}>
        <button type="button" onClick={() => setAba('resultado')} style={abaBtn(aba === 'resultado')}>Resultado</button>
        <button type="button" onClick={() => setAba('conteudo')} style={abaBtn(aba === 'conteudo')}>Conteúdo</button>
      </div>

      {aba === 'resultado' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {multiBase && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, background: C.warn,
              borderRadius: 12, padding: '12px 16px', fontSize: 12.5,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ink, flex: 'none' }} />
              Com {entries.length} bases, os campos abaixo viram soma automática e ficam somente leitura.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, alignItems: 'start' }}>
            {secoes.map((s) => (
              <div key={s.titulo} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
                <div style={{ ...eyebrow(C.inkSoft), marginBottom: 14 }}>{s.titulo}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {s.campos.map(([rotulo, chave, dica]) => (
                    <Campo
                      key={chave} rotulo={rotulo} dica={dica} valor={v(chave)}
                      onChange={set(chave)} somenteLeitura={multiBase}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 1,
            background: C.borderMid, border: `1px solid ${C.borderMid}`, borderRadius: 16, overflow: 'hidden',
          }}>
            {[
              { rotulo: 'Invest. BRL', valor: investBrl > 0 ? fmtBRL(investBrl) : '—' },
              { rotulo: 'Entregas',    valor: entregas > 0 ? `${(entregas / 1000).toFixed(1)}k` : '—' },
              { rotulo: 'Ticket médio',valor: ticket > 0 ? fmtBRL(ticket, true) : '—' },
              { rotulo: 'ROAS',        valor: roas > 0 ? `${roas.toFixed(2)}x` : '—' },
            ].map((m) => (
              <div key={m.rotulo} style={{ background: C.surfaceAlt, padding: '14px 16px' }}>
                <div style={{ ...eyebrow(C.primaryDeep), letterSpacing: '.12em' }}>
                  {m.rotulo} <span style={{ opacity: .7 }}>(auto)</span>
                </div>
                <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 20, letterSpacing: '-.02em', marginTop: 4 }}>
                  {m.valor}
                </div>
              </div>
            ))}
          </div>

          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: C.inkSoft, marginBottom: 6 }}>Observações</span>
            <textarea
              rows={3}
              value={(form.observacoes as string) ?? d.observacoes}
              onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
              placeholder="O que explica o resultado deste disparo?"
              style={{ ...INPUT, padding: 12, background: C.surface, resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={salvar} style={BTN_PRIMARY}>Salvar resultado</button>
            <button type="button" onClick={onFechar} style={BTN_GHOST}>Cancelar</button>
            {salvo && <span style={{ fontSize: 12, color: C.primaryDeep }}>{salvo}</span>}
          </div>

          <div style={{ height: 1, background: C.border }} />

          <div>
            <div style={{ marginBottom: 14 }}>
              <div style={eyebrow(C.inkSoft)}>Segmentação</div>
              <h4 style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16, margin: '4px 0 0' }}>
                Detalhamento por base
              </h4>
              <p style={{ fontSize: 12.5, color: C.inkSoft, margin: '4px 0 0' }}>
                Sem bases aqui, os campos acima valem para <strong style={{ color: C.ink }}>{d.base}</strong>.
                Com duas ou mais, eles viram a soma das bases.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {entries.map((e, i) => (
                <BaseEntryCard
                  key={i} entry={e}
                  onUpdate={(data) => updateBaseEntry(d.id, i, data)}
                  onRemove={() => removeBaseEntry(d.id, i)}
                />
              ))}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="text" value={novaBase} onChange={(e) => setNovaBase(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && novaBase.trim()) {
                      addBaseEntry(d.id, { base: novaBase.trim() }); setNovaBase('');
                    }
                  }}
                  placeholder="Nome da nova base"
                  style={{ ...INPUT, flex: 1, maxWidth: 320, background: C.surface }}
                />
                <button
                  type="button"
                  disabled={!novaBase.trim()}
                  onClick={() => { addBaseEntry(d.id, { base: novaBase.trim() }); setNovaBase(''); }}
                  style={{
                    ...BTN_GHOST, fontWeight: 600,
                    opacity: novaBase.trim() ? 1 : .5, cursor: novaBase.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  + Adicionar base
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 920 }}>
          <div style={{ fontSize: 12, color: C.inkSoft }}>Esta aba grava a cada tecla — sem botão de salvar.</div>

          {mensagens.map(([rotulo, chave]) => (
            <div key={chave} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <span style={eyebrow(C.inkSoft)}>{rotulo}</span>
                <BotaoCopiar texto={(content[chave] as string) ?? ''} />
              </div>
              <textarea
                rows={3} value={(content[chave] as string) ?? ''}
                onChange={(e) => updateDisparoContent(d.id, { [chave]: e.target.value })}
                placeholder="Cole aqui o texto da mensagem…"
                style={{ ...INPUT, padding: 12, lineHeight: 1.5, resize: 'vertical' }}
              />
            </div>
          ))}

          <div style={{ background: C.ink, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <span style={eyebrow(C.onDark)}>Mensagem 4 · convite grupo VIP</span>
              <BotaoCopiar texto={content.msgVip ?? ''} />
            </div>
            <textarea
              rows={3} value={content.msgVip ?? ''}
              onChange={(e) => updateDisparoContent(d.id, { msgVip: e.target.value })}
              placeholder="Cole aqui a mensagem de convite para o Grupo VIP…"
              style={{
                width: '100%', padding: 12, fontSize: 14, lineHeight: 1.5,
                border: '1px solid rgba(255,255,255,.2)', borderRadius: 12,
                background: 'rgba(255,255,255,.06)', color: '#fff', resize: 'vertical',
              }}
            />
          </div>

          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <span style={eyebrow(C.inkSoft)}>UTM · links ({utms.length})</span>
              <button
                type="button"
                onClick={() => updateDisparoContent(d.id, { utms: [...utms, ''] })}
                style={{ ...BTN_GHOST, padding: '7px 13px', fontSize: 12 }}
              >
                + UTM
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {utms.map((u, i) => (
                <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, background: C.bg }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>UTM {utms.length > 1 ? i + 1 : ''}</span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      <BotaoCopiar texto={u} />
                      {utms.length > 1 && (
                        <button
                          type="button" title="Remover"
                          onClick={() => updateDisparoContent(d.id, { utms: utms.filter((_, j) => j !== i) })}
                          style={{ background: 'transparent', border: 0, color: C.inkMut, fontSize: 12, cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  </div>
                  <input
                    type="text" value={u}
                    onChange={(e) => updateDisparoContent(d.id, { utms: utms.map((x, j) => (j === i ? e.target.value : x)) })}
                    placeholder="https://sualoja.com.br/produto?utm_source=whatsapp&utm_campaign=..."
                    style={{ ...INPUT, fontFamily: FONT.mono, fontSize: 12, background: C.surface, color: C.primaryDeep }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'block', maxWidth: 280, flex: 1 }}>
              <span style={{ ...eyebrow(C.inkSoft), display: 'block', marginBottom: 6 }}>Cupom</span>
              <input
                type="text" value={content.cupom ?? ''}
                onChange={(e) => updateDisparoContent(d.id, { cupom: e.target.value })}
                placeholder="Ex: VIP20"
                style={{ ...INPUT, fontFamily: FONT.mono, letterSpacing: '.06em', background: C.surface }}
              />
            </label>
            <BotaoCopiar texto={content.cupom ?? ''} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function DisparosPage() {
  const { brand, month, year } = useBrand();
  const [aberto, setAberto] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const [yampiMap, setYampiMap]       = useState<Map<string, AtribItem>>(new Map());
  const [yampiStatus, setYampiStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [yampiError, setYampiError]   = useState('');
  const [syncHora, setSyncHora]       = useState('');

  const { getDisparos, removeDisparo } = useStore();

  async function syncYampi() {
    setYampiStatus('loading');
    setYampiError('');
    try {
      const res = await fetch(`/api/atribuicao?month=${month}&year=${year}&brand=${brand.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as AtribItem[];
      const map = new Map<string, AtribItem>();
      for (const item of data) map.set(item.id, item);
      setYampiMap(map);
      setYampiStatus('done');
      setSyncHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      setYampiError(e instanceof Error ? e.message : 'Erro desconhecido');
      setYampiStatus('error');
    }
  }

  useEffect(() => { syncYampi(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [month, year, brand.id]);

  // Re-sync ao fechar o painel — 1,5s para o Supabase gravar o conteúdo antes
  const anterior = useRef<string | null>(null);
  useEffect(() => {
    if (anterior.current !== null && aberto === null) {
      const t = setTimeout(() => syncYampi(), 1500);
      return () => clearTimeout(t);
    }
    anterior.current = aberto;
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [aberto]);

  const disparos = getDisparos(month, year);

  const totalInvest = disparos.reduce((s, d) => s + d.investimentoBrl, 0);
  const totalFat    = disparos.reduce((s, d) => s + d.faturamentoPago, 0);
  const totalPed    = disparos.reduce((s, d) => s + d.pedidos, 0);
  const totalTam    = disparos.reduce((s, d) => s + d.tamanhoBase, 0);
  const totalCli    = disparos.reduce((s, d) => s + d.cliques, 0);
  const roasTotal   = totalInvest > 0 && totalFat > 0 ? totalFat / totalInvest : 0;
  const leituras    = disparos.filter((d) => d.taxaLeitura > 0).map((d) => d.taxaLeitura);
  const leituraMed  = leituras.length ? leituras.reduce((s, v) => s + v, 0) / leituras.length : 0;

  const syncCor = yampiStatus === 'error' ? C.warn : C.surfaceAlt;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Barra de sincronização */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        background: syncCor, border: `1px solid ${yampiStatus === 'error' ? C.warnBorder : C.borderMid}`,
        borderRadius: 14, padding: '13px 16px',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flex: 'none',
          background: yampiStatus === 'loading' ? C.inkMut : yampiStatus === 'error' ? C.warnInk : C.primary,
        }} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {yampiStatus === 'loading' && 'Buscando atribuições na Yampi…'}
            {yampiStatus === 'error'   && 'Falha ao sincronizar com a Yampi'}
            {yampiStatus === 'done'    && 'Atribuição da Yampi sincronizada'}
            {yampiStatus === 'idle'    && 'Atribuição da Yampi'}
          </div>
          <div style={{ fontSize: 12, color: C.inkSoft }}>
            {yampiStatus === 'error' ? yampiError
              : yampiStatus === 'done' ? `${yampiMap.size} disparos com pedidos atribuídos · atualizado às ${syncHora}`
              : 'Cruza os pedidos pagos com o cupom e a UTM de cada disparo.'}
          </div>
        </div>
        <button
          type="button" onClick={syncYampi} disabled={yampiStatus === 'loading'}
          style={{ ...BTN_GHOST, background: C.surface, opacity: yampiStatus === 'loading' ? .6 : 1 }}
        >
          {yampiStatus === 'loading' ? 'Buscando…' : 'Sincronizar'}
        </button>
      </div>

      {/* Lista de disparos */}
      <div style={{ background: '#EDF2F1', border: `1px solid ${C.railBorder}`, borderRadius: 20, overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
          background: C.rail, borderBottom: `1px solid ${C.railBorder}`,
          ...eyebrow(C.inkRail), letterSpacing: '.12em',
        }}>
          <span style={{ width: 96, flex: 'none' }}>Ação</span>
          <span style={{ flex: 1, minWidth: 0 }}>Campanha · tipo · base</span>
          <span style={{ flex: 'none' }}>ROAS</span>
          <span style={{ width: 32, flex: 'none' }} />
        </div>

        {disparos.map((d) => {
          const yampi = yampiMap.get(d.id);
          const fatMostrado = d.faturamentoPago > 0 ? d.faturamentoPago : (yampi?.faturamento ?? 0);
          const pedMostrado = d.pedidos > 0 ? d.pedidos : (yampi?.pedidos ?? 0);
          const daYampi = d.faturamentoPago === 0 && (yampi?.faturamento ?? 0) > 0;
          const estaAberto = aberto === d.id;

          const metricas = [
            { rotulo: 'Tam. base', valor: d.tamanhoBase > 0 ? num(d.tamanhoBase) : '—' },
            { rotulo: 'Invest.',   valor: d.investimentoBrl > 0 ? fmtBRL(d.investimentoBrl) : '—' },
            { rotulo: 'Fat.',      valor: fatMostrado > 0 ? fmtBRL(fatMostrado) : '—', yampi: daYampi },
            { rotulo: 'Pedidos',   valor: pedMostrado > 0 ? num(pedMostrado) : '—', yampi: daYampi },
            { rotulo: 'Leitura',   valor: d.taxaLeitura > 0 ? `${(d.taxaLeitura * 100).toFixed(0)}%` : '—' },
            { rotulo: 'Cliques',   valor: d.cliques > 0 ? num(d.cliques) : '—' },
          ];

          return (
            <div
              key={d.id}
              className="disparo-card"
              style={{
                background: C.surface, border: `1px solid ${estaAberto ? C.accent : C.railBorder}`,
                borderRadius: 14, overflow: 'hidden', margin: '10px 12px',
                boxShadow: '0 1px 2px rgba(23,48,44,.05)',
              }}
            >
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setAberto(estaAberto ? null : d.id)}
                    style={{
                      width: 96, flex: 'none', padding: '9px 0', borderRadius: 10, cursor: 'pointer',
                      fontSize: 12.5, fontWeight: 600,
                      background: estaAberto ? C.ink : C.surface,
                      color: estaAberto ? '#fff' : C.ink,
                      border: `1px solid ${estaAberto ? C.ink : C.borderMid}`,
                    }}
                  >
                    {estaAberto ? 'Fechar' : d.investimentoBrl > 0 || d.faturamentoPago > 0 ? 'Editar' : 'Preencher'}
                  </button>

                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontFamily: FONT.mono, fontSize: 11.5, color: C.inkSoft, flex: 'none' }}>
                        {format(parseISO(d.data), 'dd/MM')}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {d.campanha}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, minWidth: 0, flexWrap: 'wrap' }}>
                      <span style={tipoPill(d.tipo === 'fimmes')}>{TIPO_LABELS[d.tipo]}</span>
                      <span style={{ fontSize: 11.5, color: C.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                        {d.base}
                      </span>
                      {d.observacoes && (
                        <span style={{ fontSize: 11.5, color: C.inkMut, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                          {d.observacoes}
                        </span>
                      )}
                    </div>
                  </div>

                  <span style={roasPill(d.roas)}>{roasTexto(d.roas)}</span>

                  <span style={{ width: 32, flex: 'none', textAlign: 'right' }}>
                    {confirmando === d.id ? (
                      <span style={{ display: 'inline-flex', gap: 4, whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => { removeDisparo(d.id); setConfirmando(null); if (estaAberto) setAberto(null); }}
                          style={{ background: C.ink, color: '#fff', border: 0, borderRadius: 8, padding: '5px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Confirmar
                        </button>
                        <button type="button" onClick={() => setConfirmando(null)}
                          style={{ ...BTN_GHOST, padding: '5px 9px', fontSize: 11 }}>Não</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmando(d.id)} title="Remover disparo"
                        style={{ background: 'transparent', border: 0, color: C.inkMut, fontSize: 14, cursor: 'pointer', padding: 4 }}>
                        ⌫
                      </button>
                    )}
                  </span>
                </div>

                {/* Faixa de métricas */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(88px,1fr))', gap: 10,
                  marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.borderSoft}`,
                }}>
                  {metricas.map((m) => (
                    <div key={m.rotulo} style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                        <span style={{ ...eyebrow(C.inkRail, 8.5), letterSpacing: '.1em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.rotulo}
                        </span>
                        {m.yampi && (
                          <span style={{
                            fontFamily: FONT.mono, fontSize: 7.5, letterSpacing: '.06em',
                            background: C.surfaceAlt, color: C.primaryDeep, borderRadius: 3, padding: '1px 3px', flex: 'none',
                          }}>
                            YAMPI
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 13.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 2,
                        color: m.valor === '—' ? C.inkMut : C.ink,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {m.valor}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {estaAberto && (
                <PainelEdicao
                  d={d}
                  onFechar={() => setAberto(null)}
                  onRemover={() => setConfirmando(d.id)}
                />
              )}
            </div>
          );
        })}

        {disparos.length > 0 ? (
          <div style={{ margin: '10px 12px 12px', padding: '14px 16px', background: C.surfaceAlt, border: '1px solid #A9CFC3', borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ flex: 1, minWidth: 0, ...eyebrow(C.ink, 10), letterSpacing: '.16em' }}>
                Totais · {disparos.length} {disparos.length === 1 ? 'disparo' : 'disparos'}
              </span>
              <span style={roasPill(roasTotal)}>{roasTexto(roasTotal)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(88px,1fr))', gap: 10, marginTop: 11 }}>
              {[
                { rotulo: 'Tam. base', valor: totalTam > 0 ? num(totalTam) : '—' },
                { rotulo: 'Invest.',   valor: totalInvest > 0 ? fmtBRL(totalInvest) : '—' },
                { rotulo: 'Fat.',      valor: totalFat > 0 ? fmtBRL(totalFat) : '—' },
                { rotulo: 'Pedidos',   valor: totalPed > 0 ? num(totalPed) : '—' },
                { rotulo: 'Leitura',   valor: leituraMed > 0 ? `${(leituraMed * 100).toFixed(0)}% média` : '—' },
                { rotulo: 'Cliques',   valor: totalCli > 0 ? num(totalCli) : '—' },
              ].map((m) => (
                <div key={m.rotulo} style={{ minWidth: 0 }}>
                  <div style={{ ...eyebrow(C.primaryDeep, 8.5), letterSpacing: '.1em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.rotulo}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m.valor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ ...heading(17) }}>Nenhum disparo neste mês.</div>
            <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 6 }}>
              Vá em <strong style={{ color: C.primaryDeep }}>Calendário</strong> e clique em{' '}
              <strong style={{ color: C.primaryDeep }}>+ Novo</strong> para reservar a data.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
