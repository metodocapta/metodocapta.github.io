/* MetodoCapta — camada de eventos (privacidade primeiro).
   Sem cookies e sem provedor embutido: dispara para dataLayer / plausible / gtag
   SOMENTE se existirem no site. Sem provedor, nao faz nada (zero rede).
   Uso: window.fmEvento(nome, dados)  ou  data-fm-evento="nome" no elemento. */
(function () {
  function enviar(nome, dados) {
    dados = dados || {};
    try {
      if (window.dataLayer && window.dataLayer.push) window.dataLayer.push(Object.assign({ event: nome }, dados));
      if (typeof window.plausible === "function") window.plausible(nome, { props: dados });
      if (typeof window.gtag === "function") window.gtag("event", nome, dados);
    } catch (e) {}
  }

  function rotulo(el) { return (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60); }

  document.addEventListener("click", function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest("[data-fm-evento],a,button") : null;
    if (!el) return;
    var nome = el.getAttribute("data-fm-evento");
    var href = el.getAttribute("href") || "";
    if (!nome) {
      if (/wa\.me|whatsapp/i.test(href)) nome = "cta_whatsapp";
      else if (/calculadora\//.test(href)) nome = "ferramenta_calculadora";
      else if (/para-o-conselho\//.test(href)) nome = "ferramenta_conselho";
      else if (/(\.pdf$|\.vcf$)/i.test(href)) nome = "download";
      else return;
    }
    enviar(nome, { rotulo: rotulo(el), href: href.slice(0, 200), pagina: location.pathname });
  }, true);

  window.fmEvento = enviar;
})();
