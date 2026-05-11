'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { basesMaio } from '@/lib/data';
import { DecisaoBase } from '@/lib/types';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const DECISAO_CONFIG: Record<DecisaoBase, { label: string; bg: string; color: string }> = {
  reenviar:  { label: '✅ Reenviar',           bg: '#DCFCE7', color: '#15803D' },
  monitorar: { label: '🔄 Monitorar',          bg: '#DBEAFE', color: '#1D4ED8' },
  testar:    { label: '⚠️ Testar Novo Recorte', bg: '#FEF9C3', color: '#92400E' },
  descartar: { label: '❌ Descartar',           bg: '#FEE2E2', color: '#B91C1C' },
  pendente:  { label: '⏳ Pendente',            bg: '#F3F4F6', color: '#6B7280' },
};

export default function BasesPage() {
  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2025);
  const [decisoes, setDecisoes] = useState<Record<string, DecisaoBase>>({});

  const bases = useMemo(() => basesMaio, []);

  const getDecisao = (nome: string, original: DecisaoBase): DecisaoBase =>
    decisoes[nome] ?? original;

  const handleDecisao = (nome: string, value: DecisaoBase) => {
    setDecisoes((prev) => ({ ...prev, [nome]: value }));
  };

  const summary = useMemo(() => {
    const all = bases.map((b) => ({ ...b, decisaoAtual: getDecisao(b.nome, b.decisao) }));
    return {
      reenviar:  all.filter((b) => b.decisaoAtual === 'reenviar').length,
      monitorar: all.filter((b) => b.decisaoAtual === 'monitorar').length,
      testar:    all.filter((b) => b.decisaoAtual === 'testar').length,
      descartar: all.filter((b) => b.decisaoAtual === 'descartar').length,
      pendente:  all.filter((b) => b.decisaoAtual === 'pendente').length,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bases, decisoes]);

  return (
    <div className="flex flex-col flex-1">
      <Header title="Bases" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />

      <main className="p-8 flex flex-col gap-6">
        {/* Summary chips */}
        <div className="flex flex-wrap gap-3">
          {(Object.entries(DECISAO_CONFIG) as [DecisaoBase, typeof DECISAO_CONFIG[DecisaoBase]][]).map(([key, cfg]) => (
            <div
              key={key}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
              style={{ backgroundColor: cfg.bg, color: cfg.color }}
            >
              {cfg.label}
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                style={{ backgroundColor: cfg.color, color: '#FFF' }}
              >
                {summary[key]}
              </span>
            </div>
          ))}
        </div>

        {/* Main table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {[
                    { label: 'Base', align: 'left' },
                    { label: 'Disparos', align: 'right' },
                    { label: 'Entregas', align: 'right' },
                    { label: 'Faturamento', align: 'right' },
                    { label: 'Pedidos', align: 'right' },
                    { label: 'ROAS Médio', align: 'right' },
                    { label: 'Decisão', align: 'center' },
                  ].map(({ label, align }) => (
                    <th
                      key={label}
                      className={`px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${
                        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bases.map((b) => {
                  const dec = getDecisao(b.nome, b.decisao);
                  const { bg, color } = DECISAO_CONFIG[dec];

                  return (
                    <tr key={b.nome} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 font-medium text-gray-800">{b.nome}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{b.disparos}</td>
                      <td className="px-5 py-4 text-right text-gray-600">{(b.entregas / 1000).toFixed(1)}k</td>
                      <td className="px-5 py-4 text-right font-medium" style={{ color: b.faturamento > 0 ? '#D4A843' : '#9CA3AF' }}>
                        {b.faturamento > 0 ? fmt(b.faturamento) : '—'}
                      </td>
                      <td className="px-5 py-4 text-right text-gray-600">
                        {b.pedidos > 0 ? b.pedidos : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {b.roasMedio > 0 ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: b.roasMedio >= 7 ? '#DCFCE7' : b.roasMedio >= 4 ? '#FEF9C3' : '#FEE2E2',
                              color: b.roasMedio >= 7 ? '#15803D' : b.roasMedio >= 4 ? '#CA8A04' : '#B91C1C',
                            }}
                          >
                            {b.roasMedio.toFixed(1)}x
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">Aguardando</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <select
                          value={dec}
                          onChange={(e) => handleDecisao(b.nome, e.target.value as DecisaoBase)}
                          className="text-xs font-semibold rounded-full px-3 py-1.5 outline-none cursor-pointer border-0"
                          style={{ backgroundColor: bg, color }}
                        >
                          {(Object.entries(DECISAO_CONFIG) as [DecisaoBase, typeof DECISAO_CONFIG[DecisaoBase]][]).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          As decisões são salvas localmente nesta sessão. Em breve serão persistidas no banco de dados.
        </p>
      </main>
    </div>
  );
}
