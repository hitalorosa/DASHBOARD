import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual }           from 'crypto';

export const runtime = 'nodejs';

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD      ?? '';
const SESSION_VALUE      = process.env.DASHBOARD_SESSION_VALUE ?? '';

export async function POST(req: NextRequest) {
  if (!DASHBOARD_PASSWORD || !SESSION_VALUE) {
    return NextResponse.json({ ok: false, error: 'Dashboard não configurado' }, { status: 503 });
  }

  let body: { password?: string };
  try {
    body = await req.json() as { password?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const entered = body.password ?? '';

  // timingSafeEqual previne timing attack (não vaza se a senha está "quase certa")
  const a = Buffer.from(entered,            'utf8');
  const b = Buffer.from(DASHBOARD_PASSWORD, 'utf8');
  const valid = a.length === b.length && timingSafeEqual(a, b);

  if (!valid) {
    // Mesma resposta para "senha errada" e "usuário inexistente" — não vaza info
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('dash-session', SESSION_VALUE, {
    httpOnly: true,                                   // JS do browser NÃO consegue ler este cookie
    secure:   process.env.NODE_ENV === 'production',  // HTTPS em prod; relaxa em http://localhost no dev
    sameSite: 'strict',
    maxAge:   60 * 60 * 24 * 30, // 30 dias
    path:     '/',
  });

  return res;
}
