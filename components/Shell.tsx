'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import Header from '@/components/Header';
import { BrandProvider } from '@/lib/brand-context';
import BrandStoreWrapper from '@/components/BrandStoreWrapper';
import ArchivedGuard from '@/components/ArchivedGuard';
import AccessGuard from '@/components/AccessGuard';
import ArchiveToast from '@/components/ArchiveToast';
import { C } from '@/lib/theme';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // A tela de login não usa o shell do dashboard
  if (pathname === '/login') return <div style={{ flex: 1 }}>{children}</div>;

  return (
    <BrandProvider>
      <BrandStoreWrapper>
        <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: C.bg }}>
          <Sidebar />

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Header no shell: nenhuma página fica sem título nem repete o cabeçalho */}
            <Header />

            <main
              className="p-4 md:p-7 pb-24 md:pb-7"
              style={{ flex: 1, minWidth: 0, width: '100%' }}
            >
              <AccessGuard>
                <ArchivedGuard>{children}</ArchivedGuard>
              </AccessGuard>
            </main>
          </div>

          <BottomNav />
          <ArchiveToast />
        </div>
      </BrandStoreWrapper>
    </BrandProvider>
  );
}
