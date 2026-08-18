/**
 * Modo arquivo — acesso às marcas fora de operação (hoje: Nouê).
 *
 * Como destravar:
 *   1. 5 cliques no logo central do header em menos de 3 segundos, ou
 *   2. abrir qualquer página com ?arquivo=1 na URL.
 *
 * Como travar de novo: botão "Sair do arquivo" no seletor de marcas.
 *
 * ATENÇÃO — isto é ocultação de interface, não controle de acesso.
 * Quem já passou pelo login consegue chegar aos dados da marca arquivada
 * pelo localStorage ou pelas rotas de API. A senha do dashboard continua
 * sendo a única barreira real.
 */

export const ARCHIVE_STORAGE_KEY = 'dash-archive-mode';
export const ARCHIVE_QUERY_PARAM = 'arquivo';

/** Cliques no logo necessários para destravar, e a janela de tempo para dá-los. */
export const UNLOCK_CLICKS = 5;
export const UNLOCK_WINDOW_MS = 3000;

export function readArchiveMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(ARCHIVE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeArchiveMode(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (on) localStorage.setItem(ARCHIVE_STORAGE_KEY, '1');
    else localStorage.removeItem(ARCHIVE_STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** ?arquivo=1 destrava, ?arquivo=0 trava, ausente não mexe. */
export function archiveModeFromUrl(): boolean | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get(ARCHIVE_QUERY_PARAM);
  if (raw === null) return null;
  return raw === '1' || raw === 'true';
}
