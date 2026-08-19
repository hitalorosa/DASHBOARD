'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useBrand } from '@/lib/brand-context';
import { DEFAULT_BRAND } from '@/lib/brands';
import { NAV, areaDaRota, areasDoNivel } from '@/lib/nav';
import { C, FONT } from '@/lib/theme';

export default function Sidebar() {
  const pathname = usePathname();
  const { brand, setBrand, brands, archiveMode, setArchiveMode, nivel } = useBrand();
  const [open, setOpen] = useState(false);

  const areaAtual = areaDaRota(pathname);
  const itens = areasDoNivel(nivel).map((a) => NAV[a]);

  return (
    <aside
      className="hidden md:flex flex-col"
      style={{ width: 236, flex: 'none', background: C.ink, color: '#fff', position: 'sticky', top: 0, height: '100vh' }}
    >
      {/* Seletor de marca */}
      <div style={{ padding: '20px 18px 16px', position: 'relative' }}>
        <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: C.onDark, marginBottom: 10 }}>
          Marca
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.14)',
            borderRadius: 14, padding: '10px 12px', color: '#fff', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{
            width: 30, height: 30, borderRadius: 9, background: C.accent, display: 'grid', placeItems: 'center',
            flex: 'none', fontFamily: FONT.display, fontWeight: 800, fontSize: 15, color: '#fff',
          }}>
            {brand.name.charAt(0)}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: FONT.display, fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
              {brand.name}
            </span>
            <span style={{ display: 'block', fontSize: 11, color: C.onDark }}>
              {brands.length} {brands.length === 1 ? 'marca' : 'marcas'}
            </span>
          </span>
          <span style={{ fontSize: 10, color: C.onDark }}>{open ? '▲' : '▼'}</span>
        </button>

        {open && (
          <div
            className="entra"
            style={{
              marginTop: 8, background: '#0F2320', border: '1px solid rgba(255,255,255,.12)',
              borderRadius: 14, padding: 6,
            }}
          >
            {brands.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => { setBrand(b); setOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'transparent',
                  border: 0, padding: '9px 10px', borderRadius: 10, color: '#fff', cursor: 'pointer',
                  textAlign: 'left', fontSize: 13,
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flex: 'none',
                  background: b.id === brand.id ? C.accent : 'rgba(255,255,255,.25)',
                }} />
                <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.name}
                </span>
                {b.archived && (
                  <span style={{
                    fontFamily: FONT.mono, fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase',
                    color: C.onDark, border: '1px solid rgba(255,255,255,.18)', borderRadius: 999, padding: '2px 7px',
                  }}>
                    arquivo
                  </span>
                )}
              </button>
            ))}

            {archiveMode && (
              <button
                type="button"
                onClick={() => {
                  setArchiveMode(false);
                  if (brand.archived) setBrand(DEFAULT_BRAND);
                  setOpen(false);
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'transparent',
                  border: 0, borderTop: '1px solid rgba(255,255,255,.12)', marginTop: 4, padding: '9px 10px',
                  color: C.onDark, cursor: 'pointer', textAlign: 'left', fontSize: 11.5, fontWeight: 600,
                }}
              >
                Sair do arquivo
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,.12)', margin: '0 18px 14px' }} />

      {/* Navegação */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
        {itens.map((n) => {
          const ativo = n.area === areaAtual;
          return (
            <Link
              key={n.area}
              href={n.href}
              style={{
                position: 'relative', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, fontSize: 13.5, textDecoration: 'none',
                fontWeight: ativo ? 700 : 500,
                color: ativo ? '#fff' : C.onDark,
                background: ativo ? 'rgba(255,255,255,.10)' : 'transparent',
              }}
            >
              {ativo && (
                <span style={{
                  position: 'absolute', left: 0, top: 9, bottom: 9, width: 3,
                  background: C.accent, borderRadius: 999,
                }} />
              )}
              <span style={{ width: 18, textAlign: 'center', fontSize: 13, opacity: .9 }}>{n.icone}</span>
              <span>{n.rotulo}</span>
            </Link>
          );
        })}
      </nav>

      {/* Rodapé — wordmark textual funciona para qualquer marca */}
      <div style={{ marginTop: 'auto', padding: 18 }}>
        <div style={{
          fontFamily: FONT.display, fontWeight: 800, fontSize: 17, letterSpacing: '.06em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,.85)',
        }}>
          {brand.name}
        </div>
        <div style={{
          fontFamily: FONT.mono, fontSize: 9, letterSpacing: '.16em', textTransform: 'uppercase',
          color: C.inkSoft, marginTop: 10,
        }}>
          Vante · v2
        </div>
      </div>
    </aside>
  );
}
