import type { Metadata } from 'next';
import './globals.css';
import Shell from '@/components/Shell';

export const metadata: Metadata = {
  title: 'DrySkin CRM',
  description: 'Painel de disparos e Grupo VIP — DrySkin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="flex h-full min-h-screen">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
