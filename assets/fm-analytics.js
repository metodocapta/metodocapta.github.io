/* MetodoCapta — carregador de analítica (provider-agnostic).
   Ativa SOMENTE se houver provedor + ID em window.FM_ANALYTICS.
   Sem ID => no-op: zero rede, zero cookie, zero erro.

   Como ativar (uma linha no <head>, antes deste script):
     GA4:        window.FM_ANALYTICS = { provider: "ga4",       id: "G-XXXXXXXXXX" };
     Plausible:  window.FM_ANALYTICS = { provider: "plausible", id: "metodocapta.github.io" };
     GTM:        window.FM_ANALYTICS = { provider: "gtm",       id: "GTM-XXXXXXX" };

   Os eventos da camada fm-eventos.js (cta_diagnostico, cta_sticky,
   ab_cta_variante, ferramenta_calculadora, ...) passam a ser coletados
   automaticamente assim que houver um provedor. */
/* =====================================================================
   CONFIGURAÇÃO — edite SOMENTE estas duas linhas para ativar:
   ===================================================================== */
window.FM_ANALYTICS = window.FM_ANALYTICS || {
  provider: "",   /* "ga4" | "plausible" | "gtm"  — vazio = desativado */
  id: ""          /* G-XXXXXXXXXX | metodocapta.github.io | GTM-XXXXXXX */
};

(function () {
  "use strict";
  var cfg = window.FM_ANALYTICS || {};
  var provider = String(cfg.provider || "").toLowerCase().trim();
  var id = String(cfg.id || "").trim();
  if (!provider || !id) return;            /* sem ID => nao faz nada */

  function tag(src, attrs) {
    var s = document.createElement("script");
    s.async = true;
    s.src = src;
    if (attrs) { Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); }); }
    (document.head || document.documentElement).appendChild(s);
    return s;
  }

  if (provider === "ga4") {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", id, { anonymize_ip: true });
    tag("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id));
  } else if (provider === "plausible") {
    /* cookieless: nao exige banner de consentimento */
    tag("https://plausible.io/js/script.js", { "data-domain": id, defer: "" });
  } else if (provider === "gtm") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    tag("https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(id));
  }
})();
