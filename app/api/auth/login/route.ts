import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual }           from 'crypto';
import { Nivel }                     from '@/lib/nav';
import { NAV, areasDoNivel }         from '@/lib/nav';
import { assinarSessao, SESSION_COOKIE, NIVEL_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';

const SESSION_VALUE = process.env.DASHBOARD_SESSION_VALUE ?? '';

/**
 * Uma senha por nível de acesso. Só DASHBOARD_PASSWORD é obrigatória — sem as
 * outras duas, o painel funciona como antes, com uma senha única de acesso total.
 * Senha vazia nunca casa (o `if (!esperada)` abaixo descarta o nível).
 */
const SENHAS: { nivel: Nivel; senha: string }[] = [
  { nivel: 'total',      senha: process.env.DASHBOARD_PASSWORD             ?? '' },
  { nivel: 'financeiro', senha: process.env.DASHBOARD_PASSWORD_FINANCEIRO  ?? '' },
  { nivel: 'conteudo',   senha: process.env.DASHBOARD_PASSWORD_CONTEUDO    ?? '' },
];

function confere(digitada: string, esperada: string): boolean {
  if (!esperada) return false;
  const a = Buffer.from(digitada, 'utf8');
  const b = Buffer.from(esperada, 'utf8');
  // timingSafeEqual exige mesmo tamanho — o length check já rejeita antes
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!SESSION_VALUE || !SENHAS[0].senha) {
    return NextResponse.json({ ok: false, error: 'Dashboard não configurado' }, { status: 503 });
  }

  let body: { password?: string };
  try {
    body = await req.json() as { password?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const digitada = body.password ?? '';

  // Percorre todos os níveis mesmo após achar — não encurta o tempo de resposta
  let nivel: Nivel | null = null;
  for (const s of SENHAS) {
    if (confere(digitada, s.senha) && nivel === null) nivel = s.nivel;
  }

  if (!nivel) {
    // Mesma resposta para senha errada de qualquer nível — não revela quais existem
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const inicio = NAV[areasDoNivel(nivel)[0]].href;
  const res = NextResponse.json({ ok: true, nivel, inicio });

  res.cookies.set(SESSION_COOKIE, await assinarSessao(nivel, SESSION_VALUE), {
    httpOnly: true,                                   // JS do browser NÃO consegue ler
    secure:   process.env.NODE_ENV === 'production',  // HTTPS em prod; relaxa em http://localhost
    sameSite: 'strict',
    maxAge:   60 * 60 * 24 * 30, // 30 dias
    path:     '/',
  });

  // Espelho legível só para a interface montar a navegação.
  // Adulterar este cookie não dá acesso: quem decide é o proxy, pela assinatura acima.
  res.cookies.set(NIVEL_COOKIE, nivel, {
    httpOnly: false,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   60 * 60 * 24 * 30,
    path:     '/',
  });

  return res;
}
