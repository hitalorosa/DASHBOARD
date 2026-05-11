'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import CampaignBadge from '@/components/CampaignBadge';
import { disparosMaio, datasazonais2025 } from '@/lib/data';
import { Disparo, CampaignType } from '@/lib/types';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CAMPAIGN_DOT: Record<CampaignType, string> = {
  sazonal: '#60A5FA', esquenta: '#FB923C', ressaca: '#F472B6',
  comportamental: '#A78BFA', produto: '#FCD34D', brinde: '#4ADE80', fimmes: '#F87171',
};

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  diad:       { bg: '#0D1F3A', color: '#60A5FA' },
  ecommerce:  { bg: '#0F2E1A', color: '#4ADE80' },
  feriado:    { bg: '#2D2208', color: '#FCD34D' },
  relevante:  { bg: '#1E1529', color: '#A78BFA' },
};

const REL_LABEL: Record<string, string> = { alta: 'Alta', media: 'Media', baixa: 'Baixa' };

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export default function CalendarioPage() {
  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2025);
  const [selected, setSelected] = useState<Disparo | null>(null);

  const currentDate = useMemo(() => new Date(year, month, 1), [month, year]);
  const days = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }), [currentDate]);
  const firstDayOfWeek = useMemo(() => { const d = getDay(startOfMonth(currentDate)); return d === 0 ? 6 : d - 1; }, [currentDate]);

  const disparosDoMes = useMemo(() => {
    return disparosMaio.filter((d) => {
      const date = parseISO(d.data);
      return date.getMonth() === month && date.getFullYear() === year;
    });
  }, [month, year]);

  const getDisparosForDay = (day: Date) => disparosDoMes.filter((d) => isSameDay(parseISO(d.data), day));

  const today = new Date();
  const futureDates = datasazonais2025.filter((s) => parseISO(s.data) >= today).slice(0, 12);

  const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
  const CARD = { backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' };

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
      <Header title="Calendario" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />

      <main className="p-8 flex flex-col gap-8">

        {/* Calendar grid */}
        <div className="rounded-2xl p-6 border" style={CARD}>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: '#6B7280' }}>
            {format(currentDate, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())}
          </h2>

          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold py-2" style={{ color: '#4B5563' }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {days.map((day) => {
              const dayDisparos = getDisparosForDay(day);
              const hasDisparo = dayDisparos.length > 0;
              const isToday = isSameDay(day, today);
              const isSelected = selected && isSameDay(parseISO(selected.data), day);

              return (
                <div key={day.toISOString()}
                  onClick={() => hasDisparo ? setSelected(dayDisparos[0]) : setSelected(null)}
                  className="relative flex flex-col items-center p-2 rounded-xl transition-all min-h-[64px]"
                  style={{
                    backgroundColor: isSelected ? '#1C1A0A' : hasDisparo ? '#161616' : 'transparent',
                    border: `1.5px solid ${isSelected ? '#D4A843' : isToday ? '#3A3A3A' : 'transparent'}`,
                    cursor: hasDisparo ? 'pointer' : 'default',
                  }}>
                  <span className="text-xs font-semibold mb-1"
                    style={{ color: isToday ? '#D4A843' : hasDisparo ? '#F9FAFB' : '#4B5563' }}>
                    {format(day, 'd')}
                  </span>
                  {dayDisparos.map((d) => (
                    <span key={d.id} className="w-full text-center px-1 py-0.5 rounded-md font-medium truncate"
                      style={{ backgroundColor: CAMPAIGN_DOT[d.tipo] + '18', color: CAMPAIGN_DOT[d.tipo], fontSize: 9 }}>
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
          <div className="rounded-2xl p-6 border" style={{ backgroundColor: '#1A1A1A', borderColor: '#D4A843' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold" style={{ color: '#F9FAFB' }}>
                  {format(parseISO(selected.data), "dd 'de' MMMM", { locale: ptBR })} — {selected.campanha}
                </h3>
                <CampaignBadge type={selected.tipo} />
              </div>
              <button onClick={() => setSelected(null)} className="text-xs" style={{ color: '#6B7280' }}>fechar</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Base', value: selected.base },
                { label: 'Entregas', value: `${(selected.entregas / 1000).toFixed(1)}k msgs` },
                { label: 'Investimento', value: fmt(selected.investimentoBrl) },
                { label: 'Faturamento', value: selected.faturamentoPago > 0 ? fmt(selected.faturamentoPago) : 'A preencher' },
                { label: 'ROAS', value: selected.roas > 0 ? `${selected.roas.toFixed(1)}x` : 'A preencher' },
                { label: 'Pedidos', value: selected.pedidos > 0 ? String(selected.pedidos) : 'A preencher' },
                { label: 'Taxa Leitura', value: `${(selected.taxaLeitura * 100).toFixed(0)}%` },
                { label: 'Cliques', value: `${selected.cliques}` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs mb-0.5" style={{ color: '#4B5563' }}>{label}</p>
                  <p className="text-sm font-semibold" style={{ color: value === 'A preencher' ? '#4B5563' : '#F9FAFB' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Datas Sazonais */}
        <div className="rounded-2xl p-6 border" style={CARD}>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: '#6B7280' }}>
            Proximas Datas Sazonais
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: '#2A2A2A' }}>
                  {['Data', 'Evento', 'Categoria', 'Dias Faltando', 'Relevancia', 'Estrutura Sugerida'].map((h) => (
                    <th key={h} className="pb-3 text-xs font-medium text-left" style={{ color: '#4B5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {futureDates.map((s) => {
                  const diasFaltando = differenceInDays(parseISO(s.data), today);
                  const { bg, color } = CAT_COLORS[s.categoria] ?? { bg: '#1A1A1A', color: '#6B7280' };
                  const urgent = diasFaltando <= 15;
                  return (
                    <tr key={s.data} className="border-b" style={{ borderColor: '#2A2A2A' }}>
                      <td className="py-3 font-medium whitespace-nowrap" style={{ color: '#9CA3AF' }}>
                        {format(parseISO(s.data), 'dd/MM/yyyy')}
                      </td>
                      <td className="py-3 font-medium" style={{ color: '#F9FAFB' }}>{s.evento}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: bg, color }}>
                          {s.categoria === 'diad' ? 'Dia D' : s.categoria.charAt(0).toUpperCase() + s.categoria.slice(1)}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-sm font-bold" style={{ color: urgent ? '#F87171' : '#9CA3AF' }}>
                          {diasFaltando === 0 ? 'Hoje!' : `${diasFaltando} dias`}
                        </span>
                      </td>
                      <td className="py-3 text-sm" style={{ color: '#9CA3AF' }}>{REL_LABEL[s.relevancia]}</td>
                      <td className="py-3 text-xs" style={{ color: '#6B7280' }}>
                        {s.relevancia === 'alta' ? 'Esquenta (-3d) > Dia D > Ressaca (+1d)' : s.relevancia === 'media' ? 'Dia D + Ressaca' : 'Disparo unico'}
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
