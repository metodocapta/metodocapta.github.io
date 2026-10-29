/* FM CENA — carrega o loop cinematografico do hero so quando compensa.

   Regra de movimento (na ordem):
   1. opt-in EXPLICITO do site (`html.fm-movimento`, via botao "Ativar movimento"
      ou ?movimento=on) vence tudo — inclusive o `prefers-reduced-motion` do
      sistema, que e o que impede o usuario de ver a cena em PCs com animacoes
      desligadas;
   2. sem opt-in, respeita `prefers-reduced-motion`: fica o poster;
   3. sempre: tela >= 900px e conexao que nao seja saveData/2G. */
(function () {
  "use strict";

  var host = document.querySelector(".fm-hero-cine");
  if (!host) return;
  var video = host.querySelector(".fm-hero-cine__video");
  if (!video) return;

  var reduz = window.matchMedia("(prefers-reduced-motion: reduce)");
  var largo = window.matchMedia("(min-width: 900px)");

  /* ritmo da cena: 1.2 = 20% mais rapido (o loop de 9s vira 7,5s).
     Ajustavel pelo atributo data-velocidade no HTML, sem tocar no JS. */
  var VELOCIDADE = parseFloat(video.getAttribute("data-velocidade")) || 1.2;

  function ritmo() {
    if (video.playbackRate !== VELOCIDADE) {
      try {
        video.playbackRate = VELOCIDADE;
      } catch (e) {
        /* alguns navegadores recusam fora de faixa; segue em 1x */
      }
    }
  }

  function optIn() {
    return document.documentElement.classList.contains("fm-movimento");
  }

  function movimentoLiberado() {
    return optIn() || !reduz.matches;
  }

  function redeRuim() {
    var c = navigator.connection;
    if (!c) return false;
    if (c.saveData) return true;
    return /(^|-)2g$/.test(c.effectiveType || "");
  }

  function fontes() {
    var ss = video.querySelectorAll("source[data-src]");
    for (var i = 0; i < ss.length; i++) {
      ss[i].setAttribute("src", ss[i].getAttribute("data-src"));
      ss[i].removeAttribute("data-src");
    }
  }

  function tocar() {
    ritmo();
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }

  function ativar() {
    if (!largo.matches || !movimentoLiberado() || redeRuim()) return;
    if (!video.querySelector("source[src]")) {
      fontes();
      video.load();
    }
    tocar();
  }

  function desligar() {
    video.pause();
    /* volta ao poster (com o zoom lento) em vez de congelar um quadro */
    host.classList.remove("tem-video");
  }

  video.addEventListener("playing", function () {
    ritmo();
    host.classList.add("tem-video");
  });

  ativar();

  /* economiza CPU/bateria: pausa quando a cena sai da tela */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) {
            video.pause();
            return;
          }
          if (!largo.matches || !movimentoLiberado()) return;
          if (video.querySelector("source[data-src]")) ativar();
          else if (video.paused && video.querySelector("source[src]")) tocar();
        });
      },
      { threshold: 0.04 }
    ).observe(host);
  }

  function reagir() {
    if (!largo.matches || !movimentoLiberado() || redeRuim()) desligar();
    else ativar();
  }

  if (reduz.addEventListener) {
    reduz.addEventListener("change", reagir);
    largo.addEventListener("change", reagir);
  } else if (reduz.addListener) {
    reduz.addListener(reagir);
    largo.addListener(reagir);
  }

  /* o botao "Ativar/Desativar movimento" muda a classe no <html> */
  if (window.MutationObserver) {
    new MutationObserver(reagir).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
})();
