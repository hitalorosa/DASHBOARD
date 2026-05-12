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
  month: 4, year: 2026, setMonth: () => {}, setYear: () => {},
});

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrandState] = useState<Brand>(() => {
    if (typeof window === 'undefined') return DEFAULT_BRAND;
    const saved = localStorage.getItem('noue-selected-brand');
    return BRANDS.find((b) => b.id === saved) ?? DEFAULT_BRAND;
  });

  const [month, setMonth] = useState(4);
  const [year, setYear] = useState(2026);

  function setBrand(b: Brand) {
    localStorage.setItem('noue-selected-brand', b.id);
    setBrandState(b);
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
