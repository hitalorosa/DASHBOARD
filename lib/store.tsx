'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Disparo, Base, DecisaoBase } from './types';
import { disparosMaio, basesMaio } from './data';

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
  getBases: () => Base[];
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
const STORAGE_KEY = 'noue-dash-v1';

function load(): StoreState {
  if (typeof window === 'undefined') return { disparoData: {}, baseData: {}, customDisparos: [], baseEntries: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return {
      disparoData: parsed?.disparoData ?? {},
      baseData: parsed?.baseData ?? {},
      customDisparos: parsed?.customDisparos ?? [],
      baseEntries: parsed?.baseEntries ?? {},
    };
  } catch { return { disparoData: {}, baseData: {}, customDisparos: [], baseEntries: {} }; }
}

function save(state: StoreState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* noop */ }
}

function allDisparos(state: StoreState): Disparo[] {
  return [...disparosMaio, ...(state.customDisparos ?? [])];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({ disparoData: {}, baseData: {}, customDisparos: [], baseEntries: {} });

  useEffect(() => { setState(load()); }, []);

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
      const next = { ...prev, customDisparos: (prev.customDisparos ?? []).filter((d) => d.id !== id) };
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
    return allDisparos(state)
      .filter((d) => { const dt = new Date(d.data); return dt.getMonth() === month && dt.getFullYear() === year; })
      .map((d) => merge(d, state.disparoData?.[d.id]));
  }, [state]);

  const getBases = useCallback((): Base[] => {
    const merged = allDisparos(state).map((d) => merge(d, state.disparoData?.[d.id]));
    return basesMaio.map((b) => {
      const matching = merged.filter((d) => d.base === b.nome);
      const totalFat = matching.reduce((s, d) => s + d.faturamentoPago, 0);
      const totalInvest = matching.reduce((s, d) => s + d.investimentoBrl, 0);
      const totalEntregas = matching.reduce((s, d) => s + d.entregas, 0);
      const totalPedidos = matching.reduce((s, d) => s + d.pedidos, 0);
      const roasMedio = totalInvest > 0 && totalFat > 0 ? totalFat / totalInvest : 0;
      const override = state.baseData?.[b.nome] ?? {};
      return {
        ...b, entregas: totalEntregas, faturamento: totalFat, pedidos: totalPedidos, roasMedio,
        decisao: (override.decisao as DecisaoBase) ?? b.decisao,
        notas: override.notas ?? b.notas,
      };
    });
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
