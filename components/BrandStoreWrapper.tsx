'use client';

import { useBrand } from '@/lib/brand-context';
import { StoreProvider } from '@/lib/store';

export default function BrandStoreWrapper({ children }: { children: React.ReactNode }) {
  const { brand } = useBrand();
  return (
    <StoreProvider key={brand.id} brand={brand}>
      {children}
    </StoreProvider>
  );
}
