# Vante Dashboard — Estrutura atual

Briefing de **formato e estrutura** para redesign. Descreve o que cada tela contém,
como se organiza e como se comporta. **Não descreve identidade visual** (paleta,
tipografia, ilustração) — isso é justamente o que vai ser refeito.

Onde a cor é citada, é porque ela carrega **significado** (ex.: ROAS bom/ruim), não
porque a paleta atual deva ser preservada.

---

## 1. O que é o produto

Painel interno de uma pessoa só (não é multiusuário) para planejar e medir **disparos
de WhatsApp em massa** para bases de clientes de e-commerce.

O ciclo de trabalho é:

1. **Planejar** o disparo no calendário (data, campanha, base, alcance)
2. **Escrever** a copy e definir o cupom
3. **Executar** o disparo por fora (plataforma Martz/Nextags)
4. **Lançar os resultados** de volta no painel (custo, faturamento, pedidos)
5. **Decidir** o que fazer com cada base a partir do desempenho

O painel não dispara nada — ele planeja e mede.

### Conceitos que a interface manipula

| Conceito | O que é |
|---|---|
| **Marca** | Empresa cujos dados estão sendo vistos. Hoje 1 ativa (DrySkin) + 2 arquivadas |
| **Mês/Ano** | Recorte temporal global. Tudo no painel obedece a esse filtro |
| **Disparo** | Um envio: data, nome da campanha, tipo, base-alvo, tamanho, e os resultados |
| **Base** | Segmento de contatos (ex.: "Carrinho Abandonado", "Popup"). Agregada a partir dos disparos |
| **Conteúdo** | A copy do disparo: 3 mensagens + 1 mensagem VIP + links UTM + cupom |
| **Grupo VIP** | Canal separado de WhatsApp. Pedidos vindos dele são rastreados por UTM |

### Estágios de um disparo (importante para o redesign)

Um disparo sempre está em **um de três estados**, e isso já é sinalizado no calendário:

1. **A definir** — sem copy nem cupom. É só um espaço reservado na agenda
2. **Pronto** — copy escrita e cupom definido. Pronto para ser executado
3. **Executado** — já tem faturamento ou envios lançados

Além disso, disparos de **fim de mês** têm peso próprio (são os maiores do mês) e hoje
recebem destaque separado quando ainda estão em "a definir".

---

## 2. Arquitetura de navegação

### Casca (envolve todas as telas exceto o login)

```
DESKTOP                              MOBILE
┌──────────┬────────────────────┐    ┌────────────────────┐
│ SIDEBAR  │ HEADER             │    │ HEADER             │
│ 220px    ├────────────────────┤    ├────────────────────┤
│          │                    │    │                    │
│ seletor  │                    │    │                    │
│ de marca │  CONTEÚDO          │    │  CONTEÚDO          │
│          │  DA PÁGINA         │    │  DA PÁGINA         │
│ ── nav ──│                    │    │                    │
│ Central  │                    │    │                    │
│ Calendár.│                    │    ├────────────────────┤
│ Disparos │                    │    │ BOTTOM NAV (5 itens│
│ Bases    │                    │    │ 60px de altura)    │
│ Grupo VIP│                    │    └────────────────────┘
└──────────┴────────────────────┘
```

**Sidebar (só desktop, 220px fixos)**
- Topo: seletor de marca (logo + nome + seta). Abre lista com as marcas; arquivadas
  levam um selo "arquivo"; a ativa tem um marcador. Se o modo arquivo estiver ligado,
  ganha um item final "Sair do arquivo"
- Divisor
- Navegação: **Central · Calendário · Disparos · Bases · Grupo VIP** (ícone + rótulo,
  item ativo com marcador lateral)

**Header (todas as telas, ~64px)** — três terços:
- **Esquerda:** seletor de marca — **só no mobile** (no desktop está na sidebar).
  No desktop esse terço fica vazio
- **Centro:** logo da marca ativa
- **Direita:** `select` de Mês · `select` de Ano (2026–2027) · botão Sair

**Bottom nav (só mobile, 60px)** — os mesmos 5 destinos, ícone + rótulo curto.

> ⚠️ **Problema a resolver:** o Header recebe um `title` (ex.: "Disparos") mas **nunca
> o renderiza**. Nenhuma tela tem um H1 visível — o usuário se localiza só pelo item
> ativo na navegação. O redesign deveria dar título às páginas.

> ⚠️ **Problema a resolver:** o seletor de marca existe em dois lugares diferentes
> conforme o breakpoint, com layouts distintos. Vale unificar o padrão.

---

## 3. Telas

### 3.1 Login

Tela isolada, sem casca. Coluna única centralizada vertical e horizontalmente.

```
        [ WORDMARK ]
        ÁREA RESTRITA

    ┌────────────────────┐
    │ Senha de acesso    │   ← input password, autofoco
    └────────────────────┘
      Senha incorreta.       ← só em erro
    ┌────────────────────┐
    │      Entrar        │   ← botão, desabilita vazio/carregando
    └────────────────────┘
```

- Uma senha só, sem usuário. Não há "esqueci a senha", cadastro ou recuperação
- Estados do botão: normal · desabilitado (campo vazio) · "Entrando…" (carregando)
- Erros possíveis: "Senha incorreta." e "Erro de conexão. Tente novamente."
- **Vai mudar em breve:** a próxima feature é senha com **níveis de acesso**
  (senhas diferentes liberam partes diferentes do painel). O redesign deve prever
  que o login pode gerar sessões com permissões distintas

---

### 3.2 Central (home, rota `/`)

Visão executiva do mês. De cima para baixo:

**a) Faixa de 6 KPIs** — grade 2 col (mobile) / 3 (tablet) / 6 (desktop)

| KPI | Valor | Sub-informação |
|---|---|---|
| Investimento | Moeda BRL | "BRL acumulado" |
| Faturamento | Moeda BRL | "Status Pago" |
| ROAS Geral | `0.0x` | "Meta: 7x" |
| Meta % | `00.0%` | "de R$ 25.000" + **barra de progresso** |
| Disparos | Inteiro | "no mês" |
| Melhor Disparo | `0.0x` | nome da campanha |

Anatomia do cartão de KPI: ponto indicador + rótulo pequeno em caixa alta
monoespaçada · número grande · sub-linha pequena · (opcional) barra de progresso.
Sem dado, o valor vira o texto **"A preencher"**.

**b) Gráfico combinado — largura total, altura 280px**
Título: "Investimento × Faturamento por Disparo".
Duas séries de **barras** (investimento, faturamento) no eixo Y esquerdo em R$ +
uma **linha** de ROAS no eixo Y direito em `x`. Eixo X = data do disparo (`dd/MM`).
Tooltip mostra data + nome da campanha. Tem legenda.

**c) Bloco inferior — grade 2/3 + 1/3**

Esquerda (2/3): tabela **"Disparos do Mês"** — 5 colunas:
`Data · Campanha · Invest. R$ (dir) · Fat. R$ (dir) · ROAS (dir, pílula)`

Direita (1/3), empilhado:
- Dois KPIs lado a lado: **Pedidos** ("via disparos") e **Leads** ("bases do mês")
- Bloco **"Top 3 Bases"** — gráfico de 3 grupos de barras (investimento,
  faturamento, ROAS) com dois eixos Y. Estica para acompanhar a altura da tabela

**Estados vazios:**
- Gráfico: "Nenhum dado financeiro preenchido ainda." + "Vá em Disparos e clique em
  Preencher Resultado."
- Top 3 Bases: "Preencha resultados nos disparos para ver as bases"

**Semântica de cor do ROAS** (vale manter o conceito, não a paleta):
≥ 7x bom · ≥ 4x atenção · > 0 ruim · = 0 "A preencher"

---

### 3.3 Calendário

**a) Grade mensal** — 6 semanas fixas (42 células), começando no domingo.
Dias de outros meses aparecem esmaecidos. O dia de hoje tem destaque próprio.

Cada célula: número do dia + **chips** dos disparos daquele dia (pode ter mais de um).

**O chip é o elemento central da tela.** Formato: `[marcador] [texto]`

| Estado | Marcador | Texto | Traço |
|---|---|---|---|
| Executado | `✓` | o cupom (ou "sem cupom") | sólido |
| Pronto | `●` | o cupom | sólido |
| A definir | `◆` | "a definir" | tracejado |
| A definir (fim de mês) | `◆` | "a definir" | tracejado, peso maior |

Célula tem altura mínima de 62px (mobile) / 104px (desktop).

**b) Barra de controles** (no topo do bloco do calendário)
Esquerda: rótulo pequeno "Calendário de disparos" + nome do mês/ano em display.
Direita: `‹` · `hoje` · `›` · botão **"+ Novo"** (oculto no mobile).

**c) Legenda** — 4 itens, um por estado de chip.

**d) Card de detalhe do dia** (aparece ao clicar num chip)
Cabeçalho: data por extenso + nome da campanha + pílula de tipo + "fechar".
Corpo: grade de 8 métricas — `Base · Entregas · Investimento · Faturamento ·
ROAS · Pedidos · Taxa Leitura · Cliques`. Sem dado, cada uma mostra "A preencher".

**e) Tabela "Próximas Datas Sazonais"**
Colunas: `Data · Evento · Categoria (pílula) · Dias Faltando · Relevância ·
Estrutura Sugerida`. A coluna "Dias Faltando" destaca quando ≤ 15 dias.
A "Estrutura Sugerida" é derivada da relevância (ex.: alta → "Esquenta (-3d) >
Dia D > Ressaca (+1d)").

**f) Modal "Novo Disparo"** — sobreposto, ~512px.
Campos: `Data` (date) · `Tipo` (select de 7 opções) em duas colunas,
depois `Nome da Campanha` (texto) e `Base` (texto), ambos largura total.
Rodapé: "Criar Disparo" + "Cancelar" + nota explicativa.

**Tipos de campanha** (vocabulário fixo, usado em todo o painel):
Sazonal · Esquenta · Ressaca · Comportamental · LP Produto · Brinde · Fim de Mês

---

### 3.4 Disparos — **a tela mais densa e a que mais precisa de redesign**

**a) Barra de sincronização Yampi** (faixa fina, topo)
Ícone + texto de status à esquerda, botão "Sincronizar" à direita.
Estados: `loading` ("Buscando atribuições na Yampi…", botão girando) ·
`error` (mensagem crua da API) · `idle`/`done` (**texto vazio** — sem confirmação
nem "última sincronização às…").

> ⚠️ Não há feedback de sucesso nem timestamp. O usuário não sabe se sincronizou.

**b) Tabela principal — 14 colunas**

| # | Coluna | Alinh. | Conteúdo |
|---|---|---|---|
| 1 | — | esq | Botão **"Preencher"** / **"Editar"** + chevron |
| 2 | Data | esq | `dd/MM` |
| 3 | Campanha | esq | Nome |
| 4 | Tipo | esq | Pílula de categoria |
| 5 | Base | esq | Truncado ~140px |
| 6 | Tam. Base | **dir** | Inteiro pt-BR |
| 7 | Invest. R$ | **dir** | Moeda |
| 8 | Fat. R$ | **dir** | Moeda + **selo "YAMPI"** quando o valor vem da API |
| 9 | Pedidos | **dir** | Inteiro (mesmo fallback Yampi) |
| 10 | ROAS | **dir** | Pílula, ou "A preencher" |
| 11 | Leitura | esq ⚠️ | Percentual — *numérica mas alinhada à esquerda* |
| 12 | Cliques | **dir** | Inteiro |
| 13 | Observações | esq | Truncado ~200px |
| 14 | — | dir | Lixeira → vira confirmação inline "Confirmar" / "Não" |

**Linha de totais:** "TOTAIS" (mescla col. 1–5), somas de Tam. Base / Invest. / Fat. /
Pedidos, pílula de ROAS agregado, e "62% média" na coluna Leitura. Sem total de cliques.

**c) Painel de edição — inline, expandindo abaixo da linha**

Não é modal nem drawer: insere uma linha nova que atravessa as 14 colunas.
Só um aberto por vez. Fechar dispara re-sync automático após ~1,5s.

Cabeçalho: nome da campanha + data por extenso + base · lixeira (só disparos
customizados, **sem confirmação**) · X para fechar.

Abaixo, **duas abas**: `Resultado` (padrão) e `Conteúdo`.

#### Aba "Resultado"

1. **Banner Yampi** (condicional) — "Dados calculados pela Yampi", valores, botão "Aplicar"
2. **Banner multi-base** (condicional, 2+ bases) — avisa que os campos abaixo viram
   soma automática e ficam **somente leitura** (rótulos ganham prefixo "AUTO")
3. **Três seções de formulário:**

   | Seção | Campos (todos numéricos) |
   |---|---|
   | Dados da Plataforma (Martz / Nextags) | Total da Base · Enviados · Taxa de Entrega (0-1) · Taxa de Leitura (0-1) · Cliques |
   | Custo da API | Investimento USD · Cotação USD/BRL |
   | Resultado Shopify (apenas status Pago) | Faturamento R$ · Pedidos |

4. **Painel de métricas calculadas** (condicional) — 4 indicadores derivados:
   `Invest. BRL (auto)` · `Entregas (auto)` · `Ticket Médio (auto)` · `ROAS (auto)`
5. **Observações** — textarea 3 linhas, largura total
6. **Ações:** "Salvar Resultado" + "Cancelar"
7. *(divisor)* **"Detalhamento por Base"** — com toggle **"Base Única"** à direita:
   - **Ligado:** um único campo "Nome da Base" — tudo do formulário acima vai para ela
   - **Desligado:** lista de **cards de base** + linha de adicionar
     ("+ Adicionar Base", desabilitado com campo vazio)

**Card de base** (repete a mesma estrutura do formulário geral, em escala menor):
cabeçalho com nome editável inline + pílula de ROAS + faturamento + X;
corpo com as mesmas 3 sub-seções, painel de métricas e um campo "Observações"
(aqui **input de 1 linha**, não textarea).

#### Aba "Conteúdo"

1. **Mensagens do Disparo** — `Mensagem 1`, `2`, `3`: textarea de altura automática,
   cada uma com botão **Copiar** no cabeçalho (feedback "Copiado" por ~1,8s)
2. **Caixa destacada "👑 Mensagem — Grupo VIP"** — `Mensagem 4 — Convite VIP`
3. **UTM / Links (N)** — lista de cards, cada um com rótulo + Copiar + X (só se houver
   mais de um) e um campo de URL monoespaçado. Botão "+ UTM" no cabeçalho da seção
4. **Cupom** — campo de texto + botão Copiar, em linha

> Esta aba **não tem botão de salvar** — grava a cada tecla.

> ⚠️ **Inconsistências a resolver no redesign:**
> - Remover disparo existe em 2 lugares, com comportamentos diferentes (um pede
>   confirmação, o outro não)
> - Rótulos do formulário geral e dos cards de base usam tipografias diferentes
> - "(auto)" aparece no painel geral mas não no da base
> - **Não existe estado vazio na tabela** — sem disparos, o usuário vê só cabeçalho e totais

---

### 3.5 Bases

Painel de decisão sobre cada segmento. As bases são **derivadas** dos disparos —
não há cadastro manual aqui.

**a) Faixa de pílulas de status** — 5 pílulas com contador:
`Reenviar · Monitorar · Testar Novo Recorte · Descartar · Pendente`
À direita: botão-toggle **"Filtrar por Período"**.

**b) Seletor de período** (quando ligado) — `De` / `Até` (dates) + linha de resumo
("Mostrando resultado de X a Y em cada card").

**c) Grade de cards** — 1 col (mobile) / 2 (tablet) / 3 (desktop)

Anatomia do card:
```
┌──────────────────────────────────┐
│ Nome da Base        [ pílula ]   │
├──────────────────────────────────┤
│ Disparos │ Faturamento │  ROAS   │  ← 3 células
├──────────────────────────────────┤
│ NO PERÍODO (só com filtro ativo) │  ← mesma tripla, menor
├──────────────────────────────────┤
│ [ select de decisão            ▾]│
├──────────────────────────────────┤
│ Notas e observações (ao expandir)│  ← textarea, abre ao clicar no card
└──────────────────────────────────┘
```

**Estado vazio:** "Nenhuma base encontrada." + "Vá em Disparos, abra um disparo e
preencha os dados — a base aparece aqui automaticamente."

---

### 3.6 Grupo VIP

Espelha os pedidos que vieram do grupo VIP de WhatsApp (filtrados por UTM
`grupo_vip` / `whatsapp`). É a tela mais "relatório" do painel.

**a) Barra superior da página**
Esquerda: pílula com coroa `Grupo VIP · agosto 2026` + indicador de frescor
("Atualizado às HH:mm"). Direita: botão **"Sincronizar VIP"**.

**b) 4 KPIs** — 2 col (mobile) / 4 (desktop). Anatomia: rótulo + **ícone no canto
superior direito** + número + sub-linha.

| KPI | Sub-informação |
|---|---|
| Faturamento VIP | "status pago via UTM VIP" |
| Pedidos | "média R$ X / pedido" |
| Ticket Médio | "faturamento ÷ pedidos" |
| Carrinhos Abnd. | "UTM grupo_vip capturados" |

> ⚠️ KPIs 2 e 3 são redundantes (a sub-linha de "Pedidos" repete o valor de "Ticket
> Médio"); KPIs 1 e 3 usam o mesmo ícone; o rótulo 4 está abreviado por falta de espaço.

**c) Gráfico "Pedidos por Horário"** — barras verticais, 200px, 24 categorias fixas
(00h–23h, rótulos alternados). Título ganha sufixo dinâmico "· Pico às 20h".
A barra de pico é destacada.

**d) Dois rankings lado a lado** (empilham antes do desktop) — são listas com barra
de proporção, não gráficos de biblioteca:

- **Faturamento por Estado** — top 8. Linha: `01` · UF · barra · valor · "12p"
- **Produtos Mais Vendidos** — top 12. Duas linhas por item (posição + nome +
  quantidade + faturamento; barra abaixo). Título dinâmico com cobertura em %.
  Rodapé "+ N produtos com menor faturamento"

**e) Tabela "Todos os Pedidos VIP · N pedidos"** — 6 colunas, largura mínima 720px:

| Coluna | Conteúdo |
|---|---|
| (ícone) | Bandeira do pagamento (Visa, Master, Elo, Amex, Hiper, Pix, Boleto) |
| Nº | `#12345` monoespaçado |
| Cliente | Nome + UF; abaixo, etiqueta com a UTM |
| Data | `dd/MM/aaaa HH:mm`; abaixo, tempo relativo ("há 12 min") |
| Total | Moeda; abaixo, etiqueta de cupom quando houver |
| Status | Pílula (12 rótulos possíveis, de "Pago" a "Cancelado") |

Ordenação fixa por data desc. **Sem busca e sem filtros** além do mês do Header.
Linha inteira clicável → abre o drawer.

**Paginação** (rodapé, 3 zonas): "N por página" (menu para cima: 10/20/30/50) ·
navegação numerada com reticências · contador "11–20 de 143".

**f) Bloco "Quebra · Faturado vs Líquido"** (só se houver carrinhos) — 4 mini-cartões:
`Pedidos Pagos · Carrinhos Abandonados · Taxa de Conversão · Valor em Risco`.

**g) Drawer de detalhe do pedido** — desliza da direita, 600px (desktop) / 95% (mobile).
Fecha por X, clique no overlay ou Esc. Cabeçalho fixo ao rolar.

Seções empilhadas:
1. **Cartão tripartido `Cliente · Pagamento · Entrega`** — 3 colunas fixas.
   A coluna Cliente tem um botão **"revelar"/"ocultar"** que mascara dados pessoais
   (LGPD): e-mail, telefone e CPF vêm mascarados por padrão
2. **Valor Total** — linhas rótulo/valor: Produtos · Desconto · Frete · Saldo VIP ·
   **Total** (destacado) · Cashback
3. **Produtos** — nome + SKU à esquerda, `2x R$ 149,90` + subtotal à direita
4. **Rastreamento** — Transportadora · Código ("Não cadastrado" quando vazio) · Link
5. **Histórico do Cliente** — outros pedidos VIP do mesmo cliente **no mês carregado**

> ⚠️ O cartão tripartido mantém **3 colunas fixas em qualquer largura** — fica muito
> apertado no celular. É o segundo ponto crítico de responsividade do painel.

---

### 3.7 Tela de marca arquivada

Substitui o conteúdo (mantém casca e header) quando a marca selecionada está arquivada.
Bloco centralizado, ~420px: ícone em círculo · título "Painel em reforma" ·
parágrafo explicativo · botão "Ir para [marca ativa]".

Existe também um **modo arquivo** destravado por palavra secreta digitada em qualquer
tela, que faz as marcas arquivadas voltarem ao seletor. Ao alternar, um **toast**
aparece no canto inferior direito (acima do bottom nav no mobile) por 3,5s.

---

## 4. Padrões recorrentes

Elementos que se repetem e devem ganhar tratamento único no design system:

| Padrão | Onde aparece |
|---|---|
| **Cartão de KPI** | Central (6), VIP (4 + 4 mini), painéis de métricas calculadas |
| **Rótulo de seção** | Todo bloco: texto pequeno, caixa alta, monoespaçado, muito espaçado |
| **Pílula de status** | Tipo de campanha (7), decisão de base (5), status de pedido (12), ROAS |
| **Pílula de ROAS** | Central, Disparos, Bases, cards de base — 4 faixas semânticas |
| **Placeholder "A preencher"** | Todo valor numérico ainda não lançado |
| **Travessão "—"** | Célula de tabela sem valor |
| **Botão Copiar** | 4 mensagens + N UTMs + cupom. Feedback "Copiado" por ~1,8s |
| **Chip de calendário** | 4 variantes de estado |
| **Confirmação inline** | Remover disparo ("Confirmar" / "Não" no lugar do ícone) |

### Estados transversais

- **Vazio:** frase principal + linha secundária dizendo **onde ir para resolver**
  (ex.: "Vá em Disparos e clique em Preencher Resultado"). Padrão bom, vale manter
- **Carregando:** só o VIP tem skeleton (espelha KPIs + gráfico + 2 rankings).
  As outras telas não têm estado de carregamento
- **Erro:** só o VIP tem banner de erro. Ele **não substitui** os dados — aparece acima
  e os dados antigos continuam visíveis

---

## 5. Responsividade — o que está quebrado hoje

O ponto mais fraco do painel. Vale tratar como requisito central do redesign.

| Problema | Onde | Gravidade |
|---|---|---|
| Tabela de 14 colunas só ganha scroll horizontal no mobile | Disparos | **Crítico** |
| O painel de edição vive dentro da tabela → herda a largura e também rola na horizontal | Disparos | **Crítico** |
| Cartão `Cliente/Pagamento/Entrega` mantém 3 colunas fixas em qualquer tela | VIP (drawer) | **Alto** |
| Tabela de pedidos com largura mínima de 720px | VIP | Alto |
| Botão "+ Novo" some no mobile, sem alternativa | Calendário | Médio |
| Seletor de marca em lugares diferentes por breakpoint | Sidebar / Header | Médio |
| Nenhuma tela tem título visível | Todas | Médio |

Breakpoints em uso hoje: `sm` 640 · `md` 768 (troca sidebar ↔ bottom nav) ·
`lg` 1024 · `xl` 1280.

---

## 6. Inventário de vocabulário

Para manter consistência de nomenclatura no redesign.

**Navegação:** Central · Calendário · Disparos · Bases · Grupo VIP

**Tipos de campanha:** Sazonal · Esquenta · Ressaca · Comportamental · LP Produto ·
Brinde · Fim de Mês

**Decisões de base:** Reenviar · Monitorar · Testar Novo Recorte · Descartar · Pendente

**Status de pedido:** Pago · Pagto. aprovado · Aprovado · Em produção · Em separação ·
Faturado · Pronto p/ envio · Saiu p/ entrega · Enviado · Entregue · Cancelado

**Estágios do disparo:** a definir · pronto · executado

**Métricas:** Investimento (USD e BRL) · Cotação USD/BRL · Faturamento · Pedidos ·
ROAS · Ticket Médio · Total da Base · Enviados · Entregas · Taxa de Entrega ·
Taxa de Leitura · Cliques · Meta % · Leads

**Formatos:** moeda `R$ 18.400` (sem centavos em agregados, com centavos em pedidos
individuais) · ROAS `5.2x` · taxas exibidas em % mas **digitadas em decimal 0–1** ·
datas `dd/MM` em tabelas e por extenso em cabeçalhos · números com separador pt-BR

---

## 7. O que vem depois (contexto para o design)

A próxima funcionalidade planejada é **níveis de acesso por senha**: senhas diferentes
liberam recortes diferentes do painel. Isso implica que o design precisa acomodar:

- Itens de navegação **ausentes** (não apenas desabilitados) conforme o nível
- Possivelmente uma indicação de qual nível está ativo na sessão
- Uma tela ou estado para "você não tem acesso a esta área"
