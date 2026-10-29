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

  /* ---------- 0) marcador de TRAFEGO INTERNO (por dispositivo) ----------
     O filtro por IP quebra quando o IP muda (operadora, 4G, viagem). Este
     marcador e por navegador: visitar o site com ?interno=1 marca aquele
     dispositivo; ?interno=0 desmarca. Todo evento passa a levar
     traffic_type=internal, que e exatamente o parametro que o filtro padrao
     "Internal Traffic" do GA4 usa para excluir. */
  (function () {
    var m = /[?&]interno=([01])/.exec(location.search);
    if (m) {
      gravar('fm-interno', m[1] === '1' ? '1' : '');
      log('trafego interno', m[1] === '1' ? 'marcado' : 'desmarcado');
    }
  })();
  function ehInterno() { return ler('fm-interno') === '1'; }

  /* ---------- 1) emissao: um evento, tres destinos ---------- */
  function emitir(nome, dados) {
    dados = dados || {};
    var ev = { evento: nome, pagina: PAGINA, ts: Math.round(Date.now() / 1000) };
    for (var k in dados) { if (dados[k] !== undefined && dados[k] !== null) ev[k] = dados[k]; }
    if (ehInterno()) ev.traffic_type = 'internal';
    log(nome, ev);

    /* A) GA4 / GTM — so com consentimento (ou no modo cookieless configurado).
       Detalhe que ja custou uma page_view perdida: o evento de abertura dispara
       ANTES de o gtag.js terminar de carregar. Por isso, sem `window.gtag`,
       empilhamos no dataLayer no formato que o gtag entende (objeto {event}). */
    try {
      if (CFG.ga4 && liberado()) {
        var g = {};
        for (var a in ev) { if (a !== 'evento') g[a] = ev[a]; }
        if (nome === 'page_view') {
          g.page_location = location.href;
          g.page_title = document.title;
          g.page_referrer = document.referrer || '';
          delete g.pagina;
          delete g.titulo;
          delete g.referrer;
        }
        if (window.gtag) {
          window.gtag('event', nome, g);
        } else {
          window.dataLayer = window.dataLayer || [];
          var envio = { event: nome };
          for (var c in g) envio[c] = g[c];
          window.dataLayer.push(envio);
        }
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

  /* cookieless: GA4 sem cookie, sem banner (analytics_storage: denied). O dono
     escolhe no medicao_config.json ("consentimento": "banner" | "cookieless"). */
  function cookieless() { return CFG.consentimento === 'cookieless'; }
  function liberado() { return consentiu() || cookieless(); }

  function carregarProvedorSemCookie() {
    /* B) Plausible / Umami: o script do provedor precisa estar na pagina. Ele e
       carregado aqui (e nao no HTML) para que o build continue sem CDN fixo e
       para que a configuracao seja um campo so. Sem cookie, sem PII. */
    if (CFG.plausible && !document.getElementById('fm-plausible')) {
      /* fila do Plausible: o script carrega async, entao a page_view chegaria
         antes dele. `plausible.q` e o mecanismo oficial de fila. */
      window.plausible = window.plausible || function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
      };
      var p = document.createElement('script');
      p.id = 'fm-plausible'; p.defer = true;
      p.setAttribute('data-domain', CFG.plausible);
      p.src = (CFG.plausible_src || 'https://plausible.io/js/script.js');
      document.head.appendChild(p);
      log('plausible carregado para', CFG.plausible);
    }
    if (CFG.umami && !document.getElementById('fm-umami')) {
      var u = document.createElement('script');
      u.id = 'fm-umami'; u.defer = true;
      u.setAttribute('data-website-id', CFG.umami);
      u.src = (CFG.umami_src || 'https://cloud.umami.is/script.js');
      document.head.appendChild(u);
      log('umami carregado');
    }
  }

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
      analytics_storage: cookieless() ? 'denied' : 'granted'
    });
    /* send_page_view: false — a page_view e a NOSSA (com pagina/titulo/etapa),
       para nao contar duas vezes quando o gtag tambem envia a dele.
       ?debug=1 na URL liga o DebugView (sem precisar de extensao). */
    window.gtag('config', CFG.ga4, {
      anonymize_ip: true,
      send_page_view: false,
      debug_mode: /[?&]debug=1/.test(location.search)
    });
  }

  function barra() {
    if (document.getElementById('fm-consent')) return;
    var cor = '#062531', teal = '#0ABCB0', txt = '#eafffb';
    var d = document.createElement('div');
    d.id = 'fm-consent';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', 'Escolha sobre medição de audiência');
    d.style.cssText = 'position:fixed;left:16px;right:auto;bottom:16px;z-index:9999;background:' + cor +
      ';color:' + txt + ';padding:12px 14px;display:flex;flex-direction:column;gap:10px;' +
      'max-width:min(520px,calc(100vw - 32px));border:1px solid rgba(127,227,216,.28);border-radius:14px;' +
      'box-sizing:border-box;font:400 13px/1.45 Inter,system-ui,sans-serif;' +
      'box-shadow:0 8px 28px rgba(0,0,0,.35)';
    d.innerHTML =
      '<span>Medimos audiência para saber o que é útil: ' +
      '<strong>sem cookie para anúncio</strong>, sem identificar ninguém. ' +
      'Detalhes na <a href="/privacidade/" style="color:' + teal + ';text-decoration:underline">Política de Privacidade</a>.</span>' +
      '<span style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button type="button" data-fm="aceito" style="cursor:pointer;border:0;border-radius:999px;padding:9px 14px;' +
      'background:linear-gradient(135deg,#0ABCB0,#067a72);color:#04222a;font:600 12px/1 Oswald,sans-serif;' +
      'letter-spacing:.06em;text-transform:uppercase">Aceitar medição</button>' +
      '<button type="button" data-fm="essencial" style="cursor:pointer;border:1px solid rgba(127,227,216,.55);' +
      'border-radius:999px;padding:9px 14px;background:transparent;color:#7fe3d8;' +
      'font:600 12px/1 Oswald,sans-serif;letter-spacing:.06em;text-transform:uppercase">Só o essencial</button>' +
      '</span>';
    d.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-fm]') : null;
      if (!b) return;
      var escolha = b.getAttribute('data-fm');
      gravar(CHAVE, escolha);
      d.parentNode.removeChild(d);
      if (escolha === 'aceito') {
        carregarGA4();
        /* ORDEM IMPORTA: o evento de consentimento precisa sair DEPOIS de o
           gtag existir. Antes ele era emitido primeiro e era enfileirado no
           dataLayer antes de haver propriedade vinculada - nao chegava ao GA4
           (confirmado: 0 eventos em 3 dias de coleta). */
        emitir('consentimento', { escolha: escolha });
        /* a page_view desta visita foi emitida antes do aceite e nao saiu:
           sai agora, uma unica vez. */
        emitir('page_view', {
          titulo: document.title.slice(0, 80),
          referrer: (document.referrer || '').slice(0, 120)
        });
      } else {
        /* "so o essencial": sem GA4. O evento so chega a um destino sem cookie
           quando CFG.plausible/umami/endpoint estiverem configurados. */
        emitir('consentimento', { escolha: escolha });
      }
    });
    /* A barra entra DEPOIS que o hero assentou. Antes ela abria no primeiro
       quadro e cobria a faixa dos CTAs principais em telas de 670px de altura
       (o CTA ficava atras do banner justamente na primeira visita, o unico
       momento em que ele importa).
       Duas portas: (a) rolagem de 600px, quando o hero ja saiu de cena;
       (b) 15s parado, e nesse caso ela ancora a DIREITA, porque o CTA do hero
       e alinhado a esquerda - assim nao cobre o botao em nenhuma largura. */
    var mostrada = false;
    function mostrar(direita) {
      if (mostrada) return;
      mostrada = true;
      if (direita) {
        /* ancorada a direita e mais estreita: o CTA do hero termina em ~498px
           nesta largura, entao 380px de card (912-16-380=516) nao encosta nele */
        d.style.left = 'auto';
        d.style.right = '16px';
        d.style.maxWidth = 'min(380px,calc(100vw - 32px))';
      }
      document.body.appendChild(d);
      window.removeEventListener('scroll', aoRolar);
    }
    function aoRolar() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (y >= 600) mostrar(false);
    }
    window.addEventListener('scroll', aoRolar, { passive: true });
    if ((window.pageYOffset || 0) >= 600) mostrar(false);
    setTimeout(function () { mostrar(true); }, 15000);
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
      var a = e.target && e.target.closest ? e.target.closest('a,button') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var rotulo = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);

      /* 1) evento NOMEADO no proprio elemento (data-fm-evento): manda o nome,
            nao o generico - preserva a taxonomia que o site ja usava
            (intencao_diagnostico, ferramenta_calculadora, cta_whatsapp...). */
      var alvoEv = a.closest ? a.closest('[data-fm-evento]') : null;
      var nomeEv = alvoEv && alvoEv.getAttribute('data-fm-evento');
      if (nomeEv) {
        emitir(nomeEv, { rotulo: rotulo, destino: href.slice(0, 200), origem: 'elemento' });
        return;
      }

      /* 2) sem nome explicito: classifica pelo destino. O evento leva o TIPO no
         proprio nome (clique_whatsapp, clique_diagnostico...) para virar
         evento principal (key event) no GA4 sem filtro por parametro. O
         parametro `tipo` continua, para cruzar em exploracao. */
      var tipo = tipoDeLink(href);
      if (!tipo) return;
      emitir('clique_' + tipo, { tipo: tipo, rotulo: rotulo, destino: href.slice(0, 200) });
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
    /* ordem importa: carrega o provedor ANTES de emitir a page_view (sem isso o
       primeiro evento cai quando `gtag`/`plausible` ainda nao existem). */
    if (CFG.ga4) {
      if (liberado()) carregarGA4();
      else barra();
    }
    carregarProvedorSemCookie();
    emitir('page_view', { titulo: document.title.slice(0, 80), referrer: (document.referrer || '').slice(0, 120) });
    ligarCliques();
    ligarLeitura();
    ligarCalculadora();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
