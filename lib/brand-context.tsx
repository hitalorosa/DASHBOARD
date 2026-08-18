'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Brand, BRANDS, DEFAULT_BRAND, findBrand, visibleBrands } from './brands';
import {
  archiveModeFromUrl, readArchiveMode, writeArchiveMode,
  UNLOCK_CLICKS, UNLOCK_WINDOW_MS,
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
  /** Modo arquivo destravado (dá acesso às marcas fora de operação). */
  archiveMode: boolean;
  setArchiveMode: (on: boolean) => void;
  /** Registra um clique no logo — 5 em 3s destravam o modo arquivo. */
  registerLogoClick: () => void;
}

const Ctx = createContext<BrandCtx>({
  brand: DEFAULT_BRAND, setBrand: () => {},
  month: new Date().getMonth(), year: new Date().getFullYear(),
  setMonth: () => {}, setYear: () => {},
  brands: visibleBrands(false),
  archiveMode: false, setArchiveMode: () => {}, registerLogoClick: () => {},
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

  const [brand, setBrandState] = useState<Brand>(() => {
    if (typeof window === 'undefined') return DEFAULT_BRAND;
    const saved = localStorage.getItem('noue-selected-brand');
    return findBrand(saved) ?? DEFAULT_BRAND;
  });

  const [month, setMonthState] = useState<number>(() => loadMonthYear().month);
  const [year,  setYearState]  = useState<number>(() => loadMonthYear().year);

  // ?arquivo=1 destrava / ?arquivo=0 trava — atalho para quando o gesto não for prático
  useEffect(() => {
    const fromUrl = archiveModeFromUrl();
    if (fromUrl === null) return;
    writeArchiveMode(fromUrl);
    setArchiveModeState(fromUrl);
  }, []);

  const setArchiveMode = useCallback((on: boolean) => {
    writeArchiveMode(on);
    setArchiveModeState(on);
  }, []);

  // ── Gesto secreto: 5 cliques no logo em menos de 3s ────────────────────────
  const clicks = useRef<number[]>([]);
  const registerLogoClick = useCallback(() => {
    const now = Date.now();
    clicks.current = [...clicks.current, now].filter((t) => now - t < UNLOCK_WINDOW_MS);
    if (clicks.current.length >= UNLOCK_CLICKS) {
      clicks.current = [];
      setArchiveMode(true);
    }
  }, [setArchiveMode]);

  function setBrand(b: Brand) {
    localStorage.setItem('noue-selected-brand', b.id);
    setBrandState(b);
  }

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
      archiveMode, setArchiveMode, registerLogoClick,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBrand() {
  return useContext(Ctx);
}

export { BRANDS };
