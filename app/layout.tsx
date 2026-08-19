import type { Metadata } from 'next';
import './globals.css';
import Shell from '@/components/Shell';

export const metadata: Metadata = {
  title: 'DrySkin CRM',
  description: 'Painel de disparos e Grupo VIP — DrySkin',
};

/**
 * Nada de `h-full` no html/body: ele travava a altura no viewport, o container
 * do Shell parava de crescer com o conteúdo e a sidebar sticky ficava sem curso
 * para grudar. `min-h-screen` no body dá o piso sem impor teto.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
