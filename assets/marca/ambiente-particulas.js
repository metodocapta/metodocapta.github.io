/* ==========================================================================
   MÉTODO CAPTA+ · v2.4 · AMBIENTE (Canvas 2D)
   --------------------------------------------------------------------------
   Estende o "campo" de partículas do hero para outras seções escuras,
   SEM custo de WebGL (Canvas 2D é muito mais leve e roda bem no mobile).

   Caracterizado por ser DISCRETO: partículas pequenas, alpha baixo e
   movimento lento — é fundo, nunca compete com o conteúdo.

   Reporta-se bem: pausa fora da viewport e em aba oculta; ~30fps no mobile.
   Fallback: se não rodar, a seção permanece exatamente como está.
   ========================================================================== */
export function iniciarAmbiente(secao, opts) {
  if (!secao) return null;
  const lite = !!(opts && opts.lite);

  const canvas = document.createElement('canvas');
  canvas.className = 'fm-ambiente-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  secao.insertBefore(canvas, secao.firstChild);
  secao.classList.add('fm-ambiente-host');

  const ctx = canvas.getContext('2d');
  if (!ctx) { secao.removeChild(canvas); secao.classList.remove('fm-ambiente-host'); return null; }

  const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.5);
  const N = lite ? 24 : 44;
  const P = [];
  let w = 0;
  let h = 0;
  let vivo = true;
  let visivel = true;
  let quadro = 0;

  function medir() {
    w = secao.clientWidth || 900;
    h = secao.clientHeight || 420;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function medirSeMudou() {
    if (secao.clientWidth !== w || secao.clientHeight !== h) { medir(); semear(); }
  }

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

  medir();
  semear();
  desenhar();

  const obs = ('IntersectionObserver' in window)
    ? new IntersectionObserver((ents) => {
        const antes = visivel;
        visivel = ents.some((e) => e.isIntersecting);
        if (visivel && !antes) { medirSeMudou(); requestAnimationFrame(desenhar); }
      }, { threshold: 0.02 })
    : null;
  if (obs) obs.observe(secao);

  const aoVis = () => { if (!document.hidden && visivel) requestAnimationFrame(desenhar); };
  document.addEventListener('visibilitychange', aoVis);

  const redim = () => { if (visivel) { medir(); semear(); } };
  const ro = ('ResizeObserver' in window) ? new ResizeObserver(redim) : null;
  if (ro) ro.observe(secao);
  window.addEventListener('resize', redim, { passive: true });

  return {
    destroy() {
      vivo = false;
      if (obs) obs.disconnect();
      if (ro) ro.disconnect();
      document.removeEventListener('visibilitychange', aoVis);
      window.removeEventListener('resize', redim);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      secao.classList.remove('fm-ambiente-host');
    },
  };
}
