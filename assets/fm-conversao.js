/* MetodoCapta — FASE 10 (conversão). Três caminhos, sem dependências.
   (i)   Barra fixa de CTA que aparece ao rolar o herói e some perto do contato.
   (ii)  Caminho alternativo no herói (termômetro) — feito no HTML.
   (iii) A/B do rótulo do CTA primário (persistido por sessão + rastreado). */
(function () {
  "use strict";

  /* ---------- (i) barra fixa ---------- */
  var bar = document.querySelector(".fm-sticky-cta");
  if (bar) {
    var dispensada = false;
    try { dispensada = sessionStorage.getItem("fm_bar_off") === "1"; } catch (e) {}

    var x = bar.querySelector(".fm-sticky-cta__x");
    if (x) {
      x.addEventListener("click", function (ev) {
        ev.preventDefault();
        dispensada = true;
        bar.classList.remove("on");
        document.body.classList.remove("fm-bar-on");
        try { sessionStorage.setItem("fm_bar_off", "1"); } catch (e) {}
      });
    }

    var atualizar = function () {
      if (dispensada) return;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var doc = document.documentElement;
      var pertoDoFim = (y + window.innerHeight) > (doc.scrollHeight - 760);
      var mostrar = y > 720 && !pertoDoFim;
      bar.classList.toggle("on", mostrar);
      document.body.classList.toggle("fm-bar-on", mostrar);
    };

    /* A altura REAL da barra vai para o CSS (--fm-barra-h): o botao do WhatsApp
       sobe acima dela em vez de cair sobre o "Agendar agora". Era um numero fixo
       (86px) e a barra a 360px tem 164px. Com o observador, a conta tambem
       acompanha a barra quando ela encolhe sozinha (a "pilula" com o mapa em
       cena, que o modulo 3D liga) - sem depender de um scroll para saber. */
    var medirBarra = function () {
      document.documentElement.style.setProperty(
        "--fm-barra-h",
        Math.round(bar.getBoundingClientRect().height) + "px"
      );
    };
    medirBarra();
    if (window.ResizeObserver) new ResizeObserver(medirBarra).observe(bar);
    else window.addEventListener("resize", medirBarra);
    window.addEventListener("scroll", atualizar, { passive: true });
    window.addEventListener("resize", atualizar);
    atualizar();
  }

  /* ---------- (iii) A/B do rótulo do CTA primário ---------- */
  try {
    var prim = document.querySelector(".fm-hero .fm-btn.fm-btn-primary");
    if (prim) {
      var variantes = [
        "Agendar diagnóstico de prontidão — 72h",
        "Quero meu diagnóstico de prontidão — 72h"
      ];
      var v = null;
      try { v = sessionStorage.getItem("fm_ab_cta"); } catch (e) {}
      if (v !== "0" && v !== "1") {
        v = Math.random() < 0.5 ? "0" : "1";
        try { sessionStorage.setItem("fm_ab_cta", v); } catch (e) {}
      }
      var texto = null;
      for (var i = 0; i < prim.childNodes.length; i++) {
        var n = prim.childNodes[i];
        if (n.nodeType === 3 && n.nodeValue.replace(/\s/g, "")) { texto = n; break; }
      }
      if (texto) texto.nodeValue = texto.nodeValue.replace(/\S[\s\S]*\S/, variantes[+v]);
      prim.setAttribute("data-fm-ab", "v" + v);
      if (typeof window.fmEvento === "function") window.fmEvento("ab_cta_variante", { variante: "v" + v });
    }
  } catch (e) {}
})();
