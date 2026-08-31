'use client';

/**
 * Painel da Roleta Recovery embutido no dash.
 *
 * O robô e o painel vivem noutro projeto (repo `hitalorosa/RoletaRecovery`, na Vercel) e
 * são servidos como HTML pronto — então aqui é um embed, não uma reimplementação. A página
 * de lá já se atualiza sozinha a cada 2 min e mascara o PII da lista de leads.
 */

import { useState } from 'react';
import { useBrand } from '@/lib/brand-context';
import { C, FONT, BTN_GHOST } from '@/lib/theme';

const ROLETA_URL = 'https://roletadry.vercel.app/';

const CARD: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, overflow: 'hidden',
};

export default function RoletaPage() {
  const { brand } = useBrand();
  // `key` muda pra forçar o reload do iframe (não dá pra chamar reload() cross-origin)
  const [recarga, setRecarga] = useState(0);

  if (brand.id !== 'dryskin') {
    return (
      <div style={{ ...CARD, padding: 28, maxWidth: 560 }}>
        <div style={{
          fontFamily: FONT.mono, fontSize: 9, letterSpacing: '.2em',
          textTransform: 'uppercase', color: C.inkMut, marginBottom: 8,
        }}>
          roleta recovery
        </div>
        <p style={{ color: C.inkSoft, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          A roleta roda só na DrySkin. Troque a marca no seletor da barra lateral para ver o painel.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: FONT.mono, fontSize: 9, letterSpacing: '.2em',
          textTransform: 'uppercase', color: C.inkMut, flex: 1, minWidth: 0,
        }}>
          painel ao vivo · atualiza sozinho a cada 2 min
        </span>

        <button type="button" onClick={() => setRecarga((n) => n + 1)} style={BTN_GHOST}>
          Recarregar
        </button>

        <a href={ROLETA_URL} target="_blank" rel="noopener noreferrer" style={{ ...BTN_GHOST, textDecoration: 'none' }}>
          Abrir em nova aba ↗
        </a>
      </div>

      <div style={{ ...CARD, height: 'calc(100vh - 200px)', minHeight: 520 }}>
        <iframe
          key={recarga}
          src={ROLETA_URL}
          title="Roleta Recovery — DrySkin"
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
        />
      </div>
    </div>
  );
}
