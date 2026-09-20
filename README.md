# MÉTODO CAPTA+ — site institucional

Site estático (GitHub Pages) do **Método Capta+** — método de direção em captação de recursos para organizações da sociedade civil, cooperativas e associações.

> Recriação do espelho do site institucional, **rebrandado**: **zero ocorrências da palavra "Fomentia"** (em nomes de arquivo e conteúdo) — apenas **Método Capta+**.

## Estrutura

```
index.html                      home
metodo-capta-plus/index.html    o método
estudos-acesso/index.html       acesso a estudos
estudos-redacao/index.html      redação de estudos
area-do-cliente/index.html      área restrita (vitrine · noindex)
cartao-allan/index.html         cartão institucional (noindex)
ola-mundo/index.html            post legado (noindex)
category/sem-categoria/         categoria legada (noindex)
assets/marca/                   ativos de marca (logo, ícones, camada visual)
wp-content/ wp-includes/        assets do tema e plugins
404.html · robots.txt · sitemap.xml · .nojekyll
```

## Identidade visual

- **Paleta:** navy `#062531` · teal `#0ABCB0` · teal-grafite `#067a72` · laranja `#d97b4d`
- **Tipografia:** Oswald (títulos) + fonte de sistema (corpo)
- **Símbolo:** "C+" — `assets/marca/mark-capta.svg`
- **Camada visual moderna:** `assets/marca/marca-capta.css` (carregada pelas 8 páginas)
- **Ativos:** `wordmark-claro.png` (fundo escuro) · `wordmark-escuro.png` (fundo claro) · `og-metodo-capta.png` · favicons

## Contato

- WhatsApp: [wa.me/5544999120638](https://wa.me/5544999120638)
- E-mail: drallanvieira@gmail.com

## Publicação (GitHub Pages)

```bash
git init
git add .
git commit -m "Site Método Capta+"
git branch -M main
git remote add origin https://github.com/drallan2026/metodo-capta-site.git
git push -u origin main
```

Depois: **Settings → Pages → Source: Deploy from a branch → main / (root)**

URL: `https://drallan2026.github.io/metodo-capta-site/`

### Domínio próprio (quando houver)

Criar o arquivo `CNAME` na raiz com o domínio (ex.: `metodocapta.com.br`) e apontar o DNS:

| Tipo | Nome | Valor |
|:--|:--|:--|
| A | @ | 185.199.108.153 · 185.199.109.153 · 185.199.110.153 · 185.199.111.153 |
| CNAME | www | drallan2026.github.io |

Depois: **Settings → Pages → Custom domain** → marcar *Enforce HTTPS*.

---

*Método Capta+ — captar é o meio; transformar é o propósito.*
