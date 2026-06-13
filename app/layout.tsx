import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import { StoreProvider } from '@/lib/store';
import AuthGuard from '@/components/AuthGuard';
import { BrandProvider } from '@/lib/brand-context';
import BrandStoreWrapper from '@/components/BrandStoreWrapper';

export const metadata: Metadata = {
  title: 'Vante Dashboard',
  description: 'Dashboard de controle de disparos CRM — Vante',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="flex h-full min-h-screen" style={{ backgroundColor: '#111111' }}>
        <AuthGuard>
          <BrandProvider>
            <BrandStoreWrapper>
              <Sidebar />
              <div className="flex flex-col flex-1 min-h-screen overflow-auto pb-16 md:pb-0">
                {children}
              </div>
              <BottomNav />
            </BrandStoreWrapper>
          </BrandProvider>
        </AuthGuard>
      </body>
    </html>
  );
}
