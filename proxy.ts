import { NextRequest, NextResponse } from 'next/server';
import { lerSessao, SESSION_COOKIE } from '@/lib/session';
import { areaDaRota, podeAcessar, areasDoNivel, NAV } from '@/lib/nav';

// DASHBOARD_SESSION_VALUE existe só no servidor — nunca vai pro bundle do browser
const SESSION_VALUE = process.env.DASHBOARD_SESSION_VALUE ?? '';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas — sem sessão necessária
  if (pathname.startsWith('/api/webhooks/'))  return NextResponse.next(); // HMAC próprio
  // allowlist explícita (não prefixo) — evita que uma futura rota /api/auth/* nasça pública
  if (pathname === '/api/auth/login' || pathname === '/api/auth/logout') return NextResponse.next();
  if (pathname === '/login')                  return NextResponse.next();

  // Arquivos estáticos passam direto
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/)
  ) return NextResponse.next();

  const nivel = await lerSessao(request.cookies.get(SESSION_COOKIE)?.value, SESSION_VALUE);

  if (!nivel) {
    // Chamada de API → retorna 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 });
    }
    // Página → redireciona para /login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Sessão válida, mas o nível pode não alcançar esta área.
  // Esta é a barreira real — o cookie `dash-nivel` que a interface lê é só espelho.
  const area = areaDaRota(pathname);
  if (!podeAcessar(nivel, area)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ ok: false, error: 'Sem acesso a esta área' }, { status: 403 });
    }
    // Manda para a primeira área que este nível enxerga, em vez de deixar a tela vazia
    return NextResponse.redirect(new URL(NAV[areasDoNivel(nivel)[0]].href, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
