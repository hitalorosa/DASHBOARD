/**
 * Modo arquivo — acesso às marcas fora de operação (hoje: Nouê).
 *
 * Como alternar:
 *   1. Digitar a palavra secreta em qualquer página do dashboard (fora de um
 *      campo de texto) — alterna entre ligado e desligado, ou
 *   2. abrir qualquer página com ?arquivo=1 (liga) ou ?arquivo=0 (desliga).
 *
 * Também dá para desligar pelo "Sair do arquivo", no rodapé do seletor de marcas.
 *
 * ATENÇÃO — isto é ocultação de interface, não controle de acesso.
 * A palavra secreta vai no bundle do browser: quem abrir o DevTools acha.
 * Quem já passou pelo login também chega aos dados da marca arquivada pelo
 * localStorage ou pelas rotas de API. A senha do dashboard continua sendo a
 * única barreira real.
 */

export const ARCHIVE_STORAGE_KEY = 'dash-archive-mode';
export const ARCHIVE_QUERY_PARAM = 'arquivo';

/** Palavra que alterna o modo arquivo quando digitada fora de um campo de texto. */
export const SECRET_WORD = 'arquivo';

/** Buffer de digitação zera depois deste tempo sem teclas. */
export const TYPING_RESET_MS = 2000;

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

/** ?arquivo=1 liga, ?arquivo=0 desliga, ausente não mexe. */
export function archiveModeFromUrl(): boolean | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get(ARCHIVE_QUERY_PARAM);
  if (raw === null) return null;
  return raw === '1' || raw === 'true';
}

/**
 * Teclas que não devem alimentar o buffer: digitação em campos, atalhos com
 * modificador e teclas não-imprimíveis (Shift, Enter, setas...).
 */
export function shouldIgnoreKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  if (e.key.length !== 1) return true;

  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
