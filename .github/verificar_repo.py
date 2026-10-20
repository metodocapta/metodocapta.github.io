#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VERIFICADOR DO REPOSITORIO PUBLICADO — invariantes que nao podem sumir
=====================================================================

Por que existe: o repositorio publicado (metodocapta.github.io) recebe push de
tres lugares — o build local, as Actions do Radar/Destaques e commit manual.
Um deles pode levar para o ar uma copia regredida (ja aconteceu: o bloco
Destaques e o schema GEO sumiram em 23/09/2026 sem ninguem notar).

Este arquivo roda DENTRO do repositorio publicado, a cada push, e FALHA o job se
alguma invariante sumir. Ele e self-contained (so a stdlib) porque o publicado
nao tem a pasta SKILLS/ do projeto.

Uso
---
  python3 verificar_repo.py                  # raiz = pasta atual (o publicado)
  python3 verificar_repo.py --raiz CAMINHO   # roda contra a fonte, na sua maquina

O portao do BUILD (SKILLS/SCRIPTS/site_verificar.py) e o superconjunto: confere
tambem o que depende da fonte e dos dados. Este aqui e o subconjunto PORTATIL,
que precisa valer em qualquer copia do site.

Saida: linha "::error::..." por falha (o GitHub marca no diff do commit).
Exit: 0 = ok, 1 = falhou.
"""

import argparse
import hashlib
import json
import os
import re
import sys

# arquivos/pastas que nao entram na varredura (arquivo morto e vendor)
IGNORAR = (".git", "_arquivo", "wp-content")

# unico host externo permitido: as miniaturas do slider de Destaques, que sao
# carregadas em runtime pelo JS a partir de assets/destaques.json.
EXTERNO_OK = ("substackcdn.com",)

EXTS_TEXTO = (".html", ".htm", ".css", ".js", ".json", ".xml", ".txt")
RX_CAIXA = re.compile("[\u2500-\u257f\u2310\u25c0-\u25ff]")
RX_DUPLO = re.compile("[\u00c3\u00c2][\u0080-\u00bf]")

falhas = []


def erro(msg):
    falhas.append(msg)
    print("::error::%s" % msg)


def ler(caminho):
    try:
        with open(caminho, "r", encoding="utf-8", errors="replace") as fh:
            return fh.read()
    except OSError:
        return None


def varrer(raiz, extensoes=None):
    """Devolve [(caminho_relativo, caminho_absoluto)] sem as pastas ignoradas."""
    saida = []
    for pasta, dirs, arqs in os.walk(raiz):
        dirs[:] = [d for d in dirs if d not in IGNORAR]
        for a in arqs:
            if extensoes and not a.lower().endswith(extensoes):
                continue
            caminho = os.path.join(pasta, a)
            rel = os.path.relpath(caminho, raiz).replace("\\", "/")
            saida.append((rel, caminho))
    return saida


def existe_pagina(raiz, url):
    """Resolve um caminho do site ("/radar/", "guias/x/index.html") em disco."""
    limpa = str(url).split("#")[0].split("?")[0].strip("/")
    alvo = os.path.join(raiz, *limpa.split("/")) if limpa else raiz
    return os.path.isfile(alvo) or os.path.isfile(os.path.join(alvo, "index.html"))


# ---------------------------------------------------------------------------
# 1) Home: blocos que nao podem sumir
# ---------------------------------------------------------------------------
def checar_home(raiz, home):
    if home is None:
        erro("index.html ausente no repositorio publicado")
        return
    for marca, nome in (
        ("fm-dest-section", "bloco Destaques (slider do Substack)"),
        ("fm-dest-track", "track do slider de Destaques"),
        ('"HowTo"', "schema HowTo"),
        ("FAQPage", "schema FAQPage"),
        ("BreadcrumbList", "schema BreadcrumbList"),
        ('name="description"', "meta description"),
    ):
        if marca not in home:
            erro("Home sem %s (%s)" % (nome, marca))
    if len(re.findall(r"<h1\b", home)) != 1:
        erro("Home deve ter exatamente 1 <h1> (tem %d)" % len(re.findall(r"<h1\b", home)))

    # D6 — rotulo do fluxo de 7 pilulas: ele acontece DENTRO das seis etapas.
    # "Fluxo gerado" sugeria que o fluxo "nasce" ali (contra a fonte canonica §2).
    if "Fluxo gerado" in home:
        erro("Home: rotulo 'Fluxo gerado' no fluxo do mecanismo (o fluxo acontece "
             "DENTRO das seis etapas)")
    if "O que acontece" not in home or "dentro das seis etapas" not in home:
        erro("Home: a nota do fluxo do mecanismo sumiu (o fluxo de 7 pilulas precisa "
             "dizer que acontece dentro das seis etapas)")

    # ORDEM DAS SECOES — espelho de ORDEM_SECOES (site_v23_home.py).
    # A ordem e' narrativa: dor -> diferenca -> mecanismo -> prova -> voce ->
    # objecao -> acao. Trocar duas secoes muda o argumento, nao so o layout.
    ORDEM_ESPERADA = [
        "fm-parceiros", "fm-problema", "fm-comparativo", "fm-capta",
        "fm-radar", "fm-destaques", "fm-evidencias", "fm-publico",
        "fm-riscos", "fm-faq", "fm-decisao-mapa", "fm-decisao",
    ]
    pos_sec = {i: home.find('id="%s"' % i) for i in ORDEM_ESPERADA}
    presentes = [i for i in ORDEM_ESPERADA if pos_sec[i] >= 0]
    no_dom = sorted(presentes, key=lambda i: pos_sec[i])
    if no_dom != presentes:
        erro("Home: secoes fora da ordem canonica. Esperado: %s - encontrado: %s"
             % (" > ".join(presentes), " > ".join(no_dom)))

    # FAQ: o schema tem de ser a MESMA lista que a tela (senao o AEO mente).
    m_faq = re.search(
        r'<script type="application/ld\+json">\{[^<]*"@type":"FAQPage"[^<]*</script>', home)
    schema_q = re.findall(r'"name":"([^"]+)"', m_faq.group(0)) if m_faq else []
    visivel_q = re.findall(
        r'<details class="fm-faq-item[^"]*"><summary>([^<]+)</summary>', home)
    if len(visivel_q) < 3:
        erro("Home: FAQ visivel com menos de 3 perguntas")
    if schema_q != visivel_q:
        erro("Home: schema FAQPage != FAQ visivel (%d no schema, %d na tela)"
             % (len(schema_q), len(visivel_q)))

    # CTA do cabecalho: rotulo curto (o hero diz a acao inteira)
    m = re.search(r'<a class="fm-header-cta"[^>]*>([\s\S]{0,90}?)(?:<svg|</a>)', home)
    if not m:
        erro("Home sem o CTA do cabecalho (fm-header-cta)")
    elif "Diagn\u00f3stico 72h" not in m.group(1):
        erro("Home: CTA do cabecalho fora do padrao curto ('Diagnostico 72h'): %r"
             % m.group(1).strip()[:50])

    # versionamento dos assets (?v=) — sem isso o navegador serve CSS velho
    for css in ("marca-capta.css", "movimento.css"):
        if not re.search(re.escape(css) + r"\?v=", home):
            erro("Home: %s sem ?v= (cache-busting)" % css)
    css_t = os.path.join(raiz, "assets", "marca", "framework-t.css")
    if not os.path.isfile(css_t):
        erro("assets/marca/framework-t.css ausente")
    else:
        with open(css_t, "rb") as fh:
            md5 = hashlib.md5(fh.read()).hexdigest()[:8]
        if ("framework-t.css?v=%s" % md5) not in home:
            erro("Home: framework-t.css sem ?v=%s (md5 do arquivo)" % md5)


# ---------------------------------------------------------------------------
# 2) Componente T (Capta+ T-Intelligence): regras de INTERFACE
# ---------------------------------------------------------------------------
def checar_componente_t(raiz, home):
    if home is None:
        return
    marcos = home.count("<!-- fm-t:inicio -->") + home.count("<!-- fm-t:fim -->")
    if marcos != 2:
        erro("Home: componente T ausente ou duplicado (marcos fm-t:inicio/fim = %d)" % marcos)
        return
    m = re.search(re.escape("<!-- fm-t:inicio -->") + r"([\s\S]*?)"
                  + re.escape("<!-- fm-t:fim -->"), home)
    bloco = m.group(1) if m else ""
    if not bloco.strip():
        erro("Home: marcos do componente T sem conteudo entre eles")
        return

    if "<script" in bloco.lower():
        erro("Home: componente T com <script> — a regra do componente e zero JS")
    ocultos = sorted(set(re.findall(r"\bM\d{1,2}\b", bloco)))
    if ocultos:
        erro("Home: codigo de modulo visivel na interface: %s" % ", ".join(ocultos[:6]))
    decorativa = re.findall(r">\s*0\d\s*<", bloco)
    if decorativa:
        erro("Home: numeracao decorativa no componente T: %s" % ", ".join(decorativa[:4]))
    if re.search(r"(?<![0-9A-Za-z\u00c0-\u00ff])IA(?![0-9A-Za-z\u00c0-\u00ff])", bloco) \
            or "Dados e IA" in bloco:
        erro("Home: componente T citando IA no texto de tela (o rotulo e 'Dados')")
    ancoras = re.findall(r"<a\b[^>]*>", bloco)
    if not ancoras or not all("href=" in a for a in ancoras):
        erro("Home: ancora sem href no componente T (clique que nao leva a lugar nenhum)")
    if 'href="#"' in bloco:
        erro('Home: ancora com href="#" no componente T (clique que nao leva a lugar nenhum)')

    # o dado (framework_t.json) e a fonte do componente
    p_json = os.path.join(raiz, "assets", "framework_t.json")
    try:
        with open(p_json, "r", encoding="utf-8-sig") as fh:
            dado = json.load(fh)
    except (OSError, ValueError) as exc:
        erro("assets/framework_t.json ausente ou invalido: %s" % exc)
        return

    comps = dado.get("eixo_horizontal", {}).get("competencias") or []
    camadas = dado.get("eixo_vertical", {}).get("camadas") or []
    modulos = dado.get("modulos") or {}
    if len(camadas) != 6:
        erro("framework_t.json: %d camada(s) no eixo vertical (esperado 6)" % len(camadas))
    if len(modulos) != 17:
        erro("framework_t.json: %d modulo(s) (esperado 17: M0..M16)" % len(modulos))
    # nenhum modulo fica sem conector; 'modulos' da competencia = uniao das camadas
    camadas_mods = {c.get("id"): set(c.get("modulos") or []) for c in camadas}
    cobertos = set()
    for c in comps:
        mods_c = set(c.get("modulos") or [])
        cobertos |= mods_c
        esperado_c = set()
        for cid in c.get("camadas") or []:
            esperado_c |= camadas_mods.get(cid, set())
        if mods_c != esperado_c:
            erro("framework_t.json: competencia '%s' com 'modulos' diferente da uniao das suas "
                 "camadas (esperado %s)" % (c.get("id"), ", ".join(sorted(esperado_c))))
    sem_conector = sorted(set(modulos) - cobertos, key=lambda x: int(x[1:]))
    if sem_conector:
        erro("framework_t.json: modulo(s) sem conector (nenhuma competencia os usa): %s"
             % ", ".join(sem_conector))
    if "Dados e IA" not in [c.get("nome", "") for c in comps]:
        erro("framework_t.json: a competencia canonica 'Dados e IA' sumiu")
    n_pagina = [c for c in comps if c.get("paginas")]
    if bloco.count('class="fm-t-linha"') != len(n_pagina):
        erro("Home: componente T com %d linha(s) na tela (esperado %d — uma por competencia "
             "com pagina real)" % (bloco.count('class="fm-t-linha"'), len(n_pagina)))
    for c in n_pagina:
        for pagina in c["paginas"]:
            if str(pagina).startswith("http"):
                continue
            if not existe_pagina(raiz, pagina):
                erro("framework_t.json: destino inexistente — %s aponta para %s"
                     % (c.get("rotulo") or c.get("nome"), pagina))
                continue
            # ancora: se o id sumir, o clique cai no topo da pagina sem avisar
            frag = str(pagina).split("#")[1].strip() if "#" in str(pagina) else ""
            if frag:
                limpa = str(pagina).split("#")[0].split("?")[0].strip("/")
                alvo = os.path.join(raiz, *limpa.split("/")) if limpa else raiz
                arquivo = alvo if os.path.isfile(alvo) else os.path.join(alvo, "index.html")
                if not re.search(r'id="%s"' % re.escape(frag), ler(arquivo) or ""):
                    erro("framework_t.json: ancora #%s ausente em %s (o card de %s cai no topo)"
                         % (frag, pagina, c.get("rotulo") or c.get("nome")))

    # o componente nao tem JS: nem referencia, nem arquivo
    if re.search(r"framework-t\.js", home):
        erro("Home: referencia a framework-t.js (o componente nao tem JS)")
    if os.path.exists(os.path.join(raiz, "assets", "marca", "framework-t.js")):
        erro("assets/marca/framework-t.js existe (o componente nao tem JS)")

    # painel do trilho (fm-engine): tambem e tela, tambem sem codigo de modulo
    i_eng = home.find('id="fm-engine"')
    if i_eng >= 0:
        i_ini = home.rfind("<div", 0, i_eng)
        i_fim = home.find("<script", i_eng)
        trecho_eng = home[i_ini:i_fim if i_fim > i_eng else i_eng + 4000]
        codigos_eng = sorted(set(re.findall(r"\bM\d{1,2}\b", trecho_eng)))
        if codigos_eng:
            erro("Home: codigo de modulo no painel do trilho (fm-engine): %s"
                 % ", ".join(codigos_eng[:6]))


# ---------------------------------------------------------------------------
# 3) Quem Somos + CSS do menu fixo + imagens leves
# ---------------------------------------------------------------------------
def checar_radar(raiz, home):
    """O KPI do Radar na Home tem de ser o do snapshot — nunca numero escrito a mao.

    Era o D2 do baseline: 4 numeros fixos no HTML enquanto o
    assets/radar_snapshot.json existia. O gerador passou a ler o JSON; esta
    invariante impede a volta do numero hard-coded (numero na tela sem lastro).
    """
    txt = ler(os.path.join(raiz, "assets", "radar_snapshot.json"))
    snap = None
    if txt:
        try:
            snap = json.loads(txt.lstrip("\ufeff"))
        except ValueError:
            erro("assets/radar_snapshot.json invalido (JSON quebrado)")
            return
    m = re.search(r"<section[^>]*fm-radar-section[\s\S]*?</section>", home or "")
    bloco = m.group(0) if m else ""
    if snap is None:
        if bloco:
            erro("Home: secao do Radar sem snapshot — numero na tela sem lastro")
        return
    if not bloco:
        erro("Home: secao do Radar ausente, mas existe snapshot com dado para mostrar")
        return

    k = snap.get("kpis") or {}
    esperados = [int(k.get("oportunidades") or 0), int(k.get("elegiveis") or 0),
                 int(k.get("estruturados") or 0), int(k.get("matches") or 0)]
    pares = re.findall(r"<b>(\d+)</b><span>([^<]+)</span>", bloco)
    na_tela = [int(p[0]) for p in pares[:4]]
    if na_tela != esperados:
        erro("Home: KPI do Radar fora do snapshot (tela %s | snapshot %s)"
             % (na_tela, esperados))

    areas_snap = [(int(a.get("total") or 0), str(a.get("rotulo") or ""))
                  for a in snap.get("areas") or []]
    areas_tela = [(int(p[0]), p[1]) for p in pares[4:]]
    if areas_snap and areas_tela != areas_snap:
        erro("Home: areas do Radar fora do snapshot (tela %s | snapshot %s)"
             % (len(areas_tela), len(areas_snap)))

    gerado = str(snap.get("gerado_em") or "")
    try:
        a_, m_, d_ = gerado.split("-")
        gerado_fmt = "%s/%s/%s" % (d_, m_, a_)
    except ValueError:
        gerado_fmt = ""
    if gerado_fmt and ("Atualizado em %s" % gerado_fmt) not in bloco:
        erro("Home: selo do Radar nao mostra a data do snapshot (%s)" % gerado_fmt)


def checar_quem_somos(raiz):
    p = os.path.join(raiz, "metodo-capta-plus", "index.html")
    txt = ler(p)
    if txt is None:
        erro("metodo-capta-plus/index.html ausente")
        return
    for marca, nome in (("fm-mvv-section", "secao Missao/Visao/Valores"),
                        ("fm-values-grid", "grade dos Valores Fundamentais"),
                        ("Miss\u00e3o, Vis\u00e3o e Valores", "titulo 'Missao, Visao e Valores'")):
        if marca not in txt:
            erro("Quem Somos sem %s (%s)" % (nome, marca))


def checar_css_menu(raiz):
    p = os.path.join(raiz, "wp-content", "plugins", "landing-page", "assets",
                     "css", "landing.css")
    css = ler(p)
    if css is None:
        erro("landing.css ausente (menu fixo depende dele)")
        return
    css_plano = re.sub(r"\s+", " ", css)
    if not re.search(r"html, *body *\{[^}]*overflow-x: *(clip|visible)", css_plano):
        erro("landing.css: html/body sem overflow-x clip/visible (hidden QUEBRA o menu fixo)")
    if not re.search(r"\.fm-site *\{[^}]*overflow: *visible", css_plano):
        erro("landing.css: .fm-site sem overflow: visible")


def checar_imagens(raiz):
    for nome in ("assets/marca/wordmark-claro.webp", "assets/marca/og-metodo-capta.jpg"):
        if not os.path.isfile(os.path.join(raiz, *nome.split("/"))):
            erro("falta %s" % nome)
    pesados = []
    for rel, caminho in varrer(raiz, (".html",)):
        txt = ler(caminho) or ""
        if "wordmark-claro.png" in txt or "og-metodo-capta.png" in txt:
            pesados.append(rel)
    if pesados:
        erro("paginas referenciando PNG pesado (wordmark/og): %s"
             % ", ".join(sorted(set(pesados))[:6]))


# ---------------------------------------------------------------------------
# 4) Nenhum asset externo (o site e self-hosted) + CTA final + cabecalho
# ---------------------------------------------------------------------------
def checar_assets_externos(raiz):
    problemas = []
    for rel, caminho in varrer(raiz):
        baixo = rel.lower()
        if baixo.endswith((".html", ".htm")):
            txt = ler(caminho) or ""
            for tag in re.finditer(r"<(script|link|img)\b[^>]*>", txt):
                corpo = tag.group(0)
                url = re.search(r'(?:src|href)\s*=\s*["\'](https?://[^"\']+)', corpo)
                if not url:
                    continue
                if tag.group(1) == "link":
                    if re.search(r'rel="(canonical|alternate|profile)"', corpo):
                        continue
                    if (re.search(r'rel="(preconnect|dns-prefetch)"', corpo)
                            and any(h in url.group(1) for h in EXTERNO_OK)):
                        continue
                problemas.append("%s: %s" % (rel, url.group(1)[:70]))
        elif baixo.endswith(".css"):
            txt = ler(caminho) or ""
            for m in re.finditer(r'@import\s+url\(\s*["\']?(https?://[^)"\']+)', txt):
                problemas.append("%s: @import %s" % (rel, m.group(1)[:60]))
            for m in re.finditer(r'url\(\s*["\']?(https?://[^)"\']+)', txt):
                problemas.append("%s: url(%s)" % (rel, m.group(1)[:60]))
    if problemas:
        erro("asset externo em %d ponto(s) — o site e self-hosted (so o substackcdn das "
             "miniaturas de Destaques e permitido): %s" % (len(problemas), " | ".join(problemas[:4])))


def checar_cta_e_cabecalho(raiz):
    sem_cta, cta_sem_link = [], []
    for rel, caminho in varrer(raiz, (".html",)):
        txt = ler(caminho) or ""
        if 'class="site-hd"' in txt and "hd-cta" not in txt:
            sem_cta.append(rel)
        for m in re.finditer(r'class="cta"', txt):
            bloco = txt[m.start():m.start() + 900]
            if not re.search(r'<a\b[^>]*href\s*=\s*["\']https?://', bloco):
                cta_sem_link.append(rel)
                break
    if sem_cta:
        erro("cabecalho das internas sem CTA (hd-cta) em %d pagina(s): %s"
             % (len(sem_cta), ", ".join(sorted(sem_cta)[:6])))
    if cta_sem_link:
        erro("bloco .cta sem link de acao em %d pagina(s): %s"
             % (len(cta_sem_link), ", ".join(sorted(cta_sem_link)[:6])))


# ---------------------------------------------------------------------------
# 5) Codificacao: UTF-8 valido e SEM mojibake (double-encoding)
# ---------------------------------------------------------------------------
def checar_camadas_decorativas(raiz):
    """Camada decorativa que cobre o pai NAO pode capturar clique.

    Uma camada absoluta com inset:0 e pintada por cima do conteudo estatico:
    sem pointer-events:none ela engole o clique dos links da secao (foi o que
    deixou os 8 itens de competencia do bloco 08 sem resposta ao clique).
    """
    css_projeto = (
        "assets/marca/marca-capta.css",
        "assets/marca/atmosfera.css",
        "assets/marca/movimento.css",
        "assets/marca/framework-t.css",
        "wp-content/plugins/landing-page/assets/css/landing.css",
    )
    problemas = []
    for rel in css_projeto:
        txt = ler(os.path.join(raiz, *rel.split("/")))
        if not txt:
            continue
        txt = re.sub(r"/\*[\s\S]*?\*/", "", txt)
        regras = [(m.group(1).strip(), m.group(2)) for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", txt)]
        bases = {sel.split(",")[0].split("::")[0].strip()
                 for sel, dec in regras if re.search(r"pointer-events:\s*none", dec)}
        for sel, dec in regras:
            if not re.search(r"position:\s*(absolute|fixed)", dec):
                continue
            cobre = bool(re.search(r"inset:\s*0(px)?\s*(;|\s*$)", dec)) or all(
                re.search(r"\b%s:\s*0(px)?\s*(;|$)" % lado, dec)
                for lado in ("top", "right", "bottom", "left"))
            if not cobre or re.search(r"pointer-events:\s*none", dec):
                continue
            base = sel.split(",")[0].split("::")[0].strip()
            if "::" in sel and base in bases:
                continue
            problemas.append("%s: %s" % (rel, sel.replace("\n", " ")[:44]))
    if problemas:
        erro("camada decorativa cobrindo o pai SEM pointer-events:none — ela engole o clique "
             "do que esta embaixo (%d): %s" % (len(problemas), " | ".join(problemas[:5])))


def checar_camadas_metodo(raiz):
    """Convergencia 4 -> 6 camadas na pagina do metodo.

    A secao dizia "Quatro camadas" quando a fonte canonica ja tinha seis. Cada
    card mostra a ETAPA que serve (dado do JSON) e leva a uma pagina real.
    """
    pag = ler(os.path.join(raiz, "metodo-capta-plus", "index.html"))
    if pag is None:
        erro("metodo-capta-plus/index.html ausente")
        return
    m = re.search(r'id="fm-metodo-camadas"([\s\S]*?)</section>', pag)
    bloco = m.group(1) if m else ""
    if not bloco:
        erro("metodo-capta-plus: secao das camadas (#fm-metodo-camadas) ausente")
        return
    try:
        with open(os.path.join(raiz, "assets", "framework_t.json"), "rb") as fh:
            dado = json.loads(fh.read().decode("utf-8-sig"))
    except (OSError, ValueError) as exc:
        erro("assets/framework_t.json ilegivel: %s" % exc)
        return
    camadas = (dado.get("eixo_vertical") or {}).get("camadas") or []
    n_cards = bloco.count('<article class="fm-method-layer')
    if n_cards != len(camadas):
        erro("metodo-capta-plus: %d card(s) de camada (esperado %d, o mesmo numero do JSON)"
             % (n_cards, len(camadas)))
    if "Seis camadas" not in bloco:
        erro("metodo-capta-plus: titulo das camadas nao diz 'Seis camadas'")
    # SVG nao e texto de tela: "M12 3 5 6" e comando de path, nao modulo
    codigos = re.findall(r"\bM\d{1,2}\b", re.sub(r"<svg[\s\S]*?</svg>", "", bloco))
    if codigos:
        erro("metodo-capta-plus: codigo de modulo visivel na secao das camadas: %s"
             % ", ".join(sorted(set(codigos))[:6]))
    baixo = bloco.lower()
    # os links da secao sao relativos (o rebrand normaliza): resolve contra a
    # pasta da pagina antes de comparar com o JSON.
    hrefs = []
    for _h in re.findall(r'href="([^"]+)"', bloco):
        _h = _h.split("#")[0].split("?")[0].strip()
        if not _h or _h.startswith("http"):
            continue
        _partes = [] if _h.startswith("/") else ["metodo-capta-plus"]
        for _p in _h.split("/"):
            if _p == "..":
                if _partes:
                    _partes.pop()
            elif _p not in ("", "."):
                _partes.append(_p)
        hrefs.append("/".join(_partes))
    for c in camadas:
        nome = str(c.get("nome") or "")
        if nome.lower() not in baixo:
            erro("metodo-capta-plus: falta a camada '%s'" % nome)
        for etapa in c.get("etapas") or []:
            if str(etapa).lower() not in baixo:
                erro("metodo-capta-plus: camada '%s' sem a etapa '%s'" % (nome, etapa))
        for pag_url in c.get("paginas") or []:
            pag_url = str(pag_url)
            alvo_rel = pag_url.strip("/")
            if alvo_rel not in hrefs:
                erro("metodo-capta-plus: camada '%s' sem link para %s" % (nome, pag_url))
            elif not existe_pagina(raiz, pag_url):
                erro("metodo-capta-plus: link da camada '%s' aponta para pagina inexistente (%s)"
                     % (nome, pag_url))


def checar_mapa(raiz):
    """Toda pagina do sitemap tem de estar no mapa do site.

    O mapa se datava pela execucao (nao pelo conteudo) e por isso envelhecia.
    Ficaram 5 paginas de fora (diagnostico, guia completo, resumo para o
    conselho e os 2 estudos publicados). Agora a cobertura e invariante.
    """
    mapa = ler(os.path.join(raiz, "mapa-do-site", "index.html"))
    if mapa is None:
        erro("mapa-do-site/index.html ausente")
        return
    sm = ler(os.path.join(raiz, "sitemap.xml")) or ""
    urls = []
    for loc in re.findall(r"<loc>([^<]+)</loc>", sm):
        u = loc.replace("https://metodocapta.github.io", "").strip() or "/"
        if not (u.endswith("/") or "." in u.split("/")[-1]):
            u += "/"
        urls.append(u)
    hrefs = set()
    for h in re.findall(r'href="([^"]+)"', mapa):
        h = h.split("#")[0].split("?")[0].strip()
        if not h or h.startswith("http"):
            continue
        partes = [] if h.startswith("/") else ["mapa-do-site"]
        for p in h.split("/"):
            if p == "..":
                if partes:
                    partes.pop()
            elif p not in ("", "."):
                partes.append(p)
        hrefs.add("/" + "/".join(partes) + ("/" if partes else ""))
    hrefs = {x.replace("//", "/") for x in hrefs}
    fora = [u for u in urls if u not in hrefs]
    if fora:
        erro("mapa-do-site: %d pagina(s) do sitemap fora do mapa — rode "
             "faq_mapa_paginas.py --somente-mapa (%s)" % (len(fora), ", ".join(fora[:5])))


def checar_codificacao(raiz):
    achados, n = [], 0
    for pasta, dirs, arqs in os.walk(raiz):
        dirs[:] = [d for d in dirs if d not in (".git", "_arquivo", "wp-content")]
        for nome in arqs:
            if not nome.lower().endswith(EXTS_TEXTO):
                continue
            n += 1
            caminho = os.path.join(pasta, nome)
            rel = os.path.relpath(caminho, raiz).replace("\\", "/")
            try:
                with open(caminho, "rb") as fh:
                    conteudo = fh.read().decode("utf-8")
            except UnicodeDecodeError as exc:
                achados.append("%s: NAO e UTF-8 valido (%s)" % (rel, exc))
                continue
            except OSError:
                continue
            for rx in (RX_CAIXA, RX_DUPLO):
                m = rx.search(conteudo)
                if m:
                    ini = max(0, m.start() - 25)
                    achados.append("%s: mojibake — ex.: ...%s..."
                                   % (rel, conteudo[ini:m.start() + 25].replace("\n", " ")))
                    break
    if achados:
        erro("codificacao em %d arquivo(s): %s" % (len(achados), " | ".join(achados[:4])))
    return n


def checar_destaques(raiz):
    """Destaques: o JSON e o DADO do slider — estrutura, ordem e origem.

    Subconjunto PORTATIL: nao olha o calendario (um push manual nao pode falhar
    so porque o Substack esta quieto). Frescor, quantidade e link vivo ficam no
    portao do build (site_verificar.py) e no coletor (substack_destaques.py).
    """
    caminho = os.path.join(raiz, "assets", "destaques.json")
    try:
        with open(caminho, "r", encoding="utf-8-sig") as fh:
            dado = json.load(fh)
    except (OSError, ValueError) as exc:
        erro("assets/destaques.json ausente ou ilegivel: %s" % exc)
        return
    itens = dado.get("itens") if isinstance(dado, dict) else None
    if not isinstance(itens, list) or not itens:
        erro("assets/destaques.json: lista 'itens' vazia — o slider sai do ar")
        return

    links, datas = [], []
    for pos, it in enumerate(itens, 1):
        if not isinstance(it, dict):
            erro("destaques.json: item %d nao e objeto JSON" % pos)
            continue
        for campo in ("titulo_estrategico", "link", "data", "data_pt", "resumo"):
            if not str(it.get(campo) or "").strip():
                erro("destaques.json: item %d sem '%s' (card incompleto)" % (pos, campo))
        link = str(it.get("link") or "").strip()
        if link:
            if not link.startswith("https://") or "substack.com" not in link:
                erro("destaques.json: item %d com link fora do Substack: %s" % (pos, link[:60]))
            if link in links:
                erro("destaques.json: link repetido no slider: %s" % link[:60])
            links.append(link)
        img = str(it.get("imagem") or "")
        if img and "substackcdn.com" not in img:
            erro("destaques.json: item %d com imagem fora do substackcdn: %s" % (pos, img[:60]))
        datas.append(str(it.get("data") or "")[:10])

    if all(re.match(r"^\d{4}-\d{2}-\d{2}$", d) for d in datas):
        if any(a < b for a, b in zip(datas, datas[1:])):
            erro("destaques.json: fora de ordem — itens[0] tem de ser o post mais novo "
                 "(o cartao e o hub leem itens[0] como 'ultimo')")
    else:
        erro("destaques.json: data fora do padrao AAAA-MM-DD")


def main():
    ap = argparse.ArgumentParser(description="Invariantes do repositorio publicado.")
    ap.add_argument("--raiz", default=".", help="raiz do site (default: pasta atual)")
    args = ap.parse_args()
    raiz = os.path.abspath(args.raiz)
    if not os.path.isdir(raiz):
        print("::error::raiz nao encontrada: %s" % raiz)
        return 1

    home = ler(os.path.join(raiz, "index.html"))
    checar_home(raiz, home)
    checar_radar(raiz, home)
    checar_componente_t(raiz, home)
    checar_quem_somos(raiz)
    checar_css_menu(raiz)
    checar_imagens(raiz)
    checar_assets_externos(raiz)
    checar_destaques(raiz)
    checar_camadas_decorativas(raiz)
    checar_camadas_metodo(raiz)
    checar_mapa(raiz)
    checar_cta_e_cabecalho(raiz)
    n_texto = checar_codificacao(raiz)

    print("=" * 70)
    print(" VERIFICADOR DO REPOSITORIO PUBLICADO — %s" % raiz)
    print("=" * 70)
    print("  arquivos de texto conferidos : %d" % n_texto)
    if falhas:
        print("  FALHOU (%d):" % len(falhas))
        for f in falhas:
            print("   [X] %s" % f)
        print("=" * 70)
        return 1
    print("  OK — todas as invariantes presentes.")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
