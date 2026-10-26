/* MEDICAO — um contrato de evento, tres destinos (GA4, Plausible/Umami, endpoint proprio)
   ---------------------------------------------------------------------------------------
   Por que existe: o site nao media NADA (0 de 108 paginas). Sem medicao, "Resultados"
   e opiniao. Este arquivo e o unico ponto de instrumentacao: os eventos saem de um
   lugar so e cada destino e ligado por configuracao (window.__FM_MEDICAO), nunca por
   copiar tag em pagina.

   Destinos
   --------
   A) GA4 / GTM ......... CFG.ga4      = "G-XXXXXXX"  (carrega o gtag SO depois do aceite)
   B) Plausible/Umami ... CFG.plausible = "metodocapta.github.io" (ou CFG.umami com script)
   C) endpoint proprio .. CFG.endpoint  = "https://.../api/eventos" (POST JSON, sem cookie)

   Contrato de evento (nome + campos)
   ----------------------------------
   page_view            {pagina, titulo, referrer, etapa}
   clique               {tipo, rotulo, destino}   tipos: whatsapp | diagnostico | percursos |
                                                   calculadora | carteira | checklist | guia |
                                                   email | externo
   leitura_75           {pagina}
   calculadora_resultado{pagina}                  (quando #out-n recebe numero)
   consentimento        {escolha: aceito|essencial}

   Privacidade: nenhum identificador pessoal, nenhum cookie do site; GA4 so com aceite
   explicito; B e C sao sem cookie e agregados. IP/pais sao decididos no servidor.
*/
(function () {
  'use strict';

  var CFG = window.__FM_MEDICAO || {};
  var PAGINA = location.pathname.replace(/\/index\.html$/, '/');
  var CHAVE = 'fm-consent';
  var DEBUG = /[?&]medicao=debug/.test(location.search);

  function ler(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function gravar(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }
  function log() {
    if (DEBUG && window.console) console.info.apply(console, ['[medicao]'].concat([].slice.call(arguments)));
  }

  /* ---------- 1) emissao: um evento, tres destinos ---------- */
  function emitir(nome, dados) {
    dados = dados || {};
    var ev = { evento: nome, pagina: PAGINA, ts: Math.round(Date.now() / 1000) };
    for (var k in dados) { if (dados[k] !== undefined && dados[k] !== null) ev[k] = dados[k]; }
    log(nome, ev);

    /* A) GA4 / GTM — so com consentimento */
    try {
      if (window.gtag && consentiu()) {
        var g = {}; for (var a in ev) { if (a !== 'evento') g[a] = ev[a]; }
        window.gtag('event', nome, g);
      }
    } catch (e) {}

    /* B) Plausible / Umami — sem cookie */
    try {
      var props = {}; for (var b in ev) { if (b !== 'evento' && b !== 'ts') props[b] = String(ev[b]); }
      if (window.plausible) window.plausible(nome, { props: props });
      if (window.umami && window.umami.track) window.umami.track(nome, props);
    } catch (e) {}

    /* C) endpoint proprio — sendBeacon com corpo text/plain.
       Um Blob "application/json" obriga preflight CORS e o beacon pode ser
       descartado; text/plain e "safelisted", entao o evento sai sempre. O
       servidor le o corpo como JSON (o conteudo continua sendo JSON). */
    try {
      if (CFG.endpoint && navigator.sendBeacon) {
        navigator.sendBeacon(CFG.endpoint,
          new Blob([JSON.stringify(ev)], { type: 'text/plain;charset=UTF-8' }));
      }
    } catch (e) {}
  }
  window.fmEvento = emitir;

  /* ---------- 2) consentimento (A depende dele; B e C nao) ---------- */
  function consentiu() { return ler(CHAVE) === 'aceito'; }

  function carregarGA4() {
    if (!CFG.ga4 || document.getElementById('fm-ga4')) return;
    var s = document.createElement('script');
    s.id = 'fm-ga4'; s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CFG.ga4);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('consent', 'default', {
      ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
      analytics_storage: 'granted'
    });
    window.gtag('config', CFG.ga4, { anonymize_ip: true, send_page_view: false });
  }

  function barra() {
    if (document.getElementById('fm-consent')) return;
    var cor = '#062531', teal = '#0ABCB0', txt = '#eafffb';
    var d = document.createElement('div');
    d.id = 'fm-consent';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', 'Escolha sobre medição de audiência');
    d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:' + cor +
      ';color:' + txt + ';padding:14px 96px 14px 18px;display:flex;gap:14px;flex-wrap:wrap;' +
      'align-items:center;justify-content:center;font:400 14px/1.5 Inter,system-ui,sans-serif;' +
      'box-shadow:0 -2px 10px rgba(0,0,0,.18)';
    d.innerHTML =
      '<span style="max-width:640px">Medimos audiência para saber o que é útil: ' +
      '<strong>sem cookie para anúncio</strong>, sem identificar ninguém. ' +
      'Detalhes na <a href="/privacidade/" style="color:' + teal + ';text-decoration:underline">Política de Privacidade</a>.</span>' +
      '<span style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button type="button" data-fm="aceito" style="cursor:pointer;border:0;border-radius:999px;padding:10px 16px;' +
      'background:linear-gradient(135deg,#0ABCB0,#067a72);color:#04222a;font:600 12px/1 Oswald,sans-serif;' +
      'letter-spacing:.06em;text-transform:uppercase">Aceitar medição</button>' +
      '<button type="button" data-fm="essencial" style="cursor:pointer;border:1px solid rgba(127,227,216,.55);' +
      'border-radius:999px;padding:10px 16px;background:transparent;color:#7fe3d8;' +
      'font:600 12px/1 Oswald,sans-serif;letter-spacing:.06em;text-transform:uppercase">Só o essencial</button>' +
      '</span>';
    d.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-fm]') : null;
      if (!b) return;
      var escolha = b.getAttribute('data-fm');
      gravar(CHAVE, escolha);
      d.parentNode.removeChild(d);
      emitir('consentimento', { escolha: escolha });
      if (escolha === 'aceito') carregarGA4();
    });
    document.body.appendChild(d);
  }

  /* ---------- 3) o que medir ---------- */
  function tipoDeLink(href) {
    if (!href) return null;
    if (href.indexOf('wa.me/') > -1) return 'whatsapp';
    if (href.indexOf('/diagnostico-de-prontidao/') > -1) return 'diagnostico';
    if (href.indexOf('/percursos/') > -1) return 'percursos';
    if (href.indexOf('/carteira-de-incentivadores/') > -1) return 'carteira';
    if (href.indexOf('/calculadora/') > -1) return 'calculadora';
    if (href.indexOf('/checklist-') > -1) return 'checklist';
    if (href.indexOf('/guia-de-captacao-de-recursos/') > -1) return 'guia';
    if (/^mailto:/i.test(href)) return 'email';
    if (/^https?:/i.test(href) && href.indexOf(location.host) === -1) return 'externo';
    return null;
  }

  function ligarCliques() {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var tipo = tipoDeLink(href);
      if (!tipo) return;
      var rotulo = (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      emitir('clique', { tipo: tipo, rotulo: rotulo, destino: href.slice(0, 120) });
    }, true);
  }

  function ligarLeitura() {
    var marcou = false;
    function ver() {
      if (marcou) return;
      var h = document.documentElement;
      var total = h.scrollHeight - window.innerHeight;
      if (total <= 0) { marcou = true; emitir('leitura_75'); return; }
      if ((h.scrollTop || window.pageYOffset || 0) / total >= 0.75) {
        marcou = true;
        emitir('leitura_75');
      }
    }
    window.addEventListener('scroll', ver, { passive: true });
    setTimeout(ver, 1200);
  }

  function ligarCalculadora() {
    var alvo = document.getElementById('out-n');
    if (!alvo || !window.MutationObserver) return;
    var ja = false;
    new MutationObserver(function () {
      if (ja) return;
      var v = (alvo.textContent || '').trim();
      if (v && /\d/.test(v)) { ja = true; emitir('calculadora_resultado'); }
    }).observe(alvo, { childList: true, characterData: true, subtree: true });
  }

  /* ---------- 4) partida ---------- */
  function iniciar() {
    emitir('page_view', { titulo: document.title.slice(0, 80), referrer: (document.referrer || '').slice(0, 120) });
    ligarCliques();
    ligarLeitura();
    ligarCalculadora();
    if (CFG.ga4) {
      if (consentiu()) carregarGA4();
      else barra();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
