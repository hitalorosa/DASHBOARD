'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import CampaignBadge from '@/components/CampaignBadge';
import { disparosMaio, datasazonais2025 } from '@/lib/data';
import { Disparo, CampaignType } from '@/lib/types';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CAMPAIGN_DOT: Record<CampaignType, string> = {
  sazonal: '#1D4ED8',
  esquenta: '#C2410C',
  ressaca: '#9D174D',
  comportamental: '#6D28D9',
  produto: '#92400E',
  brinde: '#15803D',
  fimmes: '#B91C1C',
};

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  diad:       { bg: '#DBEAFE', color: '#1D4ED8' },
  ecommerce:  { bg: '#DCFCE7', color: '#15803D' },
  feriado:    { bg: '#FEF3C7', color: '#92400E' },
  relevante:  { bg: '#EDE9FE', color: '#6D28D9' },
};

const REL_LABEL: Record<string, string> = {
  alta: '🔥 Alta',
  media: '⚡ Média',
  baixa: '🔵 Baixa',
};

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export default function CalendarioPage() {
  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2025);
  const [selected, setSelected] = useState<Disparo | null>(null);

  const currentDate = useMemo(() => new Date(year, month, 1), [month, year]);

  const days = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const firstDayOfWeek = useMemo(() => {
    const dow = getDay(startOfMonth(currentDate));
    return dow === 0 ? 6 : dow - 1;
  }, [currentDate]);

  const disparosDoMes = useMemo(() => {
    return disparosMaio.filter((d) => {
      const date = parseISO(d.data);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }, [month, year]);

  const getDisparosForDay = (day: Date) =>
    disparosDoMes.filter((d) => isSameDay(parseISO(d.data), day));

  const today = new Date();
  const futureDates = datasazonais2025
    .filter((s) => {
      const d = parseISO(s.data);
      return d >= today;
    })
    .slice(0, 12);

  const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div className="flex flex-col flex-1">
      <Header title="Calendário" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />

      <main className="p-8 flex flex-col gap-8">
        {/* Calendar grid */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())}
          </h2>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {days.map((day) => {
              const dayDisparos = getDisparosForDay(day);
              const hasDisparo = dayDisparos.length > 0;
              const isToday = isSameDay(day, today);
              const isSelected = selected && isSameDay(parseISO(selected.data), day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => hasDisparo ? setSelected(dayDisparos[0]) : setSelected(null)}
                  className="relative flex flex-col items-center p-2 rounded-xl transition-all min-h-[64px]"
                  style={{
                    backgroundColor: isSelected ? '#FEF9ED' : hasDisparo ? '#FAFAFA' : 'transparent',
                    border: isSelected ? '1.5px solid #D4A843' : isToday ? '1.5px solid #E5E7EB' : '1.5px solid transparent',
                    cursor: hasDisparo ? 'pointer' : 'default',
                  }}
                >
                  <span
                    className="text-xs font-semibold mb-1"
                    style={{ color: isToday ? '#D4A843' : hasDisparo ? '#111827' : '#9CA3AF' }}
                  >
                    {format(day, 'd')}
                  </span>

                  {dayDisparos.map((d) => (
                    <span
                      key={d.id}
                      className="w-full text-center text-xs px-1 py-0.5 rounded-md font-medium truncate"
                      style={{ backgroundColor: `${CAMPAIGN_DOT[d.tipo]}18`, color: CAMPAIGN_DOT[d.tipo], fontSize: 9 }}
                    >
                      {d.campanha}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected day detail */}
        {selected && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-800">
                  {format(parseISO(selected.data), "dd 'de' MMMM", { locale: ptBR })} — {selected.campanha}
                </h3>
                <CampaignBadge type={selected.tipo} />
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕ fechar</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Base', value: selected.base },
                { label: 'Entregas', value: `${(selected.entregas / 1000).toFixed(1)}k msgs` },
                { label: 'Investimento', value: fmt(selected.investimentoBrl) },
                { label: 'Faturamento', value: selected.faturamentoPago > 0 ? fmt(selected.faturamentoPago) : '—' },
                { label: 'ROAS', value: selected.roas > 0 ? `${selected.roas.toFixed(1)}x` : 'Aguardando' },
                { label: 'Pedidos', value: selected.pedidos > 0 ? String(selected.pedidos) : '—' },
                { label: 'Taxa Leitura', value: `${(selected.taxaLeitura * 100).toFixed(0)}%` },
                { label: 'Cliques', value: `${selected.cliques}` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Datas Sazonais */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">
            Próximas Datas Sazonais
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Data', 'Evento', 'Categoria', 'Dias Faltando', 'Relevância', 'Estrutura Sugerida'].map((h) => (
                    <th key={h} className="pb-3 text-xs text-gray-400 font-medium text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {futureDates.map((s) => {
                  const diasFaltando = differenceInDays(parseISO(s.data), today);
                  const { bg, color } = CAT_COLORS[s.categoria] ?? { bg: '#F3F4F6', color: '#6B7280' };
                  const urgent = diasFaltando <= 15;
                  return (
                    <tr key={s.data} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 font-medium text-gray-700 whitespace-nowrap">
                        {format(parseISO(s.data), 'dd/MM/yyyy')}
                      </td>
                      <td className="py-3 text-gray-800 font-medium">{s.evento}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: bg, color }}>
                          {s.categoria === 'diad' ? 'Dia D' : s.categoria.charAt(0).toUpperCase() + s.categoria.slice(1)}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`text-sm font-bold ${urgent ? 'text-red-600' : 'text-gray-600'}`}>
                          {diasFaltando === 0 ? 'Hoje!' : `${diasFaltando} dias`}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-gray-600">{REL_LABEL[s.relevancia]}</td>
                      <td className="py-3 text-xs text-gray-500">
                        {s.relevancia === 'alta'
                          ? 'Esquenta (-3d) → Dia D → Ressaca (+1d)'
                          : s.relevancia === 'media'
                          ? 'Dia D + Ressaca'
                          : 'Disparo único'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
