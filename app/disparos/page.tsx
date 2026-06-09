'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import CampaignBadge from '@/components/CampaignBadge';
import { useStore, DisparoData, BaseEntryData, DisparoContent } from '@/lib/store';
import { Disparo, CampaignType } from '@/lib/types';
import { useBrand } from '@/lib/brand-context';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, ChevronDown, ChevronUp, Plus, Trash2, Copy, Check, RefreshCw, Zap } from 'lucide-react';

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

// ── Content tab (copy + UTMs + cupom) ────────────────────────────────────────
function ContentTab({ content, onChange }: {
  content: Partial<DisparoContent>;
  onChange: (data: Partial<DisparoContent>) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  // normalise: support legacy single `utm` string + new `utms` array
  const utms: string[] = content.utms?.length ? content.utms : [''];

  function setUtms(next: string[]) { onChange({ utms: next }); }
  function updateUtm(idx: number, val: string) {
    const next = [...utms]; next[idx] = val; setUtms(next);
  }
  function addUtm() { setUtms([...utms, '']); }
  function removeUtm(idx: number) {
    const next = utms.filter((_, i) => i !== idx);
    setUtms(next.length ? next : ['']);
  }

  function copy(text: string, key: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  const msgField = (key: 'msg1' | 'msg2' | 'msg3' | 'msgVip', label: string, hint: string, accentColor = '#D4A843') => (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label style={{ ...MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: accentColor }}>{label}</label>
        <button
          onClick={() => copy(content[key] ?? '', key)}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
          style={{ color: copied === key ? '#4ADE80' : '#5E5E5E', backgroundColor: 'transparent' }}
          title="Copiar">
          {copied === key ? <Check size={11} /> : <Copy size={11} />}
          <span style={{ fontSize: 10 }}>{copied === key ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
      <textarea
        ref={autoGrow}
        rows={1}
        placeholder={hint}
        value={content[key] ?? ''}
        onChange={(e) => {
          onChange({ [key]: e.target.value });
          autoGrow(e.target);
        }}
        className="w-full rounded-lg px-3 pb-4 pt-2 text-xs outline-none border"
        style={{
          ...INPUT,
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          overflowY: 'hidden',
          overflowX: 'hidden',
          resize: 'none',
          minHeight: '5rem',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        }}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Messages */}
      <div>
        <p className="mb-3" style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A8A8A' }}>
          Mensagens do Disparo
        </p>
        <div className="flex flex-col gap-4">
          {msgField('msg1', 'Mensagem 1', 'Cole aqui o texto da primeira mensagem do disparo...')}
          {msgField('msg2', 'Mensagem 2', 'Cole aqui o texto da segunda mensagem...')}
          {msgField('msg3', 'Mensagem 3', 'Cole aqui o texto da terceira mensagem...')}
        </div>
      </div>

      {/* UTMs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A8A8A' }}>
            UTM / Links ({utms.length})
          </p>
          <button
            onClick={addUtm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            style={{ borderColor: '#D4A843', color: '#D4A843', backgroundColor: 'rgba(212,168,67,0.06)' }}>
            <Plus size={11} /> + UTM
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {utms.map((utm, idx) => (
            <div key={idx} className="rounded-xl border p-3" style={{ backgroundColor: '#111111', borderColor: '#2A2A2A' }}>
              <div className="flex items-center justify-between mb-1.5">
                <label style={{ ...MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#D4A843' }}>
                  UTM {utms.length > 1 ? idx + 1 : ''}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copy(utm, `utm-${idx}`)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                    style={{ color: copied === `utm-${idx}` ? '#4ADE80' : '#5E5E5E' }}>
                    {copied === `utm-${idx}` ? <Check size={11} /> : <Copy size={11} />}
                    <span style={{ fontSize: 10 }}>{copied === `utm-${idx}` ? 'Copiado' : 'Copiar'}</span>
                  </button>
                  {utms.length > 1 && (
                    <button
                      onClick={() => removeUtm(idx)}
                      className="p-0.5 rounded"
                      style={{ color: '#5E5E5E' }}
                      title="Remover">
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
              <input
                type="text"
                placeholder="https://sualoja.com.br/produto?utm_source=whatsapp&utm_campaign=..."
                value={utm}
                onChange={(e) => updateUtm(idx, e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-xs outline-none border"
                style={{ ...INPUT, fontFamily: 'monospace' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Cupom */}
      <div>
        <p className="mb-3" style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A8A8A' }}>
          Cupom
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ex: WELCOME10, MAIO15, FRETEGRATIS..."
            value={content.cupom ?? ''}
            onChange={(e) => onChange({ cupom: e.target.value })}
            className="flex-1 rounded-lg px-3 py-2 text-sm font-bold outline-none border"
            style={{ ...INPUT, color: content.cupom ? '#D4A843' : '#5E5E5E', letterSpacing: content.cupom ? '0.12em' : undefined }}
          />
          <button
            onClick={() => copy(content.cupom ?? '', 'cupom')}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs border shrink-0"
            style={{ color: copied === 'cupom' ? '#4ADE80' : '#5E5E5E', borderColor: '#2A2A2A', backgroundColor: '#111111' }}>
            {copied === 'cupom' ? <Check size={11} /> : <Copy size={11} />}
            <span>{copied === 'cupom' ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* Mensagem Grupo VIP */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: '#0F0F1A', borderColor: '#2D2A4A' }}>
        <p className="mb-3" style={{ ...MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7C6FCD' }}>
          👑 Mensagem — Grupo VIP
        </p>
        {msgField('msgVip', 'Convite VIP', 'Cole aqui a mensagem de convite para o Grupo VIP...', '#7C6FCD')}
      </div>
    </div>
  );
}

// ── Main fill card ───────────────────────────────────────────────────────────
function FillCard({ d, onClose, onSave, baseEntries, onAddBaseEntry, onUpdateBaseEntry, onRemoveBaseEntry, isCustom, onDelete, content, onContentChange, yampiSuggestion }: {
  d: Disparo;
  onClose: () => void;
  onSave: (data: Partial<DisparoData>) => void;
  baseEntries: BaseEntryData[];
  onAddBaseEntry: (entry: BaseEntryData) => void;
  onUpdateBaseEntry: (idx: number, data: Partial<BaseEntryData>) => void;
  onRemoveBaseEntry: (idx: number) => void;
  isCustom: boolean;
  onDelete?: () => void;
  content: Partial<DisparoContent>;
  onContentChange: (data: Partial<DisparoContent>) => void;
  yampiSuggestion?: { faturamento: number; pedidos: number };
}) {
  const [tab, setTab] = useState<'resultado' | 'conteudo'>('resultado');
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

  // ── Auto-calc when 2+ bases ─────────────────────────────────────────────────
  const isMultiBase = baseEntries.length >= 2;

  useEffect(() => {
    if (!isMultiBase) return;

    const totalBase    = baseEntries.reduce((s, e) => s + (e.tamanhoBase ?? 0), 0);
    const totalEnv     = baseEntries.reduce((s, e) => s + (e.enviados ?? 0), 0);
    const totalEntreg  = baseEntries.reduce((s, e) => s + (e.enviados ?? 0) * (e.taxaEntrega ?? 0), 0);
    const totalLeit    = baseEntries.reduce((s, e) => s + (e.enviados ?? 0) * (e.taxaLeitura ?? 0), 0);
    const totalCliques = baseEntries.reduce((s, e) => s + (e.cliques ?? 0), 0);
    const totalInvBRL  = baseEntries.reduce((s, e) => s + (e.investimentoUsd ?? 0) * (e.cotacaoUsd ?? 0), 0);
    const totalFat     = baseEntries.reduce((s, e) => s + (e.faturamentoPago ?? 0), 0);
    const totalPed     = baseEntries.reduce((s, e) => s + (e.pedidos ?? 0), 0);

    setForm({
      tamanhoBase:     totalBase    || undefined,
      enviados:        totalEnv     || undefined,
      taxaEntrega:     totalEnv > 0 ? totalEntreg / totalEnv : undefined,
      taxaLeitura:     totalEnv > 0 ? totalLeit   / totalEnv : undefined,
      cliques:         totalCliques || undefined,
      // Armazena invest BRL total como investimentoUsd com cotacao=1
      investimentoUsd: totalInvBRL  || undefined,
      cotacaoUsd:      totalInvBRL > 0 ? 1 : undefined,
      faturamentoPago: totalFat     || undefined,
      pedidos:         totalPed     || undefined,
      observacoes:     form.observacoes,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseEntries, isMultiBase]);

  const inv    = (form.investimentoUsd ?? 0) * (form.cotacaoUsd ?? 0);
  const fat    = form.faturamentoPago ?? 0;
  const roas   = inv > 0 && fat > 0 ? fat / inv : 0;
  const ticket = fat > 0 && (form.pedidos ?? 0) > 0 ? fat / (form.pedidos ?? 1) : 0;
  const entregas = (form.enviados ?? 0) * (form.taxaEntrega ?? 0);

  // ── Read-only display for locked fields ──────────────────────────────────────
  const lockedField = (label: string, value: string | number | undefined, isPercent = false) => {
    const display = value !== undefined && value !== 0
      ? (isPercent ? `${(Number(value) * 100).toFixed(1)}%` : String(value))
      : '—';
    return (
      <div>
        <label className="block text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#5E5E5E' }}>
          <span style={{ fontSize: 9, color: '#D4A843', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>AUTO</span>
          {label}
        </label>
        <div className="w-full rounded-lg px-3 py-2 text-sm border select-none"
          style={{ backgroundColor: '#0A0A0A', borderColor: '#1E1E1E', color: '#9CA3AF', cursor: 'not-allowed', fontVariantNumeric: 'tabular-nums' }}>
          {display}
        </div>
      </div>
    );
  };

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
    <div className="rounded-2xl border p-4 md:p-6 mt-1" style={{ backgroundColor: '#161616', borderColor: '#D4A843', borderWidth: 1.5 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold" style={{ color: '#F2F2F2' }}>{d.campanha}</h3>
          <p className="text-xs mt-0.5" style={{ color: '#8A8A8A' }}>
            {format(parseISO(d.data), "dd 'de' MMMM yyyy", { locale: ptBR })}
            {' '}—{' '}
            <span style={{ color: '#D4A843' }}>{d.base}</span>
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

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ backgroundColor: '#0D0D0D' }}>
        {(['resultado', 'conteudo'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              backgroundColor: tab === t ? '#1A1A1A' : 'transparent',
              color: tab === t ? '#D4A843' : '#5E5E5E',
              border: tab === t ? '1px solid #2A2A2A' : '1px solid transparent',
            }}>
            {t === 'resultado' ? 'Resultado' : 'Conteúdo'}
          </button>
        ))}
      </div>

      {/* ── Conteúdo tab ── */}
      {tab === 'conteudo' && (
        <ContentTab content={content} onChange={onContentChange} />
      )}

      {/* ── Resultado tab ── */}
      {tab === 'resultado' && (<>

      {/* ── Banner Yampi ── */}
      {yampiSuggestion && yampiSuggestion.faturamento > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl flex items-center justify-between gap-3"
          style={{ backgroundColor: 'rgba(212,168,67,0.07)', border: '1px solid rgba(212,168,67,0.25)' }}>
          <div className="flex items-center gap-2.5">
            <Zap size={14} style={{ color: '#D4A843' }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: '#D4A843' }}>Dados calculados pela Yampi</p>
              <p className="text-xs mt-0.5" style={{ color: '#8A8A8A' }}>
                {fmt(yampiSuggestion.faturamento)} · {yampiSuggestion.pedidos} pedidos
              </p>
            </div>
          </div>
          <button
            onClick={() => setForm((p) => ({
              ...p,
              faturamentoPago: yampiSuggestion.faturamento,
              pedidos: yampiSuggestion.pedidos,
            }))}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0"
            style={{ borderColor: '#D4A843', color: '#D4A843', backgroundColor: 'rgba(212,168,67,0.1)' }}>
            Aplicar
          </button>
        </div>
      )}

      {/* ── Banner modo multi-base ── */}
      {isMultiBase && (
        <div className="mb-4 px-4 py-3 rounded-xl flex items-center gap-3" style={{ backgroundColor: 'rgba(212,168,67,0.07)', border: '1px solid rgba(212,168,67,0.2)' }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <div>
            <p className="text-xs font-semibold" style={{ color: '#D4A843' }}>Resultado Geral — Calculado automaticamente</p>
            <p className="text-xs mt-0.5" style={{ color: '#8A8A8A' }}>
              {baseEntries.length} bases ativas · Os campos abaixo são a soma proporcional de todas as bases. Edite os valores nas bases individuais.
            </p>
          </div>
        </div>
      )}

      {/* ── General form ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        <div className="col-span-full">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#D4A843', ...MONO, letterSpacing: '0.14em' }}>
            Dados da Plataforma (Martz / Nextags)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {isMultiBase ? <>
              {lockedField('Total da Base',        form.tamanhoBase)}
              {lockedField('Enviados',             form.enviados)}
              {lockedField('Taxa de Entrega',      form.taxaEntrega, true)}
              {lockedField('Taxa de Leitura',      form.taxaLeitura, true)}
              {lockedField('Cliques',              form.cliques)}
            </> : <>
              {field('Total da Base',        'tamanhoBase',  'Ex: 15000', 'Qtd de contatos na lista')}
              {field('Enviados',             'enviados',     'Ex: 12500')}
              {field('Taxa de Entrega (0-1)','taxaEntrega',  'Ex: 0.94', 'Decimal. Ex: 0.94 = 94%')}
              {field('Taxa de Leitura (0-1)','taxaLeitura',  'Ex: 0.62')}
              {field('Cliques',              'cliques',      'Ex: 890')}
            </>}
          </div>
        </div>

        <div className="col-span-full">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#D4A843', ...MONO, letterSpacing: '0.14em' }}>Custo da API</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {isMultiBase ? <>
              {lockedField('Invest. BRL Total (soma)', form.investimentoUsd)}
              <div />
            </> : <>
              {field('Investimento USD', 'investimentoUsd', 'Ex: 48.50')}
              {field('Cotação USD/BRL',  'cotacaoUsd',      'Ex: 5.72', 'Cotação no dia do disparo')}
            </>}
          </div>
        </div>

        <div className="col-span-full">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#D4A843', ...MONO, letterSpacing: '0.14em' }}>
            Resultado Shopify (apenas status Pago)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {isMultiBase ? <>
              {lockedField('Faturamento R$', form.faturamentoPago)}
              {lockedField('Pedidos',        form.pedidos)}
            </> : <>
              {field('Faturamento R$', 'faturamentoPago', 'Ex: 18400')}
              {field('Pedidos',        'pedidos',         'Ex: 142')}
            </>}
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
      </>)}
    </div>
  );
}

// ── Tipo retorno da API de atribuição ─────────────────────────────────────────
interface AtribItem { id: string; faturamento: number; pedidos: number; }

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DisparosPage() {
  const { brand, month, year } = useBrand();
  const [openFill, setOpenFill] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── Yampi attribution state ────────────────────────────────────────────────
  const [yampiMap, setYampiMap]       = useState<Map<string, AtribItem>>(new Map());
  const [yampiStatus, setYampiStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [yampiError, setYampiError]   = useState('');

  async function syncYampi() {
    setYampiStatus('loading');
    setYampiError('');
    try {
      const res = await fetch(`/api/atribuicao?month=${month}&year=${year}&brand=${brand.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as AtribItem[];
      const map = new Map<string, AtribItem>();
      for (const item of data) map.set(item.id, item);
      setYampiMap(map);
      setYampiStatus('done');
    } catch (e) {
      setYampiError(e instanceof Error ? e.message : 'Erro desconhecido');
      setYampiStatus('error');
    }
  }

  // Carrega na montagem e quando mês/ano/marca mudam
  useEffect(() => { syncYampi(); }, [month, year, brand.id]);

  // Re-sync automático quando o painel de edição fecha
  // Dá 1.5s pro Supabase salvar o content antes de buscar
  const prevOpenFill = useRef<string | null>(null);
  useEffect(() => {
    if (prevOpenFill.current !== null && openFill === null) {
      const timer = setTimeout(() => syncYampi(), 1500);
      return () => clearTimeout(timer);
    }
    prevOpenFill.current = openFill;
  }, [openFill]);

  const {
    getDisparos, updateDisparo, addDisparo, removeDisparo,
    addBaseEntry, updateBaseEntry, removeBaseEntry, getBaseEntries,
    updateDisparoContent, getDisparoContent,
  } = useStore();

  const disparos = getDisparos(month, year);
  const customIds = new Set(disparos.filter((d) => d.id.startsWith('c-')).map((d) => d.id));

  const totalInvest = disparos.reduce((s, d) => s + d.investimentoBrl, 0);
  const totalFat = disparos.reduce((s, d) => s + d.faturamentoPago, 0);
  const totalPedidos = disparos.reduce((s, d) => s + d.pedidos, 0);
  const totalTamanhoBase = disparos.reduce((s, d) => s + d.tamanhoBase, 0);
  const roasTotal = totalInvest > 0 && totalFat > 0 ? totalFat / totalInvest : 0;
  const leituraVals = disparos.filter((d) => d.taxaLeitura > 0).map((d) => d.taxaLeitura);
  const avgLeitura = leituraVals.length > 0 ? leituraVals.reduce((s, v) => s + v, 0) / leituraVals.length : 0;

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
      <Header title="Disparos" />
      <main className="p-4 md:p-8 flex flex-col gap-4">

        {/* ── Barra de sync Yampi ── */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border"
          style={{ backgroundColor: '#141414', borderColor: '#232323' }}>
          <div className="flex items-center gap-2.5">
            <Zap size={13} style={{ color: yampiStatus === 'done' ? '#D4A843' : '#5E5E5E' }} />
            <span className="text-xs" style={{ color: '#8A8A8A' }}>
              {yampiStatus === 'loading' && 'Buscando atribuições na Yampi...'}
              {yampiStatus === 'error'   && <span style={{ color: '#F87171' }}>{yampiError}</span>}
            </span>
          </div>
          <button
            onClick={syncYampi}
            disabled={yampiStatus === 'loading'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
            style={{ borderColor: '#2A2A2A', color: yampiStatus === 'loading' ? '#5E5E5E' : '#D4A843', backgroundColor: 'transparent' }}>
            <RefreshCw size={11} className={yampiStatus === 'loading' ? 'animate-spin' : ''} />
            {yampiStatus === 'loading' ? 'Buscando...' : 'Sincronizar'}
          </button>
        </div>

        <div className="rounded-2xl border overflow-hidden" style={CARD}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#161616', borderBottom: '1px solid #262626' }}>
                  {([
                    { label: '', right: false },
                    { label: 'Data', right: false },
                    { label: 'Campanha', right: false },
                    { label: 'Tipo', right: false },
                    { label: 'Base', right: false },
                    { label: 'Tam. Base', right: true },
                    { label: 'Invest. R$', right: true },
                    { label: 'Fat. R$', right: true },
                    { label: 'Pedidos', right: true },
                    { label: 'ROAS', right: true },
                    { label: 'Leitura', right: false },
                    { label: 'Cliques', right: true },
                    { label: 'Observações', right: false },
                    { label: '', right: false },
                  ] as { label: string; right: boolean }[]).map(({ label, right }, i) => (
                    <th key={`${label}-${i}`} className={`px-4 py-3.5 ${right ? 'text-right' : 'text-left'}`}
                      style={{ ...MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8A8A8A', fontWeight: 500 }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {disparos.map((d: Disparo) => {
                  const yampi = yampiMap.get(d.id);
                  const fatDisplay  = d.faturamentoPago > 0 ? d.faturamentoPago : (yampi?.faturamento ?? 0);
                  const pedDisplay  = d.pedidos > 0          ? d.pedidos          : (yampi?.pedidos ?? 0);
                  const isYampiVal  = d.faturamentoPago === 0 && (yampi?.faturamento ?? 0) > 0;
                  return (
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
                      <td className="px-4 py-3.5 text-right" style={{ color: d.tamanhoBase > 0 ? '#9CA3AF' : '#3A3A3A' }}>
                        {d.tamanhoBase > 0 ? d.tamanhoBase.toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right" style={{ color: d.investimentoBrl > 0 ? '#D8D8D8' : '#3A3A3A' }}>
                        {d.investimentoBrl > 0 ? fmt(d.investimentoBrl) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium">
                        {fatDisplay > 0 ? (
                          <span className="flex items-center justify-end gap-1.5">
                            <span style={{ color: isYampiVal ? '#B8902E' : '#D4A843' }}>{fmt(fatDisplay)}</span>
                            {isYampiVal && (
                              <span className="text-[9px] px-1 py-0.5 rounded font-bold"
                                style={{ backgroundColor: 'rgba(212,168,67,0.15)', color: '#D4A843', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>
                                YAMPI
                              </span>
                            )}
                          </span>
                        ) : <span style={{ color: '#3A3A3A' }}>—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right" style={{ color: pedDisplay > 0 ? (isYampiVal ? '#7A8A7A' : '#D8D8D8') : '#3A3A3A' }}>
                        {pedDisplay > 0 ? pedDisplay : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right"><RoasBadge roas={d.roas} /></td>
                      <td className="px-4 py-3.5 text-xs" style={{ color: d.taxaLeitura > 0 ? '#D8D8D8' : '#3A3A3A' }}>
                        {d.taxaLeitura > 0 ? `${(d.taxaLeitura * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right" style={{ color: d.cliques > 0 ? '#9CA3AF' : '#3A3A3A' }}>
                        {d.cliques > 0 ? d.cliques.toLocaleString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs max-w-[200px] truncate" style={{ color: '#9A9A9A' }}>
                        {d.observacoes || <span style={{ color: '#3A3A3A' }}>—</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {confirmDelete === d.id ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => { removeDisparo(d.id); setConfirmDelete(null); if (openFill === d.id) setOpenFill(null); }}
                              className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                              style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                              Confirmar
                            </button>
                            <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 py-1 rounded-lg"
                              style={{ color: '#5E5E5E' }}>
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(d.id)}
                            className="p-1.5 rounded-lg"
                            style={{ color: '#3A3A3A' }}
                            title="Remover disparo">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {openFill === d.id && (
                      <tr>
                        <td colSpan={14} className="px-4 pb-4">
                          <FillCard
                            d={d}
                            isCustom={customIds.has(d.id)}
                            onClose={() => setOpenFill(null)}
                            onSave={(data) => { updateDisparo(d.id, data); setOpenFill(null); }}
                            onDelete={() => { removeDisparo(d.id); setOpenFill(null); }}
                            baseEntries={getBaseEntries(d.id)}
                            onAddBaseEntry={(entry) => addBaseEntry(d.id, entry)}
                            content={getDisparoContent(d.id)}
                            onContentChange={(data) => updateDisparoContent(d.id, data)}
                            onUpdateBaseEntry={(idx, data) => updateBaseEntry(d.id, idx, data)}
                            onRemoveBaseEntry={(idx) => removeBaseEntry(d.id, idx)}
                            yampiSuggestion={yampi}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #3A3A3A', backgroundColor: '#161616' }}>
                  {/* Totais label — covers button + data + campanha + tipo + base */}
                  <td colSpan={5} className="px-4 py-3.5 text-sm font-bold uppercase" style={{ color: '#6B7280' }}>Totais</td>
                  {/* Tam. Base total */}
                  <td className="px-4 py-3.5 text-right text-sm font-bold" style={{ color: totalTamanhoBase > 0 ? '#9CA3AF' : '#374151' }}>
                    {totalTamanhoBase > 0 ? totalTamanhoBase.toLocaleString('pt-BR') : '—'}
                  </td>
                  {/* Invest */}
                  <td className="px-4 py-3.5 text-right text-sm font-bold" style={{ color: totalInvest > 0 ? '#9CA3AF' : '#374151' }}>
                    {totalInvest > 0 ? fmt(totalInvest) : '—'}
                  </td>
                  {/* Fat */}
                  <td className="px-4 py-3.5 text-right text-sm font-bold" style={{ color: totalFat > 0 ? '#D4A843' : '#374151' }}>
                    {totalFat > 0 ? fmt(totalFat) : '—'}
                  </td>
                  {/* Pedidos */}
                  <td className="px-4 py-3.5 text-right text-sm font-bold" style={{ color: totalPedidos > 0 ? '#D8D8D8' : '#374151' }}>
                    {totalPedidos > 0 ? totalPedidos.toLocaleString('pt-BR') : '—'}
                  </td>
                  {/* ROAS */}
                  <td className="px-4 py-3 text-right">
                    {roasTotal > 0 ? <RoasBadge roas={roasTotal} /> : <span className="text-xs" style={{ color: '#374151' }}>—</span>}
                  </td>
                  {/* Leitura média */}
                  <td className="px-4 py-3.5 text-sm font-bold" style={{ color: avgLeitura > 0 ? '#D8D8D8' : '#374151' }}>
                    {avgLeitura > 0 ? `${(avgLeitura * 100).toFixed(0)}% média` : '—'}
                  </td>
                  {/* Cliques — sem total */}
                  <td className="px-4 py-3" />
                  {/* Obs + trash */}
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
