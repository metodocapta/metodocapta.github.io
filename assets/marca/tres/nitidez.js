/* ==========================================================================
   MÉTODO CAPTA+ · v2.5 · NITIDEZ DO CANVAS 3D (auditoria V2.5, §2.3 / §8 #8)
   --------------------------------------------------------------------------
   Antes: setPixelRatio(Math.min(devicePixelRatio, lite ? 1 : 1.25)). Medido na
   auditoria: dpr 1,25 -> nitidez 1,25; mas todo celular moderno tem dpr 2-3, e
   entao o canvas rendia a 1,25 enquanto o texto ao lado (HTML) saia nitido - o
   3D parecia borrado.

   Agora: teto 2 no caminho NAO-lite, com ORCAMENTO DE AREA. Acima de ~2,6 M
   pixels de buffer a razao desce em passos de 0,25 ate 1. O celular ganha a
   nitidez (a area dele e pequena), e uma tela grande nao dobra o custo de
   fragmento so porque o dpr subiu - que era o risco apontado na auditoria.
   O caminho lite (toque ou GPU emulada) continua em 1: e a economia que
   mantem a cena de pe em aparelho fraco.
   ========================================================================== */

const ORCAMENTO_PX = 2600000;   // ~2,6 M pixels de buffer por canvas

export function fatorNitidez(largura, altura, lite) {
  if (lite) return 1;
  const dpr = window.devicePixelRatio || 1;
  let razao = Math.min(dpr, 2);                     // teto 2 (era 1,25)
  if (largura > 0 && altura > 0) {
    while (razao > 1 && largura * altura * razao * razao > ORCAMENTO_PX) razao -= 0.25;
  }
  return Math.max(1, razao);
}
