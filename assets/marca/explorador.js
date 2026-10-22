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

  /* ==========================================================================
     A) ENGINE — seis etapas
     ========================================================================== */
  function initEngine() {
    var box = doc.getElementById('fm-engine');
    if (!box) return;

    var cards = Array.prototype.slice.call(doc.querySelectorAll('.fm-pillars .fm-pillar'));
    var panels = Array.prototype.slice.call(box.querySelectorAll('.fm-engine-p'));
    if (!cards.length || !panels.length) return;

    var total = Math.min(cards.length, panels.length);
    var atualEl = box.querySelector('[data-engine-atual]');
    var btnPrev = box.querySelector('[data-engine-dir="-1"]');
    var btnNext = box.querySelector('[data-engine-dir="1"]');
    var atual = 1;

    function verbo(i) {
      var el = cards[i] && cards[i].querySelector('.fm-pillar-verb');
      return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    }

    function render(n, atualizarHash) {
      n = Math.max(1, Math.min(total, n));
      atual = n;

      cards.forEach(function (card, i) {
        var on = i === n - 1;
        card.classList.toggle('is-ativa', on);
        card.setAttribute('aria-selected', on ? 'true' : 'false');
        card.setAttribute('tabindex', on ? '0' : '-1');
      });

      panels.forEach(function (p, i) {
        var on = i === n - 1;
        p.hidden = !on;
        p.setAttribute('aria-hidden', on ? 'false' : 'true');
        p.setAttribute('tabindex', on ? '0' : '-1');
      });

      if (atualEl) {
        atualEl.textContent = 'Etapa ' + n + ' de ' + total + (verbo(n - 1) ? ' \u00b7 ' + verbo(n - 1) : '');
      }
      if (btnPrev) btnPrev.disabled = n === 1;
      if (btnNext) btnNext.disabled = n === total;

      if (atualizarHash) {
        try {
          history.replaceState(null, '', location.pathname + location.search + '#fm-engine-' + n);
        } catch (e) { /* ambientes sem history */ }
      }
    }

    /* papéis e rótulos: as 6 etapas viram abas; o painel vira tabpanel */
    var lista = doc.querySelector('.fm-pillars');
    if (lista) {
      lista.setAttribute('role', 'tablist');
      if (!lista.getAttribute('aria-label')) {
        lista.setAttribute('aria-label', 'As seis etapas do Método Capta+');
      }
    }
    cards.forEach(function (card, i) {
      if (i >= total) return;
      var p = panels[i];
      if (!p.id) p.id = 'fm-engine-p-' + (i + 1);
      if (!card.id) card.id = 'fm-pilar-' + (i + 1);
      card.setAttribute('role', 'tab');
      card.setAttribute('aria-controls', p.id);
      p.setAttribute('role', 'tabpanel');
      p.setAttribute('aria-labelledby', card.id);
      card.addEventListener('click', function () { render(i + 1, true); });
      /* foco por Tab também ativa (automatic activation) — complemento, não dependência */
      card.addEventListener('focus', function () { render(i + 1, false); });
      card.addEventListener('keydown', function (ev) {
        var k = ev.key;
        var alvo = -1;
        if (k === 'ArrowRight' || k === 'ArrowDown') alvo = (i + 1) % total;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') alvo = (i - 1 + total) % total;
        else if (k === 'Home') alvo = 0;
        else if (k === 'End') alvo = total - 1;
        if (alvo >= 0) {
          ev.preventDefault();
          cards[alvo].focus();
          render(alvo + 1, false);   /* ativação explícita: não depende do evento de foco */
        } else if (k === 'Enter' || k === ' ') {
          ev.preventDefault();
          render(i + 1, true);
        }
      });
    });

    if (btnPrev) {
      btnPrev.addEventListener('click', function () {
        render(atual - 1, true);
        if (cards[atual - 1]) cards[atual - 1].focus();
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        render(atual + 1, true);
        if (cards[atual - 1]) cards[atual - 1].focus();
      });
    }

    /* deep-link: #fm-engine-4 ou ?etapa=4 */
    var inicial = 1;
    var mHash = /#fm-engine-(\d+)/.exec(location.hash || '');
    var mQuery = /[?&]etapa=(\d+)/.exec(location.search || '');
    if (mHash) inicial = parseInt(mHash[1], 10) || 1;
    else if (mQuery) inicial = parseInt(mQuery[1], 10) || 1;

    render(inicial, false);
  }

  /* ==========================================================================
     B) RADAR — filtro UF × área (dados agregados, sem identificar organização)
     ========================================================================== */
  function initRadar() {
    var sec = doc.getElementById('fm-radar');
    if (!sec) return;

    var filtros = doc.getElementById('fm-radar-filtros');
    var selUF = doc.getElementById('fm-radar-uf');
    var resumo = doc.getElementById('fm-radar-resumo');
    var kpiOpCard = doc.getElementById('fm-radar-kpi-op');
    var kpiOp = kpiOpCard ? kpiOpCard.querySelector('b') : null;
    var areasTitulo = sec.querySelector('.fm-radar-areas-titulo');
    var btnLimpar = doc.getElementById('fm-radar-limpar');
    var notaEscopo = doc.getElementById('fm-radar-nota-escopo');
    var chips = Array.prototype.slice.call(sec.querySelectorAll('[data-area-chip]'));
    var areaBtns = Array.prototype.slice.call(sec.querySelectorAll('[data-area]'));
    if (!filtros || !selUF || !resumo || !kpiOpCard || !kpiOp) return;

    var nacional = parseInt(sec.getAttribute('data-nac-op') || '0', 10) || 0;
    var rotuloKpiOriginal = kpiOpCard.querySelector('span') ? kpiOpCard.querySelector('span').textContent : '';
    var estado = { uf: '', area: '' };

    /* mapa área -> total nacional, lido dos próprios botões renderizados no build */
    function areaNacional(codigo) {
      var b = areaBtns.filter(function (el) { return el.getAttribute('data-area') === codigo; })[0];
      return b ? (parseInt(b.getAttribute('data-nac') || '0', 10) || 0) : 0;
    }
    function rotuloArea(codigo) {
      var b = areaBtns.filter(function (el) { return el.getAttribute('data-area') === codigo; })[0];
      var sp = b && b.querySelector('span');
      return sp ? sp.textContent.trim() : codigo;
    }
    function fmt(n) {
      try { return Number(n).toLocaleString('pt-BR'); } catch (e) { return String(n); }
    }
    function nomeUF(uf) {
      var op = selUF.querySelector('option[value="' + uf + '"]');
      return op ? op.textContent.trim() : uf;
    }

    var dados = null;
    var carregando = null;
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

    function areasDoEscopo() {
      if (estado.uf && dados && dados.estados && dados.estados[estado.uf]) {
        return dados.estados[estado.uf].areas || [];
      }
      /* sem UF: usa o total nacional de cada área (dos data-nac) */
      return areaBtns.map(function (el) {
        return {
          codigo: el.getAttribute('data-area'),
          rotulo: (el.querySelector('span') || {}).textContent || '',
          total: parseInt(el.getAttribute('data-nac') || '0', 10) || 0
        };
      });
    }

    function totalDoEscopo() {
      if (!estado.uf) {
        if (!estado.area) return nacional;
        return areaNacional(estado.area);
      }
      var est = dados && dados.estados && dados.estados[estado.uf];
      if (!est) return 0;
      if (!estado.area) return parseInt(est.oportunidades || 0, 10) || 0;
      var a = (est.areas || []).filter(function (x) { return x.codigo === estado.area; })[0];
      return a ? (parseInt(a.total, 10) || 0) : 0;
    }

    function pintarAreas() {
      var doEscopo = areasDoEscopo();
      var porCodigo = {};
      doEscopo.forEach(function (a) { porCodigo[a.codigo] = parseInt(a.total || 0, 10) || 0; });

      areaBtns.forEach(function (el) {
        var cod = el.getAttribute('data-area');
        var num = el.querySelector('b');
        var temNoEscopo = !estado.uf || Object.prototype.hasOwnProperty.call(porCodigo, cod);
        if (num) num.textContent = estado.uf ? (temNoEscopo ? fmt(porCodigo[cod] || 0) : '0') : fmt(areaNacional(cod));
        el.setAttribute('aria-pressed', cod === estado.area ? 'true' : 'false');
        el.classList.toggle('is-vazio', !!estado.uf && !temNoEscopo);
      });
    }

    function render() {
      var total = totalDoEscopo();
      var escopo = [];
      if (estado.uf) escopo.push(nomeUF(estado.uf));
      else escopo.push('Brasil');
      if (estado.area) escopo.push('em ' + rotuloArea(estado.area));

      kpiOp.textContent = fmt(total);
      var label = kpiOpCard.querySelector('span');
      if (label) {
        label.textContent = (estado.uf || estado.area) ? 'oportunidades no recorte' : rotuloKpiOriginal;
      }

      if (total === 0 && (estado.uf || estado.area)) {
        resumo.innerHTML = escopo.join(' ') + ' \u2014 <b>sem oportunidade registrada nesse recorte</b>';
      } else {
        resumo.innerHTML = escopo.join(' ') + ' \u00b7 <b>' + fmt(total) + '</b> oportunidade' + (total === 1 ? '' : 's')
          + (estado.area ? '' : ' acompanhada' + (total === 1 ? '' : 's'));
      }

      if (areasTitulo) {
        var rotulo = estado.uf ? 'Áreas no território' : 'Áreas de captação';
        areasTitulo.textContent = rotulo + ' \u00b7 ' + fmt(total) + ' oportunidade' + (total === 1 ? '' : 's');
      }

      chips.forEach(function (c) {
        c.setAttribute('aria-pressed', c.getAttribute('data-area-chip') === estado.area ? 'true' : 'false');
      });
      if (btnLimpar) btnLimpar.hidden = !(estado.uf || estado.area);
      if (notaEscopo) notaEscopo.hidden = !(estado.uf || estado.area);

      pintarAreas();
    }

    function ativarFiltros() {
      if (!filtros.hasAttribute('hidden')) return;
      carregar().then(function (j) {
        if (!j) return;            /* sem dado: mantém a seção estática (nunca número falso) */
        filtros.removeAttribute('hidden');
        render();
      });
    }

    selUF.addEventListener('change', function () {
      estado.uf = selUF.value || '';
      render();
    });

    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var cod = c.getAttribute('data-area-chip');
        estado.area = estado.area === cod ? '' : cod;
        render();
      });
    });

    areaBtns.forEach(function (el) {
      el.addEventListener('click', function () {
        var cod = el.getAttribute('data-area');
        estado.area = estado.area === cod ? '' : cod;
        render();
      });
    });

    if (btnLimpar) {
      btnLimpar.addEventListener('click', function () {
        estado.uf = '';
        estado.area = '';
        selUF.value = '';
        render();
      });
    }

    /* carrega só quando a seção se aproxima da viewport (ou no primeiro foco) */
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (ents) {
        if (ents.some(function (e) { return e.isIntersecting; })) {
          obs.disconnect();
          ativarFiltros();
        }
      }, { rootMargin: '250px 0px' });
      obs.observe(sec);
    } else {
      ativarFiltros();
    }
    sec.addEventListener('focusin', ativarFiltros, { once: false });
  }

  function iniciar() {
    initEngine();
    initRadar();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
})();
