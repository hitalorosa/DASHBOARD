'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useBrand } from '@/lib/brand-context';
import { DEFAULT_BRAND } from '@/lib/brands';
import { NAV, areaDaRota, areasDoNivel } from '@/lib/nav';
import { C, FONT, heading } from '@/lib/theme';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const ANOS = [2026, 2027];

const SELECT: React.CSSProperties = {
  padding: '9px 12px', fontSize: 13, fontWeight: 600,
  border: `1px solid ${C.borderMid}`, borderRadius: 10,
  background: C.surface, color: C.ink, cursor: 'pointer',
};

/**
 * `title` é opcional: por padrão o header deriva título e eyebrow da rota atual,
 * então nenhuma página fica sem cabeçalho (era o caso no design antigo).
 */
export default function Header({ title }: { title?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    brand, setBrand, brands, month, year, setMonth, setYear,
    archiveMode, setArchiveMode, nivel,
  } = useBrand();
  const [brandOpen, setBrandOpen] = useState(false);

  const area = areaDaRota(pathname);
  const item = area ? NAV[area] : null;
  const titulo  = title ?? item?.rotulo ?? 'Painel';
  const eyebrowTxt = `${brand.name} · ${item?.eyebrow ?? 'painel'}`;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <header
      style={{
        minHeight: 68, flex: 'none', display: 'flex', alignItems: 'center', gap: 16,
        padding: '10px 16px', background: C.surface, borderBottom: `1px solid ${C.border}`,
        position: 'sticky', top: 0, zIndex: 30, flexWrap: 'wrap',
      }}
      className="md:!px-7 md:!py-0 md:!flex-nowrap"
    >
      {/* Seletor de marca — só mobile; no desktop vive na sidebar */}
      <div className="md:hidden" style={{ position: 'relative', flex: 'none' }}>
        <button
          type="button"
          onClick={() => setBrandOpen((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, background: C.surfaceAlt,
            border: `1px solid ${C.borderMid}`, borderRadius: 10, padding: '7px 10px', cursor: 'pointer',
          }}
        >
          <span style={{
            width: 22, height: 22, borderRadius: 7, background: C.accent, display: 'grid', placeItems: 'center',
            fontFamily: FONT.display, fontWeight: 800, fontSize: 12, color: '#fff',
          }}>
            {brand.name.charAt(0)}
          </span>
          <span style={{ fontSize: 10, color: C.primaryDeep }}>{brandOpen ? '▲' : '▼'}</span>
        </button>

        {brandOpen && (
          <div
            className="entra"
            style={{
              position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 50, minWidth: 190,
              background: C.surface, border: `1px solid ${C.borderMid}`, borderRadius: 14, padding: 6,
              boxShadow: '0 12px 28px rgba(23,48,44,.14)',
            }}
          >
            {brands.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => { setBrand(b); setBrandOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'transparent',
                  border: 0, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                  fontSize: 13, color: C.ink,
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', flex: 'none',
                  background: b.id === brand.id ? C.primary : C.borderMid,
                }} />
                <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.name}
                </span>
                {b.archived && (
                  <span style={{
                    fontFamily: FONT.mono, fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase',
                    color: C.inkMut, border: `1px solid ${C.borderMid}`, borderRadius: 999, padding: '2px 6px',
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
                  setBrandOpen(false);
                }}
                style={{
                  width: '100%', textAlign: 'left', background: 'transparent', border: 0,
                  borderTop: `1px solid ${C.border}`, marginTop: 4, padding: '9px 10px',
                  fontSize: 11.5, fontWeight: 600, color: C.inkSoft, cursor: 'pointer',
                }}
              >
                Sair do arquivo
              </button>
            )}
          </div>
        )}
      </div>

      {/* Título da página */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase',
          color: C.inkSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {eyebrowTxt}
        </div>
        <h1 style={{ ...heading(23), lineHeight: 1.15, marginTop: 1 }}>{titulo}</h1>
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {areasDoNivel(nivel).length < 5 && (
          <span
            title="Esta sessão tem acesso parcial ao painel"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, background: C.surfaceAlt,
              borderRadius: 999, padding: '6px 12px', fontFamily: FONT.mono, fontSize: 10,
              letterSpacing: '.1em', textTransform: 'uppercase', color: C.primaryDeep, whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent }} />
            acesso {nivel}
          </span>
        )}

        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={SELECT} aria-label="Mês">
          {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={SELECT} aria-label="Ano">
          {ANOS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            background: C.surface, color: C.inkSoft, fontWeight: 600, fontSize: 13,
            padding: '9px 14px', border: `1px solid ${C.borderMid}`, borderRadius: 10, cursor: 'pointer',
          }}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
