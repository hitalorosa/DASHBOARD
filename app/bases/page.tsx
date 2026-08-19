'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { DecisaoBase } from '@/lib/types';
import { C, FONT, eyebrow, heading, decisaoPill, fmtBRL } from '@/lib/theme';

const DEC: Record<DecisaoBase, string> = {
  pendente:  'Pendente',
  reenviar:  'Reenviar',
  monitorar: 'Monitorar',
  testar:    'Testar Novo Recorte',
  descartar: 'Descartar',
};
const ORDEM = Object.keys(DEC) as DecisaoBase[];

const INPUT_DATE: React.CSSProperties = {
  padding: '10px 12px', fontSize: 14, border: `1px solid ${C.borderMid}`,
  borderRadius: 10, background: C.bg, color: C.ink, colorScheme: 'light',
};

export default function BasesPage() {
  const [aberta, setAberta] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<DecisaoBase | 'todos'>('todos');
  const [periodoAtivo, setPeriodoAtivo] = useState(false);
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const { getBases, updateBase } = useStore();

  const bases = getBases();
  const noPeriodo = periodoAtivo && inicio && fim ? getBases(inicio, fim) : null;

  const contagem = ORDEM.reduce((acc, k) => {
    acc[k] = bases.filter((b) => b.decisao === k).length;
    return acc;
  }, {} as Record<DecisaoBase, number>);

  const visiveis = filtro === 'todos' ? bases : bases.filter((b) => b.decisao === filtro);

  function pillFiltro(ativo: boolean): React.CSSProperties {
    return {
      display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 999,
      fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
      background: ativo ? C.ink : C.surface,
      color: ativo ? '#fff' : C.inkSoft,
      border: `1px solid ${ativo ? C.ink : C.borderMid}`,
    };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setFiltro('todos')} style={pillFiltro(filtro === 'todos')}>
          Todos <span style={{ opacity: .6 }}>{bases.length}</span>
        </button>
        {ORDEM.map((k) => (
          <button key={k} type="button" onClick={() => setFiltro(k)} style={pillFiltro(filtro === k)}>
            {DEC[k]} <span style={{ opacity: .6 }}>{contagem[k]}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => setPeriodoAtivo((v) => !v)}
          style={{ ...pillFiltro(periodoAtivo), marginLeft: 'auto' }}
        >
          Filtrar por período
        </button>
      </div>

      {periodoAtivo && (
        <div className="entra" style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
          padding: '16px 18px', display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap',
        }}>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: C.inkSoft, marginBottom: 5 }}>De</span>
            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} style={INPUT_DATE} />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: C.inkSoft, marginBottom: 5 }}>Até</span>
            <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} style={INPUT_DATE} />
          </label>
          <div style={{ fontSize: 12.5, color: C.inkSoft, paddingBottom: 10 }}>
            {inicio && fim
              ? <>Mostrando o resultado de <strong style={{ color: C.primaryDeep }}>
                  {new Date(inicio + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  {' a '}
                  {new Date(fim + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </strong> em cada card.</>
              : 'Selecione as duas datas para filtrar.'}
          </div>
        </div>
      )}

      {/* Cards */}
      {visiveis.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(304px,1fr))', gap: 16, alignItems: 'start' }}>
          {visiveis.map((b) => {
            const pb = noPeriodo?.find((x) => x.nome === b.nome);
            const expandida = aberta === b.nome;

            const celulas = [
              { rotulo: 'Disparos',    valor: String(b.disparos) },
              { rotulo: 'Faturamento', valor: b.faturamento > 0 ? fmtBRL(b.faturamento) : '—' },
              { rotulo: 'ROAS',        valor: b.roasMedio > 0 ? `${b.roasMedio.toFixed(1)}x` : '—' },
            ];

            return (
              <div key={b.nome} style={{
                background: C.surface, border: `1px solid ${expandida ? C.accent : C.border}`,
                borderRadius: 20, overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '18px 18px 14px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16, letterSpacing: '-.01em' }}>{b.nome}</div>
                    <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2 }}>
                      {b.tamanho > 0 ? `${b.tamanho.toLocaleString('pt-BR')} contatos` : 'tamanho não informado'}
                    </div>
                  </div>
                  <span style={decisaoPill(b.decisao)}>{DEC[b.decisao]}</span>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 1,
                  background: C.surfaceMut, borderTop: `1px solid ${C.borderSoft}`, borderBottom: `1px solid ${C.borderSoft}`,
                }}>
                  {celulas.map((c) => (
                    <div key={c.rotulo} style={{ background: C.surface, padding: '13px 14px' }}>
                      <div style={{ ...eyebrow(C.inkSoft), letterSpacing: '.12em' }}>{c.rotulo}</div>
                      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                        {c.valor}
                      </div>
                    </div>
                  ))}
                </div>

                {noPeriodo && (
                  <div style={{ background: C.surfaceAlt, padding: '11px 16px', display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                    {pb ? [
                      { rotulo: 'Disparos',    valor: String(pb.disparos) },
                      { rotulo: 'Faturamento', valor: pb.faturamento > 0 ? fmtBRL(pb.faturamento) : '—' },
                      { rotulo: 'ROAS',        valor: pb.roasMedio > 0 ? `${pb.roasMedio.toFixed(1)}x` : '—' },
                    ].map((c) => (
                      <div key={c.rotulo}>
                        <div style={{ ...eyebrow(C.primaryDeep, 8), letterSpacing: '.12em' }}>{c.rotulo}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{c.valor}</div>
                      </div>
                    )) : (
                      <div style={{ fontSize: 12, color: C.primaryDeep }}>Sem disparos neste período</div>
                    )}
                  </div>
                )}

                <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <select
                    value={b.decisao}
                    onChange={(e) => updateBase(b.nome, { decisao: e.target.value as DecisaoBase })}
                    style={{
                      width: '100%', padding: '11px 12px', fontSize: 13.5, fontWeight: 600,
                      border: `1px solid ${C.borderMid}`, borderRadius: 10, background: C.bg, color: C.ink, cursor: 'pointer',
                    }}
                  >
                    {ORDEM.map((k) => <option key={k} value={k}>{DEC[k]}</option>)}
                  </select>

                  <button
                    type="button"
                    onClick={() => setAberta(expandida ? null : b.nome)}
                    style={{ background: 'transparent', border: 0, padding: 0, fontSize: 12, fontWeight: 600, color: C.primaryDeep, cursor: 'pointer', textAlign: 'left' }}
                  >
                    {expandida ? 'ocultar notas' : b.notas ? 'ver notas' : '+ adicionar nota'}
                  </button>

                  {expandida && (
                    <textarea
                      rows={3}
                      value={b.notas}
                      onChange={(e) => updateBase(b.nome, { notas: e.target.value })}
                      placeholder="Notas e observações desta base"
                      style={{
                        width: '100%', padding: 11, fontSize: 13.5, border: `1px solid ${C.borderMid}`,
                        borderRadius: 10, background: C.bg, color: C.ink, resize: 'vertical',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          background: C.surface, border: `1px dashed ${C.borderMid}`, borderRadius: 20,
          padding: '56px 24px', textAlign: 'center',
        }}>
          <div style={{ ...heading(17) }}>
            {bases.length === 0 ? 'Nenhuma base encontrada.' : 'Nenhuma base com esse status.'}
          </div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 6 }}>
            {bases.length === 0
              ? <>Vá em <strong style={{ color: C.primaryDeep }}>Disparos</strong>, abra um disparo e preencha os dados — a base aparece aqui automaticamente.</>
              : <>Troque o filtro acima para ver as outras.</>}
          </div>
        </div>
      )}
    </div>
  );
}
