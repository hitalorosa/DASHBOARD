import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Dash Disparos — Nouê',
  description: 'Dashboard de controle de disparos CRM — Nouê Cosméticos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="flex h-full min-h-screen" style={{ backgroundColor: '#F5F5F5' }}>
        <Sidebar />
        <div className="flex flex-col flex-1 min-h-screen overflow-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
