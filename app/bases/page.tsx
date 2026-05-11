'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { useStore } from '@/lib/store';
import { DecisaoBase } from '@/lib/types';

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); }

const DEC: Record<DecisaoBase, { label: string; bg: string; color: string }> = {
  reenviar:  { label: 'Reenviar',            bg: '#0F2E1A', color: '#4ADE80' },
  monitorar: { label: 'Monitorar',           bg: '#0D1F3A', color: '#60A5FA' },
  testar:    { label: 'Testar Novo Recorte', bg: '#2D2208', color: '#FCD34D' },
  descartar: { label: 'Descartar',           bg: '#3F1010', color: '#F87171' },
  pendente:  { label: 'Pendente',            bg: '#1C1C1C', color: '#4B5563' },
};

const MONO = { fontFamily: "'JetBrains Mono', monospace" };
const INPUT_STYLE = { backgroundColor: '#0D0D0D', borderColor: '#2A2A2A', color: '#F9FAFB' };

export default function BasesPage() {
  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2026);
  const [selected, setSelected] = useState<string | null>(null);
  const [periodoAtivo, setPeriodoAtivo] = useState(false);
  const [periodoStart, setPeriodoStart] = useState('');
  const [periodoEnd, setPeriodoEnd] = useState('');
  const { getBases, updateBase } = useStore();

  const bases = getBases();
  const basesFiltered = periodoAtivo && periodoStart && periodoEnd
    ? getBases(periodoStart, periodoEnd)
    : null;

  const summary = (Object.keys(DEC) as DecisaoBase[]).reduce((acc, k) => {
    acc[k] = bases.filter((b) => b.decisao === k).length;
    return acc;
  }, {} as Record<DecisaoBase, number>);

  const isEmpty = bases.length === 0;

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
      <Header title="Bases" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
      <main className="p-8 flex flex-col gap-6">

        {/* status pills + period toggle */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {(Object.entries(DEC) as [DecisaoBase, typeof DEC[DecisaoBase]][]).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
                style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color + '30' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                {cfg.label}
                <span className="font-bold">{summary[key]}</span>
              </div>
            ))}
          </div>

          {/* período button */}
          <button
            onClick={() => { setPeriodoAtivo((v) => !v); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
            style={{
              borderColor: periodoAtivo ? '#D4A843' : '#2A2A2A',
              color: periodoAtivo ? '#D4A843' : '#5E5E5E',
              backgroundColor: periodoAtivo ? 'rgba(212,168,67,0.08)' : 'transparent',
            }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: periodoAtivo ? '#D4A843' : '#3A3A3A' }} />
            Filtrar por Período
          </button>
        </div>

        {/* date range picker */}
        {periodoAtivo && (
          <div className="rounded-2xl border p-4 flex flex-wrap items-end gap-4"
            style={{ backgroundColor: '#1A1A1A', borderColor: '#D4A843', borderWidth: 1 }}>
            <div>
              <label className="block mb-1.5 text-xs" style={{ ...MONO, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>De</label>
              <input
                type="date"
                value={periodoStart}
                onChange={(e) => setPeriodoStart(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none border"
                style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-xs" style={{ ...MONO, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Até</label>
              <input
                type="date"
                value={periodoEnd}
                onChange={(e) => setPeriodoEnd(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none border"
                style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
              />
            </div>
            {periodoStart && periodoEnd && (
              <p className="text-xs self-center" style={{ color: '#5E5E5E' }}>
                Mostrando resultado de{' '}
                <span style={{ color: '#D4A843' }}>
                  {new Date(periodoStart + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  {' '}a{' '}
                  {new Date(periodoEnd + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                {' '}em cada card.
              </p>
            )}
            {(!periodoStart || !periodoEnd) && (
              <p className="text-xs self-center" style={{ color: '#3A3A3A' }}>Selecione as duas datas para filtrar.</p>
            )}
          </div>
        )}

        {/* empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-24 gap-3" style={{ color: '#3A3A3A' }}>
            <p className="text-sm">Nenhuma base encontrada.</p>
            <p className="text-xs" style={{ color: '#2A2A2A' }}>
              Vá em Disparos, abra um disparo e preencha os dados — a base aparece aqui automaticamente.
            </p>
          </div>
        )}

        {/* cards grid */}
        {!isEmpty && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {bases.map((b) => {
              const cfg = DEC[b.decisao];
              const isOpen = selected === b.nome;

              // period overlay stats
              const pb = basesFiltered?.find((x) => x.nome === b.nome);
              const showPeriod = periodoAtivo && periodoStart && periodoEnd;

              return (
                <div key={b.nome} onClick={() => setSelected(isOpen ? null : b.nome)}
                  className="rounded-2xl border p-5 cursor-pointer transition-all"
                  style={{ backgroundColor: '#1A1A1A', borderColor: isOpen ? '#D4A843' : '#2A2A2A' }}>

                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-sm leading-snug" style={{ color: '#F9FAFB' }}>{b.nome}</h3>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ml-2 shrink-0"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* all-time stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: 'Disparos',    value: String(b.disparos) },
                      { label: 'Faturamento', value: b.faturamento > 0 ? fmt(b.faturamento) : '—', gold: b.faturamento > 0 },
                      { label: 'ROAS',        value: b.roasMedio > 0 ? `${b.roasMedio.toFixed(1)}x` : '—',
                        color: b.roasMedio >= 7 ? '#4ADE80' : b.roasMedio >= 4 ? '#FCD34D' : b.roasMedio > 0 ? '#F87171' : '#374151' },
                    ].map(({ label, value, gold, color }) => (
                      <div key={label} className="rounded-lg p-3 text-center" style={{ backgroundColor: '#111111' }}>
                        <p className="text-xs mb-1" style={{ color: '#4B5563' }}>{label}</p>
                        <p className="text-sm font-bold" style={{ color: color ?? (gold ? '#D4A843' : '#9CA3AF') }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* period strip */}
                  {showPeriod && (
                    <div className="rounded-xl px-3 py-2.5 mb-3 border" style={{ backgroundColor: '#111111', borderColor: 'rgba(212,168,67,0.15)' }}>
                      <p className="text-xs mb-2" style={{ ...MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#D4A843' }}>
                        No período
                      </p>
                      {pb ? (
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Disparos',    value: String(pb.disparos) },
                            { label: 'Faturamento', value: pb.faturamento > 0 ? fmt(pb.faturamento) : '—', gold: pb.faturamento > 0 },
                            { label: 'ROAS',        value: pb.roasMedio > 0 ? `${pb.roasMedio.toFixed(1)}x` : '—',
                              color: pb.roasMedio >= 7 ? '#4ADE80' : pb.roasMedio >= 4 ? '#FCD34D' : pb.roasMedio > 0 ? '#F87171' : '#374151' },
                          ].map(({ label, value, gold, color }) => (
                            <div key={label} className="text-center">
                              <p className="text-xs mb-0.5" style={{ color: '#3A3A3A' }}>{label}</p>
                              <p className="text-xs font-bold" style={{ color: color ?? (gold ? '#D4A843' : '#9CA3AF') }}>{value}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs" style={{ color: '#3A3A3A' }}>Sem disparos neste período</p>
                      )}
                    </div>
                  )}

                  <div onClick={(e) => e.stopPropagation()}>
                    <select value={b.decisao}
                      onChange={(e) => updateBase(b.nome, { decisao: e.target.value as DecisaoBase })}
                      className="w-full text-xs font-semibold rounded-lg px-3 py-2 outline-none cursor-pointer border"
                      style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color + '30' }}>
                      {(Object.entries(DEC) as [DecisaoBase, typeof DEC[DecisaoBase]][]).map(([k, c]) => (
                        <option key={k} value={k}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: '#2A2A2A' }} onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs mb-2" style={{ color: '#4B5563' }}>Notas e observações</p>
                      <textarea value={b.notas}
                        onChange={(e) => updateBase(b.nome, { notas: e.target.value })}
                        rows={3} className="w-full rounded-lg px-3 py-2 text-xs outline-none resize-none border"
                        style={{ backgroundColor: '#0D0D0D', borderColor: '#2A2A2A', color: '#9CA3AF' }}
                        placeholder="Ex: base nova testada em maio, boa abertura mas faturamento baixo..." />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
