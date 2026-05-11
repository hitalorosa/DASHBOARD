'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import CampaignBadge from '@/components/CampaignBadge';
import { useStore, DisparoData } from '@/lib/store';
import { Disparo } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); }
function fmtN(n: number, decimals = 0) { return n > 0 ? n.toFixed(decimals) : ''; }

function RoasBadge({ roas }: { roas: number }) {
  if (roas === 0) return <span className="text-xs" style={{ color: '#374151' }}>A preencher</span>;
  let bg = '#3F1010', color = '#F87171';
  if (roas >= 7) { bg = '#0F2E1A'; color = '#4ADE80'; }
  else if (roas >= 4) { bg = '#2D2208'; color = '#FCD34D'; }
  return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: bg, color }}>{roas.toFixed(1)}x</span>;
}

const CARD = { backgroundColor: '#1A1A1A', borderColor: '#2A2A2A' };
const INPUT = { backgroundColor: '#0D0D0D', borderColor: '#2A2A2A', color: '#F9FAFB' };

function FillCard({ d, onClose, onSave }: { d: Disparo; onClose: () => void; onSave: (data: Partial<DisparoData>) => void }) {
  const [form, setForm] = useState<Partial<DisparoData>>({
    tamanhoBase: d.tamanhoBase || undefined,
    enviados: d.enviados || undefined,
    taxaEntrega: d.taxaEntrega || undefined,
    taxaLeitura: d.taxaLeitura || undefined,
    cliques: d.cliques || undefined,
    cotacaoUsd: d.cotacaoUsd || undefined,
    investimentoUsd: d.investimentoUsd || undefined,
    faturamentoPago: d.faturamentoPago || undefined,
    pedidos: d.pedidos || undefined,
    observacoes: d.observacoes || '',
  });

  const inv = (form.investimentoUsd ?? 0) * (form.cotacaoUsd ?? 0);
  const fat = form.faturamentoPago ?? 0;
  const roas = inv > 0 && fat > 0 ? fat / inv : 0;
  const ticket = fat > 0 && (form.pedidos ?? 0) > 0 ? fat / (form.pedidos ?? 1) : 0;
  const entregas = (form.enviados ?? 0) * (form.taxaEntrega ?? 0);

  const field = (label: string, key: keyof DisparoData, placeholder: string, hint?: string) => (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#6B7280' }}>{label}</label>
      {key === 'observacoes' ? (
        <textarea rows={3} placeholder={placeholder}
          value={(form[key] as string) ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none border"
          style={INPUT} />
      ) : (
        <input type="number" placeholder={placeholder}
          value={(form[key] as number) ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value === '' ? undefined : Number(e.target.value) }))}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
          style={INPUT} />
      )}
      {hint && <p className="text-xs mt-1" style={{ color: '#374151' }}>{hint}</p>}
    </div>
  );

  return (
    <div className="rounded-2xl border p-6 mt-1" style={{ backgroundColor: '#161616', borderColor: '#D4A843', borderWidth: 1.5 }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold" style={{ color: '#F9FAFB' }}>{d.campanha}</h3>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            {format(parseISO(d.data), "dd 'de' MMMM yyyy", { locale: ptBR })} — {d.base}
          </p>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg" style={{ color: '#6B7280' }}><X size={16} /></button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <div className="col-span-full">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#D4A843' }}>Dados da Plataforma (Martz / Nextags)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {field('Total da Base', 'tamanhoBase', 'Ex: 15000', 'Qtd de contatos na lista')}
            {field('Enviados', 'enviados', 'Ex: 12500')}
            {field('Taxa de Entrega (0-1)', 'taxaEntrega', 'Ex: 0.94', 'Decimal. Ex: 0.94 = 94%')}
            {field('Taxa de Leitura (0-1)', 'taxaLeitura', 'Ex: 0.62')}
            {field('Cliques', 'cliques', 'Ex: 890')}
          </div>
        </div>

        <div className="col-span-full">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#D4A843' }}>Custo da API</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {field('Investimento USD', 'investimentoUsd', 'Ex: 48.50')}
            {field('Cotacao USD/BRL', 'cotacaoUsd', 'Ex: 5.72', 'Cotacao no dia do disparo')}
          </div>
        </div>

        <div className="col-span-full">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#D4A843' }}>Resultado Shopify (apenas status Pago)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {field('Faturamento R$', 'faturamentoPago', 'Ex: 18400')}
            {field('Pedidos', 'pedidos', 'Ex: 142')}
          </div>
        </div>
      </div>

      {(inv > 0 || fat > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl mb-5" style={{ backgroundColor: '#0D0D0D' }}>
          <div>
            <p className="text-xs mb-1" style={{ color: '#4B5563' }}>Invest. BRL (auto)</p>
            <p className="text-sm font-bold" style={{ color: '#9CA3AF' }}>{inv > 0 ? fmt(inv) : '—'}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#4B5563' }}>Entregas (auto)</p>
            <p className="text-sm font-bold" style={{ color: '#9CA3AF' }}>{entregas > 0 ? `${(entregas / 1000).toFixed(1)}k` : '—'}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#4B5563' }}>Ticket Medio (auto)</p>
            <p className="text-sm font-bold" style={{ color: '#9CA3AF' }}>{ticket > 0 ? fmt(ticket) : '—'}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#4B5563' }}>ROAS (auto)</p>
            <p className="text-sm font-bold" style={{ color: roas >= 7 ? '#4ADE80' : roas >= 4 ? '#FCD34D' : roas > 0 ? '#F87171' : '#4B5563' }}>
              {roas > 0 ? `${roas.toFixed(2)}x` : '—'}
            </p>
          </div>
        </div>
      )}

      <div className="mb-5">{field('Observacoes do Disparo', 'observacoes', 'Como foi? Base nova testada? Algum insight de abertura ou rejeicao...', '')}</div>

      <div className="flex gap-3">
        <button onClick={() => onSave(form)}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ backgroundColor: '#D4A843', color: '#0D0D0D' }}>
          Salvar Resultado
        </button>
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm border transition-colors"
          style={{ borderColor: '#2A2A2A', color: '#6B7280' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function DisparosPage() {
  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2025);
  const [openFill, setOpenFill] = useState<string | null>(null);
  const { getDisparos, updateDisparo } = useStore();

  const disparos = getDisparos(month, year);

  const totalInvest = disparos.reduce((s, d) => s + d.investimentoBrl, 0);
  const totalFat = disparos.reduce((s, d) => s + d.faturamentoPago, 0);
  const totalEntregas = disparos.reduce((s, d) => s + d.entregas, 0);
  const roasTotal = totalInvest > 0 && totalFat > 0 ? totalFat / totalInvest : 0;

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
      <Header title="Disparos" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
      <main className="p-8 flex flex-col gap-4">

        <div className="rounded-2xl border overflow-hidden" style={CARD}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ backgroundColor: '#161616', borderColor: '#2A2A2A' }}>
                  {['','Data','Campanha','Tipo','Base','Invest. R$','Fat. R$','Pedidos','ROAS','Leitura','Observacoes'].map((h, i) => (
                    <th key={`${h}-${i}`} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider ${i >= 5 && i <= 8 ? 'text-right' : 'text-left'}`}
                      style={{ color: '#4B5563' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disparos.map((d: Disparo) => (
                  <React.Fragment key={d.id}>
                    <tr className="border-b" style={{ borderColor: '#1F1F1F' }}>
                      <td className="px-4 py-3">
                        <button onClick={() => setOpenFill(openFill === d.id ? null : d.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
                          style={{ borderColor: openFill === d.id ? '#D4A843' : '#2A2A2A', color: openFill === d.id ? '#D4A843' : '#6B7280', backgroundColor: 'transparent' }}>
                          {openFill === d.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {d.investimentoBrl > 0 || d.faturamentoPago > 0 ? 'Editar' : 'Preencher'}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: '#D4A843' }}>
                        {format(parseISO(d.data), 'dd/MM', { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#E5E7EB' }}>{d.campanha}</td>
                      <td className="px-4 py-3"><CampaignBadge type={d.tipo} /></td>
                      <td className="px-4 py-3 max-w-[140px] truncate text-xs" style={{ color: '#6B7280' }}>{d.base}</td>
                      <td className="px-4 py-3 text-right" style={{ color: d.investimentoBrl > 0 ? '#9CA3AF' : '#374151' }}>
                        {d.investimentoBrl > 0 ? fmt(d.investimentoBrl) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium" style={{ color: d.faturamentoPago > 0 ? '#D4A843' : '#374151' }}>
                        {d.faturamentoPago > 0 ? fmt(d.faturamentoPago) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: d.pedidos > 0 ? '#9CA3AF' : '#374151' }}>
                        {d.pedidos > 0 ? d.pedidos : '—'}
                      </td>
                      <td className="px-4 py-3 text-right"><RoasBadge roas={d.roas} /></td>
                      <td className="px-4 py-3 text-xs" style={{ color: d.taxaLeitura > 0 ? '#9CA3AF' : '#374151' }}>
                        {d.taxaLeitura > 0 ? `${(d.taxaLeitura * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[200px] truncate" style={{ color: '#6B7280' }}>
                        {d.observacoes || <span style={{ color: '#374151' }}>—</span>}
                      </td>
                    </tr>
                    {openFill === d.id && (
                      <tr>
                        <td colSpan={11} className="px-4 pb-4">
                          <FillCard d={d} onClose={() => setOpenFill(null)}
                            onSave={(data) => { updateDisparo(d.id, data); setOpenFill(null); }} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2" style={{ borderColor: '#3A3A3A', backgroundColor: '#161616' }}>
                  <td colSpan={5} className="px-4 py-3 text-xs font-bold uppercase" style={{ color: '#6B7280' }}>Totais</td>
                  <td className="px-4 py-3 text-right text-xs font-bold" style={{ color: totalInvest > 0 ? '#9CA3AF' : '#374151' }}>
                    {totalInvest > 0 ? fmt(totalInvest) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-bold" style={{ color: totalFat > 0 ? '#D4A843' : '#374151' }}>
                    {totalFat > 0 ? fmt(totalFat) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-xs" style={{ color: '#374151' }}>—</td>
                  <td className="px-4 py-3 text-right">
                    {roasTotal > 0 ? <RoasBadge roas={roasTotal} /> : <span className="text-xs" style={{ color: '#374151' }}>—</span>}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
