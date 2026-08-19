'use client';

import { useBrand } from '@/lib/brand-context';
import { DEFAULT_BRAND } from '@/lib/brands';
import { C, heading, BTN_PRIMARY } from '@/lib/theme';

/**
 * Marcas arquivadas (fora de operação) não mostram o dashboard — cai aqui.
 * Nada é apagado: os dados seguem no Supabase e no localStorage da marca,
 * e voltam a aparecer assim que o modo arquivo é destravado.
 */
export default function ArchivedGuard({ children }: { children: React.ReactNode }) {
  const { brand, setBrand, archiveMode } = useBrand();

  if (!brand.archived || archiveMode) return <>{children}</>;

  return (
    <div
      className="entra"
      style={{
        maxWidth: 440, margin: '80px auto', textAlign: 'center',
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 24, padding: '44px 36px',
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: '50%', background: C.surfaceAlt,
        display: 'grid', placeItems: 'center', margin: '0 auto 20px',
      }}>
        {/* SVG inline em vez de lucide — ver nota sobre OneDrive no README */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke={C.primaryDeep} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3z" />
          <path d="M19.7 11.3 22 9a5.5 5.5 0 0 0-7-7l2.6 2.6-1.4 3.5-3.5 1.4L9.9 6.4" />
        </svg>
      </div>

      <h2 style={{ ...heading(24), marginBottom: 10 }}>Painel em reforma</h2>

      <p style={{ color: C.inkSoft, fontSize: 14, margin: '0 0 22px' }}>
        O painel da <strong style={{ color: C.ink }}>{brand.name}</strong> está temporariamente
        indisponível enquanto passa por ajustes.
      </p>

      <button type="button" onClick={() => setBrand(DEFAULT_BRAND)} style={BTN_PRIMARY}>
        Ir para {DEFAULT_BRAND.name}
      </button>
    </div>
  );
}
