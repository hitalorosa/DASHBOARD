'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useBrand } from '@/lib/brand-context';
import { NAV, areaDaRota, areasDoNivel, podeAcessar } from '@/lib/nav';
import { C, FONT, heading, BTN_PRIMARY } from '@/lib/theme';

/**
 * Esconde as áreas fora do nível da sessão.
 *
 * Isto é só a camada de interface — quem barra de verdade é o proxy, que valida a
 * sessão assinada antes de a página ser servida. Sem essa checagem no servidor,
 * bastaria editar o cookie de nível para ver tudo.
 */
export default function AccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { nivel } = useBrand();

  const area = areaDaRota(pathname);
  if (podeAcessar(nivel, area)) return <>{children}</>;

  const destino = NAV[areasDoNivel(nivel)[0]];

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
        display: 'grid', placeItems: 'center', margin: '0 auto 20px', fontSize: 22, color: C.primaryDeep,
      }}>
        ◇
      </div>

      <h2 style={{ ...heading(24), marginBottom: 10 }}>Sem acesso a esta área</h2>

      <p style={{ color: C.inkSoft, fontSize: 14, margin: '0 0 22px' }}>
        A senha desta sessão libera o nível{' '}
        <strong style={{ color: C.ink, fontFamily: FONT.mono }}>{nivel}</strong>.
        Peça o acesso ampliado ou volte para uma área liberada.
      </p>

      <button type="button" onClick={() => router.push(destino.href)} style={BTN_PRIMARY}>
        Ir para {destino.rotulo}
      </button>
    </div>
  );
}
