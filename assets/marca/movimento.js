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
const rmSistema = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let optIn = false;
try { optIn = localStorage.getItem('fm-movimento') === 'on'; } catch (e) { /* noop */ }
// Override EXPLÍCITO por URL: ?3d=on (ou ?movimento=on) força o 3D/movimento neste
// dispositivo — útil quando o portão de hardware recusa (GPU emulada, driver, VM) e
// também como autodiagnóstico. Fica gravado no aparelho e pode ser desfeito pelo
// botão "Desativar movimento" (que passa a aparecer para quem forçou).
try {
  const q = new URLSearchParams(window.location.search);
  if (q.get('3d') === 'on' || q.get('movimento') === 'on') {
    optIn = true;
    try { localStorage.setItem('fm-movimento', 'on'); } catch (e) { /* noop */ }
  }
} catch (e) { /* noop */ }
const permitido = !rmSistema || optIn;   // opt-in: ver mesmo com o sistema pedindo menos
doc.documentElement.classList.toggle('fm-movimento', permitido);
const rm = !permitido;
const fine = window.matchMedia('(pointer: fine)').matches;

const cleanups = [];
const on = (el, ev, fn, opt) => {
  el.addEventListener(ev, fn, opt);
  cleanups.push(() => el.removeEventListener(ev, fn, opt));
};

/* --------------------------------------------------------------------------
   0) BOTÃO "ATIVAR MOVIMENTO" — só aparece para quem tem reduced-motion
   -------------------------------------------------------------------------- */
(function botaoMovimento() {
  if (!rmSistema && !optIn) return;       // aparece p/ quem tem reduced-motion OU forçou o 3D (?3d=on)
  const btn = doc.createElement('button');
  btn.type = 'button';
  btn.className = 'fm-mov-toggle';
  btn.setAttribute('aria-pressed', optIn ? 'true' : 'false');
  btn.textContent = optIn ? 'Desativar movimento' : 'Ativar movimento';
  btn.title = optIn
    ? 'Voltar ao modo sem movimento'
    : 'Ver as animações do site mesmo com o sistema pedindo menos';
  btn.addEventListener('click', () => {
    try {
      if (optIn) localStorage.removeItem('fm-movimento');
      else localStorage.setItem('fm-movimento', 'on');
    } catch (e) { /* noop */ }
    location.reload();
  });
  /* ANCORAGEM (auditoria V2.5): flutuando no canto inferior, o botão cobria o CTA
     principal, a faixa "as seis etapas" e a nota "Sem compromisso…" em telas
     pequenas. Agora, na home, ele é POSICIONADO (fora do fluxo) na faixa vazia
     logo acima do bloco de texto do hero — medido vazio a 390, 912 e 1440 px,
     abaixo do header e longe do palco. Fora do fluxo por dois motivos: não
     desloca nada (o palco é centralizado e o hero cresceria ~60 px = CLS 0,041)
     e não cobre conteúdo em nenhuma posição de rolagem, pois acompanha o hero.
     Nas internas (sem hero da home) entra no FLUXO, logo depois das ações —
     lá o bloco seguinte já está abaixo da dobra e o CLS medido é 0. */
  const heroCopy = doc.querySelector('.fm-hero-copy');
  const acoes = doc.querySelector('.fm-actions');
  const rodape = doc.querySelector('footer.fm-footer');
  if (heroCopy) {
    btn.classList.add('fm-mov-toggle--hero');
    heroCopy.insertBefore(btn, heroCopy.firstChild);
  } else if (acoes && acoes.parentNode) {
    acoes.parentNode.insertBefore(btn, acoes.nextSibling);
  } else if (rodape && rodape.parentNode) {
    rodape.parentNode.insertBefore(btn, rodape);
  } else {
    btn.classList.add('fm-mov-toggle--flutuante');
    doc.body.appendChild(btn);
  }
})();

/* --------------------------------------------------------------------------
   0b) NUMERAÇÃO DAS SEÇÕES — evita "01 · " repetido quando uma seção tem
   mais de um kicker (o número pertence só ao primeiro)
   -------------------------------------------------------------------------- */
(function numeracaoKicker() {
  doc.querySelectorAll('.fm-section').forEach((sec) => {
    const ks = sec.querySelectorAll('.fm-kicker');
    for (let i = 1; i < ks.length; i++) ks[i].classList.add('fm-kicker-sub');
  });
})();

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
    '.fm-radar-kpi b, .fm-radar-areas li b, .fm-metric strong, ' +
    '.fm-method-metrics b, .fm-method-metrics strong'
  ));
  if (!els.length) return;

  const alvos = [];
  els.forEach((el) => {
    const txt = (el.textContent || '').trim();
    if (!/^\d[\d.\s]*$/.test(txt)) return;            // só valores numéricos
    const n = parseInt(txt.replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(n) || n < 10) return;         // ignora números pequenos
    alvos.push({ el, n, original: txt });
  });
  if (!alvos.length) return;
  if (rm || !('IntersectionObserver' in window)) return;  // mantém o valor final

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
        item.el.textContent = String(Math.round(item.n * eased));
        if (k < 1) requestAnimationFrame(passo);
        else item.el.textContent = item.original;      // volta ao texto exato do HTML
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
    '.fm-partners-grid, .fm-radar-grid, .fm-radar-areas ul, ' +
    '.fm-mvv-grid, .fm-values-grid, .fm-method-layers, .fm-method-guarantees-grid, ' +
    '.fm-method-formal-grid, .fm-method-tech-grid, .fm-cases-grid, .fm-method-scope-list'
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
    '.fm-partner-card, .fm-radar-kpi, .fm-metric, .fm-case, ' +
    '.fm-method-layer, .fm-method-scope-card, .fm-method-formal-card'
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
  const secoes = Array.from(doc.querySelectorAll(
    '#fm-capta, #fm-contato, .fm-method-hero, .fm-method-cta-section'
  ));
  secoes.forEach((secao) => {
    secao.classList.add('fm-spot-host');
    const spot = doc.createElement('span');
    spot.className = 'fm-spot';
    spot.setAttribute('aria-hidden', 'true');
    secao.appendChild(spot);

    let raf = 0;
    let lx = 0;
    let ly = 0;
    on(secao, 'pointermove', (ev) => {
      lx = ev.clientX;                       // guarda e resolve no próximo frame
      ly = ev.clientY;                       // (1 leitura de layout por frame, no máximo)
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = secao.getBoundingClientRect();
        if (!r.width || !r.height) return;
        spot.style.setProperty('--fm-mx', ((lx - r.left) / r.width * 100).toFixed(1) + '%');
        spot.style.setProperty('--fm-my', ((ly - r.top) / r.height * 100).toFixed(1) + '%');
        spot.classList.add('on');
      });
    });
    on(secao, 'pointerleave', () => spot.classList.remove('on'));
  });
})();

/* --------------------------------------------------------------------------
   7) TIPOGRAFIA CINÉTICA — H1 revelado por linha (máscara)
   Embrulha cada linha do H1 (split no <br>) e revela com cortina.
   Sem JS / reduced-motion: o texto permanece simples e visível.
   -------------------------------------------------------------------------- */
(function tituloCinetico() {
  if (rm) return;
  const h1 = doc.querySelector('.fm-hero h1, .fm-method-hero h1');
  if (!h1) return;

  const linhas = /<br\s*\/?>/i.test(h1.innerHTML)
    ? h1.innerHTML.split(/<br\s*\/?>/i).map((l) => l.trim())
    : [h1.innerHTML.trim()];
  if (!linhas.length) return;
  h1.innerHTML = linhas
    .map((l) => '<span class="fm-kin-line"><span class="fm-kin-in">' + l + '</span></span>')
    .join('');
  h1.classList.add('fm-kinetic-title');

  if (!('IntersectionObserver' in window)) { h1.classList.add('in'); return; }
  const obs = new IntersectionObserver((entradas, o) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      o.unobserve(h1);
      h1.classList.add('in');
    });
  }, { threshold: 0.2 });
  obs.observe(h1);
})();

/* --------------------------------------------------------------------------
   8) MARQUEE — a faixa do hero vira um fluxo contínuo
   Duplica o conteúdo uma vez (o clone é decorativo: aria-hidden).
   -------------------------------------------------------------------------- */
(function marqueeDoStrip() {
  if (rm) return;
  const strip = doc.querySelector('.fm-hero-strip');
  if (!strip || strip.children.length < 2) return;

  const track = doc.createElement('div');
  track.className = 'fm-marquee-track';
  const grupo = doc.createElement('div');
  grupo.className = 'fm-marquee-grupo';
  Array.from(strip.childNodes).forEach((n) => grupo.appendChild(n));
  track.appendChild(grupo);

  const clone = grupo.cloneNode(true);
  clone.setAttribute('aria-hidden', 'true');
  track.appendChild(clone);

  strip.appendChild(track);
  strip.classList.add('fm-marquee');
})();

/* --------------------------------------------------------------------------
   9) H2 COM VARREDURA — cada título de seção entra com um "wipe" lateral
   -------------------------------------------------------------------------- */
(function h2Varredura() {
  if (rm) return;
  const h2s = Array.from(doc.querySelectorAll('section h2'));
  if (!h2s.length) return;
  h2s.forEach((h) => h.classList.add('fm-wipe'));

  if (!('IntersectionObserver' in window)) { h2s.forEach((h) => h.classList.add('in')); return; }
  const obs = new IntersectionObserver((entradas, o) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      o.unobserve(e.target);
      e.target.classList.add('in');
    });
  }, { threshold: 0.25 });
  h2s.forEach((h) => obs.observe(h));
})();

/* --------------------------------------------------------------------------
   10) HERO 3D — minimalismo espacial (import dinâmico, só se o aparelho aguentar)
   -------------------------------------------------------------------------- */
let hero3D = null;
let radar3D = null;
let mapa3D = null;
let ambientes = [];

/* Renderização por SOFTWARE (SwiftShader/llvmpipe/Basic Render). Sem GPU, o
   WebGL roda na CPU e TRAVA a thread principal — é o que derruba o TBT em
   ambientes sem aceleração (o Chromium headless do Lighthouse é um deles).
   Nesses casos usamos o fallback CSS/2D, que já existe. Retorna false quando
   não é possível saber (sem contexto WebGL) para não penalizar o visitante. */
function renderizacaoPorSoftware() {
  try {
    const prova = doc.createElement('canvas');
    const gl = prova.getContext('webgl2') || prova.getContext('webgl');
    if (!gl) return false;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return false;
    const nome = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    return /swiftshader|software|llvmpipe|softpipe|basic render|microsoft basic|mesa offscreen|virtualbox|vmware|emulator/i.test(nome);
  } catch (e) { return false; }
}

/* Agenda trabalho pesado para DEPOIS da página estar carregada e ociosa:
   não compete com a 1ª pintura nem com o TBT da janela de carregamento. */
function emOcioso(fn) {
  if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 350);
}

async function capacidade3D(software) {
  try {
    if (!window.WebGL2RenderingContext) return false;
    // GPU emulada (sem aceleração): o WebGL roda na CPU e trava a thread principal
    // — vetado por padrão. EXCEÇÃO: quem CLICOU "ativar movimento" (optIn) pediu a
    // experiência completa; a escolha do visitante vale (e usamos cenas leves).
    if (software && !optIn) return false;
    const prova = doc.createElement('canvas');
    if (!prova.getContext('webgl2')) return false;
    const ram = navigator.deviceMemory;
    if (typeof ram === 'number' && ram < 4) return false;          // aparelho fraco
    const cpu = navigator.hardwareConcurrency;
    if (typeof cpu === 'number' && cpu < 4) return false;
    if (navigator.connection && navigator.connection.saveData) return false;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-data: reduce)').matches) return false;
    return true;
  } catch (e) { return false; }
}

async function tridimensional() {
  if (rm) return;
  const software = renderizacaoPorSoftware();
  if (!(await capacidade3D(software))) return;
  const lite = !fine || software;   // toque OU GPU emulada: cenas mais leves

  // Mapa 3D do método (F4): registro IMEDIATO do observador (antes dos awaits do
  // hero/radar, que são pesados) — e o import só dispara quando a seção do método
  // se aproxima da viewport (ela fica a ~6.700 px do topo). Assim o mapa não
  // disputa banda/CPU no carregamento inicial e chega na hora em que é visto.
  // O 3D NAVEGA; o texto (nome/artefato/plataforma) segue no HTML.
  const areaMetodo = doc.querySelector('.fm-capta-section .fm-capta-visual');
  if (areaMetodo && 'IntersectionObserver' in window) {
    let mapaMontado = false;
    const montarMapa = () => {
      if (mapaMontado) return;
      mapaMontado = true;
      if (obsMapa) obsMapa.disconnect();
      import('./tres/mapa-3d.js').then((mod) => {
        if (mod && typeof mod.iniciarMapa === 'function') {
          mapa3D = mod.iniciarMapa(areaMetodo, { lite: lite });
          if (mapa3D) {
            doc.documentElement.setAttribute('data-fm-mapa3d', 'on');
            /* Auditoria V2.5: o balão comprido do WhatsApp passava por cima do
               rótulo da etapa 01. Enquanto a seção do método está em cena ele
               recolhe para ícone (o WhatsApp segue a um toque); fora dela volta. */
            const sec = doc.querySelector('.fm-capta-section');
            if (sec) {
              const obsZap = new IntersectionObserver((es) => {
                if (es.some((e) => e.isIntersecting)) {
                  doc.documentElement.setAttribute('data-fm-mapa-em-cena', '');
                } else {
                  doc.documentElement.removeAttribute('data-fm-mapa-em-cena');
                }
              }, { threshold: 0.06 });
              obsZap.observe(sec);
            }
          }
        }
      }).catch(() => { /* fallback: imagem + anéis 2D */ });
    };
    const obsMapa = new IntersectionObserver((ents) => {
      if (!ents.some((e) => e.isIntersecting)) return;
      montarMapa();
    }, { rootMargin: '700px 0px' });
    obsMapa.observe(areaMetodo);
    /* REDE DE SEGURANÇA (corrida medida na auditoria): quando o observador é
       registrado com a seção JÁ dentro do alcance, não há transição para
       observar e o mapa podia nunca montar — o visitante via só a imagem.
       A checagem aqui é geométrica e imediata, no mesmo tique. */
    const r = areaMetodo.getBoundingClientRect();
    const alcance = (window.innerHeight || 800) + 700;
    if (r.top < alcance && r.bottom > -700) montarMapa();
  }

  // Hero: o símbolo "C+" (minimalismo espacial).
  // Desktop: campo 3D por TODA a largura do hero, com o símbolo alinhado ao wordmark.
  // Mobile: mantém o canvas no palco (a composição é empilhada).
  const hero = doc.querySelector('.fm-hero');
  const stage = doc.querySelector('.fm-hero-stage');
  const telaCheia = !!(hero && stage && window.innerWidth >= 1024);
  const alvo3d = telaCheia ? hero : stage;
  if (alvo3d) {
    const obterOffsetX = () => {
      if (!telaCheia) return 0;
      const rh = hero.getBoundingClientRect();
      const rs = stage.getBoundingClientRect();
      if (!rh.width || !rs.width) return 0;
      return (rs.left + rs.width / 2 - (rh.left + rh.width / 2)) / rh.width;
    };
    try {
      const mod = await import('./tres/hero-3d.js');
      if (mod && typeof mod.iniciarHero === 'function') {
        hero3D = mod.iniciarHero(alvo3d, { lite: lite, fullBleed: telaCheia, offsetX: obterOffsetX });
        if (hero3D) doc.documentElement.setAttribute('data-fm-3d', 'on');
      }
    } catch (e) { /* fallback: hero CSS */ }
  }

  // Radar: a nuvem que se filtra num funil (o 3D enquadra o número)
  const secRadar = doc.querySelector('.fm-radar-section');
  if (secRadar) {
    try {
      const mod = await import('./tres/radar-3d.js');
      if (mod && typeof mod.iniciarRadar === 'function') {
        radar3D = mod.iniciarRadar(secRadar, { lite: lite });
        if (radar3D) {
          doc.documentElement.setAttribute('data-fm-radar3d', 'on');
          const sw = doc.querySelector('.fm-radar-sweep');
          if (sw) sw.remove();          // o 3D substitui a varredura 2D
        }
      }
    } catch (e) { /* fallback: varredura 2D */ }
  }
}

/* O 3D só é disparado DEPOIS do load e em tempo ocioso — e nunca quando a
   renderização é por software (sem GPU). Assim ele deixa de competir com a
   janela de carregamento (FCP/LCP/TBT) e o fallback CSS assume o lugar. */
if (!rm) {
  const disparar3D = () => emOcioso(tridimensional);
  if (doc.readyState === 'complete') disparar3D();
  else on(window, 'load', disparar3D);
}

/* --------------------------------------------------------------------------
   11) MÉTODO — storytelling por scroll: a etapa que cruza o centro "acende"
   Reusa a interação que JÁ existe (mouseenter/focus/click → painel). Se o
   usuário interagir por conta própria, paramos de dirigir por scroll.
   -------------------------------------------------------------------------- */
(function metodoStorytelling() {
  if (rm) return;
  const pillars = Array.from(doc.querySelectorAll('.fm-capta-section .fm-pillars .fm-pillar'));
  if (pillars.length < 2) return;

  let manual = false;
  const marcarManual = (ev) => { if (ev && ev.isTrusted === false) return; manual = true; };
  ['mouseenter', 'click', 'focusin', 'pointerdown', 'keydown'].forEach((ev) =>
    pillars.forEach((p) => p.addEventListener(ev, marcarManual, { passive: true })));

  let atual = -1;
  let ticking = false;
  let centros = [];     // centro de cada etapa, em coordenadas do documento
  let alturas = [];

  function medir() {                       // 1 leitura de layout por etapa (não por frame)
    centros = []; alturas = [];
    pillars.forEach((p) => {
      const r = p.getBoundingClientRect();
      centros.push(r.top + window.scrollY + r.height / 2);
      alturas.push(r.height);
    });
  }

  function atualizar() {
    ticking = false;
    if (manual || !centros.length) return;
    const topo = window.scrollY;
    const base = topo + window.innerHeight;
    const cy = topo + window.innerHeight / 2;
    let melhor = -1;
    let dist = Infinity;
    for (let i = 0; i < centros.length; i++) {
      const c = centros[i];
      const h = alturas[i] || 0;
      if (c + h / 2 < topo || c - h / 2 > base) continue;   // fora da tela
      const d = Math.abs(c - cy);
      if (d < dist) { dist = d; melhor = i; }
    }
    if (melhor >= 0 && melhor !== atual) {
      atual = melhor;
      pillars[melhor].dispatchEvent(new MouseEvent('mouseenter'));   // acende a etapa
    }
  }

  function agendar() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(atualizar);
  }
  const remedir = () => { medir(); agendar(); };

  medir();
  on(window, 'scroll', agendar, { passive: true });
  on(window, 'resize', remedir, { passive: true });
  on(window, 'load', remedir);

  // com content-visibility, a seção fora da tela não é "medida": re-mede ao aparecer
  const secCaps = doc.querySelector('.fm-capta-section');
  if (secCaps && 'IntersectionObserver' in window) {
    const ioCap = new IntersectionObserver((ents) => {
      if (ents.some((e) => e.isIntersecting)) { medir(); agendar(); }
    }, { threshold: 0.01 });
    ioCap.observe(secCaps);
    cleanups.push(() => ioCap.disconnect());
  }
  agendar();
})();

/* --------------------------------------------------------------------------
   12) RADAR — varredura decorativa (HUD), atrás do conteúdo
   -------------------------------------------------------------------------- */
(function radarVarredura() {
  if (rm) return;
  const sec = doc.querySelector('.fm-radar-section');
  if (!sec || sec.querySelector('.fm-radar-sweep')) return;

  const sweep = doc.createElement('div');
  sweep.className = 'fm-radar-sweep';
  sweep.setAttribute('aria-hidden', 'true');
  sweep.innerHTML = '<span class="fm-radar-ring"></span><span class="fm-radar-ring"></span>' +
                    '<span class="fm-radar-ring"></span><span class="fm-radar-beam"></span>';
  sec.insertBefore(sweep, sec.firstChild);
  sec.classList.add('fm-radar-host');

  cleanups.push(() => {
    sweep.remove();
    sec.classList.remove('fm-radar-host');
  });
})();

/* --------------------------------------------------------------------------
   13) TERMOS-CHAVE — sublinhado que "desenha" ao entrar na tela
   -------------------------------------------------------------------------- */
(function termosChave() {
  if (rm) return;
  const alvos = Array.from(doc.querySelectorAll(
    '#fm-problema strong, #fm-decisao strong, #fm-comparativo strong'
  ));
  if (!alvos.length) return;
  alvos.forEach((s) => s.classList.add('fm-forte'));
  if (!('IntersectionObserver' in window)) { alvos.forEach((s) => s.classList.add('in')); return; }
  const obs = new IntersectionObserver((ents, o) => {
    ents.forEach((e) => {
      if (!e.isIntersecting) return;
      o.unobserve(e.target);
      e.target.classList.add('in');
    });
  }, { threshold: 0.6 });
  alvos.forEach((s) => obs.observe(s));
})();

/* --------------------------------------------------------------------------
   14) AMBIENTE — campo de partículas leve nas demais seções escuras
   (Canvas 2D: barato, roda também no mobile; nunca compete com o conteúdo)
   -------------------------------------------------------------------------- */
(function ambienteNasSecoes() {
  if (rm) return;
  if (renderizacaoPorSoftware()) return;    // GPU emulada: sem partículas de fundo
  const alvos = Array.from(doc.querySelectorAll(
    '#fm-parceiros, #fm-destaques, #fm-publico, #fm-riscos, #fm-decisao'
  ));
  if (!alvos.length) return;
  emOcioso(() => import('./ambiente-particulas.js').then((mod) => {
    if (!mod || typeof mod.iniciarAmbiente !== 'function') return;
    ambientes = alvos.map((s) => mod.iniciarAmbiente(s, { lite: !fine })).filter(Boolean);
    if (ambientes.length) doc.documentElement.setAttribute('data-fm-ambiente', 'on');
  }).catch(() => { /* fallback: seção como está */ }));
})();

/* --------------------------------------------------------------------------
   15) ROLLBACK — desliga a camada sem rebuild (emergência)
   -------------------------------------------------------------------------- */
window.__fmMovimento = {
  versao: '2.4.7',
  desligar() {
    cleanups.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } });
    cleanups.length = 0;
    doc.querySelectorAll('.fm-stagger-item, .fm-kinetic-title, .fm-wipe, .fm-forte')
      .forEach((e) => e.classList.add('in'));
    if (hero3D && typeof hero3D.destroy === 'function') {
      try { hero3D.destroy(); } catch (e) { /* noop */ }
      hero3D = null;
      doc.documentElement.removeAttribute('data-fm-3d');
    }
    if (radar3D && typeof radar3D.destroy === 'function') {
      try { radar3D.destroy(); } catch (e) { /* noop */ }
      radar3D = null;
      doc.documentElement.removeAttribute('data-fm-radar3d');
    }
    if (mapa3D && typeof mapa3D.destroy === 'function') {
      try { mapa3D.destroy(); } catch (e) { /* noop */ }
      mapa3D = null;
      doc.documentElement.removeAttribute('data-fm-mapa3d');
    }
    if (ambientes.length) {
      ambientes.forEach((a) => { try { a.destroy(); } catch (e) { /* noop */ } });
      ambientes = [];
      doc.documentElement.removeAttribute('data-fm-ambiente');
    }
    const bar = doc.getElementById('fm-progress');
    if (bar) bar.remove();
  }
};
