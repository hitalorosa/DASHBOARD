# Tela `/roleta` — o que pode e o que não pode mudar

Guia para quem for **redesenhar esta tela**. Hoje ela é um embed (iframe do painel
`roletadry.vercel.app`); o plano é que vire uma tela nativa, com a cara do dash.

---

## Pode mexer à vontade

| Arquivo | Observação |
|---|---|
| `app/roleta/page.tsx` | É só desta tela. Reescreva inteiro se quiser. |
| Componentes novos em `app/roleta/` | Se for só desta tela, deixe aqui, não em `components/`. |
| `next.config.ts` → linha `frame-src` | Só existe por causa do iframe. **Se o iframe sair, essa linha sai junto.** |

## Pode mexer com cuidado

**`lib/nav.ts`** — só a linha da área `roleta` (rótulo, `rotuloCurto`, `icone`, `eyebrow`).
O `eyebrow` é a linha pequena acima do título no header.
Não mexa na forma do `Area`/`AREAS_POR_NIVEL`: `proxy.ts` usa isso como barreira de acesso real,
então remover a área daqui derruba a rota, e tirar um nível tira o acesso de quem entra com aquela senha.

**`next.config.ts` → CSP** — só some coisa na lista, nunca afrouxe o `default-src`.

## Não mexa

- **`lib/theme.ts`** — tokens (`C`, `FONT`, `BTN_PRIMARY`, `BTN_GHOST`, `heading`, `metric`…) são
  compartilhados por todas as telas. **Importe daqui**; mudar um valor repinta o dash inteiro.
- **`components/Shell.tsx`, `Header.tsx`, `Sidebar.tsx`, `BottomNav.tsx`** — o `Shell` já envolve a
  página com header, navegação, `AccessGuard` e `ArchivedGuard`, e o `main` já tem padding.
  A página **não** deve desenhar título próprio nem outro cabeçalho.
- **`proxy.ts`, `lib/session.ts`, `app/api/auth/*`** — autenticação.
- **Qualquer outra página ou componente compartilhado.**

---

## Convenções da casa

- Estilo é `style={{}}` inline com tokens de `lib/theme.ts` — o projeto **não** usa classes utilitárias
  do Tailwind para cor/tipografia. Siga o padrão das telas vizinhas (`app/vip/page.tsx` é o melhor
  exemplo de tela com dados).
- Ícones são glifos de texto (`◎`, `♛`, `➤`), não biblioteca.
- Marca ativa vem de `useBrand()`. **A roleta só existe na DrySkin** — mantenha o aviso quando
  `brand.id !== 'dryskin'`.
- Rodar local: `.env.local` com `DASHBOARD_SESSION_VALUE` e `DASHBOARD_PASSWORD` (valores quaisquer),
  `npm install && npm run dev`.

---

## Para transformar em tela nativa: leia isto antes

Os dados são de **outro projeto** (`hitalorosa/RoletaRecovery`, arquivo único `api/roleta_recovery.py`),
e hoje ele **só devolve HTML** — não existe endpoint JSON e **não há cabeçalho CORS**.

Consequências práticas:

1. **`fetch` direto do browser para `roletadry.vercel.app` não funciona.** Falha por CORS, e também
   esbarra no `connect-src 'self' https://*.supabase.co` do CSP.
2. O caminho certo é **rota de API própria** (`app/api/roleta/route.ts`) que busca do lado do servidor e
   devolve JSON para a tela. Server-side não passa por CORS nem por CSP.
3. Se criar essa rota, **registre-a em `API_AREA` no `lib/nav.ts`** (`{ prefixo: '/api/roleta', area: 'roleta' }`).
   O que não está nessa lista fica legível por qualquer sessão válida, de qualquer nível.
4. Ela precisa de um JSON na ponta da roleta. Isso é mudança no **outro repo** — peça, não improvise
   parser de HTML.

Enquanto o JSON não existir, o iframe é a única forma que funciona.

### Cuidado que já custou depuração

O CSP do projeto é `default-src 'self'`. Um `<iframe>` de domínio externo renderiza **em branco, sem
nenhum erro na tela** — o bloqueio só aparece no console do browser. Se algo externo "não carrega e não
dá erro", olhe o console antes de procurar bug no layout.
