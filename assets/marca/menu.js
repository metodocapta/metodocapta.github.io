/* ============================================================================
   MENU — comportamento unico para o header do site (.site-hd) e o da pagina
   Metodo (.fm-header). Sem framework, sem CDN.

   O que faz:
   1. marca o item ativo (aria-current="page") e acende uma linha teal que
      desliza para o item sob o mouse/foco;
   2. encolhe o header depois de 8 px de rolagem (mais conteudo na tela);
   3. injeta o contador de oportunidades abertas no item Radar, lendo
      /assets/radar_abertas.json (gerado no build do Radar publico).

   Tudo degrada em silencio: se o elemento nao existe, nao faz nada.
   ========================================================================== */
(function () {
  "use strict";

  var semMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function caminho(u) {
    return u.pathname.replace(/\/index\.html$/, "/");
  }

  var aqui = caminho(location);

  /* ------------------------------------------------------------------ site */
  var hd = document.querySelector(".site-hd");
  if (hd) {
    var aoRolar = function () {
      hd.classList.toggle("is-scrolled", window.pageYOffset > 8);
    };
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });

    var nav = hd.querySelector("nav");
    if (nav) {
      var links = Array.prototype.slice.call(nav.querySelectorAll("a"));
      var ativo = null;
      var tamanho = 0;

      links.forEach(function (a) {
        var u;
        try { u = new URL(a.getAttribute("href"), location.href); } catch (e) { return; }
        var p = caminho(u);
        if (p === "/") {
          if (aqui === "/" && !ativo) { ativo = a; tamanho = 1; }
          return;
        }
        if ((aqui === p || aqui.indexOf(p) === 0) && p.length > tamanho) {
          ativo = a;
          tamanho = p.length;
        }
      });

      if (ativo) {
        ativo.classList.add("is-active");
        ativo.setAttribute("aria-current", "page");
      }

      var linha = document.createElement("span");
      linha.className = "nav-line";
      linha.setAttribute("aria-hidden", "true");
      nav.appendChild(linha);

      function mover(el) {
        if (!el) { linha.style.opacity = "0"; return; }
        var r = el.getBoundingClientRect();
        var n = nav.getBoundingClientRect();
        linha.style.opacity = "1";
        linha.style.width = r.width + "px";
        linha.style.transform = "translateX(" + (r.left - n.left) + "px)";
      }

      if (!semMovimento) {
        links.forEach(function (a) {
          a.addEventListener("mouseenter", function () { mover(a); });
          a.addEventListener("focus", function () { mover(a); });
        });
        nav.addEventListener("mouseleave", function () { mover(ativo); });
        window.addEventListener("resize", function () { mover(ativo); });
      }
      /* posiciona a linha mesmo com movimento reduzido: ela e indicador de
         estado, nao animacao. */
      mover(ativo);

      /* contador de oportunidades abertas no item Radar */
      var radar = null;
      links.forEach(function (a) {
        var h = (a.getAttribute("href") || "").toLowerCase();
        var t = (a.textContent || "").trim().toLowerCase();
        if (!radar && (/(^|\/)radar\/?$/.test(h) || t === "radar")) radar = a;
      });
      if (radar) {
        fetch("/assets/radar_abertas.json", { cache: "no-store" })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d || !d.abertas || radar.querySelector(".nav-count")) return;
            var s = document.createElement("span");
            s.className = "nav-count";
            s.textContent = d.abertas;
            s.title = d.abertas + " oportunidades abertas no Radar";
            radar.appendChild(s);
          })
          .catch(function () { /* sem JSON, sem contador */ });
      }
    }
  }

  /* --------------------------------------------------------------- metodo */
  var fm = document.querySelector(".fm-header");
  if (fm) {
    var aoRolar2 = function () {
      fm.classList.toggle("is-scrolled", window.pageYOffset > 8);
    };
    aoRolar2();
    window.addEventListener("scroll", aoRolar2, { passive: true });
  }
})();
