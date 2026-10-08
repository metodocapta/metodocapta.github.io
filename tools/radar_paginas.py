#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RADAR — PÁGINAS PÚBLICAS POR MECANISMO (hub programático)
=========================================================
Gera páginas ESTÁTICAS, indexáveis e persuasivas a partir do agregado real do
Radar (assets/radar_snapshot.json), uma por mecanismo de captação — a jogada
escolhida pelo JEV (jeV-1.13.0): "hub_programatico" sobre "radar_mecanismo".

Saída (site estático):
  radar/index.html                     (hub)
  radar/<slug>/index.html              (uma por mecanismo)

Também atualiza (idempotente): sitemap.xml e llms.txt.

Regras: só dado AGREGADO/anônimo (nunca cliente); paleta oficial; sem JS.

Uso:
  python radar_paginas.py
  python radar_paginas.py --no-sitemap --no-llms
"""
import argparse
import html as H
import json
import os
import re
from datetime import date

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = os.path.join(BASE_DIR, "MARKETING", "SITE_METODO_CAPTA")
SNAP = os.path.join(SITE, "assets", "radar_snapshot.json")
OUT = os.path.join(SITE, "radar")
SITEMAP = os.path.join(SITE, "sitemap.xml")
LLMS = os.path.join(SITE, "llms.txt")


def config_site(site):
    """Reaponta a raiz do site (uso no CI: --site . dentro do repo de deploy)."""
    global SITE, SNAP, OUT, SITEMAP, LLMS
    SITE = os.path.abspath(site)
    SNAP = os.path.join(SITE, "assets", "radar_snapshot.json")
    OUT = os.path.join(SITE, "radar")
    SITEMAP = os.path.join(SITE, "sitemap.xml")
    LLMS = os.path.join(SITE, "llms.txt")

SITE_URL = "https://metodocapta.github.io"
WA = "https://wa.me/5544999120638?text=Ol%C3%A1%21%20Quero%20o%20diagn%C3%B3stico%20de%20prontid%C3%A3o%20%2872h%29%20do%20M%C3%A9todo%20Capta%2B."
OG = SITE_URL + "/assets/marca/og-metodo-capta.jpg"

# ---------------------------------------------------------------------------
# Conteúdo curado por mecanismo (o dado AO VIVO entra depois, do snapshot)
# ---------------------------------------------------------------------------
MECANISMOS = {
    "LIR": {
        "slug": "lir",
        "sigla": "LIR",
        "nome": "Lei de Incentivo à Reciclagem",
        "lei": "Lei nº 14.260/2021 · Decreto nº 11.044/2022",
        "esfera": "Federal",
        "titulo_seo": "LIR — Lei de Incentivo à Reciclagem: o que é, quem pode e como captar",
        "descricao": "Guia da Lei de Incentivo à Reciclagem (Lei 14.260/2021): quem pode propor, requisitos no SINIR/MTR, rubrica de captação e como se habilitar. Com oportunidades abertas no Radar.",
        "tags": ["lei de incentivo à reciclagem", "LIR", "reciclagem", "catadores", "SINIR", "economia circular"],
        "o_que_e": "A LIR permite que empresas do Lucro Real destinem parte do IRPJ a projetos de reciclagem aprovados pelo Ministério do Meio Ambiente. A aderência é por <strong>material</strong>: o resíduo que a empresa gera ou é obrigada a recuperar (PNRS, art. 33).",
        "quem": ["Cooperativas de catadores e de reciclagem", "Associações e OSCs com objeto ambiental", "Federações e redes de catadores"],
        "requisitos": ["Habilitação no SINIR (Portaria nº 1.018/2024)", "Manifesto de Transporte de Resíduos — MTR (Portaria nº 280/2020)", "Estatuto com objeto de reciclagem / economia circular", "Projeto aprovado no âmbito da LIR", "Conta específica do projeto"],
        "incentivo": "IRPJ devido por empresas do <strong>Lucro Real</strong> (incentivo federal). A LIR prevê rubrica própria de captação — até <strong>8% do captado</strong> (teto de R$ 120 mil), pela Portaria GM/MMA nº 1.250/2024.",
        "prazos": "Chamamentos e portarias do Ministério do Meio Ambiente definem as janelas; o projeto opera por <strong>período de captação</strong>. O Radar mostra o que está aberto agora.",
        "passos": ["Verificar elegibilidade e habilitar-se no SINIR/MTR", "Estruturar o projeto por metas padrão e orçamento por rubrica", "Submeter e obter aprovação no âmbito da LIR", "Abrir a conta específica do projeto", "Captar junto a empresas do Lucro Real (por material aderente)", "Executar e prestar contas com rastreabilidade das NF-e e do rateio (ITG 2002)"],
        "erros": ["Usar a LIR para cumprir logística reversa (vedado — Portaria 1.250/2024, art. 17)", "Propor sem habilitação SINIR/MTR", "Não abrir a conta específica do projeto"],
        "faq": [
            {"q": "A LIR serve para logística reversa?", "a": "Não. A vedação consta da regulação da LIR (Portaria GM/MMA nº 1.250/2024, art. 17). O enquadramento correto é o que separa aprovação de glosa."},
            {"q": "Quem pode propor projeto na LIR?", "a": "Cooperativas de catadores, associações e OSCs com objeto de reciclagem/economia circular, habilitadas no SINIR."},
            {"q": "A LIR remunera a captação?", "a": "Sim: há rubrica própria de até 8% do captado (teto de R$ 120 mil), conforme a Portaria 1.250/2024."},
        ],
        "rel": ["MROSC", "EMENDA", "PNAB"],
    },
    "ROUANET": {
        "slug": "rouanet",
        "sigla": "Rouanet",
        "nome": "Lei Rouanet (PRONAC)",
        "lei": "Lei nº 8.313/1991",
        "esfera": "Federal",
        "titulo_seo": "Lei Rouanet (PRONAC): como captar recursos de incentivo à cultura",
        "descricao": "Como funciona a Lei Rouanet (Lei 8.313/1991): aprovação no SALIC, quem pode destinar, contrapartidas e captação incentivada para projetos culturais.",
        "tags": ["lei rouanet", "PRONAC", "SALIC", "incentivo à cultura", "captação cultural"],
        "o_que_e": "A Lei Rouanet permite que empresas (Lucro Real) e pessoas físicas destinem imposto devido a projetos culturais aprovados no Ministério da Cultura, com <strong>pronac</strong> e captação via SALIC.",
        "quem": ["Associações e fundações culturais", "Institutos e OSCs com projetos culturais", "Produtores culturais e coletivos formalizados"],
        "requisitos": ["Proponente habilitado no SALIC", "Projeto aprovado (pronac) pelo MinC", "Estatuto e documentação regular", "Conta específica / movimentação própria"],
        "incentivo": "IRPJ (Lucro Real) e IRPF, com limites percentuais por porte/regime. O valor captado pertence ao projeto e é comprovado na prestação de contas.",
        "prazos": "A captação depende de projeto <strong>aprovado</strong> e de janela regulamentar; editais complementares ocorrem ao longo do ano.",
        "passos": ["Habilitar o proponente no SALIC", "Submeter o projeto e acompanhar a análise", "Obter a aprovação (pronac)", "Captar junto a incentivadores", "Executar com comprovação de contrapartidas", "Prestar contas na plataforma"],
        "erros": ["Captar sem projeto aprovado", "Desencontrar contrapartida e plano de comunicação", "Movimentar fora da conta do projeto"],
        "faq": [
            {"q": "Quem pode destinar na Rouanet?", "a": "Empresas do Lucro Real e pessoas físicas, dentro dos limites legais."},
            {"q": "Preciso ter projeto aprovado para captar?", "a": "Sim. A captação só ocorre após a aprovação e a emissão do pronac, via SALIC."},
            {"q": "Rouanet serve para qualquer tipo de cultura?", "a": "Há enquadramentos e limites por segmento; o desenho do projeto é decisivo para a aprovação."},
        ],
        "rel": ["PNAB", "LIE", "FIA"],
    },
    "LIE": {
        "slug": "esporte",
        "sigla": "LIE",
        "nome": "Lei de Incentivo ao Esporte",
        "lei": "Lei nº 11.438/2006",
        "esfera": "Federal",
        "titulo_seo": "Lei de Incentivo ao Esporte (LIE): como captar para projetos esportivos",
        "descricao": "Guia da Lei de Incentivo ao Esporte (Lei 11.438/2006): quem pode captar, manifestação prévia, limites de dedução e prestação de contas de projetos esportivos e paradesportivos.",
        "tags": ["lei de incentivo ao esporte", "LIE", "projeto esportivo", "paradesporto", "captação esporte"],
        "o_que_e": "A LIE permite que empresas (Lucro Real) e pessoas físicas destinem imposto devido a projetos desportivos e paradesportivos aprovados, fomentando a prática esportiva e a formação de atletas.",
        "quem": ["Associações e federações esportivas", "Institutos e OSCs com objeto esportivo", "Clubes e entidades de prática desportiva formalizados"],
        "requisitos": ["Estatuto com objeto desportivo", "Manifestação prévia / aprovação do órgão competente", "Projeto com metas, cronograma e orçamento", "Conta específica do projeto"],
        "incentivo": "IRPJ (Lucro Real) e IRPF, com limites de dedução definidos em lei. O recurso é aplicado no projeto e comprovado na prestação de contas.",
        "prazos": "Definidos por portarias/manifestações ao longo do exercício; acompanhe as janelas de submissão.",
        "passos": ["Verificar elegibilidade do proponente", "Obter a manifestação prévia", "Estruturar o projeto (metas, cronograma, orçamento)", "Submeter e captar", "Executar e comprovar", "Prestar contas"],
        "erros": ["Projeto sem manifestação prévia", "Orçamento sem nexo com as metas", "Comprovação frágil de execução"],
        "faq": [
            {"q": "A LIE cobre paradesporto?", "a": "Sim, há enquadramentos específicos para o paradesporto e a formação de atletas."},
            {"q": "Meu clube pode propor?", "a": "Entidades formalizadas, com estatuto e objeto desportivo, podem propor conforme os requisitos vigentes."},
            {"q": "Como o recurso é comprovado?", "a": "Por execução física e financeira do projeto, com conta específica e prestação de contas."},
        ],
        "rel": ["ROUANET", "FIA", "MROSC"],
    },
    "FIA": {
        "slug": "fia",
        "sigla": "FIA",
        "nome": "Fundo da Infância e da Adolescência",
        "lei": "Lei nº 8.069/1990 (ECA, art. 260) · Lei nº 8.242/1991",
        "esfera": "Federal / Estadual / Municipal",
        "titulo_seo": "FIA — Fundo da Infância e Adolescência: como destinar IR para projetos",
        "descricao": "Como funciona o FIA (ECA, art. 260): destinação de IR por empresas e pessoas físicas, papel dos conselhos (CMDCA/CEAS) e como captar para projetos de criança e adolescente.",
        "tags": ["FIA", "fundo da infância e adolescência", "ECA art 260", "CMDCA", "captação criança e adolescente"],
        "o_que_e": "O FIA é um fundo público que financia políticas de criança e adolescente. Empresas e pessoas físicas podem fazer a <strong>destinação de IR</strong> ao fundo, que repassa a projetos aprovados pelos conselhos.",
        "quem": ["OSCs com projetos para criança e adolescente", "Associações e institutos", "Redes e consórcios de entidades"],
        "requisitos": ["Registro e projeto aprovados no conselho (CMDCA/CEAS)", "Documentação regular da entidade", "Plano de trabalho e orçamento", "Conta específica do projeto"],
        "incentivo": "Destinação de IRPJ (até o limite legal, para Lucro Real) e de IRPF na declaração. O repasse ao projeto depende da deliberação do conselho.",
        "prazos": "Editais e chamamentos dos conselhos ao longo do ano; o prazo de destinação de IR segue o calendário fiscal.",
        "passos": ["Verificar o edital do conselho (municipal/estadual)", "Aprovar o projeto no conselho", "Abrir a conta específica", "Captar via destinação de IR e/ou aportes", "Executar", "Prestar contas ao conselho"],
        "erros": ["Projeto fora do edital/registro do conselho", "Confundir destinação de IR com patrocínio", "Prestação de contas incompleta"],
        "faq": [
            {"q": "Qual a diferença entre FIA e patrocínio?", "a": "No FIA há destinação de imposto (IR) ao fundo, com deliberação do conselho; não é um patrocínio comercial."},
            {"q": "Pessoa física pode destinar?", "a": "Sim, na sua declaração, dentro dos limites legais — conforme o calendário fiscal."},
            {"q": "Quem aprova o projeto?", "a": "Os conselhos de direitos (CMDCA/CEAS), conforme edital e registro da entidade."},
        ],
        "rel": ["FUNDO_IDOSO", "LIR", "MROSC"],
    },
    "FUNDO_IDOSO": {
        "slug": "fundo-do-idoso",
        "sigla": "Fundo do Idoso",
        "nome": "Fundo Nacional do Idoso",
        "lei": "Lei nº 12.213/2010 · Estatuto da Pessoa Idosa",
        "esfera": "Federal / Estadual / Municipal",
        "titulo_seo": "Fundo do Idoso: como destinar IR e captar para projetos da pessoa idosa",
        "descricao": "Como funciona o Fundo do Idoso (Lei 12.213/2010): destinação de IR por empresas e pessoas físicas, papel dos conselhos e captação para projetos de envelhecimento ativo e cuidado.",
        "tags": ["fundo do idoso", "fundo nacional do idoso", "pessoa idosa", "captação terceira idade"],
        "o_que_e": "O Fundo do Idoso financia programas de promoção, proteção e defesa da pessoa idosa. Empresas e pessoas físicas podem <strong>destinar IR</strong> ao fundo, que apoia projetos aprovados pelos conselhos.",
        "quem": ["OSCs com projetos para pessoa idosa", "Associações e institutos", "Entidades de cuidado e convivência"],
        "requisitos": ["Projeto aprovado no conselho competente", "Documentação regular", "Plano de trabalho e orçamento", "Conta específica"],
        "incentivo": "Destinação de IRPJ (limite legal) e de IRPF na declaração. O repasse a projetos depende da deliberação do conselho.",
        "prazos": "Editais dos conselhos e o calendário fiscal de destinação definem as janelas.",
        "passos": ["Verificar o edital do conselho", "Aprovar o projeto", "Abrir a conta específica", "Captar via destinação de IR/aportes", "Executar", "Prestar contas"],
        "erros": ["Projeto fora do edital", "Confundir destinação com patrocínio", "Ausência de conta específica"],
        "faq": [
            {"q": "Quem pode destinar ao Fundo do Idoso?", "a": "Empresas (Lucro Real, dentro do limite) e pessoas físicas, na declaração, conforme o calendário fiscal."},
            {"q": "O que o fundo financia?", "a": "Programas de promoção, proteção e defesa da pessoa idosa aprovados pelos conselhos."},
            {"q": "Existe teto?", "a": "Sim, há limites legais de dedução que podem ser compartilhados com outros fundos."},
        ],
        "rel": ["FIA", "MROSC", "LIR"],
    },
    "PNAB": {
        "slug": "pnab",
        "sigla": "PNAB",
        "nome": "Política Nacional Aldir Blanc",
        "lei": "Lei nº 14.399/2022",
        "esfera": "Municipal / Estadual (recursos federais)",
        "titulo_seo": "PNAB — Política Nacional Aldir Blanc: editais de cultura e como participar",
        "descricao": "Como funciona a PNAB (Lei 14.399/2022): repasses a municípios e estados, editais locais de fomento à cultura e como organizações e agentes culturais participam.",
        "tags": ["PNAB", "Aldir Blanc", "editais de cultura", "fomento cultural", "Lei 14.399"],
        "o_que_e": "A PNAB destina recursos federais a estados e municípios para fomento à cultura. Na ponta, <strong>editais locais</strong> selecionam projetos de organizações e agentes culturais.",
        "quem": ["OSCs e coletivos culturais", "Associações e institutos de cultura", "Agentes e espaços culturais formalizados"],
        "requisitos": ["Aderência ao edital local (objeto e território)", "Documentação regular (quando exigida)", "Plano de trabalho e orçamento", "Conta/movimentação conforme o edital"],
        "incentivo": "Fomento da política pública (repasse), não incentivo fiscal. Valor e contrapartidas variam por edital municipal/estadual.",
        "prazos": "Cada município/estado publica seus <strong>editais</strong> com prazos próprios — o Radar acompanha os abertos.",
        "passos": ["Identificar o edital do seu município/estado", "Verificar enquadramento do proponente", "Montar plano de trabalho e orçamento", "Submeter a proposta", "Executar", "Prestar contas ao ente"],
        "erros": ["Propor fora do território/objeto do edital", "Orçamento sem nexo com o plano", "Prestação de contas incompleta"],
        "faq": [
            {"q": "PNAB é lei de incentivo fiscal?", "a": "Não. É política pública de fomento (repasse), com editais locais, e não destinação de IR."},
            {"q": "Quem publica os editais?", "a": "Cada estado e município que recebe os recursos — com prazos e regras próprios."},
            {"q": "Coletivos informais podem participar?", "a": "Depende do edital; muitos admitem agentes culturais de diversas naturezas, com requisitos próprios."},
        ],
        "rel": ["ROUANET", "MROSC", "EMENDA"],
    },
    "MROSC": {
        "slug": "mrosc",
        "sigla": "MROSC",
        "nome": "Marco Regulatório das OSCs",
        "lei": "Lei nº 13.019/2014",
        "esfera": "Federal / Estadual / Municipal",
        "titulo_seo": "MROSC — Lei 13.019/2014: chamamentos públicos e como firmar parcerias",
        "descricao": "Como funciona o MROSC (Lei 13.019/2014): chamamentos públicos, termos de fomento e de colaboração, contrapartidas e prestação de contas para parcerias com o poder público.",
        "tags": ["MROSC", "chamamento público", "termo de fomento", "termo de colaboração", "parceria OSC"],
        "o_que_e": "O MROSC disciplina as <strong>parcerias</strong> entre o poder público e as OSCs, por meio de chamamento público e dos termos de <strong>fomento</strong> (iniciativa da OSC) e de <strong>colaboração</strong> (iniciativa do governo).",
        "quem": ["OSCs com CNPJ, estatuto e contabilidade regulares", "Associações, fundações e cooperativas sociais", "Institutos que executam políticas públicas"],
        "requisitos": ["Estatuto e documentação em ordem (certidões, ata)", "Capacidade técnica e estrutura", "Plano de trabalho com metas e indicadores", "Conta específica do termo"],
        "incentivo": "Repasse público por parceria (não é incentivo fiscal). Exige chamamento, plano de trabalho e prestação de contas.",
        "prazos": "Chamamentos públicos ao longo do exercício, com prazos próprios de cada órgão.",
        "passos": ["Monitorar chamamentos do órgão", "Aprovar/revisar o estatuto e a habilitação", "Montar o plano de trabalho", "Celebrar o termo e movimentar a conta específica", "Executar e medir", "Prestar contas"],
        "erros": ["Estatuto desatualizado", "Certidão vencida", "Execução sem rastreabilidade das metas"],
        "faq": [
            {"q": "Qual a diferença entre fomento e colaboração?", "a": "No fomento, a iniciativa é da OSC; na colaboração, a iniciativa e as metas são do poder público."},
            {"q": "MROSC é incentivo fiscal?", "a": "Não; é repasse de recurso público via parceria, com chamamento e prestação de contas."},
            {"q": "O que mais reprova uma OSC?", "a": "Documentação irregular (estatuto, certidões, atas) e execução sem rastreabilidade das metas."},
        ],
        "rel": ["EMENDA", "FIA", "LIR"],
    },
    "EMENDA": {
        "slug": "emendas",
        "sigla": "Emendas",
        "nome": "Emendas parlamentares",
        "lei": "Emendas individuais e EC nº 105/2019 (transferências especiais)",
        "esfera": "Federal / Estadual / Municipal",
        "titulo_seo": "Emendas parlamentares: como acessar recursos via Transferegov",
        "descricao": "Como funcionam as emendas parlamentares e as transferências especiais: indicação, plano de trabalho no Transferegov, execução e prestação de contas para OSCs e governos.",
        "tags": ["emendas parlamentares", "emenda", "Transferegov", "transferência especial", "captação pública"],
        "o_que_e": "Emendas direcionam recursos do orçamento a projetos. Há as transferências com finalidade definida e as <strong>especiais</strong> (EC 105/2019), que exigem indicação parlamentar e instrumento próprio.",
        "quem": ["OSCs com projetos estruturados", "Prefeituras e governos", "Entidades que recebem transferência via indicação"],
        "requisitos": ["Indicação parlamentar / alinhamento político-institucional", "Plano de trabalho no Transferegov (ou plataforma do ente)", "Documentação e habilitação da entidade", "Conta específica"],
        "incentivo": "Recurso orçamentário (federal/estadual), com instrumento próprio. O desenho de metas e a prestação de contas são decisivos.",
        "prazos": "Ciclo orçamentário anual (LDO/LOA) e prazos de execução/prestação por instrumento.",
        "passos": ["Estruture o projeto e defina o objeto", "Alinhe com o parlamentar/ente", "Registre o plano de trabalho no Transferegov", "Celebre o instrumento e abra a conta", "Execute", "Prestação de contas"],
        "erros": ["Projeto genérico", "Ausência de plano de trabalho aderente ao instrumento", "Execução fora do objeto"],
        "faq": [
            {"q": "Qualquer OSC pode receber emenda?", "a": "É preciso documentação regular, plano de trabalho aderente e indicação/origem do recurso, conforme o instrumento."},
            {"q": "O que é transferência especial?", "a": "Modalidade criada pela EC 105/2019, com indicação parlamentar e regras próprias de aplicação."},
            {"q": "Onde o projeto é cadastrado?", "a": "No Transferegov (federal) ou na plataforma do ente responsável, conforme o tipo de emenda."},
        ],
        "rel": ["MROSC", "LIR", "PNAB"],
    },
}

CSS = """\
:root{--navy:#062531;--navy2:#0a3340;--teal:#0ABCB0;--graf:#067a72;--ink:#0d1f35;
--muted:#4a6572;--line:#e2e8ea;--bg:#ffffff;--soft:#f4f8f8}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,'Segoe UI',system-ui,sans-serif;
line-height:1.75;-webkit-font-smoothing:antialiased}
a{color:var(--graf)}
.site-hd{background:linear-gradient(135deg,var(--navy),var(--navy2));padding:18px 0}
.site-hd .wrap{max-width:960px;margin:0 auto;padding:0 20px;display:flex;align-items:center;justify-content:space-between;gap:10px 16px;flex-wrap:wrap;min-width:0}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;min-width:0}
.brand img{height:34px;display:block;max-width:100%}
.brand b{font-family:Oswald,'Segoe UI',sans-serif;color:#fff;font-size:19px;letter-spacing:.4px;font-weight:600}
.site-hd nav{display:flex;flex-wrap:wrap;gap:6px 14px;flex:1 1 280px;min-width:0;justify-content:flex-end}
.site-hd nav a{color:#bdeee9;text-decoration:none;font-size:13px;letter-spacing:.06em;text-transform:uppercase;font-family:Oswald,sans-serif}
.site-hd nav a:hover{color:#fff}
.crumb{max-width:960px;margin:0 auto;padding:14px 20px 0;font-size:13px;color:var(--muted)}
.crumb a{color:var(--graf);text-decoration:none}
.wrap{max-width:960px;margin:0 auto;padding:0 20px;width:100%}
.hero{padding:26px 0 6px}
.eyebrow{display:inline-block;font:600 11.5px/1 Oswald,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--graf);margin-bottom:12px}
.hero h1{font:600 clamp(27px,4vw,42px)/1.16 Oswald,sans-serif;color:var(--navy);margin:0 0 12px}
.hero p.lead{font-size:17px;color:var(--muted);margin:0;max-width:780px}
.count{margin:22px 0 0;padding:16px 18px;border-radius:12px;border:1px solid rgba(10,188,176,.35);
background:linear-gradient(135deg,rgba(10,188,176,.08),rgba(6,122,114,.05));display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}
.count b{font:700 clamp(30px,4vw,44px)/1 Oswald,sans-serif;color:var(--navy);font-variant-numeric:tabular-nums}
.count span{font-size:14px;color:var(--muted)}
article{padding:8px 0 60px}
h2{font:600 clamp(20px,2.6vw,28px)/1.22 Oswald,sans-serif;color:var(--navy);margin:36px 0 12px}
h3{font:600 clamp(17px,2vw,20px)/1.2 Oswald,sans-serif;color:var(--graf);margin:24px 0 8px}
article p{margin:0 0 14px}
article strong{color:var(--navy)}
ul,ol{margin:0 0 16px;padding-left:22px}
li{margin:6px 0}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin:18px 0}
.card{border:1px solid var(--line);border-radius:12px;padding:16px 18px;background:#fff}
.card b{font-family:Oswald,sans-serif;color:var(--navy);display:block;margin-bottom:6px}
.card .n{font:700 22px/1 Oswald,sans-serif;color:var(--teal);font-variant-numeric:tabular-nums}
.tag{display:inline-block;font:600 11px/1 Oswald,sans-serif;letter-spacing:.08em;text-transform:uppercase;
color:var(--graf);border:1px solid rgba(6,122,114,.3);border-radius:999px;padding:5px 11px;margin:0 6px 6px 0}
table{width:100%;border-collapse:collapse;margin:18px 0;font-size:14.5px}
th,td{border:1px solid var(--line);padding:9px 11px;text-align:left;vertical-align:top}
th{background:var(--soft);font-family:Oswald,sans-serif;color:var(--navy);font-weight:600}
details{border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin:8px 0;background:#fff}
details summary{cursor:pointer;font-weight:600;color:var(--navy)}
details p{margin:10px 0 0;color:var(--muted)}
.cta{margin:34px 0 0;padding:24px;border-radius:14px;background:linear-gradient(135deg,var(--navy),var(--navy2));color:#e9fbf8}
.cta b{font-family:Oswald,sans-serif;display:block;font-size:20px;color:#fff;margin-bottom:6px}
.cta p{margin:0 0 14px;color:#cfe8e6}
.btn{display:inline-block;padding:13px 22px;border-radius:999px;text-decoration:none;font:600 14px/1 Oswald,sans-serif;
letter-spacing:.04em;text-transform:uppercase;background:linear-gradient(135deg,#0ABCB0,#067a72);color:#04222a}
.btn.ghost{background:transparent;border:1px solid rgba(127,227,216,.55);color:#7fe3d8;margin-left:10px}
.muted{color:var(--muted);font-size:13.5px}
.rels a{display:inline-block;margin:4px 8px 0 0;font-size:14px}
.site-ft{background:var(--navy);color:#a9c6c3;font-size:13.5px;padding:26px 0;margin-top:30px}
.site-ft .wrap{display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
.site-ft a{color:#7ef0e2;text-decoration:none;margin-right:14px}
@media(max-width:640px){table{display:block;overflow-x:auto;white-space:nowrap}
.site-hd{padding:14px 0}.site-hd .wrap{align-items:flex-start;gap:8px}
.site-hd nav{flex:1 1 100%;width:100%;justify-content:flex-start;gap:4px 12px}
.site-hd nav a{font-size:11.5px;letter-spacing:.04em}
.cta .btn{display:block;width:100%;text-align:center;margin:0 0 10px}
.cta .btn.ghost{margin-left:0}
html,body{overflow-x:hidden}}
"""


def _e(s):
    return H.escape(str(s), quote=True)


def carregar_totais():
    try:
        with open(SNAP, encoding="utf-8") as fh:
            d = json.load(fh)
    except (OSError, ValueError):
        return {}, ""
    tot = {a.get("codigo"): int(a.get("total") or 0) for a in (d.get("areas") or [])}
    return tot, d.get("gerado_em", "")


def _jsonld(m, total, gerado_em):
    url = "%s/radar/%s/" % (SITE_URL, m["slug"])
    graph = [
        {"@type": "Organization", "@id": SITE_URL + "/#organizacao", "name": "Método Capta+",
         "url": SITE_URL + "/", "logo": OG},
        {"@type": "WebPage", "@id": url + "#pagina", "url": url,
         "name": m["titulo_seo"], "description": m["descricao"],
         "inLanguage": "pt-BR", "isPartOf": {"@id": SITE_URL + "/#site"},
         "about": {"@type": "Thing", "name": m["nome"]}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Início", "item": SITE_URL + "/"},
            {"@type": "ListItem", "position": 2, "name": "Radar de captação", "item": SITE_URL + "/radar/"},
            {"@type": "ListItem", "position": 3, "name": m["sigla"], "item": url}]},
        {"@type": "HowTo", "name": "Como se habilitar — " + m["nome"],
         "step": [{"@type": "HowToStep", "position": i + 1, "text": s} for i, s in enumerate(m["passos"])]},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q["q"],
             "acceptedAnswer": {"@type": "Answer", "text": q["a"]}} for q in m["faq"]]},
    ]
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)


def _pagina(m, total, gerado_em):
    url = "%s/radar/%s/" % (SITE_URL, m["slug"])
    hoje = date.today().isoformat()
    req = "".join("<li>%s</li>" % x for x in m["requisitos"])
    quem = "".join("<li>%s</li>" % x for x in m["quem"])
    passos = "".join("<li>%s</li>" % x for x in m["passos"])
    erros = "".join("<li>%s</li>" % x for x in m["erros"])
    tags = "".join('<span class="tag">%s</span>' % _e(t) for t in m["tags"])
    rel = "".join('<a href="/radar/%s/">%s &rsaquo;</a>' % (MECANISMOS[c]["slug"], MECANISMOS[c]["sigla"])
                  for c in m["rel"] if c in MECANISMOS)
    faq = "".join('<details><summary>%s</summary><p>%s</p></details>' % (_e(q["q"]), q["a"]) for q in m["faq"])
    obs = ""
    if gerado_em:
        obs = '<p class="muted">Oportunidades acompanhadas pelo Radar (dado agregado, atualizado em %s). Nenhuma organização é identificada.</p>' % _e(gerado_em)
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{_e(m["titulo_seo"])} | Método Capta+</title>
<meta name="description" content="{_e(m["descricao"])}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:title" content="{_e(m["titulo_seo"])}">
<meta property="og:description" content="{_e(m["descricao"])}">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="Método Capta+">
<meta property="og:image" content="{OG}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/marca/favicon.svg?v=2" type="image/svg+xml">
<link rel="stylesheet" href="/assets/marca/fontes.css">
<link rel="preload" as="font" type="font/woff2" href="/assets/marca/fontes/inter-latin.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/assets/marca/fontes/oswald-latin.woff2" crossorigin>
<script type="application/ld+json">{_jsonld(m, total, gerado_em)}</script>
<style>{CSS}</style>
</head>
<body>
<header class="site-hd"><div class="wrap">
<a class="brand" href="/"><img src="/assets/marca/wordmark-claro.webp" alt="Método Capta+"></a>
<nav><a href="/">Início</a><a href="/radar/">Radar</a><a href="/estudos/">Estudos</a><a href="/calculadora/">Calculadora</a><a href="/metodo-capta-plus/">Método</a></nav>
</div></header>
<div class="crumb"><a href="/">Início</a> › <a href="/radar/">Radar</a> › {_e(m["sigla"])}</div>
<main class="wrap">
<section class="hero">
<span class="eyebrow">Radar · {_e(m["sigla"])} · {_e(m["esfera"])}</span>
<h1>{_e(m["nome"])}</h1>
<p class="lead">{m["o_que_e"]}</p>
<div class="count"><b>{total}</b><span>oportunidades <strong>acompanhadas</strong> neste mecanismo no Radar Capta+ (dado agregado).</span></div>
<div class="muted" style="margin-top:10px">{tags}</div>
</section>
<article>
<h2>Quem pode captar</h2>
<ul>{quem}</ul>

<h2>O incentivo / o recurso</h2>
<p>{m["incentivo"]}</p>
<p class="muted"><strong>Base legal:</strong> {_e(m["lei"])}.</p>

<h2>Requisitos</h2>
<ul>{req}</ul>

<h2>Prazos</h2>
<p>{m["prazos"]}</p>

<h2>Como se habilitar (passo a passo)</h2>
<ol>{passos}</ol>

<h2>Erros que custam meses</h2>
<ul>{erros}</ul>

<h2>Perguntas frequentes</h2>
{faq}

<div class="cta">
<b>Quer saber se a sua organização capta por este mecanismo?</b>
<p>Diagnóstico de prontidão (72h): elegibilidade, prontidão documental e prioridade — com método e critério. Atuação de meio, sem promessa de resultado.</p>
<a class="btn" href="{WA}%20%28origem%3A%20Radar%20{m["slug"]}%29">Agendar diagnóstico de prontidão — 72h</a>
<a class="btn ghost" href="/metodo-capta-plus/">Conhecer o método</a>
</div>

<h2>Veja também</h2>
<p class="rels">{rel} <a href="/radar/">Radar de captação &rsaquo;</a></p>
<p class="muted">Última atualização: {hoje}.</p>
{obs}
</article>
</main>
<footer class="site-ft"><div class="wrap">
<div><b>Método Capta+</b> — captação de recursos e gestão de projetos para o Terceiro Setor.</div>
<div><a href="/">Início</a><a href="/radar/">Radar</a><a href="/estudos/">Estudos</a><a href="/calculadora/">Calculadora</a><a href="/metodo-capta-plus/">Método</a></div>
</div></footer>
</body></html>"""


def _hub(totais, gerado_em):
    hoje = date.today().isoformat()
    ordem = ["LIR", "ROUANET", "LIE", "FIA", "FUNDO_IDOSO", "PNAB", "MROSC", "EMENDA"]
    cards = ""
    for cod in ordem:
        m = MECANISMOS[cod]
        t = totais.get(cod, 0)
        cards += ('<div class="card"><b>%s — %s</b><div class="n">%d</div>'
                  '<p class="muted">%s</p><a href="/radar/%s/">Ver guia &rsaquo;</a></div>'
                  % (_e(m["sigla"]), _e(m["nome"]), t, _e(m["esfera"]), m["slug"]))
    ld = json.dumps({"@context": "https://schema.org", "@type": "CollectionPage",
                     "name": "Radar de captação — editais, leis de incentivo e fundos",
                     "url": SITE_URL + "/radar/", "inLanguage": "pt-BR",
                     "isPartOf": {"@id": SITE_URL + "/#site"}}, ensure_ascii=False)
    obs = ('<p class="muted">Números agregados e anônimos do Radar Capta+ (atualizado em %s). '
           'Nenhuma organização é identificada.</p>' % _e(gerado_em)) if gerado_em else ""
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Radar de captação — editais, leis de incentivo e fundos | Método Capta+</title>
<meta name="description" content="Radar de captação do Método Capta+: guias por mecanismo (LIR, Rouanet, Esporte, FIA, Fundo do Idoso, PNAB, MROSC e Emendas), requisitos, prazos e como se habilitar.">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="{SITE_URL}/radar/">
<meta property="og:type" content="website">
<meta property="og:title" content="Radar de captação — Método Capta+">
<meta property="og:description" content="Guias por mecanismo de captação: requisitos, prazos e como se habilitar.">
<meta property="og:url" content="{SITE_URL}/radar/">
<meta property="og:site_name" content="Método Capta+">
<meta property="og:image" content="{OG}">
<link rel="icon" href="/assets/marca/favicon.svg?v=2" type="image/svg+xml">
<link rel="stylesheet" href="/assets/marca/fontes.css">
<link rel="preload" as="font" type="font/woff2" href="/assets/marca/fontes/inter-latin.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/assets/marca/fontes/oswald-latin.woff2" crossorigin>
<script type="application/ld+json">{ld}</script>
<style>{CSS}</style>
</head>
<body>
<header class="site-hd"><div class="wrap">
<a class="brand" href="/"><img src="/assets/marca/wordmark-claro.webp" alt="Método Capta+"></a>
<nav><a href="/">Início</a><a href="/radar/">Radar</a><a href="/estudos/">Estudos</a><a href="/calculadora/">Calculadora</a><a href="/metodo-capta-plus/">Método</a></nav>
</div></header>
<div class="crumb"><a href="/">Início</a> › Radar</div>
<main class="wrap">
<section class="hero">
<span class="eyebrow">Radar de captação</span>
<h1>Editais, leis de incentivo e fundos — por mecanismo.</h1>
<p class="lead">Um guia para cada mecanismo de captação: quem pode, requisitos, prazos e como se habilitar. Os números são o que o Radar acompanha — <strong>dado agregado</strong>, sem identificar organizações.</p>
</section>
<article>
<h2>Escolha o mecanismo</h2>
<div class="grid">{cards}</div>
{obs}
<div class="cta">
<b>Não sabe por onde começar?</b>
<p>O diagnóstico de prontidão (72h) indica os mecanismos com maior aderência ao seu perfil — com método e critério, sem promessa de resultado.</p>
<a class="btn" href="{WA}">Agendar diagnóstico de prontidão — 72h</a>
<a class="btn ghost" href="/metodo-capta-plus/">Conhecer o método</a>
</div>
<p class="muted">Última atualização: {hoje}.</p>
</article>
</main>
<footer class="site-ft"><div class="wrap">
<div><b>Método Capta+</b> — captação de recursos e gestão de projetos para o Terceiro Setor.</div>
<div><a href="/">Início</a><a href="/radar/">Radar</a><a href="/estudos/">Estudos</a><a href="/calculadora/">Calculadora</a><a href="/metodo-capta-plus/">Método</a></div>
</div></footer>
</body></html>"""


def _atualizar_sitemap(urls):
    try:
        txt = open(SITEMAP, encoding="utf-8").read()
    except OSError:
        return 0
    hoje = date.today().isoformat()
    novas = 0
    for u in urls:
        if u in txt:
            continue
        linha = ('  <url><loc>%s</loc><lastmod>%s</lastmod><changefreq>weekly</changefreq>'
                 '<priority>0.8</priority></url>\n' % (u, hoje))
        txt = txt.replace("</urlset>", linha + "</urlset>")
        novas += 1
    if novas:
        open(SITEMAP, "w", encoding="utf-8").write(txt)
    return novas


def _atualizar_llms(links):
    try:
        txt = open(LLMS, encoding="utf-8").read()
    except OSError:
        return 0
    if "## Radar de captação" in txt:
        return 0
    bloco = "\n## Radar de captação (por mecanismo)\n\n" + "".join(
        "- [%s](%s): %s\n" % (t, u, d) for t, u, d in links) + "\n"
    open(LLMS, "a", encoding="utf-8").write(bloco)
    return len(links)


def main():
    ap = argparse.ArgumentParser(description="Gera as páginas públicas do Radar por mecanismo.")
    ap.add_argument("--site", default=None, help="raiz do site (default: MARKETING/SITE_METODO_CAPTA)")
    ap.add_argument("--no-sitemap", action="store_true")
    ap.add_argument("--no-llms", action="store_true")
    a = ap.parse_args()
    if a.site:
        config_site(a.site)

    totais, gerado_em = carregar_totais()
    os.makedirs(OUT, exist_ok=True)

    # hub
    with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(_hub(totais, gerado_em))

    urls, links = [SITE_URL + "/radar/"], [
        ("Radar de captação (hub)", SITE_URL + "/radar/",
         "índice dos mecanismos: LIR, Rouanet, Esporte, FIA, Fundo do Idoso, PNAB, MROSC e Emendas.")]

    for cod, m in MECANISMOS.items():
        pasta = os.path.join(OUT, m["slug"])
        os.makedirs(pasta, exist_ok=True)
        with open(os.path.join(pasta, "index.html"), "w", encoding="utf-8") as fh:
            fh.write(_pagina(m, totais.get(cod, 0), gerado_em))
        urls.append("%s/radar/%s/" % (SITE_URL, m["slug"]))
        links.append(("%s — %s" % (m["sigla"], m["nome"]),
                      "%s/radar/%s/" % (SITE_URL, m["slug"]), m["descricao"]))

    n_sm = 0 if a.no_sitemap else _atualizar_sitemap(urls)
    n_ll = 0 if a.no_llms else _atualizar_llms(links)

    print("=" * 66)
    print(" RADAR -> PÁGINAS POR MECANISMO")
    print("=" * 66)
    print("  hub      : radar/index.html")
    print("  páginas  : %d" % len(MECANISMOS))
    for cod in MECANISMOS:
        print("    - /radar/%-14s total=%s" % (MECANISMOS[cod]["slug"] + "/", totais.get(cod, 0)))
    print("  sitemap  : +%d urls" % n_sm)
    print("  llms.txt : +%d links" % n_ll)
    print("  saida    : %s" % os.path.relpath(OUT, BASE_DIR))
    print("=" * 66)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
