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
      /* Um dono por vez no rodapé: com o banner de consentimento em cena, a
         barra espera. Sem isso ela nascia por baixo do banner e o visitante
         via dois retângulos sobrepostos no mesmo canto. */
      var consentimentoEmCena = document.body.classList.contains('fm-consent-on');
      var mostrar = y > 720 && !pertoDoFim && !consentimentoEmCena;
      bar.classList.toggle("on", mostrar);
      document.body.classList.toggle("fm-bar-on", mostrar);
    };

    /* o banner avisa quando sai; a barra reavalia na hora, sem depender de scroll */
    document.addEventListener('fm-consent-livre', atualizar);

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

  /* ---------- (iii) A/B do rótulo do CTA primário: DESLIGADO ----------
     Este bloco trocava o rótulo do CTA do herói por duas variantes
     ("Agendar diagnóstico…" / "Quero meu diagnóstico…"). Era o principal
     motivo de o site ter 13 frases diferentes para o mesmo pedido: o texto
     que aparecia na tela não era o do HTML, então nem o rótulo publicado nem
     a medição batiam. Fica registrado aqui para não voltar: rótulo é conteúdo,
     não experimento. O que se mede agora é a SEÇÃO de origem (medicao.js),
     que não muda o texto de ninguém. */
})();
