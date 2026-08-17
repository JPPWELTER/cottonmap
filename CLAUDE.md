# CottonMap — contexto do projeto

App de mapeamento reprodutivo do algodoeiro: avaliação planta a planta em campo (ensaios/tratamentos agronômicos), feito como PWA instalável no celular.

**App ao vivo:** https://jppwelter.github.io/cottonmap/ (GitHub Pages, branch `main`, deploy from `/root`)

## Stack atual (v1)

Vanilla JS puro — sem framework, sem build step, sem bundler. Arquivos principais:

- `index.html`, `styles.css`, `app.js` — a SPA inteira. `app.js` tem: modelo de dados, roteamento (`nav` global + `parentOf()` para "voltar" — é uma árvore estrita, não uma pilha), renderização (funções `screenXxx()` que retornam strings HTML), e um único listener de clique delegado por `data-action`.
- `manifest.json` + `sw.js` + `icons/` — deixam o app instalável e funcionando offline depois do primeiro acesso.
- Sem backend, sem login real. Dados ficam em `localStorage` (`cottonmap_db_v1`) — **só no aparelho**, não sincroniza entre dispositivos ainda.
- Exportação `.xlsx` via SheetJS carregado de CDN (`unpkg.com/xlsx@0.18.5`), pré-cacheado pelo service worker na instalação pra funcionar offline depois.

## Modelo de dados

Hierarquia: **Ensaio → Tratamento → Ponto (repetição no talhão) → Planta → Nó/ramo → Estruturas** (botão 🌱, flor 🌷, maçã verde 🍏, capulho ⚪, cavitação 🌀, podre 🟤, aborto 💀).

```
{ ensaios: [{ id, nome, fazenda, safra, tratamentos: [{ id, nome, pontos: [{ id, nome,
  plantas: [{ id, numero, altura, concluida, nos: [{ numero, estruturas: [emoji,...] }] }]
}]}]}]}
```

## Decisões já tomadas (não redecidir sem avisar o usuário)

- **Sem login/backend na v1**, por escolha explícita do usuário. Tela de login é só um "Começar".
- **Fontes sem CDN de propósito** (Google Fonts foi removido) — o app precisa funcionar em campo sem sinal; só a lib de exportação `.xlsx` depende de CDN (com fallback: se não carregou, avisa em vez de travar — ver `xlsxReady()` em `app.js`).
- **Publicação**: feita via upload manual pelo GitHub web UI (sem `gh` CLI, sem git local) porque o ambiente que criou este repo não tinha acesso de rede ao GitHub nem `git push` configurado — só controle de navegador Chrome via extensão. Isso não é mais uma restrição no Claude Code: aqui dá pra usar `git` normalmente.

## Próximos passos possíveis (v2), na ordem que fazem mais sentido

1. Login real + sincronização na nuvem via **Supabase** (conta já existe, foi usada em outra sessão) — troca o `localStorage` por Postgres + Auth, no lugar da ideia original de "sync com Google Drive" do mockup.
2. Conectar o repo GitHub ao **Vercel** pra deploy automático a cada commit (hoje é só GitHub Pages, sem CI).
3. Editar/excluir ensaios, tratamentos e pontos (hoje só dá pra criar).
4. Fotos anexadas por planta/ponto.

## Referência visual

Os protótipos originais (mockups estáticos, antes da app real) estão em `docs/`:
- `docs/cottonmap-prototipo-v2.html`
- `docs/cottonmap-prototipo-v4.html`

Abra num navegador pra ver o visual/fluxo que a v1 implementou.
