import type { Metadata } from 'next';
import './globals.css';
import Shell from '@/components/Shell';

export const metadata: Metadata = {
  title: 'Vante Dashboard',
  description: 'Dashboard de controle de disparos CRM — Vante',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="flex h-full min-h-screen" style={{ backgroundColor: '#111111' }}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
