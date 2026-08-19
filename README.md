# Vante Dashboard

Painel de disparos e Grupo VIP. Marca em operação: **DrySkin** (Nouê e New Hair estão
arquivadas).

## Design

A interface segue o **Painel Vante**, desenhado no Claude Design (projeto *Redesign do site
Dryskin*). Os tokens vivem em dois lugares que precisam andar juntos:

- `lib/theme.ts` — cores, tipografia e helpers de pílula, para os estilos inline
- `app/globals.css` — as mesmas cores como variáveis CSS, mais o reset e as animações

Fontes: **Archivo** (títulos e números) e **Inter** (corpo), com monoespaçada do sistema nos
rótulos pequenos. Os ícones da navegação são glifos (`◧ ▦ ➤ ◍ ♛`), não uma biblioteca —
o que também elimina a dependência do `lucide-react`, que dava problema com o OneDrive.

O cabeçalho de cada página é montado uma vez em `components/Shell.tsx` e o título vem da
rota, via `lib/nav.ts` — nenhuma página fica sem título.

## Níveis de acesso

Cada senha abre um recorte diferente do painel. O mapa está em `lib/nav.ts`:

| Nível | Env var | Áreas |
|---|---|---|
| `total` | `DASHBOARD_PASSWORD` | Central · Calendário · Disparos · Bases · Grupo VIP |
| `financeiro` | `DASHBOARD_PASSWORD_FINANCEIRO` | Central · Disparos · Bases · Grupo VIP |
| `conteudo` | `DASHBOARD_PASSWORD_CONTEUDO` | Calendário · Disparos |

Só a primeira é obrigatória — sem as outras duas, o dashboard funciona com uma senha só,
como antes.

**Como a barreira funciona.** O login grava dois cookies:

- `dash-session` — httpOnly e **assinado** (`<nível>.<sha256 do segredo + nível>`, ver
  `lib/session.ts`). É o que o `proxy.ts` valida. Trocar o nível aqui invalida a assinatura
  e derruba a sessão.
- `dash-nivel` — legível pelo JS, usado só para a interface montar a navegação. Adulterar
  este cookie **não** dá acesso: quem decide é o proxy.

Rotas de API que servem dados de uma área precisam ser mapeadas em `API_AREA`, dentro de
`lib/nav.ts` — senão um nível sem acesso à tela ainda consegue ler os dados direto.

## Marcas arquivadas (modo arquivo)

A **Nouê Cosméticos** está marcada como `archived: true` em `lib/brands.ts`. Ela some do
seletor de marcas e qualquer página dela cai numa tela de manutenção — mas **nenhum dado é
apagado**: a linha do Supabase (`id: 1`), o `localStorage` (`noue-dash-v1`) e as env vars
`YAMPI_*` continuam intactos.

Para acessar uma marca arquivada, destrave o modo arquivo:

- **5 cliques no logo central do header** em menos de 3 segundos, ou
- abra qualquer página com `?arquivo=1` na URL.

Para travar de novo: **Sair do arquivo**, no rodapé do seletor de marcas (`?arquivo=0`
também funciona). Detalhes em `lib/archive-mode.ts`.

> Isso é ocultação de interface, não controle de acesso. Quem já passou pelo login consegue
> chegar aos dados da marca arquivada pelo `localStorage` ou pelas rotas de API. A senha do
> dashboard (`DASHBOARD_PASSWORD`) continua sendo a única barreira real.

## Grupo VIP por marca

Cada marca tem um `vip` em `lib/brands.ts`:

- `'live'` — credenciais configuradas e painel liberado (hoje: só Nouê).
- `'standby'` — painel pronto, atrás de uma tela de aviso com botão de pré-visualização
  (hoje: DrySkin e New Hair).

O painel busca `/api/yampi?brand=<id>`, que resolve as credenciais pelo `yampiEnvPrefix` da
marca (`YAMPI_*` para a Nouê, `DRYSKIN_YAMPI_*`, `NEWHAIR_YAMPI_*`). Só reconhece pedidos com
a UTM `grupo_vip` / `whatsapp`. Para promover uma marca a `'live'`, confirme que os pedidos
dela chegam com essa UTM e troque o campo.

## ⚠️ node_modules no OneDrive

Este repositório vive dentro do OneDrive e o `node_modules` está com a maioria dos arquivos
como *online-only*. Com o OneDrive parado, ler esses arquivos falha com
`os error 362` / `UNKNOWN: unknown error, read` — o que quebra `next dev` e `next build`
em arquivos que nunca foram usados antes (por exemplo, um ícone novo do `lucide-react`).

Se acontecer: inicie o OneDrive, ou reinstale as dependências localmente com `npm ci`.
O `lucide-react` não é mais importado por nenhuma tela (a navegação usa glifos), o que
remove a causa mais comum desse erro — por isso
alguns ícones neste projeto são SVG inline.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
