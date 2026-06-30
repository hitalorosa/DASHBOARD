import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Apaga com os MESMOS atributos do set (path:'/' explícito). Sem isso, o browser
  // pode emitir o Set-Cookie de deleção com Path errado e NÃO remover o cookie de
  // sessão — "logout" que não desloga.
  res.cookies.set('dash-session', '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
    maxAge:   0,
  });
  return res;
}
