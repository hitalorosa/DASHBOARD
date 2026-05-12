'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Brand, BRANDS, DEFAULT_BRAND } from './brands';

interface BrandCtx {
  brand: Brand;
  setBrand: (b: Brand) => void;
}

const Ctx = createContext<BrandCtx>({ brand: DEFAULT_BRAND, setBrand: () => {} });

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrandState] = useState<Brand>(() => {
    if (typeof window === 'undefined') return DEFAULT_BRAND;
    const saved = localStorage.getItem('noue-selected-brand');
    return BRANDS.find((b) => b.id === saved) ?? DEFAULT_BRAND;
  });

  function setBrand(b: Brand) {
    localStorage.setItem('noue-selected-brand', b.id);
    setBrandState(b);
  }

  return <Ctx.Provider value={{ brand, setBrand }}>{children}</Ctx.Provider>;
}

export function useBrand() {
  return useContext(Ctx);
}
