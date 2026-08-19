import { NextResponse } from 'next/server';
import { SESSION_COOKIE, NIVEL_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Apaga com os MESMOS atributos do set (path:'/' explícito). Sem isso, o browser
  // pode emitir o Set-Cookie de deleção com Path errado e NÃO remover o cookie de
  // sessão — "logout" que não desloga.
  const comum = {
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path:     '/',
    maxAge:   0,
  };

  res.cookies.set(SESSION_COOKIE, '', { ...comum, httpOnly: true });
  res.cookies.set(NIVEL_COOKIE,   '', { ...comum, httpOnly: false });

  return res;
}
