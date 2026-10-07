# Cartão Virtual — Allan Márcio · CEO (Método Capta+)

Cartão de visita digital, autocontido, para publicação no GitHub Pages.

## URL de publicação
`https://metodocapta.github.io/cartao-allan/`

## Conteúdo
- `index.html` — o cartão (CSS/SVG inline; sem dependências além da fonte Inter via Google Fonts).
- `404.html` — página de erro.
- `assets/` — retrato (PNG/WebP), favicon, imagem de compartilhamento (OG) e `contato.vcf` (vCard do botão "Salvar contato").
- `.nojekyll` — evita o processamento Jekyll no GitHub Pages.

## Ativos (gerados por `SKILLS/SCRIPTS/cartao_build.py`)
- `retrato.png` / `retrato.webp` — recorte do retrato com fundo transparente.
- `og-cartao.jpg` — imagem 1200×630 (JPEG) para compartilhamento.
- `favicon.png` — símbolo "C+" (gradiente da marca).
- `contato.vcf` — vCard 3.0 (nome, cargo, telefone, e-mail, site e redes).

Regenerar:
```
python SKILLS/SCRIPTS/cartao_build.py             # tudo
python SKILLS/SCRIPTS/cartao_build.py --so-marca  # só a marca/favicon
```

## Publicar (GitHub Pages)
```
git init
git add .
git commit -m "Cartao virtual Allan Marcio"
git branch -M main
git remote add origin https://github.com/metodocapta/cartao-allan.git
git push -u origin main
```
Depois: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.

## Observação
Este diretório é a fonte dentro do repositório FOMENTIA. O repositório público
`cartao-allan` recebe uma cópia apenas deste conteúdo.
