'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { basesMaio } from '@/lib/data';
import { Base, DecisaoBase } from '@/lib/types';

const DECISAO_CONFIG: Record<DecisaoBase, { label: string; bg: string; color: string; dot: string }> = {
  reenviar:  { label: 'Reenviar',           bg: '#0F2E1A', color: '#4ADE80', dot: '#4ADE80' },
  monitorar: { label: 'Monitorar',          bg: '#0D1F3A', color: '#60A5FA', dot: '#60A5FA' },
  testar:    { label: 'Testar Novo Recorte',bg: '#2D2208', color: '#FCD34D', dot: '#FCD34D' },
  descartar: { label: 'Descartar',          bg: '#3F1010', color: '#F87171', dot: '#F87171' },
  pendente:  { label: 'Pendente',           bg: '#1A1A1A', color: '#6B7280', dot: '#6B7280' },
};

export default function BasesPage() {
  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2025);
  const [decisoes, setDecisoes] = useState<Record<string, DecisaoBase>>({});
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newBaseName, setNewBaseName] = useState('');

  const bases = useMemo(() => basesMaio, []);

  const getDecisao = (nome: string, original: DecisaoBase): DecisaoBase => decisoes[nome] ?? original;
  const getNota = (nome: string, original: string): string => notas[nome] ?? original;

  const summary = useMemo(() => {
    return (Object.keys(DECISAO_CONFIG) as DecisaoBase[]).reduce((acc, key) => {
      acc[key] = bases.filter((b) => getDecisao(b.nome, b.decisao) === key).length;
      return acc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, {} as Record<DecisaoBase, number>);
  }, [bases, decisoes]);

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
      <Header title="Bases" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />

      <main className="p-8 flex flex-col gap-6">

        {/* Summary strip */}
        <div className="flex flex-wrap gap-3">
          {(Object.entries(DECISAO_CONFIG) as [DecisaoBase, typeof DECISAO_CONFIG[DecisaoBase]][]).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border"
              style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color + '40' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
              {cfg.label}
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                style={{ backgroundColor: cfg.color + '20', color: cfg.color }}>
                {summary[key]}
              </span>
            </div>
          ))}

          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-colors"
            style={{ borderColor: '#D4A843', color: '#D4A843', backgroundColor: 'transparent' }}>
            + Nova Base
          </button>
        </div>

        {/* Add base modal */}
        {showAdd && (
          <div className="rounded-2xl border p-5 flex items-center gap-3" style={{ backgroundColor: '#1A1A1A', borderColor: '#D4A843' }}>
            <input
              autoFocus
              value={newBaseName}
              onChange={(e) => setNewBaseName(e.target.value)}
              placeholder="Nome da nova base (ex: Compradores VIP, Quiz Responderam...)"
              className="flex-1 text-sm rounded-lg px-3 py-2 outline-none border"
              style={{ backgroundColor: '#0D0D0D', borderColor: '#2A2A2A', color: '#F9FAFB' }}
            />
            <button onClick={() => { setNewBaseName(''); setShowAdd(false); }}
              className="text-xs px-4 py-2 rounded-lg border"
              style={{ borderColor: '#D4A843', color: '#D4A843' }}>
              Salvar
            </button>
            <button onClick={() => setShowAdd(false)} className="text-xs" style={{ color: '#6B7280' }}>Cancelar</button>
          </div>
        )}

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {bases.map((b: Base) => {
            const dec = getDecisao(b.nome, b.decisao);
            const nota = getNota(b.nome, b.notas);
            const cfg = DECISAO_CONFIG[dec];
            const isOpen = selected === b.nome;

            return (
              <div key={b.nome}
                onClick={() => setSelected(isOpen ? null : b.nome)}
                className="rounded-2xl border p-5 cursor-pointer transition-all"
                style={{
                  backgroundColor: '#1A1A1A',
                  borderColor: isOpen ? '#D4A843' : '#2A2A2A',
                  boxShadow: isOpen ? '0 0 0 1px #D4A843' : 'none',
                }}>

                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-sm leading-snug" style={{ color: '#F9FAFB' }}>{b.nome}</h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ml-2 shrink-0"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                    {cfg.label}
                  </span>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Disparos', value: String(b.disparos) },
                    { label: 'Tamanho', value: b.tamanho > 0 ? `${(b.tamanho / 1000).toFixed(1)}k` : 'A preencher' },
                    { label: 'ROAS', value: b.roasMedio > 0 ? `${b.roasMedio.toFixed(1)}x` : 'A preencher' },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg p-2.5 text-center" style={{ backgroundColor: '#111111' }}>
                      <p className="text-xs mb-0.5" style={{ color: '#4B5563' }}>{label}</p>
                      <p className="text-sm font-bold" style={{ color: value === 'A preencher' ? '#4B5563' : '#9CA3AF' }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Decision dropdown */}
                <div onClick={(e) => e.stopPropagation()}>
                  <select
                    value={dec}
                    onChange={(e) => setDecisoes((prev) => ({ ...prev, [b.nome]: e.target.value as DecisaoBase }))}
                    className="w-full text-xs font-semibold rounded-lg px-3 py-2 outline-none cursor-pointer border"
                    style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color + '40' }}>
                    {(Object.entries(DECISAO_CONFIG) as [DecisaoBase, typeof DECISAO_CONFIG[DecisaoBase]][]).map(([key, c]) => (
                      <option key={key} value={key}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Expanded: notes */}
                {isOpen && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: '#2A2A2A' }} onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs mb-2" style={{ color: '#6B7280' }}>Notas e observacoes</p>
                    <textarea
                      value={nota}
                      onChange={(e) => setNotas((prev) => ({ ...prev, [b.nome]: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg px-3 py-2 text-xs outline-none resize-none border"
                      style={{ backgroundColor: '#0D0D0D', borderColor: '#2A2A2A', color: '#9CA3AF' }}
                      placeholder="Ex: base nova testada em maio, boa abertura mas faturamento baixo..."
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-center" style={{ color: '#4B5563' }}>
          Clique em qualquer card para expandir e adicionar notas. Use + Nova Base para registrar bases testadas no mes.
        </p>
      </main>
    </div>
  );
}
