import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'dash-session';
// DASHBOARD_SESSION_VALUE existe só no servidor — nunca vai pro bundle do browser
const SESSION_VALUE  = process.env.DASHBOARD_SESSION_VALUE ?? '';

function isAuthenticated(req: NextRequest): boolean {
  if (!SESSION_VALUE) return false;
  return req.cookies.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas públicas — sem sessão necessária
  if (pathname.startsWith('/api/webhooks/'))  return NextResponse.next(); // HMAC próprio
  if (pathname.startsWith('/api/auth/'))      return NextResponse.next(); // login/logout
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
