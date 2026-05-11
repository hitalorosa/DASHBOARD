'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import CampaignBadge from '@/components/CampaignBadge';
import { disparosMaio, datasazonais2025 } from '@/lib/data';
import { Disparo, CampaignType } from '@/lib/types';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CAMPAIGN_COLOR: Record<CampaignType, string> = {
  sazonal: '#D4A843',
  esquenta: '#FB923C',
  ressaca: '#F472B6',
  comportamental: '#6BA8E5',
  produto: '#D4A843',
  brinde: '#7CC68A',
  fimmes: '#F87171',
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

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
      <Header title="Calendário" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />

      <main className="p-8 flex flex-col gap-8">

        {/* Calendar grid */}
        <div className="rounded-2xl p-6 border relative overflow-hidden" style={{ backgroundColor: '#1A1A1A', borderColor: '#262626' }}>
          {/* gold gradient separator under header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8A8A8A' }}>
                Calendário de disparos
              </p>
              <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, marginTop: 2, color: '#ECECEC' }}>
                {format(currentDate, 'MMMM', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())}{' '}
                <span style={{ color: '#8A8A8A' }}>{year}</span>
              </p>
            </div>
            {/* legend */}
            <div className="flex items-center gap-4" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8A8A' }}>
              {[
                { label: 'Sazonal', color: '#D4A843' },
                { label: 'Brinde', color: '#7CC68A' },
                { label: 'Comp.', color: '#6BA8E5' },
                { label: 'Ressaca', color: '#F472B6' },
              ].map(({ label, color }) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span style={{ display: 'block', width: 14, height: 4, borderRadius: 2, background: color }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* thin gold line under header */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(212,168,67,0.35) 40%, rgba(212,168,67,0.35) 60%, transparent 100%)', marginBottom: 16 }} />

          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center py-2" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5E5E5E' }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {days.map((day) => {
              const dayDisparos = getDisparosForDay(day);
              const hasDisparo = dayDisparos.length > 0;
              const isToday = isSameDay(day, today);
              const isSelected = selected && isSameDay(parseISO(selected.data), day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => hasDisparo ? setSelected(dayDisparos[0]) : setSelected(null)}
                  className={`relative overflow-hidden transition-all min-h-[72px] rounded-xl p-2 ${isToday ? 'cal-cell-today' : ''}`}
                  style={{
                    background: isSelected
                      ? 'radial-gradient(140% 100% at 0% 0%, rgba(212,168,67,0.22), transparent 60%), #1a1814'
                      : isToday
                      ? 'radial-gradient(140% 100% at 0% 0%, rgba(212,168,67,0.18), transparent 60%), #1a1814'
                      : hasDisparo ? '#161616' : '#141414',
                    border: isSelected
                      ? '1.5px solid rgba(212,168,67,0.7)'
                      : isToday
                      ? '1px solid rgba(212,168,67,0.45)'
                      : hasDisparo ? '1px solid #1f1f1f' : '1px solid transparent',
                    cursor: hasDisparo ? 'pointer' : 'default',
                  }}>
                  {/* serif numeral */}
                  <span className="cal-num">{format(day, 'd')}</span>

                  {/* disparo name tags */}
                  {dayDisparos.map((d) => (
                    <div key={d.id} className="mt-1 truncate" style={{ fontSize: 9, color: CAMPAIGN_COLOR[d.tipo], opacity: 0.85 }}>
                      {d.campanha}
                    </div>
                  ))}

                  {/* color bars per campaign type at bottom */}
                  {hasDisparo && (
                    <div style={{ position: 'absolute', left: 7, right: 7, bottom: 7, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {dayDisparos.map((d) => (
                        <span key={d.id} style={{ height: 4, borderRadius: 2, flex: 1, minWidth: 8, background: CAMPAIGN_COLOR[d.tipo] }} />
                      ))}
                    </div>
                  )}
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
                <h3 className="font-semibold" style={{ color: '#ECECEC' }}>
                  {format(parseISO(selected.data), "dd 'de' MMMM", { locale: ptBR })} — {selected.campanha}
                </h3>
                <CampaignBadge type={selected.tipo} />
              </div>
              <button onClick={() => setSelected(null)} className="text-xs" style={{ color: '#8A8A8A' }}>fechar</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Base', value: selected.base },
                { label: 'Entregas', value: selected.entregas > 0 ? `${(selected.entregas / 1000).toFixed(1)}k msgs` : 'A preencher' },
                { label: 'Investimento', value: selected.investimentoBrl > 0 ? fmt(selected.investimentoBrl) : 'A preencher' },
                { label: 'Faturamento', value: selected.faturamentoPago > 0 ? fmt(selected.faturamentoPago) : 'A preencher' },
                { label: 'ROAS', value: selected.roas > 0 ? `${selected.roas.toFixed(1)}x` : 'A preencher' },
                { label: 'Pedidos', value: selected.pedidos > 0 ? String(selected.pedidos) : 'A preencher' },
                { label: 'Taxa Leitura', value: selected.taxaLeitura > 0 ? `${(selected.taxaLeitura * 100).toFixed(0)}%` : 'A preencher' },
                { label: 'Cliques', value: selected.cliques > 0 ? String(selected.cliques) : 'A preencher' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs mb-0.5" style={{ color: '#5E5E5E' }}>{label}</p>
                  <p className="text-sm font-semibold" style={{ color: value === 'A preencher' ? '#5E5E5E' : '#ECECEC' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Datas Sazonais */}
        <div className="rounded-2xl p-6 border" style={{ backgroundColor: '#1A1A1A', borderColor: '#262626' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5E5E5E', marginBottom: 20 }}>
            Próximas Datas Sazonais
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #262626' }}>
                  {['Data', 'Evento', 'Categoria', 'Dias Faltando', 'Relevância', 'Estrutura Sugerida'].map((h) => (
                    <th key={h} className="pb-3 text-left" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5E5E5E', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {futureDates.map((s) => {
                  const diasFaltando = differenceInDays(parseISO(s.data), today);
                  const { bg, color } = CAT_COLORS[s.categoria] ?? { bg: '#1A1A1A', color: '#5E5E5E' };
                  const urgent = diasFaltando <= 15;
                  return (
                    <tr key={s.data} className="disparo-row" style={{ borderBottom: '1px solid #1c1c1c' }}>
                      <td className="py-3 font-medium whitespace-nowrap" style={{ color: '#9A9A9A' }}>
                        {format(parseISO(s.data), 'dd/MM/yyyy')}
                      </td>
                      <td className="py-3 font-medium" style={{ color: '#F2F2F2' }}>{s.evento}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: bg, color }}>
                          {s.categoria === 'diad' ? 'Dia D' : s.categoria.charAt(0).toUpperCase() + s.categoria.slice(1)}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-sm font-bold" style={{ color: urgent ? '#F87171' : '#D8D8D8' }}>
                          {diasFaltando === 0 ? 'Hoje!' : `${diasFaltando} dias`}
                        </span>
                      </td>
                      <td className="py-3 text-sm" style={{ color: '#D8D8D8' }}>{REL_LABEL[s.relevancia]}</td>
                      <td className="py-3 text-xs" style={{ color: '#9A9A9A' }}>
                        {s.relevancia === 'alta' ? 'Esquenta (-3d) > Dia D > Ressaca (+1d)' : s.relevancia === 'media' ? 'Dia D + Ressaca' : 'Disparo único'}
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
