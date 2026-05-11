'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import CampaignBadge from '@/components/CampaignBadge';
import RoasBadge from '@/components/RoasBadge';
import { disparosMaio } from '@/lib/data';
import { CampaignType, Disparo } from '@/lib/types';
import { format, parseISO } from 'date-fns';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const TIPOS = [
  { value: 'todos', label: 'Todos os tipos' },
  { value: 'sazonal', label: 'Sazonal' },
  { value: 'esquenta', label: 'Esquenta' },
  { value: 'ressaca', label: 'Ressaca' },
  { value: 'comportamental', label: 'Comportamental' },
  { value: 'produto', label: 'LP Produto' },
  { value: 'brinde', label: 'Brinde' },
  { value: 'fimmes', label: 'Fim de Mes' },
];

const CARD = { backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' };
const TH = 'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-left';
const TD = 'px-4 py-3 text-sm';

export default function DisparosPage() {
  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2025);
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [baseFiltro, setBaseFiltro] = useState('todas');
  const [obs, setObs] = useState<Record<string, string>>({});
  const [editingObs, setEditingObs] = useState<string | null>(null);

  const disparos = useMemo(() => {
    return disparosMaio.filter((d) => {
      const date = parseISO(d.data);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }, [month, year]);

  const bases = useMemo(() => ['todas', ...Array.from(new Set(disparos.map((d) => d.base)))], [disparos]);

  const filtrados = useMemo(() => {
    return disparos.filter((d) => {
      const matchTipo = tipoFiltro === 'todos' || d.tipo === tipoFiltro;
      const matchBase = baseFiltro === 'todas' || d.base === baseFiltro;
      return matchTipo && matchBase;
    });
  }, [disparos, tipoFiltro, baseFiltro]);

  const totalInvest = filtrados.reduce((s, d) => s + d.investimentoBrl, 0);
  const totalFat = filtrados.reduce((s, d) => s + d.faturamentoPago, 0);
  const totalEntregas = filtrados.reduce((s, d) => s + d.entregas, 0);
  const roasTotal = totalInvest > 0 && totalFat > 0 ? totalFat / totalInvest : 0;

  const selectStyle = { backgroundColor: '#1A1A1A', borderColor: '#2A2A2A', color: '#9CA3AF' };

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
      <Header title="Disparos" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />

      <main className="p-8 flex flex-col gap-6">
        <div className="flex flex-wrap gap-3 items-center">
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 outline-none cursor-pointer" style={selectStyle}>
            {TIPOS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={baseFiltro} onChange={(e) => setBaseFiltro(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 outline-none cursor-pointer" style={selectStyle}>
            {bases.map((b) => <option key={b} value={b}>{b === 'todas' ? 'Todas as bases' : b}</option>)}
          </select>
          <span className="text-xs ml-1" style={{ color: '#4B5563' }}>{filtrados.length} disparo(s)</span>
        </div>

        <div className="rounded-2xl border overflow-hidden" style={CARD}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ backgroundColor: '#161616', borderColor: '#2A2A2A' }}>
                  {[
                    { label: 'Data' }, { label: 'Campanha' }, { label: 'Tipo' }, { label: 'Base' },
                    { label: 'Total Base', right: true }, { label: 'Entregas', right: true },
                    { label: 'Leitura', right: true }, { label: 'Cliques', right: true },
                    { label: 'Invest. R$', right: true }, { label: 'Fat. R$', right: true },
                    { label: 'Pedidos', right: true }, { label: 'Ticket', right: true },
                    { label: 'ROAS', right: true }, { label: 'Observacoes' },
                  ].map(({ label, right }) => (
                    <th key={label} className={`${TH} ${right ? 'text-right' : ''}`} style={{ color: '#4B5563' }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d: Disparo) => (
                  <tr key={d.id} className="border-b" style={{ borderColor: '#2A2A2A' }}>
                    <td className={TD} style={{ color: '#D4A843', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {format(parseISO(d.data), 'dd/MM')}
                    </td>
                    <td className={TD} style={{ color: '#F9FAFB', whiteSpace: 'nowrap' }}>{d.campanha}</td>
                    <td className={TD}><CampaignBadge type={d.tipo as CampaignType} /></td>
                    <td className={`${TD} max-w-[150px] truncate`} style={{ color: '#9CA3AF' }}>{d.base}</td>
                    <td className={`${TD} text-right`} style={{ color: d.tamanhoBase > 0 ? '#9CA3AF' : '#4B5563' }}>
                      {d.tamanhoBase > 0 ? `${(d.tamanhoBase / 1000).toFixed(1)}k` : 'A preencher'}
                    </td>
                    <td className={`${TD} text-right`} style={{ color: '#9CA3AF' }}>{(d.entregas / 1000).toFixed(1)}k</td>
                    <td className={`${TD} text-right`} style={{ color: '#9CA3AF' }}>{(d.taxaLeitura * 100).toFixed(0)}%</td>
                    <td className={`${TD} text-right`} style={{ color: '#9CA3AF' }}>{d.cliques.toLocaleString('pt-BR')}</td>
                    <td className={`${TD} text-right`} style={{ color: '#9CA3AF' }}>{fmt(d.investimentoBrl)}</td>
                    <td className={`${TD} text-right`} style={{ color: d.faturamentoPago > 0 ? '#D4A843' : '#4B5563' }}>
                      {d.faturamentoPago > 0 ? fmt(d.faturamentoPago) : 'A preencher'}
                    </td>
                    <td className={`${TD} text-right`} style={{ color: d.pedidos > 0 ? '#9CA3AF' : '#4B5563' }}>
                      {d.pedidos > 0 ? d.pedidos : 'A preencher'}
                    </td>
                    <td className={`${TD} text-right`} style={{ color: d.ticketMedio > 0 ? '#9CA3AF' : '#4B5563' }}>
                      {d.ticketMedio > 0 ? fmt(d.ticketMedio) : 'A preencher'}
                    </td>
                    <td className={`${TD} text-right`}><RoasBadge roas={d.roas} /></td>
                    <td className={TD} style={{ minWidth: 200 }}>
                      {editingObs === d.id ? (
                        <textarea autoFocus
                          value={obs[d.id] ?? d.observacoes}
                          onChange={(e) => setObs((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          onBlur={() => setEditingObs(null)}
                          rows={2}
                          className="w-full rounded-lg px-2 py-1 text-xs outline-none resize-none border"
                          style={{ backgroundColor: '#0D0D0D', borderColor: '#D4A843', color: '#F9FAFB' }}
                          placeholder="Anote como foi o disparo, base nova testada..."
                        />
                      ) : (
                        <button onClick={() => setEditingObs(d.id)}
                          className="w-full text-left text-xs rounded-lg px-2 py-1.5 transition-colors"
                          style={{ color: (obs[d.id] ?? d.observacoes) ? '#9CA3AF' : '#D4A843', backgroundColor: 'transparent' }}>
                          {(obs[d.id] ?? d.observacoes) || '+ Adicionar observacao'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2" style={{ borderColor: '#3A3A3A', backgroundColor: '#161616' }}>
                  <td colSpan={4} className="px-4 py-3 text-xs font-bold uppercase" style={{ color: '#6B7280' }}>Totais</td>
                  <td className="px-4 py-3 text-right text-xs" style={{ color: '#4B5563' }}>A preencher</td>
                  <td className="px-4 py-3 text-right text-xs font-bold" style={{ color: '#9CA3AF' }}>{(totalEntregas / 1000).toFixed(1)}k</td>
                  <td className="px-4 py-3 text-right" style={{ color: '#4B5563' }}>A preencher</td>
                  <td className="px-4 py-3 text-right" style={{ color: '#4B5563' }}>A preencher</td>
                  <td className="px-4 py-3 text-right text-xs font-bold" style={{ color: '#9CA3AF' }}>{fmt(totalInvest)}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold" style={{ color: totalFat > 0 ? '#D4A843' : '#4B5563' }}>
                    {totalFat > 0 ? fmt(totalFat) : 'A preencher'}
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-right" style={{ color: '#4B5563' }}>A preencher</td>
                  <td className="px-4 py-3 text-right">
                    {roasTotal > 0 ? <RoasBadge roas={roasTotal} /> : <span className="text-xs" style={{ color: '#4B5563' }}>A preencher</span>}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <p className="text-xs text-center" style={{ color: '#4B5563' }}>
          Clique em Observacoes para anotar como foi o disparo, bases novas testadas ou qualquer insight.
        </p>
      </main>
    </div>
  );
}
