'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import CampaignBadge from '@/components/CampaignBadge';
import { useStore, DisparoData, BaseEntryData } from '@/lib/store';
import { Disparo, CampaignType } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

function fmt(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); }

function RoasBadge({ roas }: { roas: number }) {
  if (roas === 0) return <span className="text-xs" style={{ color: '#3A3A3A' }}>A preencher</span>;
  let bg = '#3F1010', color = '#F87171';
  if (roas >= 7) { bg = '#0F2E1A'; color = '#4ADE80'; }
  else if (roas >= 4) { bg = '#2D2208'; color = '#FCD34D'; }
  return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: bg, color }}>{roas.toFixed(1)}x</span>;
}

function roasColor(r: number) { return r >= 7 ? '#4ADE80' : r >= 4 ? '#FCD34D' : r > 0 ? '#F87171' : '#5E5E5E'; }

const CARD = { backgroundColor: '#1A1A1A', borderColor: '#262626' };
const INPUT: React.CSSProperties = { backgroundColor: '#0D0D0D', borderColor: '#2A2A2A', color: '#F9FAFB' };
const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

// ── Base entry card — always fully expanded ──────────────────────────────────
function BaseEntryCard({ entry, onUpdate, onRemove }: {
  entry: BaseEntryData;
  onUpdate: (data: Partial<BaseEntryData>) => void;
  onRemove: () => void;
}) {
  const inv = (entry.investimentoUsd ?? 0) * (entry.cotacaoUsd ?? 0);
  const fat = entry.faturamentoPago ?? 0;
  const roas = inv > 0 && fat > 0 ? fat / inv : 0;
  const ticket = fat > 0 && (entry.pedidos ?? 0) > 0 ? fat / entry.pedidos! : 0;
  const entregas = (entry.enviados ?? 0) * (entry.taxaEntrega ?? 0);

  const numInput = (key: keyof BaseEntryData, label: string, placeholder: string) => (
    <div>
      <label className="block mb-1.5" style={{ ...MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>{label}</label>
      <input
        type="number"
        placeholder={placeholder}
        value={(entry[key] as number) ?? ''}
        onChange={(e) => onUpdate({ [key]: e.target.value === '' ? undefined : Number(e.target.value) })}
        className="w-full rounded-lg px-3 py-2 text-xs outline-none border"
        style={INPUT}
      />
    </div>
  );

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#111111', borderColor: '#2A2A2A' }}>

      {/* card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: '#161616', borderColor: '#2A2A2A' }}>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#D4A843' }} />
          <input
            type="text"
            value={entry.base}
            onChange={(e) => onUpdate({ base: e.target.value })}
            className="text-sm font-semibold outline-none bg-transparent border-none"
            style={{ color: '#F2F2F2', minWidth: 140 }}
            placeholder="Nome da base"
          />
        </div>
        <div className="flex items-center gap-3">
          {roas > 0 && (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: roas >= 7 ? '#0F2E1A' : roas >= 4 ? '#2D2208' : '#3F1010', color: roasColor(roas) }}>
              {roas.toFixed(1)}x
            </span>
          )}
          {fat > 0 && <span style={{ ...MONO, fontSize: 11, color: '#D4A843' }}>{fmt(fat)}</span>}
          <button onClick={onRemove} className="p-1.5 rounded-lg" style={{ color: '#5E5E5E' }}><X size={13} /></button>
        </div>
      </div>

      {/* fields */}
      <div className="p-4 flex flex-col gap-4">

        {/* plataforma */}
        <div>
          <p className="mb-2.5" style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D4A843' }}>
            Plataforma (Martz / Nextags)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {numInput('tamanhoBase', 'Total da Base', '15000')}
            {numInput('enviados', 'Enviados', '12500')}
            {numInput('taxaEntrega', 'Tx. Entrega', '0.94')}
            {numInput('taxaLeitura', 'Tx. Leitura', '0.62')}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {numInput('cliques', 'Cliques', '890')}
          </div>
        </div>

        {/* custo */}
        <div>
          <p className="mb-2.5" style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D4A843' }}>
            Custo da API
          </p>
          <div className="grid grid-cols-2 gap-3">
            {numInput('investimentoUsd', 'Investimento USD', '48.50')}
            {numInput('cotacaoUsd', 'Cotação USD/BRL', '5.72')}
          </div>
        </div>

        {/* resultado */}
        <div>
          <p className="mb-2.5" style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D4A843' }}>
            Resultado Shopify (Pago)
          </p>
          <div className="grid grid-cols-2 gap-3">
            {numInput('faturamentoPago', 'Faturamento R$', '18400')}
            {numInput('pedidos', 'Pedidos', '142')}
          </div>
        </div>

        {/* auto calc */}
        {(inv > 0 || fat > 0 || entregas > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl" style={{ backgroundColor: '#0D0D0D' }}>
            <div>
              <p className="text-xs mb-1" style={{ color: '#5E5E5E' }}>Invest. BRL</p>
              <p className="text-sm font-bold" style={{ color: '#9CA3AF' }}>{inv > 0 ? fmt(inv) : '—'}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#5E5E5E' }}>Entregas</p>
              <p className="text-sm font-bold" style={{ color: '#9CA3AF' }}>{entregas > 0 ? `${(entregas / 1000).toFixed(1)}k` : '—'}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#5E5E5E' }}>Ticket Médio</p>
              <p className="text-sm font-bold" style={{ color: '#9CA3AF' }}>{ticket > 0 ? fmt(ticket) : '—'}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#5E5E5E' }}>ROAS</p>
              <p className="text-sm font-bold" style={{ color: roasColor(roas) }}>{roas > 0 ? `${roas.toFixed(2)}x` : '—'}</p>
            </div>
          </div>
        )}

        {/* observações */}
        <div>
          <label className="block mb-1.5" style={{ ...MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5E5E5E' }}>Observações</label>
          <input
            type="text"
            placeholder="Insight sobre esta base..."
            value={entry.observacoes ?? ''}
            onChange={(e) => onUpdate({ observacoes: e.target.value })}
            className="w-full rounded-lg px-3 py-2 text-xs outline-none border"
            style={INPUT}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main fill card ───────────────────────────────────────────────────────────
function FillCard({ d, onClose, onSave, baseEntries, onAddBaseEntry, onUpdateBaseEntry, onRemoveBaseEntry, isCustom, onDelete }: {
  d: Disparo;
  onClose: () => void;
  onSave: (data: Partial<DisparoData>) => void;
  baseEntries: BaseEntryData[];
  onAddBaseEntry: (entry: BaseEntryData) => void;
  onUpdateBaseEntry: (idx: number, data: Partial<BaseEntryData>) => void;
  onRemoveBaseEntry: (idx: number) => void;
  isCustom: boolean;
  onDelete?: () => void;
}) {
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
  const [newBaseName, setNewBaseName] = useState('');
  const [baseUnica, setBaseUnica] = useState(false);
  const [baseUnicaNome, setBaseUnicaNome] = useState(d.base);

  const inv = (form.investimentoUsd ?? 0) * (form.cotacaoUsd ?? 0);
  const fat = form.faturamentoPago ?? 0;
  const roas = inv > 0 && fat > 0 ? fat / inv : 0;
  const ticket = fat > 0 && (form.pedidos ?? 0) > 0 ? fat / (form.pedidos ?? 1) : 0;
  const entregas = (form.enviados ?? 0) * (form.taxaEntrega ?? 0);

  const field = (label: string, key: keyof DisparoData, placeholder: string, hint?: string) => (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: '#8A8A8A' }}>{label}</label>
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
      {hint && <p className="text-xs mt-1" style={{ color: '#5E5E5E' }}>{hint}</p>}
    </div>
  );

  function handleAddBase() {
    if (!newBaseName.trim()) return;
    onAddBaseEntry({ base: newBaseName.trim() });
    setNewBaseName('');
  }

  function handleSave() {
    if (baseUnica && baseUnicaNome.trim()) {
      onAddBaseEntry({
        base: baseUnicaNome.trim(),
        tamanhoBase: form.tamanhoBase,
        enviados: form.enviados,
        taxaEntrega: form.taxaEntrega,
        taxaLeitura: form.taxaLeitura,
        cliques: form.cliques,
        cotacaoUsd: form.cotacaoUsd,
        investimentoUsd: form.investimentoUsd,
        faturamentoPago: form.faturamentoPago,
        pedidos: form.pedidos,
        observacoes: form.observacoes,
      });
    }
    onSave(form);
  }

  return (
    <div className="rounded-2xl border p-6 mt-1" style={{ backgroundColor: '#161616', borderColor: '#D4A843', borderWidth: 1.5 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold" style={{ color: '#F2F2F2' }}>{d.campanha}</h3>
          <p className="text-xs mt-0.5" style={{ color: '#8A8A8A' }}>
            {format(parseISO(d.data), "dd 'de' MMMM yyyy", { locale: ptBR })}
            {' '}—{' '}
            <span style={{ color: '#D4A843' }}>{d.base}</span>
            {' '}
            <span style={{ color: '#3A3A3A', ...MONO, fontSize: 10 }}>· valores gerais do dia</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isCustom && onDelete && (
            <button onClick={onDelete} className="p-1.5 rounded-lg" style={{ color: '#F87171' }} title="Excluir">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: '#8A8A8A' }}><X size={16} /></button>
        </div>
      </div>

      {/* ── General form ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <div className="col-span-full">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#D4A843', ...MONO, letterSpacing: '0.14em' }}>
            Dados da Plataforma (Martz / Nextags)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {field('Total da Base', 'tamanhoBase', 'Ex: 15000', 'Qtd de contatos na lista')}
            {field('Enviados', 'enviados', 'Ex: 12500')}
            {field('Taxa de Entrega (0-1)', 'taxaEntrega', 'Ex: 0.94', 'Decimal. Ex: 0.94 = 94%')}
            {field('Taxa de Leitura (0-1)', 'taxaLeitura', 'Ex: 0.62')}
            {field('Cliques', 'cliques', 'Ex: 890')}
          </div>
        </div>

        <div className="col-span-full">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#D4A843', ...MONO, letterSpacing: '0.14em' }}>Custo da API</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {field('Investimento USD', 'investimentoUsd', 'Ex: 48.50')}
            {field('Cotação USD/BRL', 'cotacaoUsd', 'Ex: 5.72', 'Cotação no dia do disparo')}
          </div>
        </div>

        <div className="col-span-full">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#D4A843', ...MONO, letterSpacing: '0.14em' }}>
            Resultado Shopify (apenas status Pago)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {field('Faturamento R$', 'faturamentoPago', 'Ex: 18400')}
            {field('Pedidos', 'pedidos', 'Ex: 142')}
          </div>
        </div>
      </div>

      {(inv > 0 || fat > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl mb-5" style={{ backgroundColor: '#0D0D0D' }}>
          <div>
            <p className="text-xs mb-1" style={{ color: '#5E5E5E' }}>Invest. BRL (auto)</p>
            <p className="text-sm font-bold" style={{ color: '#9CA3AF' }}>{inv > 0 ? fmt(inv) : '—'}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#5E5E5E' }}>Entregas (auto)</p>
            <p className="text-sm font-bold" style={{ color: '#9CA3AF' }}>{entregas > 0 ? `${(entregas / 1000).toFixed(1)}k` : '—'}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#5E5E5E' }}>Ticket Médio (auto)</p>
            <p className="text-sm font-bold" style={{ color: '#9CA3AF' }}>{ticket > 0 ? fmt(ticket) : '—'}</p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#5E5E5E' }}>ROAS (auto)</p>
            <p className="text-sm font-bold" style={{ color: roasColor(roas) }}>{roas > 0 ? `${roas.toFixed(2)}x` : '—'}</p>
          </div>
        </div>
      )}

      <div className="mb-5">
        {field('Observações do Disparo', 'observacoes', 'Como foi o dia? Insights gerais de abertura, rejeição...', '')}
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: '#D4A843', color: '#0D0D0D' }}>
          Salvar Resultado
        </button>
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm border"
          style={{ borderColor: '#2A2A2A', color: '#8A8A8A' }}>
          Cancelar
        </button>
      </div>

      {/* ── Per-base section ── */}
      <div className="mt-6 pt-5 border-t" style={{ borderColor: '#262626' }}>

        {/* header row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p style={{ ...MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4A843' }}>
              Detalhamento por Base
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#5E5E5E' }}>
              {baseUnica
                ? 'O formulário acima será salvo inteiro para esta base.'
                : 'Insira os números de cada base individualmente — os campos gerais acima são os totais do dia.'}
            </p>
          </div>
          {/* Base Única toggle */}
          <button
            onClick={() => setBaseUnica((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
            style={{
              borderColor: baseUnica ? '#4ADE80' : '#2A2A2A',
              color: baseUnica ? '#4ADE80' : '#5E5E5E',
              backgroundColor: baseUnica ? 'rgba(74,222,128,0.08)' : 'transparent',
            }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: baseUnica ? '#4ADE80' : '#3A3A3A' }} />
            Base Única
          </button>
        </div>

        {/* Base Única: nome field */}
        {baseUnica && (
          <div className="mb-4 p-4 rounded-xl border" style={{ backgroundColor: 'rgba(74,222,128,0.04)', borderColor: 'rgba(74,222,128,0.18)' }}>
            <label className="block mb-2" style={{ ...MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4ADE80' }}>
              Nome da Base
            </label>
            <input
              autoFocus
              type="text"
              placeholder="Ex: Base Toda, Carrinho Abandonado 60d..."
              value={baseUnicaNome}
              onChange={(e) => setBaseUnicaNome(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none border"
              style={{ ...INPUT, borderColor: 'rgba(74,222,128,0.25)' }}
            />
            <p className="text-xs mt-2" style={{ color: '#5E5E5E' }}>
              Ao salvar, todos os dados do formulário acima serão vinculados a esta base na página de Bases.
            </p>
          </div>
        )}

        {/* existing base entries (only shown when not in base única mode) */}
        {!baseUnica && (
          <>
            <div className="flex flex-col gap-3 mb-3">
              {baseEntries.map((entry, idx) => (
                <BaseEntryCard
                  key={idx}
                  entry={entry}
                  onUpdate={(data) => onUpdateBaseEntry(idx, data)}
                  onRemove={() => onRemoveBaseEntry(idx)}
                />
              ))}
            </div>

            {/* add new base input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome da base (ex: Base Toda, Carrinho Abandonado 60d...)"
                value={newBaseName}
                onChange={(e) => setNewBaseName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddBase(); }}
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none border"
                style={INPUT}
              />
              <button
                onClick={handleAddBase}
                disabled={!newBaseName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border"
                style={{
                  borderColor: newBaseName.trim() ? '#D4A843' : '#2A2A2A',
                  color: newBaseName.trim() ? '#D4A843' : '#5E5E5E',
                  backgroundColor: 'transparent',
                }}>
                <Plus size={12} /> Adicionar Base
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DisparosPage() {
  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2026);
  const [openFill, setOpenFill] = useState<string | null>(null);
  const {
    getDisparos, updateDisparo, addDisparo, removeDisparo,
    addBaseEntry, updateBaseEntry, removeBaseEntry, getBaseEntries,
  } = useStore();

  const disparos = getDisparos(month, year);
  const customIds = new Set(disparos.filter((d) => d.id.startsWith('c-')).map((d) => d.id));

  const totalInvest = disparos.reduce((s, d) => s + d.investimentoBrl, 0);
  const totalFat = disparos.reduce((s, d) => s + d.faturamentoPago, 0);
  const roasTotal = totalInvest > 0 && totalFat > 0 ? totalFat / totalInvest : 0;

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
      <Header title="Disparos" month={month} year={year} onMonthChange={setMonth} onYearChange={setYear} />
      <main className="p-8 flex flex-col gap-4">

        <div className="rounded-2xl border overflow-hidden" style={CARD}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#161616', borderBottom: '1px solid #262626' }}>
                  {['','Data','Campanha','Tipo','Base','Invest. R$','Fat. R$','Pedidos','ROAS','Leitura','Observações'].map((h, i) => (
                    <th key={`${h}-${i}`} className={`px-4 py-3.5 ${i >= 5 && i <= 8 ? 'text-right' : 'text-left'}`}
                      style={{ ...MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A8A8A', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disparos.map((d: Disparo) => (
                  <React.Fragment key={d.id}>
                    <tr className="disparo-row" style={{ borderBottom: '1px solid #1c1c1c' }}>
                      <td className="px-4 py-3">
                        <button onClick={() => setOpenFill(openFill === d.id ? null : d.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
                          style={{ borderColor: openFill === d.id ? '#D4A843' : '#2A2A2A', color: openFill === d.id ? '#D4A843' : '#6B7280', backgroundColor: 'transparent' }}>
                          {openFill === d.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {d.investimentoBrl > 0 || d.faturamentoPago > 0 ? 'Editar' : 'Preencher'}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 font-medium whitespace-nowrap" style={{ color: '#D4A843' }}>
                        {format(parseISO(d.data), 'dd/MM', { locale: ptBR })}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-medium" style={{ color: '#F2F2F2' }}>{d.campanha}</td>
                      <td className="px-4 py-3.5"><CampaignBadge type={d.tipo} /></td>
                      <td className="px-4 py-3.5 max-w-[140px] truncate text-xs" style={{ color: '#9A9A9A' }}>{d.base}</td>
                      <td className="px-4 py-3.5 text-right" style={{ color: d.investimentoBrl > 0 ? '#D8D8D8' : '#3A3A3A' }}>
                        {d.investimentoBrl > 0 ? fmt(d.investimentoBrl) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium" style={{ color: d.faturamentoPago > 0 ? '#D4A843' : '#3A3A3A' }}>
                        {d.faturamentoPago > 0 ? fmt(d.faturamentoPago) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right" style={{ color: d.pedidos > 0 ? '#D8D8D8' : '#3A3A3A' }}>
                        {d.pedidos > 0 ? d.pedidos : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right"><RoasBadge roas={d.roas} /></td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: d.taxaLeitura > 0 ? '#D8D8D8' : '#3A3A3A' }}>
                        {d.taxaLeitura > 0 ? `${(d.taxaLeitura * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs max-w-[200px] truncate" style={{ color: '#9A9A9A' }}>
                        {d.observacoes || <span style={{ color: '#3A3A3A' }}>—</span>}
                      </td>
                    </tr>
                    {openFill === d.id && (
                      <tr>
                        <td colSpan={11} className="px-4 pb-4">
                          <FillCard
                            d={d}
                            isCustom={customIds.has(d.id)}
                            onClose={() => setOpenFill(null)}
                            onSave={(data) => { updateDisparo(d.id, data); setOpenFill(null); }}
                            onDelete={() => { removeDisparo(d.id); setOpenFill(null); }}
                            baseEntries={getBaseEntries(d.id)}
                            onAddBaseEntry={(entry) => addBaseEntry(d.id, entry)}
                            onUpdateBaseEntry={(idx, data) => updateBaseEntry(d.id, idx, data)}
                            onRemoveBaseEntry={(idx) => removeBaseEntry(d.id, idx)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #3A3A3A', backgroundColor: '#161616' }}>
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
