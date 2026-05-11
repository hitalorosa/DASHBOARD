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

export default function BasesPage() {
  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2025);
  const [selected, setSelected] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newBaseName, setNewBaseName] = useState('');
  const { getBases, updateBase } = useStore();

  const bases = getBases();

  const summary = (Object.keys(DEC) as DecisaoBase[]).reduce((acc, k) => {
    acc[k] = bases.filter((b) => b.decisao === k).length;
    return acc;
  }, {} as Record<DecisaoBase, number>);

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
      <Header title="Bases" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
      <main className="p-8 flex flex-col gap-6">

        <div className="flex flex-wrap gap-3 items-center">
          {(Object.entries(DEC) as [DecisaoBase, typeof DEC[DecisaoBase]][]).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border"
              style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color + '30' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              {cfg.label}
              <span className="font-bold">{summary[key]}</span>
            </div>
          ))}
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border"
            style={{ borderColor: '#D4A843', color: '#D4A843', backgroundColor: 'transparent' }}>
            + Nova Base
          </button>
        </div>

        {showAdd && (
          <div className="rounded-2xl border p-4 flex items-center gap-3" style={{ backgroundColor: '#1A1A1A', borderColor: '#D4A843' }}>
            <input autoFocus value={newBaseName} onChange={(e) => setNewBaseName(e.target.value)}
              placeholder="Nome da nova base (ex: Compradores VIP, Quiz Responderam...)"
              className="flex-1 text-sm rounded-lg px-3 py-2 outline-none border"
              style={{ backgroundColor: '#0D0D0D', borderColor: '#2A2A2A', color: '#F9FAFB' }} />
            <button onClick={() => { setNewBaseName(''); setShowAdd(false); }}
              className="text-xs px-4 py-2 rounded-lg font-semibold"
              style={{ backgroundColor: '#D4A843', color: '#0D0D0D' }}>Salvar</button>
            <button onClick={() => setShowAdd(false)} className="text-xs" style={{ color: '#6B7280' }}>Cancelar</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {bases.map((b) => {
            const cfg = DEC[b.decisao];
            const isOpen = selected === b.nome;

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

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: 'Disparos', value: String(b.disparos) },
                    { label: 'Faturamento', value: b.faturamento > 0 ? fmt(b.faturamento) : '—', gold: b.faturamento > 0 },
                    { label: 'ROAS', value: b.roasMedio > 0 ? `${b.roasMedio.toFixed(1)}x` : '—',
                      color: b.roasMedio >= 7 ? '#4ADE80' : b.roasMedio >= 4 ? '#FCD34D' : b.roasMedio > 0 ? '#F87171' : '#374151' },
                  ].map(({ label, value, gold, color }) => (
                    <div key={label} className="rounded-lg p-3 text-center" style={{ backgroundColor: '#111111' }}>
                      <p className="text-xs mb-1" style={{ color: '#4B5563' }}>{label}</p>
                      <p className="text-sm font-bold" style={{ color: color ?? (gold ? '#D4A843' : '#9CA3AF') }}>{value}</p>
                    </div>
                  ))}
                </div>

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
                    <p className="text-xs mb-2" style={{ color: '#4B5563' }}>Notas e observacoes</p>
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
      </main>
    </div>
  );
}
