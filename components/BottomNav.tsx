'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBrand } from '@/lib/brand-context';
import { NAV, areaDaRota, areasDoNivel } from '@/lib/nav';
import { C, FONT } from '@/lib/theme';

export default function BottomNav() {
  const pathname = usePathname();
  const { nivel } = useBrand();

  const areaAtual = areaDaRota(pathname);
  const itens = areasDoNivel(nivel).map((a) => NAV[a]);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
      style={{
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        height: 60,
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 16px rgba(23,48,44,.05)',
      }}
    >
      {itens.map((n) => {
        const ativo = n.area === areaAtual;
        return (
          <Link
            key={n.area}
            href={n.href}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
            style={{ color: ativo ? C.primary : C.inkMut, textDecoration: 'none', position: 'relative' }}
          >
            {ativo && (
              <span style={{
                position: 'absolute', top: 0, left: '28%', right: '28%', height: 2,
                background: C.primary, borderRadius: 999,
              }} />
            )}
            <span style={{ fontSize: 16, lineHeight: 1 }}>{n.icone}</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '.08em', fontWeight: ativo ? 700 : 500 }}>
              {n.rotuloCurto}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
