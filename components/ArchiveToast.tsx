'use client';

import { useEffect } from 'react';
import { useBrand } from '@/lib/brand-context';
import { C } from '@/lib/theme';

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
      className="toast-vante fixed z-[100] right-4 cursor-pointer bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-6"
      style={{
        maxWidth: 'calc(100vw - 32px)',
        background: C.ink,
        color: '#fff',
        borderRadius: 14,
        padding: '14px 18px',
        fontSize: 13,
        fontWeight: 500,
        boxShadow: '0 14px 32px rgba(23,48,44,.24)',
      }}
    >
      {archiveToast}
    </div>
  );
}
