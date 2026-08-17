# CottonMap

Aplicativo de mapeamento reprodutivo do algodoeiro (avaliação planta a planta em campo), feito como PWA (funciona no navegador, instalável na tela inicial do celular, funciona offline depois do primeiro acesso).

Dados ficam salvos **somente no aparelho** (localStorage) nesta versão — login com Google e sincronização na nuvem ficam para uma próxima etapa.

## Como publicar no GitHub Pages (sem usar terminal)

1. Crie um repositório novo em https://github.com/new (pode ser público, sem README).
2. Abra o repositório recém-criado e clique em **"uploading an existing file"** (ou Add file → Upload files).
3. Arraste **todos os arquivos e pastas de dentro desta pasta** (index.html, styles.css, app.js, manifest.json, sw.js, icons/) — não arraste a pasta em si, arraste o conteúdo dela.
4. Clique em **Commit changes**.
5. Vá em **Settings → Pages**. Em "Build and deployment", escolha **Deploy from a branch**, branch **main**, pasta **/ (root)**, e clique em **Save**.
6. Espere ~1 minuto e recarregue a página — vai aparecer o link do site (algo como `https://SEUUSUARIO.github.io/NOMEDOREPO/`).

## Como instalar no celular

1. Abra o link do site no navegador do celular (Chrome no Android, Safari no iPhone).
2. Android (Chrome): toque no menu ⋮ → **"Adicionar à tela inicial"** (ou aparece um banner de instalar automaticamente).
3. iPhone (Safari): toque no ícone de compartilhar (□↑) → **"Adicionar à Tela de Início"**.
4. O ícone do CottonMap aparece na tela inicial como um app normal, abre em tela cheia e funciona sem internet depois do primeiro acesso.

## Estrutura

- `index.html` / `styles.css` / `app.js` — o app em si (sem frameworks, sem build).
- `manifest.json` + `icons/` — deixam o app instalável.
- `sw.js` — service worker, guarda o app (e a biblioteca de exportação) em cache pra funcionar offline no campo depois do primeiro acesso online.
- A exportação `.xlsx` usa a biblioteca SheetJS carregada de um CDN (unpkg) — fica cacheada localmente após o primeiro uso, então também funciona offline depois disso.
- `tools/gen_icons.py` — script que gerou os ícones (não é necessário publicar, mas não atrapalha).
