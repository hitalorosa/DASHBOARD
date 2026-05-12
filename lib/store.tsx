'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Disparo, Base, DecisaoBase } from './types';
import { disparosMaio } from './data';
import { supabase } from './supabase';
import { Brand, DEFAULT_BRAND } from './brands';

export interface DisparoData {
  tamanhoBase: number;
  enviados: number;
  taxaEntrega: number;
  taxaLeitura: number;
  cliques: number;
  cotacaoUsd: number;
  investimentoUsd: number;
  faturamentoPago: number;
  pedidos: number;
  observacoes: string;
}

export interface BaseEntryData {
  base: string;
  tamanhoBase?: number;
  enviados?: number;
  taxaEntrega?: number;
  taxaLeitura?: number;
  cliques?: number;
  cotacaoUsd?: number;
  investimentoUsd?: number;
  faturamentoPago?: number;
  pedidos?: number;
  observacoes?: string;
}

export interface BaseData {
  decisao: DecisaoBase;
  notas: string;
}

interface StoreState {
  disparoData: Record<string, Partial<DisparoData>>;
  baseData: Record<string, Partial<BaseData>>;
  customDisparos: Disparo[];
  baseEntries: Record<string, BaseEntryData[]>; // key = disparo ID
  hiddenIds: string[]; // fixed dispatches marked as removed
}

interface Store extends StoreState {
  updateDisparo: (id: string, data: Partial<DisparoData>) => void;
  updateBase: (nome: string, data: Partial<BaseData>) => void;
  addDisparo: (d: Disparo) => void;
  removeDisparo: (id: string) => void;
  addBaseEntry: (disparoId: string, entry: BaseEntryData) => void;
  updateBaseEntry: (disparoId: string, idx: number, data: Partial<BaseEntryData>) => void;
  removeBaseEntry: (disparoId: string, idx: number) => void;
  getBaseEntries: (disparoId: string) => BaseEntryData[];
  getDisparos: (month: number, year: number) => Disparo[];
  getBases: (start?: string, end?: string) => Base[];
}

function merge(base: Disparo, override: Partial<DisparoData> = {}): Disparo {
  const enviados = override.enviados ?? base.enviados;
  const taxaEntrega = override.taxaEntrega ?? base.taxaEntrega;
  const entregas = enviados > 0 && taxaEntrega > 0 ? Math.round(enviados * taxaEntrega) : 0;
  const cotacaoUsd = override.cotacaoUsd ?? base.cotacaoUsd;
  const investimentoUsd = override.investimentoUsd ?? base.investimentoUsd;
  const investimentoBrl = investimentoUsd > 0 && cotacaoUsd > 0 ? investimentoUsd * cotacaoUsd : base.investimentoBrl;
  const faturamentoPago = override.faturamentoPago ?? base.faturamentoPago;
  const pedidos = override.pedidos ?? base.pedidos;
  const ticketMedio = faturamentoPago > 0 && pedidos > 0 ? faturamentoPago / pedidos : 0;
  const roas = faturamentoPago > 0 && investimentoBrl > 0 ? faturamentoPago / investimentoBrl : 0;

  return {
    ...base,
    tamanhoBase: override.tamanhoBase ?? base.tamanhoBase,
    enviados,
    taxaEntrega: override.taxaEntrega ?? base.taxaEntrega,
    entregas,
    taxaLeitura: override.taxaLeitura ?? base.taxaLeitura,
    cliques: override.cliques ?? base.cliques,
    cotacaoUsd,
    investimentoUsd,
    investimentoBrl,
    faturamentoPago,
    pedidos,
    ticketMedio,
    roas,
    observacoes: override.observacoes ?? base.observacoes,
  };
}

const Ctx = createContext<Store | null>(null);
const EMPTY_STATE: StoreState = { disparoData: {}, baseData: {}, customDisparos: [], baseEntries: {}, hiddenIds: [] };

function parseState(raw: unknown): StoreState {
  const p = raw as Record<string, unknown> | null;
  return {
    disparoData: (p?.disparoData as StoreState['disparoData']) ?? {},
    baseData: (p?.baseData as StoreState['baseData']) ?? {},
    customDisparos: (p?.customDisparos as Disparo[]) ?? [],
    baseEntries: (p?.baseEntries as StoreState['baseEntries']) ?? {},
    hiddenIds: (p?.hiddenIds as string[]) ?? [],
  };
}

function hasData(s: StoreState) {
  return Object.keys(s.disparoData).length > 0 || s.customDisparos.length > 0
    || Object.keys(s.baseEntries).length > 0 || s.hiddenIds.length > 0;
}

function loadLocal(key: string): StoreState {
  if (typeof window === 'undefined') return EMPTY_STATE;
  try { return parseState(JSON.parse(localStorage.getItem(key) ?? '{}')); }
  catch { return EMPTY_STATE; }
}

function saveLocal(key: string, state: StoreState) {
  try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* noop */ }
}

async function loadCloud(rowId: number): Promise<StoreState | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('dash_store').select('data').eq('id', rowId).single();
    if (error || !data) return null;
    const parsed = parseState(data.data);
    return hasData(parsed) ? parsed : null;
  } catch { return null; }
}

let cloudTimer: ReturnType<typeof setTimeout> | null = null;
function saveCloud(rowId: number, state: StoreState, immediate = false) {
  if (!supabase) return;
  if (cloudTimer) clearTimeout(cloudTimer);
  const delay = immediate ? 0 : 800;
  cloudTimer = setTimeout(async () => {
    try {
      await supabase!.from('dash_store').upsert({ id: rowId, data: state, updated_at: new Date().toISOString() });
    } catch { /* noop */ }
  }, delay);
}

function allDisparos(state: StoreState): Disparo[] {
  return [...disparosMaio, ...(state.customDisparos ?? [])];
}

export function StoreProvider({ children, brand = DEFAULT_BRAND }: { children: ReactNode; brand?: Brand }) {
  const [state, setState] = useState<StoreState>(EMPTY_STATE);
  const [synced, setSynced] = useState(false);
  const storageKey = brand.storageKey;
  const rowId = brand.supabaseRowId;
  const keyRef = useRef(storageKey);
  const rowRef = useRef(rowId);
  useEffect(() => { keyRef.current = storageKey; rowRef.current = rowId; }, [storageKey, rowId]);

  const save = useCallback((s: StoreState) => {
    saveLocal(keyRef.current, s);
    saveCloud(rowRef.current, s);
  }, []);

  useEffect(() => {
    setSynced(false);
    setState(EMPTY_STATE);
    const local = loadLocal(storageKey);
    setState(local);

    loadCloud(rowId).then((cloud) => {
      if (cloud) {
        setState(cloud);
        saveLocal(storageKey, cloud);
      } else if (hasData(local)) {
        saveCloud(rowId, local, true);
      }
      setSynced(true);
    }).catch(() => {
      if (hasData(local)) saveCloud(rowId, local, true);
      setSynced(true);
    });
  }, [storageKey, rowId]);

  const updateDisparo = useCallback((id: string, data: Partial<DisparoData>) => {
    setState((prev) => {
      const next = { ...prev, disparoData: { ...prev.disparoData, [id]: { ...(prev.disparoData?.[id] ?? {}), ...data } } };
      save(next); return next;
    });
  }, []);

  const updateBase = useCallback((nome: string, data: Partial<BaseData>) => {
    setState((prev) => {
      const next = { ...prev, baseData: { ...prev.baseData, [nome]: { ...(prev.baseData?.[nome] ?? {}), ...data } } };
      save(next); return next;
    });
  }, []);

  const addDisparo = useCallback((d: Disparo) => {
    setState((prev) => {
      const next = { ...prev, customDisparos: [...(prev.customDisparos ?? []), d] };
      save(next); return next;
    });
  }, []);

  const removeDisparo = useCallback((id: string) => {
    setState((prev) => {
      const isCustom = id.startsWith('c-');
      const next = isCustom
        ? { ...prev, customDisparos: (prev.customDisparos ?? []).filter((d) => d.id !== id) }
        : { ...prev, hiddenIds: [...new Set([...(prev.hiddenIds ?? []), id])] };
      save(next); return next;
    });
  }, []);

  const addBaseEntry = useCallback((disparoId: string, entry: BaseEntryData) => {
    setState((prev) => {
      const existing = prev.baseEntries?.[disparoId] ?? [];
      const next = { ...prev, baseEntries: { ...prev.baseEntries, [disparoId]: [...existing, entry] } };
      save(next); return next;
    });
  }, []);

  const updateBaseEntry = useCallback((disparoId: string, idx: number, data: Partial<BaseEntryData>) => {
    setState((prev) => {
      const existing = [...(prev.baseEntries?.[disparoId] ?? [])];
      existing[idx] = { ...existing[idx], ...data };
      const next = { ...prev, baseEntries: { ...prev.baseEntries, [disparoId]: existing } };
      save(next); return next;
    });
  }, []);

  const removeBaseEntry = useCallback((disparoId: string, idx: number) => {
    setState((prev) => {
      const existing = (prev.baseEntries?.[disparoId] ?? []).filter((_, i) => i !== idx);
      const next = { ...prev, baseEntries: { ...prev.baseEntries, [disparoId]: existing } };
      save(next); return next;
    });
  }, []);

  const getBaseEntries = useCallback((disparoId: string): BaseEntryData[] => {
    return state.baseEntries?.[disparoId] ?? [];
  }, [state.baseEntries]);

  const getDisparos = useCallback((month: number, year: number): Disparo[] => {
    const hidden = new Set(state.hiddenIds ?? []);
    return allDisparos(state)
      .filter((d) => !hidden.has(d.id))
      .filter((d) => { const dt = new Date(d.data); return dt.getMonth() === month && dt.getFullYear() === year; })
      .map((d) => merge(d, state.disparoData?.[d.id]));
  }, [state]);

  const getBases = useCallback((start?: string, end?: string): Base[] => {
    let merged = allDisparos(state).map((d) => merge(d, state.disparoData?.[d.id]));
    if (start && end) {
      merged = merged.filter((d) => d.data >= start && d.data <= end);
    }

    type Agg = { tamanho: number; disparos: number; entregas: number; totalInvest: number; faturamento: number; pedidos: number };
    const map = new Map<string, Agg>();
    const ensure = (nome: string) => {
      if (!map.has(nome)) map.set(nome, { tamanho: 0, disparos: 0, entregas: 0, totalInvest: 0, faturamento: 0, pedidos: 0 });
      return map.get(nome)!;
    };

    for (const d of merged) {
      const entries = state.baseEntries?.[d.id] ?? [];

      if (entries.length === 0) {
        // Only include if the disparo has real financial data
        if (!d.base || (d.faturamentoPago === 0 && d.investimentoBrl === 0 && d.enviados === 0)) continue;
        const b = ensure(d.base);
        b.disparos += 1;
        b.tamanho = Math.max(b.tamanho, d.tamanhoBase);
        b.entregas += d.entregas;
        b.totalInvest += d.investimentoBrl;
        b.faturamento += d.faturamentoPago;
        b.pedidos += d.pedidos;
      } else {
        // Per-base entries exist — aggregate from each entry
        const seen = new Set<string>();
        for (const entry of entries) {
          if (!entry.base) continue;
          const b = ensure(entry.base);
          if (!seen.has(entry.base)) { b.disparos += 1; seen.add(entry.base); }
          b.tamanho = Math.max(b.tamanho, entry.tamanhoBase ?? 0);
          b.entregas += (entry.enviados ?? 0) * (entry.taxaEntrega ?? 0);
          b.totalInvest += (entry.investimentoUsd ?? 0) * (entry.cotacaoUsd ?? 0);
          b.faturamento += entry.faturamentoPago ?? 0;
          b.pedidos += entry.pedidos ?? 0;
        }
      }
    }

    return Array.from(map.entries())
      .map(([nome, agg]) => {
        const override = state.baseData?.[nome] ?? {};
        return {
          nome,
          tamanho: agg.tamanho,
          disparos: agg.disparos,
          entregas: Math.round(agg.entregas),
          faturamento: agg.faturamento,
          pedidos: agg.pedidos,
          roasMedio: agg.totalInvest > 0 && agg.faturamento > 0 ? agg.faturamento / agg.totalInvest : 0,
          decisao: (override.decisao as DecisaoBase) ?? 'pendente',
          notas: override.notas ?? '',
        };
      })
      .sort((a, b) => b.faturamento - a.faturamento || a.nome.localeCompare(b.nome));
  }, [state]);

  return (
    <Ctx.Provider value={{
      ...state, updateDisparo, updateBase, addDisparo, removeDisparo,
      addBaseEntry, updateBaseEntry, removeBaseEntry, getBaseEntries,
      getDisparos, getBases,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
