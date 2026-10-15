/* ==========================================================================
   MÉTODO CAPTA+ · v2.4 · HERO 3D (módulo isolado — carregado sob demanda)
   --------------------------------------------------------------------------
   Minimalismo espacial: UM objeto (o símbolo "C+") num fundo navy infinito,
   com anéis, partículas e câmera que acompanha o cursor (LookAt + damping).

   Aceita:
     alvo       -> o elemento que recebe o canvas. No desktop é o <section>
                   .fm-hero (campo 3D por TODA a largura); no mobile é o
                   .fm-hero-stage (a composição empilhada).
     opts.lite  -> cena leve (toque): menos partículas, DPR menor.
     opts.fullBleed -> partículas espalhadas por uma área larga.
     opts.offsetX   -> função que devolve o deslocamento horizontal (fração da
                   largura, -0.5..0.5) onde o símbolo deve ficar — mantém o C+
                   alinhado ao wordmark mesmo com o canvas em tela cheia.

   Guardrails: só a paleta (navy/teal/grafite/teal-claro); fundo transparente;
   loop pausado fora da viewport e em aba oculta; DPR limitado.
   Fallback: se este módulo não carregar, o hero CSS atual permanece intacto.
   ========================================================================== */
import * as THREE from './three.module.min.js';
import { fatorNitidez } from './nitidez.js';

const TEAL = 0x0abcb0;
const TEAL_DARK = 0x067a72;
const TEAL_LIGHT = 0x7fe3d8;
const NAVY = 0x062531;

/* O símbolo: um "C" (anel com abertura à direita) extrudado + um "+" */
function criarSimbolo() {
  const grupo = new THREE.Group();

  const R = 1.0;
  const r = 0.66;
  const off = 0.60;                       // metade da abertura (radianos)
  const forma = new THREE.Shape();
  forma.absarc(0, 0, R, off, Math.PI * 2 - off, false);      // arco externo (CCW)
  forma.absarc(0, 0, r, Math.PI * 2 - off, off, true);       // arco interno (CW)

  const extrusao = new THREE.ExtrudeGeometry(forma, {
    depth: 0.34, bevelEnabled: true, bevelThickness: 0.05,
    bevelSize: 0.05, bevelSegments: 2, curveSegments: 24,
  });
  extrusao.center();

  const materialC = new THREE.MeshStandardMaterial({
    color: TEAL, emissive: TEAL_DARK, emissiveIntensity: 0.65,
    metalness: 0.36, roughness: 0.34, transparent: true, opacity: 0.96,
  });
  const meshC = new THREE.Mesh(extrusao, materialC);
  meshC.position.x = -0.62;
  grupo.add(meshC);

  const materialMais = new THREE.MeshStandardMaterial({
    color: TEAL_LIGHT, emissive: TEAL, emissiveIntensity: 0.75,
    metalness: 0.30, roughness: 0.30, transparent: true, opacity: 0.97,
  });
  const bracoLong = 1.06, esp = 0.30;
  const vBar = new THREE.Mesh(new THREE.BoxGeometry(esp, bracoLong, esp), materialMais);
  const hBar = new THREE.Mesh(new THREE.BoxGeometry(bracoLong * 0.72, esp, esp), materialMais);
  const mais = new THREE.Group();
  mais.add(vBar, hBar);
  mais.position.set(1.16, 0.02, 0.02);
  grupo.add(mais);

  return grupo;
}

/* Anéis orbitais finos (espelham o ".fm-stage-orbit" do CSS) */
function criarAneis() {
  const grupo = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: TEAL, transparent: true, opacity: 0.20, depthWrite: false,
  });
  const defs = [
    { raio: 2.15, inclina: 1.15, rot: 0.2, op: 0.16 },
    { raio: 2.65, inclina: -0.85, rot: -0.5, op: 0.09 },
  ];
  defs.forEach((d) => {
    const anel = new THREE.Mesh(new THREE.TorusGeometry(d.raio, 0.012, 8, 96), material.clone());
    anel.material.opacity = d.op;
    anel.rotation.x = d.inclina;
    anel.rotation.y = d.rot;
    grupo.add(anel);
  });
  return grupo;
}

/* Poeira teal. Com "wide", espalha por uma área larga (tela cheia). */
function criarParticulas(qtd, wide) {
  const pos = new Float32Array(qtd * 3);
  const r0 = wide ? 3.0 : 2.4;
  const r1 = wide ? 8.4 : 5.8;
  for (let i = 0; i < qtd; i++) {
    const ang = Math.random() * Math.PI * 2;
    const raio = r0 + Math.random() * (r1 - r0);
    const altura = (Math.random() - 0.5) * (wide ? 4.6 : 3.2);
    pos[i * 3] = Math.cos(ang) * raio;
    pos[i * 3 + 1] = altura;
    pos[i * 3 + 2] = Math.sin(ang) * raio;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: TEAL_LIGHT, size: 0.02, transparent: true, opacity: 0.5,
    sizeAttenuation: true, depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

export function iniciarHero(alvo, opts) {
  if (!alvo) return null;
  const lite = !!(opts && opts.lite);
  const fullBleed = !!(opts && opts.fullBleed);
  const offsetX = (opts && typeof opts.offsetX === 'function') ? opts.offsetX : null;

  let largura = alvo.clientWidth || 560;
  let altura = alvo.clientHeight || 500;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(fatorNitidez(largura, altura, lite));   // auditoria V2.5, 2.3: teto 2
  renderer.setSize(largura, altura, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const canvas = renderer.domElement;
  canvas.className = 'fm-hero-3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  alvo.appendChild(canvas);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, largura / altura, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  cena.add(new THREE.AmbientLight(NAVY, 1.6));
  const luzTeal = new THREE.DirectionalLight(TEAL_LIGHT, 2.4);
  luzTeal.position.set(3.2, 4.2, 5);
  const luzPreenche = new THREE.DirectionalLight(TEAL, 0.9);
  luzPreenche.position.set(-4.5, -2.5, 3);
  cena.add(luzTeal, luzPreenche);

  const mundo = new THREE.Group();
  const simbolo = criarSimbolo();
  const aneis = criarAneis();
  const particulas = criarParticulas(lite ? 70 : 140, fullBleed);
  mundo.add(simbolo, aneis, particulas);
  mundo.scale.setScalar(0.92);
  cena.add(mundo);

  /* Desloca o símbolo (e os anéis) para a posição do wordmark, em unidades de mundo. */
  function aplicarOffset() {
    if (!offsetX) return;
    const aspect = largura / altura || 1;
    const alturaMundo = 2 * Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
    const larguraMundo = alturaMundo * aspect;
    const fx = offsetX() || 0;
    simbolo.position.x = fx * larguraMundo;
    aneis.position.x = fx * larguraMundo;   // anéis concêntricos ao C+ (não varrem o texto)
  }
  aplicarOffset();

  // --- ponteiro (parallax da câmera) ---
  const alvoP = { x: 0, y: 0 };
  const suave = { x: 0, y: 0 };
  const aoMover = (ev) => {
    const r = alvo.getBoundingClientRect();
    if (!r.width || !r.height) return;
    alvoP.x = ((ev.clientX - r.left) / r.width - 0.5) * 2;   // -1..1
    alvoP.y = ((ev.clientY - r.top) / r.height - 0.5) * 2;
  };
  const aoSair = () => { alvoP.x = 0; alvoP.y = 0; };
  alvo.addEventListener('pointermove', aoMover, { passive: true });
  alvo.addEventListener('pointerleave', aoSair, { passive: true });

  // --- loop com pausa inteligente ---
  let rodando = true;
  let vivo = true;
  let visivel = true;
  let t = 0;
  let ultimoQuadro = 0;
  const intervalo = 1000 / 40;              // teto de ~40fps: poupa CPU/GPU

  function animar(ts) {
    if (!vivo) return;
    if (!rodando || !visivel) return;         // não agenda: economiza CPU
    requestAnimationFrame(animar);
    if (ts - ultimoQuadro < intervalo) return;          // limita o FPS
    const dt = ultimoQuadro ? Math.min(ts - ultimoQuadro, 120) : 16.7;
    ultimoQuadro = ts;
    t += 0.0055 * (dt / 16.7);

    suave.x += (alvoP.x - suave.x) * 0.055;
    suave.y += (alvoP.y - suave.y) * 0.055;

    camera.position.x = suave.x * 0.9;
    camera.position.y = -suave.y * 0.6;
    camera.lookAt(0, 0, 0);

    mundo.rotation.y = Math.sin(t * 0.6) * 0.22 + suave.x * 0.28;
    mundo.rotation.x = -suave.y * 0.18;
    aneis.rotation.z = t * 0.35;
    particulas.rotation.y = -t * 0.18;

    renderer.render(cena, camera);
  }

  const obs = ('IntersectionObserver' in window)
    ? new IntersectionObserver((ents) => {
        visivel = ents.some((e) => e.isIntersecting);
        if (visivel) { rodando = true; requestAnimationFrame(animar); }
      }, { threshold: 0.05 })
    : null;
  if (obs) obs.observe(alvo);

  const aoVisibilidade = () => { rodando = !document.hidden; if (rodando) requestAnimationFrame(animar); };
  document.addEventListener('visibilitychange', aoVisibilidade);

  const redimensionar = () => {
    largura = alvo.clientWidth || largura;
    altura = alvo.clientHeight || altura;
    if (!largura || !altura) return;
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(fatorNitidez(largura, altura, lite));
    renderer.setSize(largura, altura, false);
    aplicarOffset();
  };
  const ro = ('ResizeObserver' in window) ? new ResizeObserver(redimensionar) : null;
  if (ro) ro.observe(alvo);
  window.addEventListener('resize', redimensionar, { passive: true });

  renderer.render(cena, camera);
  requestAnimationFrame(animar);

  /* WebGL perdido: o canvas ficaria preto. Some com ele e devolve o hero CSS. */
  const aoPerderContexto = (ev) => {
    if (ev) ev.preventDefault();
    vivo = false;
    if (obs) obs.disconnect();
    try { renderer.dispose(); } catch (e) { /* noop */ }
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    document.documentElement.removeAttribute('data-fm-3d');
  };
  canvas.addEventListener('webglcontextlost', aoPerderContexto, false);

  return {
    destroy() {
      vivo = false;
      canvas.removeEventListener('webglcontextlost', aoPerderContexto);
      if (obs) obs.disconnect();
      if (ro) ro.disconnect();
      document.removeEventListener('visibilitychange', aoVisibilidade);
      window.removeEventListener('resize', redimensionar);
      alvo.removeEventListener('pointermove', aoMover);
      alvo.removeEventListener('pointerleave', aoSair);
      cena.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
  };
}
