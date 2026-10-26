/* MetodoCapta - camada de eventos (DESATIVADA em 26/10/2026)
   ---------------------------------------------------------------------------
   Este arquivo foi a primeira camada de eventos do site. Ele escutava cliques em
   [data-fm-evento], a e button e enviava direto para dataLayer/plausible/gtag
   - SEM consentimento e em paralelo ao medidor novo, o que contava o mesmo
   clique duas vezes (intencao_diagnostico + clique).

   A camada unica agora e assets/marca/medicao.js (passo 6c2 do build):
     - um contrato de 5 eventos + eventos nomeados por data-fm-evento;
     - GA4 so depois do aceite;
     - um unico tag por pagina.

   Este arquivo fica como no-op para nao quebrar paginas antigas que ainda o
   referenciam. Nao reative: use o medicao_config.json.
*/
(function () {
  'use strict';
  if (typeof window.fmEvento !== 'function') {
    /* fallback silencioso: quem chamar fmEvento antes do medidor nao quebra */
    window.fmEvento = function () {};
  }
})();
