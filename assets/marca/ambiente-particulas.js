/* ==========================================================================
   MÉTODO CAPTA+ · v2.5 · AMBIENTE (Canvas 2D) — UM canvas, não cinco
   --------------------------------------------------------------------------
   Estende o "campo" de partículas do hero para as outras seções escuras,
   SEM custo de WebGL (Canvas 2D é muito mais leve e roda bem no mobile).

   Auditoria V2.5, §2.7 (item 13): antes eram CINCO canvases (um por seção:
   parceiros, destaques, riscos, público, decisão), todos com buffer em dpr —
   medido, 39 MB de buffer somados a 1440 px. Agora é UM canvas, HOSPEDADO na
   seção que está em cena e mudando de casa conforme a rolagem.

   Por que hospedar, em vez de um canvas fixo fora das seções: as partículas
   têm de ficar ACIMA do fundo da seção que as hospeda e ABAIXO do conteúdo
   dela — é o CSS que garante isso (.fm-ambiente-host{position:relative;
   overflow:hidden} + .fm-ambiente-host > .fm-container{z-index:1}). Um canvas
   único fora das seções cairia atrás do fundo opaco do #fm-destaques. Então a
   classe .fm-ambiente-host continua em TODAS as seções (o empilhamento não
   muda em nada) — o que se move é só o canvas.

   Caracterizado por ser DISCRETO: partículas pequenas, alpha baixo e
   movimento lento — é fundo, nunca compete com o conteúdo.

   Reporta-se bem: pausa fora da viewport e em aba oculta; ~30fps no mobile.
   Fallback: se não rodar, a seção permanece exatamente como está.
   ========================================================================== */
export function iniciarAmbiente(secoes, opts) {
  const alvos = (secoes && secoes.nodeType ? [secoes] : Array.prototype.slice.call(secoes || []))
    .filter((s) => s && s.nodeType === 1);
  if (!alvos.length) return null;
  const lite = !!(opts && opts.lite);

  const canvas = document.createElement('canvas');
  canvas.className = 'fm-ambiente-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  // o empilhamento de hoje (canvas acima do fundo, conteúdo acima do canvas)
  // passa a valer nas cinco: só o canvas viaja.
  alvos.forEach((s) => s.classList.add('fm-ambiente-host'));

  const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.5);
  const N = lite ? 24 : 44;
  const P = [];
  let host = null;          // a seção que hospeda o canvas agora
  let w = 0;
  let h = 0;
  let vivo = true;
  let visivel = false;      // o host atual está em tela?
  let quadro = 0;

  function semear() {
    P.length = 0;
    for (let i = 0; i < N; i++) {
      P.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: 0.35 + Math.random() * 0.75,          // profundidade = tamanho/alpha
        vx: (Math.random() - 0.5) * 0.10,
        vy: (Math.random() - 0.5) * 0.10,
        r: 0.5 + Math.random() * 1.0,
      });
    }
  }

  function medir() {
    w = (host && host.clientWidth) || 900;
    h = (host && host.clientHeight) || 420;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function hospedar(s) {
    if (!s || s === host) return;
    host = s;
    s.insertBefore(canvas, s.firstChild);
    medir();
    if (!P.length) semear();
    if (ro) { ro.disconnect(); ro.observe(s); }
  }

  /* qual seção hospeda agora: a que está em cena, mais perto do centro da tela */
  function escolher() {
    const vh = window.innerHeight || 800;
    let melhor = null;
    let dist = Infinity;
    for (let i = 0; i < alvos.length; i++) {
      const r = alvos[i].getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= vh) continue;
      const d = Math.abs((r.top + r.bottom) / 2 - vh / 2);
      if (d < dist) { dist = d; melhor = alvos[i]; }
    }
    return melhor;
  }

  function desenhar() {
    if (!vivo || !visivel || document.hidden) return;
    requestAnimationFrame(desenhar);
    quadro++;
    if (quadro % 2) return;                       // ~30fps em qualquer aparelho

    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      p.x += p.vx * p.z;
      p.y += p.vy * p.z;
      if (p.x < -6) p.x = w + 6; else if (p.x > w + 6) p.x = -6;
      if (p.y < -6) p.y = h + 6; else if (p.y > h + 6) p.y = -6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.z, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(127,227,216,' + (0.09 + p.z * 0.24).toFixed(3) + ')';
      ctx.fill();
    }
  }

  function acordar() {
    hospedar(escolher());
    const antes = visivel;
    visivel = !!host;
    if (visivel && !antes) requestAnimationFrame(desenhar);
  }

  const obs = ('IntersectionObserver' in window)
    ? new IntersectionObserver(acordar, { threshold: 0.02 })
    : null;
  if (obs) alvos.forEach((s) => obs.observe(s));

  const aoVis = () => { if (!document.hidden && visivel) requestAnimationFrame(desenhar); };
  document.addEventListener('visibilitychange', aoVis);

  const redim = () => { if (visivel) { medir(); semear(); } };
  const ro = ('ResizeObserver' in window) ? new ResizeObserver(() => { if (visivel) medir(); }) : null;
  window.addEventListener('resize', redim, { passive: true });

  acordar();

  return {
    destroy() {
      vivo = false;
      if (obs) obs.disconnect();
      if (ro) ro.disconnect();
      document.removeEventListener('visibilitychange', aoVis);
      window.removeEventListener('resize', redim);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      alvos.forEach((s) => s.classList.remove('fm-ambiente-host'));
    },
  };
}
