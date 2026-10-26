/* MetodoCapta - carregador de analitica ANTIGO (DESATIVADO em 26/10/2026)
   ---------------------------------------------------------------------------
   Este arquivo carregava um provedor a partir de window.FM_ANALYTICS. Ele foi
   substituido por assets/marca/medicao.js, que ja faz as tres coisas (GA4 com
   consentimento, Plausible/Umami sem cookie e endpoint proprio) e garante UM
   tag por pagina.

   Se os dois carregassem, haveria duas tags do Google na mesma pagina (e duas
   contagens de page_view). Por isso este arquivo virou no-op.

   Para medir, edite: SKILLS/SCRIPTS/medicao_config.json
*/
(function () {
  'use strict';
  /* intencionalmente vazio */
})();
