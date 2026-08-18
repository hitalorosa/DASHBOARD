'use client';

import Header from '@/components/Header';
import { useBrand } from '@/lib/brand-context';
import { DEFAULT_BRAND } from '@/lib/brands';

const GOLD = '#D4A843';

/**
 * Marcas arquivadas (fora de operação) não mostram o dashboard — cai aqui.
 * Nada é apagado: os dados seguem no Supabase e no localStorage da marca,
 * e voltam a aparecer assim que o modo arquivo é destravado.
 */
export default function ArchivedGuard({ children }: { children: React.ReactNode }) {
  const { brand, setBrand, archiveMode } = useBrand();

  if (!brand.archived || archiveMode) return <>{children}</>;

  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#111111' }}>
      <Header title="Em manutenção" />
      <main className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-center" style={{ maxWidth: 420 }}>
          <div
            className="flex items-center justify-center w-16 h-16 rounded-full"
            style={{ backgroundColor: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.18)' }}
          >
            {/* SVG inline em vez de lucide — ver nota sobre OneDrive no README */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity: 0.6 }}>
              <path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3z" />
              <path d="M19.7 11.3 22 9a5.5 5.5 0 0 0-7-7l2.6 2.6-1.4 3.5-3.5 1.4L9.9 6.4" />
            </svg>
          </div>

          <p style={{ fontSize: 18, fontWeight: 600, color: '#ECECEC', letterSpacing: '-0.01em' }}>
            Painel em reforma
          </p>

          <p style={{ fontSize: 13, color: '#5E5E5E', lineHeight: 1.6 }}>
            O painel da <strong style={{ color: '#8A8A8A' }}>{brand.name}</strong> está temporariamente
            indisponível enquanto passa por ajustes.
          </p>

          <button
            onClick={() => setBrand(DEFAULT_BRAND)}
            className="mt-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', color: '#9CA3AF' }}
          >
            Ir para {DEFAULT_BRAND.name}
          </button>
        </div>
      </main>
    </div>
  );
}
