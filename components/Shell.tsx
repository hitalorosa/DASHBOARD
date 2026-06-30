'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { BrandProvider } from '@/lib/brand-context';
import BrandStoreWrapper from '@/components/BrandStoreWrapper';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // A tela de login não usa o shell do dashboard (sidebar, brand store, etc.)
  if (pathname === '/login') return <div className="flex-1">{children}</div>;

  return (
    <BrandProvider>
      <BrandStoreWrapper>
        <Sidebar />
        <div className="flex flex-col flex-1 min-h-screen overflow-auto pb-16 md:pb-0">
          {children}
        </div>
        <BottomNav />
      </BrandStoreWrapper>
    </BrandProvider>
  );
}
