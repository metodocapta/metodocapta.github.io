/* LEAD — formulário curto que abre o WhatsApp já preenchido.
   ---------------------------------------------------------------------------
   Por que existe: o site é estático e não tem backend. Em vez de pedir
   infraestrutura, o formulário de 4 campos monta a mensagem estruturada e abre
   a conversa no WhatsApp — o lead chega qualificado, sem servidor e sem banco.

   Privacidade: o nome da organização NÃO vai para o GA4 (é dado identificável).
   O evento `lead_form` leva só UF, situação e urgência.

   Contrato: <form data-fm-lead> com campos org, uf, sit, urg.
*/
(function () {
  'use strict';
  var WA = 'https://wa.me/5544999120638?text=';

  function texto(f) {
    var d = new FormData(f);
    var org = String(d.get('org') || '').trim();
    var uf = String(d.get('uf') || '');
    var sit = String(d.get('sit') || '');
    var urg = String(d.get('urg') || '');
    var nEl = document.getElementById('n');
    var score = nEl ? String(nEl.textContent || '').trim() : '';
    var linhas = [
      'Olá! Vim da ferramenta de diagnóstico do Método Capta+.',
      'Organização: ' + (org || '(não informada)'),
      'UF: ' + uf,
      'Situação: ' + sit,
      'Urgência: ' + urg
    ];
    if (score && score !== '0') linhas.push('Diagnóstico: ' + score + ' itens marcados');
    return { texto: linhas.join('\n'), uf: uf, sit: sit, urg: urg };
  }

  document.addEventListener('submit', function (e) {
    var f = e.target && e.target.closest ? e.target.closest('form[data-fm-lead]') : null;
    if (!f) return;
    e.preventDefault();
    var t = texto(f);
    if (typeof window.fmEvento === 'function') {
      window.fmEvento('lead_form', { uf: t.uf, situacao: t.sit, urgencia: t.urg });
    }
    window.open(WA + encodeURIComponent(t.texto), '_blank', 'noopener');
  }, true);
})();
