/* ============================================================================
   MENU — comportamento unico do header (.site-hd) e da pagina Metodo (.fm-header)

   1. item ativo (aria-current) + linha teal que desliza;
   2. header encolhe depois de 8 px;
   3. contador de oportunidades abertas no item Radar;
   4. DRAWER no mobile (burger + painel, Esc, foco);
   5. MEGA-MENU em Radar e Biblioteca (dados de assets/menu_*.json);
   6. BUSCA no site (assets/menu_busca.json), com teclado;
   7. SCROLLSPY nas ancoras da pagina Metodo.

   Sem framework e sem CDN. Tudo degrada em silencio: se o elemento ou o JSON
   nao existe, o menu continua funcionando como antes.
   ========================================================================== */
(function () {
  "use strict";

  var semMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reduzido = function () { return window.matchMedia("(max-width: 900px)").matches; };

  function caminho(u) { return u.pathname.replace(/\/index\.html$/, "/"); }
  function normaliza(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function cria(tag, classe, attrs) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  var aqui = caminho(location);

  /* ==================================================================== site */
  var hd = document.querySelector(".site-hd");
  var nav = hd ? hd.querySelector("nav") : null;

  if (hd) {
    /* 2) encolhe ao rolar */
    var aoRolar = function () { hd.classList.toggle("is-scrolled", window.pageYOffset > 8); };
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });

    if (nav) {
      var links = Array.prototype.slice.call(nav.querySelectorAll("a"));

      /* 1) ativo */
      var ativo = null, tamanho = 0;
      links.forEach(function (a) {
        var u;
        try { u = new URL(a.getAttribute("href"), location.href); } catch (e) { return; }
        var p = caminho(u);
        if (p === "/") { if (aqui === "/" && !ativo) { ativo = a; tamanho = 1; } return; }
        if ((aqui === p || aqui.indexOf(p) === 0) && p.length > tamanho) { ativo = a; tamanho = p.length; }
      });
      if (ativo) { ativo.classList.add("is-active"); ativo.setAttribute("aria-current", "page"); }

      /* 1b) linha que desliza */
      var linha = cria("span", "nav-line", { "aria-hidden": "true" });
      nav.appendChild(linha);
      function mover(el) {
        if (!el) { linha.style.opacity = "0"; return; }
        var r = el.getBoundingClientRect(), n = nav.getBoundingClientRect();
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
      mover(ativo);

      /* 3) contador do Radar */
      var radarLink = null;
      links.forEach(function (a) {
        var h = (a.getAttribute("href") || "").toLowerCase();
        var t = (a.textContent || "").trim().toLowerCase();
        if (!radarLink && (/(^|\/)radar\/?$/.test(h) || t === "radar")) radarLink = a;
      });
      if (radarLink) {
        fetch("/assets/radar_abertas.json", { cache: "no-store" })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d || !d.abertas || radarLink.querySelector(".nav-count")) return;
            var s = cria("span", "nav-count");
            s.textContent = d.abertas;
            s.title = d.abertas + " oportunidades abertas no Radar";
            radarLink.appendChild(s);
          })
          .catch(function () {});
      }

      /* 4) DRAWER mobile */
      var wrap = hd.querySelector(".wrap") || hd;
      var cta = hd.querySelector(".hd-cta");
      var burger = cria("button", "nav-burger", {
        type: "button", "aria-label": "Abrir menu", "aria-expanded": "false", "aria-controls": "nav-site"
      });
      burger.innerHTML = "<span></span><span></span><span></span>";
      if (cta && cta.parentNode === wrap) wrap.insertBefore(burger, cta); else wrap.appendChild(burger);
      nav.id = "nav-site";

      function fecharMenu() {
        hd.classList.remove("nav-open");
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Abrir menu");
      }
      burger.addEventListener("click", function () {
        var aberto = hd.classList.toggle("nav-open");
        burger.setAttribute("aria-expanded", aberto ? "true" : "false");
        burger.setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
        if (aberto) { var p = nav.querySelector("a"); if (p) p.focus(); }
      });
      nav.addEventListener("click", function (e) {
        if (e.target.tagName === "A" && reduzido()) fecharMenu();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { fecharMenu(); fecharMega(); fecharBusca(); }
      });
      window.addEventListener("resize", function () { if (!reduzido()) fecharMenu(); });

      /* 5) MEGA-MENU */
      var mega = null, megaTipo = null, cache = {};

      function painel(tipo, dados) {
        var box = cria("div", "nav-mega");
        var inner = cria("div", "nav-mega-in");
        if (tipo === "radar") {
          var grid = cria("div", "nav-mega-grid");
          (dados.mecanismos || []).forEach(function (m) {
            var a = cria("a", "nav-mega-item", { href: m.href });
            a.innerHTML = '<span class="mg-sigla">' + m.sigla + '</span>' +
                          '<span class="mg-nome">' + m.nome + '</span>' +
                          '<span class="mg-n">' + (m.total || 0) + '</span>';
            grid.appendChild(a);
          });
          inner.appendChild(grid);
          var rod = cria("div", "nav-mega-rod");
          rod.innerHTML = '<a href="../../radar">Radar por mecanismo</a><a href="../../radar/oportunidades">Oportunidades abertas</a>';
          inner.appendChild(rod);
        } else {
          var ul = cria("div", "nav-mega-lista");
          (dados.categorias || []).forEach(function (c) {
            var a = cria("a", "nav-mega-cat", { href: "/biblioteca/#" + c.id });
            a.innerHTML = '<span>' + c.cat + '</span><em>' + c.n + '</em>';
            ul.appendChild(a);
          });
          inner.appendChild(ul);
          var rod2 = cria("div", "nav-mega-rod");
          rod2.innerHTML = '<a href="../../biblioteca">Ver toda a biblioteca</a>';
          inner.appendChild(rod2);
        }
        box.appendChild(inner);
        hd.appendChild(box);
        box.addEventListener("mouseenter", function () { box.dataset.hover = "1"; });
        box.addEventListener("mouseleave", function () { delete box.dataset.hover; fecharMega(); });
        return box;
      }

      function abrirMega(tipo, link) {
        if (reduzido()) return;
        if (megaTipo === tipo) return;
        fecharBusca();
        fecharMega();
        var arq = tipo === "radar" ? "/assets/menu_radar.json" : "/assets/menu_biblioteca.json";
        var montar = function (d) {
          mega = painel(tipo, d);
          megaTipo = tipo;
          link.setAttribute("aria-expanded", "true");
          requestAnimationFrame(function () { mega.classList.add("aberto"); });
        };
        if (cache[tipo]) { montar(cache[tipo]); return; }
        fetch(arq, { cache: "no-store" })
          .then(function (r) { return r.json(); })
          .then(function (d) { cache[tipo] = d; montar(d); })
          .catch(function () {});
      }

      function fecharMega() {
        if (!mega) return;
        mega.remove();
        mega = null;
        megaTipo = null;
        links.forEach(function (a) { a.setAttribute("aria-expanded", "false"); });
      }

      links.forEach(function (a) {
        var h = (a.getAttribute("href") || "").toLowerCase();
        var t = (a.textContent || "").trim().toLowerCase();
        var tipo = (/biblioteca/.test(h) || t === "biblioteca") ? "biblioteca"
                 : ((/\/radar\/?$/.test(h) || t === "radar") ? "radar" : null);
        if (!tipo) return;
        a.setAttribute("aria-haspopup", "true");
        a.setAttribute("aria-expanded", "false");
        a.addEventListener("mouseenter", function () { abrirMega(tipo, a); });
        a.addEventListener("focus", function () { abrirMega(tipo, a); });
      });

      /* sai do header (ou da pagina) e o mega fecha */
      hd.addEventListener("mouseleave", function () {
        if (mega && !mega.dataset.hover) fecharMega();
      });

      /* 6) BUSCA */
      var lupa = cria("button", "nav-lupa", { type: "button", "aria-label": "Buscar no site", "aria-expanded": "false" });
      lupa.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>';
      if (cta && cta.parentNode === wrap) wrap.insertBefore(lupa, burger); else wrap.appendChild(lupa);

      var painelBusca = null, indice = null, aberta = false;

      function fecharBusca() {
        if (!painelBusca) return;
        painelBusca.hidden = true;
        aberta = false;
        lupa.setAttribute("aria-expanded", "false");
      }

      function abrirBusca() {
        fecharMega();
        if (!painelBusca) {
          painelBusca = cria("div", "nav-busca");
          painelBusca.innerHTML =
            '<div class="nav-busca-in">' +
            '<input type="search" id="nav-q" placeholder="Buscar no site (ex.: CEBAS, emendas, plano de trabalho)" ' +
            'aria-label="Buscar no site" autocomplete="off">' +
            '<div class="nav-busca-res" role="listbox" aria-label="Resultados"></div></div>';
          hd.appendChild(painelBusca);
          var campo = painelBusca.querySelector("#nav-q");
          campo.addEventListener("input", function () { filtrar(campo.value); });
          campo.addEventListener("keydown", function (e) {
            var itens = Array.prototype.slice.call(painelBusca.querySelectorAll(".nav-busca-item"));
            var i = itens.indexOf(document.activeElement);
            if (e.key === "ArrowDown") { e.preventDefault(); (itens[i + 1] || itens[0]).focus(); }
            if (e.key === "ArrowUp") { e.preventDefault(); (itens[i - 1] || itens[itens.length - 1]).focus(); }
          });
          document.addEventListener("click", function (e) {
            if (aberta && !painelBusca.contains(e.target) && e.target !== lupa && !lupa.contains(e.target)) fecharBusca();
          });
        }
        painelBusca.hidden = false;
        aberta = true;
        lupa.setAttribute("aria-expanded", "true");
        var campo = painelBusca.querySelector("#nav-q");
        campo.value = "";
        campo.focus();
        filtrar("");
        if (!indice) {
          fetch("/assets/menu_busca.json", { cache: "no-store" })
            .then(function (r) { return r.json(); })
            .then(function (d) { indice = d.paginas || []; filtrar(campo.value); })
            .catch(function () { indice = []; });
        }
      }

      function filtrar(termo) {
        var box = painelBusca.querySelector(".nav-busca-res");
        if (!indice) { box.innerHTML = '<p class="nav-busca-vazio">Carregando…</p>'; return; }
        var t = normaliza(termo.trim());
        var achados = indice.filter(function (p) {
          return !t || normaliza(p.t + " " + p.d).indexOf(t) >= 0;
        }).slice(0, 8);
        if (!achados.length) { box.innerHTML = '<p class="nav-busca-vazio">Nada encontrado.</p>'; return; }
        box.innerHTML = achados.map(function (p) {
          return '<a class="nav-busca-item" role="option" href="' + p.u + '">' +
                 '<strong>' + p.t + '</strong><span>' + (p.d || p.u) + '</span></a>';
        }).join("");
      }

      lupa.addEventListener("click", function () { aberta ? fecharBusca() : abrirBusca(); });
    }
  }

  /* ================================================================== metodo */
  var fm = document.querySelector(".fm-header");
  if (fm) {
    var aoRolar2 = function () { fm.classList.toggle("is-scrolled", window.pageYOffset > 8); };
    aoRolar2();
    window.addEventListener("scroll", aoRolar2, { passive: true });

    /* 7) scrollspy das ancoras */
    var fn = fm.querySelector(".fm-nav");
    if (fn) {
      var ancoras = Array.prototype.slice.call(fn.querySelectorAll('a[href^="#"]'));
      var alvos = ancoras.map(function (a) {
        return document.getElementById(a.getAttribute("href").slice(1));
      }).filter(Boolean);
      if (alvos.length && "IntersectionObserver" in window) {
        var io = new IntersectionObserver(function (ents) {
          ents.forEach(function (e) {
            if (!e.isIntersecting) return;
            ancoras.forEach(function (a) {
              a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id);
            });
          });
        }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
        alvos.forEach(function (t) { io.observe(t); });
      }
    }
  }
})();
