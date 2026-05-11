'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import CampaignBadge from '@/components/CampaignBadge';
import RoasBadge from '@/components/RoasBadge';
import { disparosMaio } from '@/lib/data';
import { CampaignType } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const TIPOS: { value: string; label: string }[] = [
  { value: 'todos', label: 'Todos os tipos' },
  { value: 'sazonal', label: 'Sazonal' },
  { value: 'esquenta', label: 'Esquenta' },
  { value: 'ressaca', label: 'Ressaca' },
  { value: 'comportamental', label: 'Comportamental' },
  { value: 'produto', label: 'LP Produto' },
  { value: 'brinde', label: 'Brinde' },
  { value: 'fimmes', label: 'Fim de Mês' },
];

export default function DisparosPage() {
  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2025);
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [baseFiltro, setBaseFiltro] = useState('todas');

  const disparos = useMemo(() => {
    return disparosMaio.filter((d) => {
      const date = parseISO(d.data);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }, [month, year]);

  const bases = useMemo(() => {
    return ['todas', ...Array.from(new Set(disparos.map((d) => d.base)))];
  }, [disparos]);

  const filtrados = useMemo(() => {
    return disparos.filter((d) => {
      const matchTipo = tipoFiltro === 'todos' || d.tipo === tipoFiltro;
      const matchBase = baseFiltro === 'todas' || d.base === baseFiltro;
      return matchTipo && matchBase;
    });
  }, [disparos, tipoFiltro, baseFiltro]);

  const totalInvest = filtrados.reduce((s, d) => s + d.investimentoBrl, 0);
  const totalFat = filtrados.reduce((s, d) => s + d.faturamentoPago, 0);
  const totalPedidos = filtrados.reduce((s, d) => s + d.pedidos, 0);
  const totalEntregas = filtrados.reduce((s, d) => s + d.entregas, 0);
  const roasTotal = totalInvest > 0 && totalFat > 0 ? totalFat / totalInvest : 0;

  return (
    <div className="flex flex-col flex-1">
      <Header title="Disparos" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />

      <main className="p-8 flex flex-col gap-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 outline-none"
            style={{ borderColor: '#E5E7EB', color: '#374151', backgroundColor: '#FFF' }}
          >
            {TIPOS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>

          <select
            value={baseFiltro}
            onChange={(e) => setBaseFiltro(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 outline-none"
            style={{ borderColor: '#E5E7EB', color: '#374151', backgroundColor: '#FFF' }}
          >
            {bases.map((b) => (
              <option key={b} value={b}>{b === 'todas' ? 'Todas as bases' : b}</option>
            ))}
          </select>

          <span className="text-xs text-gray-400 ml-1">{filtrados.length} disparo(s)</span>
        </div>

        {/* Main table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {[
                    { label: 'Data', align: 'left' },
                    { label: 'Campanha', align: 'left' },
                    { label: 'Tipo', align: 'left' },
                    { label: 'Base', align: 'left' },
                    { label: 'Entregas', align: 'right' },
                    { label: 'Leitura', align: 'right' },
                    { label: 'Cliques', align: 'right' },
                    { label: 'Invest. R$', align: 'right' },
                    { label: 'Fat. R$', align: 'right' },
                    { label: 'Pedidos', align: 'right' },
                    { label: 'Ticket Médio', align: 'right' },
                    { label: 'ROAS', align: 'right' },
                  ].map(({ label, align }) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                      {format(parseISO(d.data), "dd/MM", { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">{d.campanha}</td>
                    <td className="px-4 py-3"><CampaignBadge type={d.tipo as CampaignType} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{d.base}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{(d.entregas / 1000).toFixed(1)}k</td>
                    <td className="px-4 py-3 text-right text-gray-600">{(d.taxaLeitura * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right text-gray-600">{d.cliques.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(d.investimentoBrl)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {d.faturamentoPago > 0 ? fmt(d.faturamentoPago) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {d.pedidos > 0 ? d.pedidos : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {d.ticketMedio > 0 ? fmt(d.ticketMedio) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RoasBadge roas={d.roas} />
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Totals row */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 text-xs font-bold text-gray-500 uppercase" colSpan={4}>
                    Totais / Médias
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">
                    {(totalEntregas / 1000).toFixed(1)}k
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">—</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">—</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">{fmt(totalInvest)}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold" style={{ color: '#D4A843' }}>
                    {totalFat > 0 ? fmt(totalFat) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-gray-700">
                    {totalPedidos > 0 ? totalPedidos : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">—</td>
                  <td className="px-4 py-3 text-right">
                    {roasTotal > 0 ? <RoasBadge roas={roasTotal} /> : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
