/* ==========================================================================
   MÉTODO CAPTA+ · v2.5 · CONVERSA (F2) — fluxo guiado, determinístico, sem IA
   --------------------------------------------------------------------------
   • Injeta no CAPÍTULO DE DECISÃO (depois das 5 perguntas, antes do CTA):
     um roteador não pode pedir decisão antes da dor, do mecanismo e da prova.
     (Só na home: os links são relativos à raiz.)
   • Sem JS: nada é injetado e o site segue igual (a home já tem o caminho normal).
   • Acessível: <button>, foco gerenciado, aria-live, teclado.
   • Sem promessa de resultado — encaminha para as páginas que JÁ existem.
   ========================================================================== */
(function () {
  'use strict';
  var doc = document;
  if (doc.querySelector('.fm-conversa')) return;
  var hero = doc.querySelector('.fm-hero');
  if (!hero) return;

  var WA = 'https://wa.me/5544999120638?text=' + encodeURIComponent(
    'Olá! Quero o diagnóstico de prontidão (72h) do MetodoCapta.');

  /* ---------------------------------------------------------------- fluxo */
  var CAMINHOS = [
    {
      id: 'find',
      rotulo: 'Encontrar oportunidades que fazem sentido',
      perguntas: [
        { q: 'Em que tipo de mecanismo você quer buscar?',
          ops: ['Editais e chamamentos públicos', 'Leis de incentivo (Rouanet, LIR, Esporte)', 'Fundos (infância, idoso) e emendas', 'Ainda não sei'] },
        { q: 'Sua documentação está em dia?',
          ops: ['Sim, está em dia', 'Parcialmente', 'Não sei dizer'] }
      ],
      resultado: function (r) {
        var primeiro = [
          ['radar/index.html', 'Radar: onde buscar — editais, chamamentos, leis e fundos'],
          ['radar/rouanet/index.html', 'Radar — Lei Rouanet (PRONAC)'],
          ['radar/fia/index.html', 'Radar — Fundos da infância (FIA) e do idoso'],
          ['biblioteca/o-que-e-osc/index.html', 'O que é uma OSC (e o que ela precisa ter)']
        ][r[0]];
        var segundo = (r[1] === 0)
          ? ['diagnostico-de-prontidao/index.html', 'Diagnóstico de prontidão: 18 itens em 3 dimensões']
          : ['guias/checklist-de-habilitacao-documental/index.html', 'Checklist de habilitação documental (estatuto, ata, certidões)'];
        return {
          titulo: 'Primeiro o alvo, depois a prontidão.',
          txt: 'O Radar mostra o que está aberto e aderente ao seu perfil. Em paralelo, a documentação precisa estar pronta antes de a oportunidade abrir — é o que costuma travar o pedido.',
          links: [primeiro, segundo, ['guias/como-abordar-uma-empresa/index.html', 'Como abordar uma empresa parceira']]
        };
      }
    },
    {
      id: 'prepare',
      rotulo: 'Preparar projetos e documentos',
      perguntas: [
        { q: 'O que está mais frágil hoje?',
          ops: ['Estatuto, ata e certidões', 'Plano de trabalho e orçamento', 'Indicadores e relatórios', 'Não sei dizer'] },
        { q: 'Você já tem um edital escolhido?', ops: ['Sim', 'Não'] }
      ],
      resultado: function (r) {
        var primeiro = [
          ['guias/checklist-de-habilitacao-documental/index.html', 'Habilitação documental: estatuto, ata, certidões e conta vinculada'],
          ['guias/como-montar-um-plano-de-trabalho/index.html', 'Plano de trabalho: metas, etapas, rubricas e nexo'],
          ['guias/como-montar-indicadores-de-impacto/index.html', 'Indicadores de impacto: como medir e comprovar'],
          ['biblioteca/o-que-e-mrosc/index.html', 'MROSC — o que a parceria exige']
        ][r[0]];
        return {
          titulo: 'Projeto no formato do edital.',
          txt: r[1] === 0
            ? 'Com o edital escolhido, o trabalho é traduzir a sua realidade para o que ele pede: objeto, metas, orçamento por rubrica e comprovação.'
            : 'Antes de escolher o edital, organize a base: objeto claro, capacidade instalada e documentação. Sem isso, o projeto compete em desvantagem.',
          links: [primeiro,
            ['diagnostico-de-prontidao/index.html', 'Diagnóstico de prontidão (18 itens · 3 dimensões)'],
            ['guias/como-se-habilitar-no-sinir/index.html', 'Como se habilitar no SINIR']]
        };
      }
    },
    {
      id: 'manage',
      rotulo: 'Melhorar a gestão e os resultados',
      perguntas: [
        { q: 'Qual é a prioridade agora?',
          ops: ['Prestação de contas sem glosa', 'Medir e comprovar impacto', 'Governança e estatuto', 'Organizar a casa antes de captar'] },
        { q: 'Você já captou e precisa prestar contas?', ops: ['Sim', 'Ainda não'] }
      ],
      resultado: function (r) {
        var primeiro = [
          ['guias/como-prestar-contas-de-parceria/index.html', 'Prestação de contas de parceria, passo a passo'],
          ['guias/como-montar-um-relatorio-de-impacto/index.html', 'Relatório de impacto: do dado ao argumento'],
          ['metodo-capta-plus/index.html', 'MetodoCapta: as seis etapas e os artefatos'],
          ['checklist-parcerias/index.html', 'Checklist de prontidão (12 itens)']
        ][r[0]];
        return {
          titulo: r[1] === 0 ? 'Fechar o ciclo com lastro.' : 'Preparar antes de captar.',
          txt: r[1] === 0
            ? 'Recurso captado se sustenta em evidência: conta vinculada, conciliação, indicadores e prestação no prazo. É o que evita glosa e libera a próxima captação.'
            : 'Comece pela prontidão: documentação, governança e indicadores. Quem chega pronto é parceiro — quem chega pedindo precisa convencer.',
          links: [primeiro,
            ['biblioteca/o-que-e-glosao/index.html', 'Glosa: por que a verba volta'],
            ['diagnostico-de-prontidao/index.html', 'Diagnóstico de prontidão: as 3 dimensões, em 18 itens']]
        };
      }
    },
    {
      id: 'start',
      rotulo: 'Não sei por onde começar',
      perguntas: [
        { q: 'Sua entidade tem CNPJ ativo e estatuto registrado?', ops: ['Sim', 'Não', 'Não sei dizer'] },
        { q: 'Quanto tempo você tem para se preparar?', ops: ['Até 30 dias', '30 a 90 dias', 'Mais de 90 dias'] }
      ],
      resultado: function (r) {
        var primeiro = (r[0] === 0)
          ? ['para-o-conselho/index.html', 'Resumo de 1 página para levar ao conselho']
          : ['biblioteca/o-que-e-osc/index.html', 'O que é uma OSC: os requisitos básicos'];
        return {
          titulo: r[2] === 0 ? 'Prazo curto pede foco.' : 'Comece pela base, com calma.',
          txt: r[2] === 0
            ? 'Com pouco tempo, o caminho é um só: o edital mais aderente e a documentação mínima para não desclassificar. O resto vem depois.'
            : 'Sem pressa de edital, dá para estruturar: formalização, governança, documentação e um primeiro projeto bem desenhado.',
          links: [primeiro,
            ['calculadora/index.html', 'Calculadora: quantas empresas cabem na sua meta'],
            ['metodo-capta-plus/index.html', 'Como o MetodoCapta funciona']]
        };
      }
    }
  ];

  /* ------------------------------------------------------------ utilidades */
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
  var seta = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>';

  /* ------------------------------------------------------------------ DOM */
  var sec = doc.createElement('section');
  sec.className = 'fm-section fm-conversa';
  sec.id = 'fm-conversa';
  sec.setAttribute('aria-labelledby', 'fm-conversa-titulo');
  sec.innerHTML =
    '<div class="fm-container"><div class="fm-conversa-card" role="group" aria-labelledby="fm-conversa-titulo">' +
    '<span class="fm-conversa-kicker">Capta+ Conversa</span>' +
    '<h2 class="fm-conversa-q" id="fm-conversa-titulo">O que sua entidade precisa resolver hoje?</h2>' +
    '<p class="fm-conversa-sub">Escolha o caminho. Em duas perguntas mostramos o próximo passo — e o material certo para ele. Sem formulário, sem promessa de resultado.</p>' +
    '<div class="fm-conversa-painel" aria-live="polite"></div>' +
    '</div></div>';

  var painel = sec.querySelector('.fm-conversa-painel');

  /* --------------------------------------------------------------- estados */
  function passoInicial() {
    var h = '<div class="fm-conversa-ops">';
    CAMINHOS.forEach(function (c, i) {
      h += '<button type="button" class="fm-conversa-op" data-cam="' + i + '">' + esc(c.rotulo) + seta + '</button>';
    });
    h += '</div><p class="fm-conversa-nota">Orientação inicial e informativa — não é parecer jurídico, contábil ou garantia de aprovação.</p>';
    painel.innerHTML = h;
    painel.querySelectorAll('[data-cam]').forEach(function (b) {
      b.addEventListener('click', function () { abrir(Number(b.getAttribute('data-cam'))); });
    });
  }

  function abrir(iCaminho, respostas) {
    var cam = CAMINHOS[iCaminho];
    respostas = respostas || [];
    var iPerg = respostas.length;

    if (iPerg < cam.perguntas.length) {
      var p = cam.perguntas[iPerg];
      var h = '<p class="fm-conversa-q" style="font-size:clamp(19px,2vw,24px)">' + esc(p.q) + '</p><div class="fm-conversa-opcoes">';
      p.ops.forEach(function (o, i) {
        h += '<label class="fm-conversa-opt"><input type="radio" name="fmc-op" value="' + i + '"' + (i === 0 ? ' checked' : '') + '>' + esc(o) + '</label>';
      });
      h += '</div><button type="button" class="fm-conversa-avancar">' + (iPerg + 1 < cam.perguntas.length ? 'Continuar' : 'Ver o próximo passo') + ' ' + seta + '</button>' +
        (iPerg > 0 ? '<div><button type="button" class="fm-conversa-voltar">← voltar</button></div>' : '<div><button type="button" class="fm-conversa-voltar">← trocar o caminho</button></div>');
      painel.innerHTML = h;

      var prim = painel.querySelector('input');
      if (prim) prim.focus();

      painel.querySelector('.fm-conversa-avancar').addEventListener('click', function () {
        var marcado = painel.querySelector('input:checked');
        abrir(iCaminho, respostas.concat(marcado ? Number(marcado.value) : 0));
      });
      painel.querySelector('.fm-conversa-voltar').addEventListener('click', function () {
        if (iPerg > 0) abrir(iCaminho, respostas.slice(0, -1)); else passoInicial();
      });
      return;
    }

    var res = cam.resultado(respostas);
    var r = '<p class="fm-conversa-res-titulo">' + esc(res.titulo) + '</p><p class="fm-conversa-res-txt">' + esc(res.txt) + '</p>' +
      '<p class="fm-conversa-prox">Próximos passos</p><ul class="fm-conversa-lista">';
    res.links.forEach(function (l) {
      r += '<li><a href="' + esc(l[0]) + '">' + esc(l[1]) + '</a></li>';
    });
    r += '</ul><a class="fm-conversa-cta" href="' + WA + '" target="_blank" rel="noopener">Agendar diagnóstico de prontidão — 72h ' + seta + '</a>' +
      '<p class="fm-conversa-nota">O diagnóstico mapeia o que a sua organização já pode captar e o que falta — sem compromisso.</p>' +
      '<div><button type="button" class="fm-conversa-voltar">← começar de novo</button></div>';
    painel.innerHTML = r;
    painel.querySelector('.fm-conversa-voltar').addEventListener('click', passoInicial);
    var t = painel.querySelector('.fm-conversa-res-titulo');
    if (t) { t.setAttribute('tabindex', '-1'); t.focus(); }
  }

  /* ---------------------------------------------------------------- injeta */
  passoInicial();
  // A Conversa e' um ROTEADOR de decisao: vive no capitulo de decisao, depois
  // das 5 perguntas e ANTES do CTA. Ficava logo apos o hero — pedia decisao
  // antes da dor, do mecanismo e da prova (contra a regra do canônico).
  var cta = doc.querySelector('#fm-decisao');
  if (cta && cta.parentNode) {
    cta.parentNode.insertBefore(sec, cta);
  } else {
    var hero = doc.querySelector('.fm-hero');
    if (hero && hero.parentNode) hero.parentNode.insertBefore(sec, hero.nextSibling);
    else doc.body.appendChild(sec);
  }
})();
