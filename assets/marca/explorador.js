/* ============================================================================
   EXPLORADOR — comportamento da home (vanilla, sem dependências)
   A) Engine: as 6 etapas (abas acessíveis, teclado, deep-link, próxima/anterior)
   B) Radar: filtro REAL por UF × área de captação (dados agregados do sistema)

   Regras do projeto respeitadas:
   - nada de dado inventado: o Radar lê assets/radar_estados.json;
   - sem código de módulo na interface;
   - funciona sem JS: as seções continuam legíveis (os filtros ficam ocultos);
   - prefers-reduced-motion: nenhuma animação própria.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  doc.documentElement.classList.add('fm-js');

  /* instrumentacao: usa a camada do site (fm-eventos.js). Sem provedor = zero rede. */
  function evento(nome, dados) {
    if (typeof window.fmEvento === 'function') {
      try { window.fmEvento(nome, dados || {}); } catch (e) { /* noop */ }
    }
  }

  /* ==========================================================================
     A) ENGINE — seis etapas
     ========================================================================== */
  function initEtapas() {
    var cards = Array.prototype.slice.call(doc.querySelectorAll('.fm-pillars .fm-pillar'));
    var rail = doc.querySelector('.fm-etapas-rail');
    if (!cards.length) return;

    var atual = 0;

    function marcarRail(n) {
      if (!rail) return;
      Array.prototype.slice.call(rail.querySelectorAll('[data-rail]')).forEach(function (b) {
        if (n && Number(b.getAttribute('data-rail')) === n) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
    }

    function fecharTodos(exceto) {
      cards.forEach(function (card, i) {
        var btn = card.querySelector('.fm-pilar-toggle');
        var det = card.querySelector('.fm-pilar-detalhe');
        if (!btn || !det) return;
        var on = (i + 1) === exceto;
        det.hidden = !on;
        btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        card.classList.toggle('is-ativa', on);
        var txt = btn.querySelector('.fm-pilar-toggle-txt');
        if (txt) txt.textContent = on ? 'Fechar detalhe' : 'O que esta etapa entrega';
      });
    }

    function abrir(n, rolar) {
      n = Math.max(1, Math.min(cards.length, n));
      atual = n;
      fecharTodos(n);
      marcarRail(n);
      if (rolar) {
        var card = cards[n - 1];
        if (card && card.scrollIntoView) {
          var reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          card.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'center' });
        }
      }
      try {
        history.replaceState(null, '', location.pathname + location.search + '#fm-etapa-' + n);
      } catch (e) { /* noop */ }
      try {
        doc.dispatchEvent(new CustomEvent('fm:etapa', { detail: { n: n } }));
      } catch (e) { /* noop */ }
    }

    function fechar() {
      atual = 0;
      fecharTodos(0);
      marcarRail(0);
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    }

    cards.forEach(function (card, i) {
      var btn = card.querySelector('.fm-pilar-toggle');
      if (!btn) return;
      btn.addEventListener('click', function () {
        if (atual === i + 1) {
          fechar();
          evento('etapa_fechada', { etapa: i + 1 });
        } else {
          abrir(i + 1, false);
          evento('etapa_aberta', { etapa: i + 1, via: 'card' });
        }
      });
    });

    if (rail) {
      Array.prototype.slice.call(rail.querySelectorAll('[data-rail]')).forEach(function (b) {
        b.addEventListener('click', function () {
          var n = Number(b.getAttribute('data-rail')) || 1;
          abrir(n, true);
          evento('rail_etapa', { etapa: n });
        });
      });
    }

    /* deep-link: #fm-etapa-4 ou ?etapa=4 */
    var mHash = /#fm-etapa-(\d+)/.exec(location.hash || '');
    var mQuery = /[?&]etapa=(\d+)/.exec(location.search || '');
    var inicial = mHash ? parseInt(mHash[1], 10) : (mQuery ? parseInt(mQuery[1], 10) : 0);
    if (inicial) abrir(inicial, false);
    else { fecharTodos(0); marcarRail(0); }
  }

  function initRadar() {
    var sec = doc.getElementById('fm-radar');
    if (!sec) return;

    var filtros = doc.getElementById('fm-radar-filtros');
    var selUF = doc.getElementById('fm-radar-uf');
    var btnLimpar = doc.getElementById('fm-radar-limpar');
    var kpiOpCard = doc.getElementById('fm-radar-kpi-op');
    var kpiOp = kpiOpCard ? kpiOpCard.querySelector('b') : null;
    var scopeEl = sec.querySelector('[data-scope]');
    var scopeTotal = sec.querySelector('[data-scope-total]');
    var barras = Array.prototype.slice.call(sec.querySelectorAll('.fm-barra'));
    if (!filtros || !selUF || !kpiOpCard || !kpiOp || !barras.length) return;

    var nacional = parseInt(sec.getAttribute('data-nac-op') || '0', 10) || 0;
    var rotuloKpiOriginal = kpiOpCard.querySelector('span') ? kpiOpCard.querySelector('span').textContent : '';
    var estado = { uf: '', area: '' };
    var dados = null;
    var carregando = null;

    function fmt(n) {
      try { return Number(n).toLocaleString('pt-BR'); } catch (e) { return String(n); }
    }
    function nomeUF(uf) {
      var o = selUF.querySelector('option[value="' + uf + '"]');
      return o ? o.textContent.trim() : uf;
    }
    function barraDe(cod) {
      return barras.filter(function (x) { return x.getAttribute('data-area') === cod; })[0];
    }
    function rotuloArea(cod) {
      var b = barraDe(cod);
      var sp = b && b.querySelector('span');
      return sp ? sp.textContent.trim() : cod;
    }
    function nac(cod) {
      var b = barraDe(cod);
      return b ? (parseInt(b.getAttribute('data-nac') || '0', 10) || 0) : 0;
    }
    function carregar() {
      if (dados) return Promise.resolve(dados);
      if (carregando) return carregando;
      var url = sec.getAttribute('data-json') || 'assets/radar_estados.json';
      carregando = fetch(url, { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) { dados = j; return j; })
        .catch(function () { return null; });
      return carregando;
    }
    function areasEscopo() {
      if (estado.uf && dados && dados.estados && dados.estados[estado.uf]) {
        return dados.estados[estado.uf].areas || [];
      }
      return barras.map(function (b) {
        var cod = b.getAttribute('data-area');
        return { codigo: cod, total: nac(cod) };
      });
    }
    function totalEscopo() {
      if (!estado.uf) return estado.area ? nac(estado.area) : nacional;
      var est = dados && dados.estados && dados.estados[estado.uf];
      if (!est) return 0;
      if (!estado.area) return parseInt(est.oportunidades || 0, 10) || 0;
      var a = (est.areas || []).filter(function (x) { return x.codigo === estado.area; })[0];
      return a ? (parseInt(a.total, 10) || 0) : 0;
    }

    function render() {
      var porCodigo = {};
      areasEscopo().forEach(function (a) {
        porCodigo[a.codigo] = parseInt(a.total || 0, 10) || 0;
      });
      var maior = 1;
      barras.forEach(function (b) {
        var v = estado.uf ? (porCodigo[b.getAttribute('data-area')] || 0) : nac(b.getAttribute('data-area'));
        if (v > maior) maior = v;
      });

      barras.forEach(function (b) {
        var cod = b.getAttribute('data-area');
        var temNoEscopo = !estado.uf || Object.prototype.hasOwnProperty.call(porCodigo, cod);
        var v = estado.uf ? (porCodigo[cod] || 0) : nac(cod);
        var num = b.querySelector('b');
        if (num) num.textContent = fmt(v);
        var fill = b.querySelector('.fm-barra-fill');
        if (fill) fill.style.width = Math.max(2, Math.round(v * 100 / maior)) + '%';
        b.setAttribute('aria-pressed', cod === estado.area ? 'true' : 'false');
        b.classList.toggle('is-vazio', !!estado.uf && !temNoEscopo);
        b.setAttribute('data-dica', rotuloArea(cod) + ': ' + fmt(v)
          + (estado.uf ? ' em ' + nomeUF(estado.uf) : ' no total'));
      });

      var total = totalEscopo();
      if (scopeEl) scopeEl.textContent = estado.uf ? nomeUF(estado.uf) : 'Brasil';
      if (scopeTotal) scopeTotal.textContent = fmt(total);
      kpiOp.textContent = fmt(total);
      var label = kpiOpCard.querySelector('span');
      if (label) {
        label.textContent = (estado.uf || estado.area) ? 'oportunidades no recorte' : rotuloKpiOriginal;
      }
      if (btnLimpar) btnLimpar.hidden = !(estado.uf || estado.area);
    }

    function ativar() {
      if (!filtros.hasAttribute('hidden')) { render(); return; }
      carregar().then(function (j) {
        if (!j) return;              /* sem dado: mantém a seção estática */
        filtros.removeAttribute('hidden');
        render();
      });
    }

    selUF.addEventListener('change', function () {
      estado.uf = selUF.value || '';
      render();
      evento('radar_filtro_uf', { uf: estado.uf || 'br' });
    });

    barras.forEach(function (b) {
      b.addEventListener('click', function () {
        var cod = b.getAttribute('data-area');
        estado.area = estado.area === cod ? '' : cod;
        render();
        evento('radar_filtro_area', { area: estado.area || 'todas' });
      });
    });

    if (btnLimpar) {
      btnLimpar.addEventListener('click', function () {
        estado.uf = '';
        estado.area = '';
        selUF.value = '';
        render();
        evento('radar_limpar', {});
      });
    }

    /* Carrega o recorte (8 KB) na inicializacao. NAO depende de IntersectionObserver:
       em aba oculta/segundo plano o callback pode nunca disparar e os filtros ficariam
       presos no estado escondido. */
    ativar();
  }

  /* Simulador de carteira: conta explícita (meta ÷ ticket), sem alíquota inventada */
  function initSimulador() {
    var meta = doc.getElementById('fm-sim-meta');
    var ticket = doc.getElementById('fm-sim-ticket');
    if (!meta || !ticket) return;
    var outMeta = doc.querySelector('[data-sim-meta]');
    var outTicket = doc.querySelector('[data-sim-ticket]');
    var outN = doc.querySelector('[data-sim-n]');

    function brl(n) {
      try { return 'R$ ' + Number(n).toLocaleString('pt-BR'); } catch (e) { return 'R$ ' + n; }
    }
    function calc(enviar) {
      var m = parseInt(meta.value, 10) || 0;
      var t = parseInt(ticket.value, 10) || 1;
      var n = Math.max(1, Math.ceil(m / t));
      if (outMeta) outMeta.textContent = brl(m);
      if (outTicket) outTicket.textContent = brl(t);
      if (outN) outN.textContent = String(n);
      if (enviar) evento('simulador_carteira', { meta: m, ticket: t, incentivadores: n });
    }

    meta.addEventListener('input', function () { calc(false); });
    ticket.addEventListener('input', function () { calc(false); });
    meta.addEventListener('change', function () { calc(true); });
    ticket.addEventListener('change', function () { calc(true); });
    calc(false);
  }

  /* Prontidão: derivada das respostas do mini-diagnóstico (sessionStorage, sem cookie) */
  function initProntidao() {
    var box = doc.getElementById('fm-prontidao');
    if (!box) return;
    var elValor = box.querySelector('[data-pront-valor]');
    var elFalta = box.querySelector('[data-pront-falta]');
    var dados = null;
    try { dados = JSON.parse(sessionStorage.getItem('fm-minidiag') || 'null'); } catch (e) { dados = null; }
    if (!dados) return;             /* sem respostas: a faixa fica oculta */

    var itens = ['estatuto', 'projeto', 'certidoes', 'parceiros'];
    var nomes = { estatuto: 'estatuto', projeto: 'projeto', certidoes: 'certidões', parceiros: 'empresas/editais' };
    var tem = Array.isArray(dados.tem) ? dados.tem : [];
    var faltas = itens.filter(function (i) { return tem.indexOf(i) < 0; });
    var pct = Math.round(((itens.length - faltas.length) / itens.length) * 100);

    if (elValor) elValor.textContent = pct + '%';
    if (elFalta) {
      elFalta.textContent = faltas.length
        ? 'Falta: ' + faltas.map(function (f) { return nomes[f]; }).join(', ')
          + ' (de ' + itens.length + ' itens).'
        : 'Você marcou os ' + itens.length + ' itens básicos.';
    }
    box.hidden = false;

    var refazer = box.querySelector('[data-pront-refazer]');
    if (refazer) {
      refazer.addEventListener('click', function () {
        try { sessionStorage.removeItem('fm-minidiag'); } catch (e) {}
        box.hidden = true;
        var md = doc.getElementById('fm-minidiag');
        if (md) { md.open = true; md.scrollIntoView({ block: 'center' }); }
        evento('prontidao_refazer', {});
      });
    }
  }

  function initMiniDiag() {
    var box = doc.getElementById('fm-minidiag');
    if (!box) return;
    var form = box.querySelector('[data-md-form]');
    var passos = Array.prototype.slice.call(box.querySelectorAll('[data-md-passo]'));
    var prog = box.querySelector('[data-md-prog]');
    var seguir = box.querySelector('[data-md-seguir]');
    var voltar = box.querySelector('[data-md-voltar]');
    var saida = box.querySelector('[data-md-resultado]');
    if (!form || !passos.length || !prog || !seguir || !saida) return;

    var atual = 1;
    var aberto = false;

    function resposta(nome) {
      var el = form.querySelector('[name="' + nome + '"]:checked');
      return el ? el.value : '';
    }
    function marcados(nome) {
      return Array.prototype.slice.call(form.querySelectorAll('[name="' + nome + '"]:checked'))
        .map(function (e) { return e.value; });
    }
    function podeSeguir() {
      if (atual === 1) return !!resposta('tipo');
      if (atual === 2) return true;
      return !!resposta('urgencia');
    }
    function pintar() {
      passos.forEach(function (p) {
        p.hidden = Number(p.getAttribute('data-md-passo')) !== atual;
      });
      prog.textContent = 'Pergunta ' + atual + ' de 3';
      seguir.disabled = !podeSeguir();
      seguir.textContent = atual === 3 ? 'Ver recomendação' : 'Continuar';
      if (voltar) voltar.hidden = atual === 1;
    }

    function recomendar() {
      var tipo = resposta('tipo');
      var tem = marcados('tem');
      var urg = resposta('urgencia');
      var faltas = [];
      if (tem.indexOf('estatuto') < 0) faltas.push('estatuto atualizado');
      if (tem.indexOf('projeto') < 0) faltas.push('projeto escrito');
      if (tem.indexOf('certidoes') < 0) faltas.push('certidões em dia');
      if (tem.indexOf('parceiros') < 0) faltas.push('empresas ou editais mapeados');

      var r;
      if (tipo === 'nao') {
        r = {
          titulo: 'O primeiro passo é existir juridicamente',
          porque: 'Sem CNPJ e personalidade jurídica não há como receber recurso público ou incentivado.',
          links: [['/diagnostico-de-prontidao/', 'Diagnóstico de Prontidão'],
                  ['/guias/como-montar-um-plano-de-trabalho/', 'Como montar um plano de trabalho']]
        };
      } else if (urg === 'edital' && (tem.indexOf('certidoes') < 0 || tem.indexOf('estatuto') < 0)) {
        r = {
          titulo: 'Prioridade: prontidão documental',
          porque: 'Com edital aberto, o que costuma travar não é o projeto: é documento vencido ou estatuto que não cobre o objeto.',
          links: [['/diagnostico-de-prontidao/', 'Diagnóstico de Prontidão'],
                  ['/guias/checklist-de-habilitacao-documental/', 'Checklist de habilitação']]
        };
      } else if (tem.indexOf('projeto') < 0 || urg === 'estruturar') {
        r = {
          titulo: 'Prioridade: estruturar o projeto',
          porque: 'Sem metas, etapas e orçamento por rubrica, a oportunidade não vira proposta.',
          links: [['/guias/como-montar-um-plano-de-trabalho/', 'Como montar um plano de trabalho'],
                  ['/guias/como-montar-indicadores-de-impacto/', 'Indicadores de impacto']]
        };
      } else if (tem.indexOf('parceiros') < 0) {
        r = {
          titulo: 'Prioridade: carteira de incentivadores',
          porque: 'Captação incentivada é matemática de relacionamento: meta dividida por ticket, com quem decide mapeado.',
          links: [['/carteira-de-incentivadores/', 'Carteira de incentivadores'],
                  ['/radar/', 'Radar de oportunidades']]
        };
      } else {
        r = {
          titulo: 'Prioridade: diagnóstico de prontidão',
          porque: 'Você já tem o básico. O ganho agora é conferir o que vence e o que falta por mecanismo.',
          links: [['/diagnostico-de-prontidao/', 'Diagnóstico de Prontidão'],
                  ['/radar/', 'Radar de oportunidades']]
        };
      }

      try {
        sessionStorage.setItem('fm-minidiag', JSON.stringify({
          tipo: tipo, tem: tem, urg: urg, rec: r.titulo
        }));
      } catch (e) { /* sessionStorage bloqueado */ }

      var rotulos = { osc: 'OSC/associação', coop: 'cooperativa', inst: 'instituto/fundação', nao: 'ainda não tenho organização' };      var urgs = { edital: 'edital aberto', estruturar: 'estruturar projeto', preparar: 'me preparar' };
      var resumo = r.titulo + '. ' + r.porque
        + (faltas.length ? ' Falta organizar: ' + faltas.join(', ') + '.' : ' Base documental e projeto já existem.');

      var msg = 'Olá! Fiz o diagnóstico rápido no site.\n'
        + 'Organização: ' + (rotulos[tipo] || tipo) + '\n'
        + 'Já tenho: ' + (tem.length ? tem.join(', ') : 'nada ainda') + '\n'
        + 'Urgência: ' + (urgs[urg] || urg) + '\n'
        + 'Recomendação do site: ' + r.titulo;
      var wa = 'https://wa.me/5544999120638?text=' + encodeURIComponent(msg);

      var ctas = r.links.map(function (p) {
        return '<a href="' + p[0] + '" data-fm-evento="minidiag_resultado_link">' + p[1] + '</a>';
      }).join('');

      saida.innerHTML = '<p class="fm-minidiag-titulo"><strong>' + r.titulo + '</strong></p>'
        + '<p>' + r.porque + '</p>'
        + (faltas.length
            ? '<p><b>Falta organizar:</b> ' + faltas.join(', ') + '.</p>'
            : '<p><b>Base documental e projeto já existem.</b></p>')
        + '<div class="fm-minidiag-ctas">'
        + '<a data-md-wa href="' + wa + '" target="_blank" rel="noopener" data-fm-evento="minidiag_whatsapp">Falar sobre meu caso</a>'
        + ctas
        + '<button type="button" data-md-copiar>Copiar resumo</button>'
        + '<button type="button" data-md-refazer>Refazer</button>'
        + '</div>';
      form.hidden = true;
      prog.textContent = 'Recomendação';
      saida.hidden = false;
      try { saida.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { /* noop */ }

      var copiar = saida.querySelector('[data-md-copiar]');
      if (copiar) {
        copiar.addEventListener('click', function () {
          try {
            navigator.clipboard.writeText(resumo);
            copiar.textContent = 'Copiado';
            setTimeout(function () { copiar.textContent = 'Copiar resumo'; }, 1800);
          } catch (e) { /* clipboard bloqueado */ }
          evento('minidiag_copiar', {});
        });
      }
      var refazer = saida.querySelector('[data-md-refazer]');
      if (refazer) {
        refazer.addEventListener('click', function () {
          try { sessionStorage.removeItem('fm-minidiag'); } catch (e) {}
          form.reset();
          form.hidden = false;
          atual = 1;
          saida.hidden = true;
          saida.innerHTML = '';
          pintar();
          evento('minidiag_refazer', {});
        });
      }
    }

    function avancar() {
      if (!podeSeguir()) return;
      if (atual < 3) {
        atual++;
        pintar();
        evento('minidiag_passo', { passo: atual });
        return;
      }
      recomendar();
      evento('minidiag_resultado', {
        tipo: resposta('tipo'),
        urgencia: resposta('urgencia'),
        tem: marcados('tem').length
      });
    }

    seguir.addEventListener('click', avancar);
    if (voltar) {
      voltar.addEventListener('click', function () {
        if (atual > 1) { atual--; pintar(); }
      });
    }
    form.addEventListener('change', function () { seguir.disabled = !podeSeguir(); });
    form.addEventListener('submit', function (ev) { ev.preventDefault(); avancar(); });

    box.addEventListener('toggle', function () {
      if (box.open && !aberto) {
        aberto = true;
        evento('minidiag_abrir', {});
      }
    });

    pintar();
  }

  function iniciar() {
    initEtapas();
    initRadar();
    initSimulador();
    initProntidao();
    initMiniDiag();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
})();
