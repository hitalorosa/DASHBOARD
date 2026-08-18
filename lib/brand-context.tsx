'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Brand, DEFAULT_BRAND, findBrand, visibleBrands } from './brands';
import {
  archiveModeFromUrl, readArchiveMode, writeArchiveMode, shouldIgnoreKey,
  SECRET_WORD, TYPING_RESET_MS,
} from './archive-mode';

interface BrandCtx {
  brand: Brand;
  setBrand: (b: Brand) => void;
  month: number;
  year: number;
  setMonth: (m: number) => void;
  setYear: (y: number) => void;
  /** Lista de marcas para os seletores — já filtrada pelo modo arquivo. */
  brands: Brand[];
  /** Modo arquivo ligado (dá acesso às marcas fora de operação). */
  archiveMode: boolean;
  setArchiveMode: (on: boolean) => void;
  /** Mensagem de confirmação a exibir, ou null. */
  archiveToast: string | null;
  dismissArchiveToast: () => void;
}

const Ctx = createContext<BrandCtx>({
  brand: DEFAULT_BRAND, setBrand: () => {},
  month: new Date().getMonth(), year: new Date().getFullYear(),
  setMonth: () => {}, setYear: () => {},
  brands: visibleBrands(false),
  archiveMode: false, setArchiveMode: () => {},
  archiveToast: null, dismissArchiveToast: () => {},
});

function loadMonthYear(): { month: number; year: number } {
  if (typeof window === 'undefined') {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  }
  try {
    const saved = localStorage.getItem('dash-month-year');
    if (saved) {
      const { month, year } = JSON.parse(saved) as { month: number; year: number };
      if (typeof month === 'number' && typeof year === 'number') return { month, year };
    }
  } catch { /* noop */ }
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const [archiveMode, setArchiveModeState] = useState<boolean>(() => readArchiveMode());
  const [archiveToast, setArchiveToast]    = useState<string | null>(null);

  const [brand, setBrandState] = useState<Brand>(() => {
    if (typeof window === 'undefined') return DEFAULT_BRAND;
    const saved = localStorage.getItem('noue-selected-brand');
    return findBrand(saved) ?? DEFAULT_BRAND;
  });

  const [month, setMonthState] = useState<number>(() => loadMonthYear().month);
  const [year,  setYearState]  = useState<number>(() => loadMonthYear().year);

  const setBrand = useCallback((b: Brand) => {
    localStorage.setItem('noue-selected-brand', b.id);
    setBrandState(b);
  }, []);

  const setArchiveMode = useCallback((on: boolean) => {
    writeArchiveMode(on);
    setArchiveModeState(on);
    setArchiveToast(on
      ? 'Modo arquivo ligado — Nouê disponível no seletor'
      : 'Modo arquivo desligado');
  }, []);

  const dismissArchiveToast = useCallback(() => setArchiveToast(null), []);

  // ?arquivo=1 liga / ?arquivo=0 desliga
  useEffect(() => {
    const fromUrl = archiveModeFromUrl();
    if (fromUrl === null) return;
    writeArchiveMode(fromUrl);
    setArchiveModeState(fromUrl);
  }, []);

  // ── Palavra secreta: digitar SECRET_WORD fora de um campo alterna o modo ────
  // Refs evitam re-registrar o listener a cada mudança de estado.
  const modeRef  = useRef(archiveMode);
  const brandRef = useRef(brand);
  useEffect(() => { modeRef.current  = archiveMode; }, [archiveMode]);
  useEffect(() => { brandRef.current = brand;       }, [brand]);

  useEffect(() => {
    let buffer = '';
    let timer: ReturnType<typeof setTimeout> | null = null;

    function onKeyDown(e: KeyboardEvent) {
      if (shouldIgnoreKey(e)) return;

      buffer = (buffer + e.key.toLowerCase()).slice(-SECRET_WORD.length);

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { buffer = ''; }, TYPING_RESET_MS);

      if (buffer !== SECRET_WORD) return;

      buffer = '';
      const next = !modeRef.current;
      setArchiveMode(next);
      // Ao desligar estando numa marca arquivada, volta para uma marca ativa
      if (!next && brandRef.current.archived) setBrand(DEFAULT_BRAND);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (timer) clearTimeout(timer);
    };
  }, [setArchiveMode, setBrand]);

  function setMonth(m: number) {
    setMonthState(m);
    localStorage.setItem('dash-month-year', JSON.stringify({ month: m, year }));
  }

  function setYear(y: number) {
    setYearState(y);
    localStorage.setItem('dash-month-year', JSON.stringify({ month, year: y }));
  }

  return (
    <Ctx.Provider value={{
      brand, setBrand, month, year, setMonth, setYear,
      brands: visibleBrands(archiveMode),
      archiveMode, setArchiveMode,
      archiveToast, dismissArchiveToast,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBrand() {
  return useContext(Ctx);
}
