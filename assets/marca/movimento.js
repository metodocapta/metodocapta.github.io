/* ==========================================================================
   MÉTODO CAPTA+ · v2.4 · MOVIMENTO — orquestrador (camada FINAL)
   --------------------------------------------------------------------------
   Carregado como <script type="module"> (não bloqueia a 1ª pintura).
   Não mexe em landing.js nem em landing-interactions.js: apenas acrescenta
   comportamentos e, quando substitui algo, é aditivo.

   Princípios:
     - Opt-in por hooks que JÁ existem no DOM (sem tocar no HTML gerado).
     - Progressive enhancement: sem JS / sem IO, o conteúdo fica visível.
     - `prefers-reduced-motion` desliga tudo.
     - Física no cenário; precisão na UI (só pointer:fine).
   ========================================================================== */
'use strict';

const doc = document;
const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(pointer: fine)').matches;

const cleanups = [];
const on = (el, ev, fn, opt) => {
  el.addEventListener(ev, fn, opt);
  cleanups.push(() => el.removeEventListener(ev, fn, opt));
};

/* --------------------------------------------------------------------------
   1) BARRA DE PROGRESSO DE LEITURA
   -------------------------------------------------------------------------- */
(function barraDeProgresso() {
  const bar = doc.createElement('div');
  bar.id = 'fm-progress';
  bar.setAttribute('aria-hidden', 'true');
  doc.body.appendChild(bar);

  let ticking = false;
  function pintar() {
    ticking = false;
    const total = doc.documentElement.scrollHeight - window.innerHeight;
    const p = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
    bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  }
  function agendar() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(pintar);
  }
  pintar();
  on(window, 'scroll', agendar, { passive: true });
  on(window, 'resize', agendar, { passive: true });
})();

/* --------------------------------------------------------------------------
   2) CONTADORES — sobem quando o número entra na tela
   -------------------------------------------------------------------------- */
(function contadores() {
  const els = Array.from(doc.querySelectorAll(
    '.fm-radar-kpi b, .fm-radar-areas li b, .fm-metric strong'
  ));
  if (!els.length) return;

  const alvos = [];
  els.forEach((el) => {
    const txt = (el.textContent || '').trim();
    if (!/^\d[\d.\s]*$/.test(txt)) return;            // só valores numéricos
    const n = parseInt(txt.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(n) || n < 10) return;         // ignora números pequenos
    alvos.push({ el, n });
  });
  if (!alvos.length) return;
  if (rm || !('IntersectionObserver' in window)) return;  // mantém o valor final

  const fmt = new Intl.NumberFormat('pt-BR');
  const obs = new IntersectionObserver((entradas, o) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      o.unobserve(entrada.target);
      const item = alvos.find((a) => a.el === entrada.target);
      if (!item) return;
      const t0 = performance.now();
      const dur = 1100;
      const passo = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - k, 3);
        item.el.textContent = fmt.format(Math.round(item.n * eased));
        if (k < 1) requestAnimationFrame(passo);
        else item.el.textContent = fmt.format(item.n);
      };
      requestAnimationFrame(passo);
    });
  }, { threshold: 0.4 });
  alvos.forEach((a) => obs.observe(a.el));
})();

/* --------------------------------------------------------------------------
   3) REVELAÇÃO EM CASCATA — grids que hoje entram de uma vez só
   -------------------------------------------------------------------------- */
(function cascata() {
  const grids = Array.from(doc.querySelectorAll(
    '.fm-partners-grid, .fm-radar-grid, .fm-radar-areas ul'
  ));
  if (!grids.length || rm || !('IntersectionObserver' in window)) return;

  const obs = new IntersectionObserver((entradas, o) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      o.unobserve(entrada.target);
      Array.from(entrada.target.children).forEach((filho, i) => {
        filho.style.transitionDelay = Math.min(i * 55, 440) + 'ms';
        filho.classList.add('in');
      });
    });
  }, { threshold: 0.12 });

  grids.forEach((grid) => {
    Array.from(grid.children).forEach((c) => c.classList.add('fm-stagger-item'));
    obs.observe(grid);
  });
})();

/* --------------------------------------------------------------------------
   4) TILT DOS CARDS — profundidade sutil (física no cenário, não na UI densa)
   -------------------------------------------------------------------------- */
(function tiltDosCards() {
  if (rm || !fine) return;
  const cards = Array.from(doc.querySelectorAll(
    '.fm-partner-card, .fm-radar-kpi, .fm-metric'
  ));
  cards.forEach((box) => {
    box.classList.add('fm-tiltz');
    let raf = 0, rx = 0, ry = 0;
    const mover = (ev) => {
      const r = box.getBoundingClientRect();
      if (!r.width || !r.height) return;
      rx = (((ev.clientX - r.left) / r.width - 0.5) * 3).toFixed(2);
      ry = ((-(ev.clientY - r.top) / r.height + 0.5) * 3).toFixed(2);
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        box.style.transform =
          'perspective(700px) rotateY(' + rx + 'deg) rotateX(' + ry + 'deg)';
      });
    };
    const sair = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      box.style.transform = '';
    };
    on(box, 'pointermove', mover);
    on(box, 'pointerleave', sair);
  });
})();

/* --------------------------------------------------------------------------
   5) BOTÕES MAGNÉTICOS — o CTA "cede" ao cursor
   -------------------------------------------------------------------------- */
(function botoesMagneticos() {
  if (rm || !fine) return;
  const btns = Array.from(doc.querySelectorAll('.fm-btn-primary, .fm-header-cta'));
  btns.forEach((el) => {
    el.classList.add('fm-magnet');
    let raf = 0, dx = 0, dy = 0;
    const mover = (ev) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      dx = ((ev.clientX - (r.left + r.width / 2)) * 0.12).toFixed(1);
      dy = ((ev.clientY - (r.top + r.height / 2)) * 0.18).toFixed(1);
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
    };
    const sair = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      el.style.transform = '';
    };
    on(el, 'pointermove', mover);
    on(el, 'pointerleave', sair);
  });
})();

/* --------------------------------------------------------------------------
   6) SPOTLIGHT — brilho teal que acompanha o cursor (só seções escuras)
   -------------------------------------------------------------------------- */
(function spotlight() {
  if (rm || !fine) return;
  const secoes = Array.from(doc.querySelectorAll('#fm-capta, #fm-contato'));
  secoes.forEach((secao) => {
    secao.classList.add('fm-spot-host');
    const spot = doc.createElement('span');
    spot.className = 'fm-spot';
    spot.setAttribute('aria-hidden', 'true');
    secao.appendChild(spot);
    on(secao, 'pointermove', (ev) => {
      const r = secao.getBoundingClientRect();
      if (!r.width || !r.height) return;
      spot.style.setProperty('--fm-mx', ((ev.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      spot.style.setProperty('--fm-my', ((ev.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      spot.classList.add('on');
    });
    on(secao, 'pointerleave', () => spot.classList.remove('on'));
  });
})();

/* --------------------------------------------------------------------------
   7) ROLLBACK — desliga a camada sem rebuild (emergência)
   -------------------------------------------------------------------------- */
window.__fmMovimento = {
  versao: '2.4.0-f1',
  desligar() {
    cleanups.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } });
    cleanups.length = 0;
    doc.querySelectorAll('.fm-stagger-item').forEach((e) => e.classList.add('in'));
    const bar = doc.getElementById('fm-progress');
    if (bar) bar.remove();
  }
};
