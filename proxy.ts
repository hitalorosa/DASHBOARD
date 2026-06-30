import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'dash-session';
// DASHBOARD_SESSION_VALUE existe só no servidor — nunca vai pro bundle do browser
const SESSION_VALUE  = process.env.DASHBOARD_SESSION_VALUE ?? '';

function isAuthenticated(req: NextRequest): boolean {
  if (!SESSION_VALUE) return false;
  return req.cookies.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

export function proxy(request: NextRequest) {
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

  if (!isAuthenticated(request)) {
    // Chamada de API → retorna 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ ok: false, error: 'Não autorizado' }, { status: 401 });
    }
    // Página → redireciona para /login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
