/**
 * Cookie de sessão assinado, com o nível de acesso embutido.
 *
 * Formato: `<nivel>.<assinatura>`, onde a assinatura é SHA-256 de
 * `<segredo>:<nivel>`. Trocar o nível no cookie invalida a assinatura, então o
 * proxy pode confiar no nível sem consultar nada.
 *
 * Usa Web Crypto (`crypto.subtle`) porque o proxy roda no Edge, onde o módulo
 * `crypto` do Node não existe. Node 18+ também expõe `crypto` global, então o
 * mesmo código serve às rotas de API.
 */

import { Nivel, isNivel } from './nav';

const COOKIE = 'dash-session';
const COOKIE_NIVEL = 'dash-nivel';

export { COOKIE as SESSION_COOKIE, COOKIE_NIVEL as NIVEL_COOKIE };

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Comparação de tempo constante — não vaza quanto do valor estava certo. */
function equalConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function assinarSessao(nivel: Nivel, segredo: string): Promise<string> {
  return `${nivel}.${await sha256Hex(`${segredo}:${nivel}`)}`;
}

/** Devolve o nível se o cookie for válido, senão null. */
export async function lerSessao(valor: string | undefined, segredo: string): Promise<Nivel | null> {
  if (!valor || !segredo) return null;

  const corte = valor.lastIndexOf('.');
  if (corte <= 0) return null;

  const nivel = valor.slice(0, corte);
  const assinatura = valor.slice(corte + 1);
  if (!isNivel(nivel)) return null;

  const esperada = await sha256Hex(`${segredo}:${nivel}`);
  return equalConstantTime(assinatura, esperada) ? nivel : null;
}
