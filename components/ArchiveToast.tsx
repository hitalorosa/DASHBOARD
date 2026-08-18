'use client';

import { useEffect } from 'react';
import { useBrand } from '@/lib/brand-context';

const VISIBLE_MS = 3500;

/**
 * Confirmação visual de que o modo arquivo mudou de estado. Sem isso, digitar a
 * palavra secreta não produz nenhum sinal na tela e parece não ter funcionado.
 */
export default function ArchiveToast() {
  const { archiveToast, dismissArchiveToast } = useBrand();

  useEffect(() => {
    if (!archiveToast) return;
    const t = setTimeout(dismissArchiveToast, VISIBLE_MS);
    return () => clearTimeout(t);
  }, [archiveToast, dismissArchiveToast]);

  if (!archiveToast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={dismissArchiveToast}
      // No mobile sobe acima da BottomNav (60px + safe area); no desktop encosta embaixo
      className="archive-toast fixed z-[100] right-4 flex items-center gap-2.5 px-4 py-3
                 rounded-xl cursor-pointer bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-5"
      style={{
        maxWidth: 'calc(100vw - 32px)',
        backgroundColor: '#161616',
        border: '1px solid rgba(212,168,67,0.35)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: '#D4A843' }} />
      <span style={{ fontSize: 12.5, color: '#ECECEC', lineHeight: 1.4 }}>{archiveToast}</span>
    </div>
  );
}
