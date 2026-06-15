'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Brand, BRANDS, DEFAULT_BRAND } from './brands';

interface BrandCtx {
  brand: Brand;
  setBrand: (b: Brand) => void;
  month: number;
  year: number;
  setMonth: (m: number) => void;
  setYear: (y: number) => void;
}

const Ctx = createContext<BrandCtx>({
  brand: DEFAULT_BRAND, setBrand: () => {},
  month: new Date().getMonth(), year: new Date().getFullYear(),
  setMonth: () => {}, setYear: () => {},
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
  const [brand, setBrandState] = useState<Brand>(() => {
    if (typeof window === 'undefined') return DEFAULT_BRAND;
    const saved = localStorage.getItem('noue-selected-brand');
    return BRANDS.find((b) => b.id === saved) ?? DEFAULT_BRAND;
  });

  const [month, setMonthState] = useState<number>(() => loadMonthYear().month);
  const [year,  setYearState]  = useState<number>(() => loadMonthYear().year);

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
    <Ctx.Provider value={{ brand, setBrand, month, year, setMonth, setYear }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBrand() {
  return useContext(Ctx);
}
