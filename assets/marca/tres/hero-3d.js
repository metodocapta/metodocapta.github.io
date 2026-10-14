/* ==========================================================================
   MÉTODO CAPTA+ · v2.4 · HERO 3D (módulo isolado — carregado sob demanda)
   --------------------------------------------------------------------------
   Minimalismo espacial: UM objeto (o símbolo "C+") num fundo navy infinito,
   com anéis, partículas e câmera que acompanha o cursor (LookAt + damping).

   Só é importado quando o aparelho aguenta (ver movimento.js):
     - WebGL2 + deviceMemory >= 4 + sem saveData + pointer:fine + sem reduced-motion.

   Guardrails: só a paleta (navy/teal/grafite/teal-claro); fundo transparente;
   loop pausado fora da viewport e em aba oculta; DPR limitado a 2.
   Fallback: se este módulo não carregar, o hero CSS atual permanece intacto.
   ========================================================================== */
import * as THREE from './three.module.min.js';

const TEAL = 0x0abcb0;
const TEAL_DARK = 0x067a72;
const TEAL_LIGHT = 0x7fe3d8;
const NAVY = 0x062531;

/* O símbolo: um "C" (anel com abertura à direita) extrudado + um "+" */
function criarSimbolo() {
  const grupo = new THREE.Group();

  // --- "C": banda circular com abertura à direita ---
  const R = 1.0;
  const r = 0.66;
  const off = 0.60;                       // metade da abertura (radianos)
  const forma = new THREE.Shape();
  forma.absarc(0, 0, R, off, Math.PI * 2 - off, false);      // arco externo (CCW)
  forma.absarc(0, 0, r, Math.PI * 2 - off, off, true);       // arco interno (CW)

  const extrusao = new THREE.ExtrudeGeometry(forma, {
    depth: 0.34, bevelEnabled: true, bevelThickness: 0.05,
    bevelSize: 0.05, bevelSegments: 3, curveSegments: 96,
  });
  extrusao.center();

  const materialC = new THREE.MeshStandardMaterial({
    color: TEAL, emissive: TEAL_DARK, emissiveIntensity: 0.65,
    metalness: 0.36, roughness: 0.34, transparent: true, opacity: 0.96,
  });
  const meshC = new THREE.Mesh(extrusao, materialC);
  meshC.position.x = -0.62;
  grupo.add(meshC);

  // --- "+": dois blocos (vertical + horizontal) ---
  const materialMais = new THREE.MeshStandardMaterial({
    color: TEAL_LIGHT, emissive: TEAL, emissiveIntensity: 0.75,
    metalness: 0.30, roughness: 0.30, transparent: true, opacity: 0.97,
  });
  const bracoLong = 1.06, bracoCurto = 0.30, esp = 0.30;
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
    { raio: 2.55, inclina: 1.15, rot: 0.2, op: 0.20 },
    { raio: 3.10, inclina: -0.85, rot: -0.5, op: 0.12 },
  ];
  defs.forEach((d) => {
    const anel = new THREE.Mesh(new THREE.TorusGeometry(d.raio, 0.012, 12, 220), material.clone());
    anel.material.opacity = d.op;
    anel.rotation.x = d.inclina;
    anel.rotation.y = d.rot;
    grupo.add(anel);
  });
  return grupo;
}

/* Poeira teal (poucas partículas, opacidade baixa) */
function criarParticulas(qtd) {
  const pos = new Float32Array(qtd * 3);
  for (let i = 0; i < qtd; i++) {
    const ang = Math.random() * Math.PI * 2;
    const raio = 2.4 + Math.random() * 3.4;
    const altura = (Math.random() - 0.5) * 3.2;
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

export function iniciarHero(stage, opts) {
  if (!stage) return null;
  const lite = !!(opts && opts.lite);   // toque: cena mais leve

  let largura = stage.clientWidth || 560;
  let altura = stage.clientHeight || 500;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.5));
  renderer.setSize(largura, altura, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const canvas = renderer.domElement;
  canvas.className = 'fm-hero-3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);

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
  const particulas = criarParticulas(lite ? 120 : 260);
  mundo.add(simbolo, aneis, particulas);
  mundo.scale.setScalar(0.92);
  cena.add(mundo);

  // --- ponteiro (parallax da câmera) ---
  const alvo = { x: 0, y: 0 };
  const suave = { x: 0, y: 0 };
  const aoMover = (ev) => {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    alvo.x = ((ev.clientX - r.left) / r.width - 0.5) * 2;   // -1..1
    alvo.y = ((ev.clientY - r.top) / r.height - 0.5) * 2;   // -1..1
  };
  const aoSair = () => { alvo.x = 0; alvo.y = 0; };
  stage.addEventListener('pointermove', aoMover, { passive: true });
  stage.addEventListener('pointerleave', aoSair, { passive: true });

  // --- loop com pausa inteligente ---
  let rodando = true;
  let vivo = true;
  let visivel = true;
  let t = 0;

  function animar() {
    if (!vivo) return;
    if (!rodando || !visivel) return;         // não agenda: economiza CPU
    requestAnimationFrame(animar);
    t += 0.0055;

    suave.x += (alvo.x - suave.x) * 0.055;
    suave.y += (alvo.y - suave.y) * 0.055;

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
  if (obs) obs.observe(stage);

  const aoVisibilidade = () => { rodando = !document.hidden; if (rodando) requestAnimationFrame(animar); };
  document.addEventListener('visibilitychange', aoVisibilidade);

  const redimensionar = () => {
    largura = stage.clientWidth || largura;
    altura = stage.clientHeight || altura;
    if (!largura || !altura) return;
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
    renderer.setSize(largura, altura, false);
  };
  const ro = ('ResizeObserver' in window) ? new ResizeObserver(redimensionar) : null;
  if (ro) ro.observe(stage);
  window.addEventListener('resize', redimensionar, { passive: true });

  // 1ª renderização imediata (não espera o observer)
  renderer.render(cena, camera);
  requestAnimationFrame(animar);

  return {
    destroy() {
      vivo = false;
      if (obs) obs.disconnect();
      if (ro) ro.disconnect();
      document.removeEventListener('visibilitychange', aoVisibilidade);
      window.removeEventListener('resize', redimensionar);
      stage.removeEventListener('pointermove', aoMover);
      stage.removeEventListener('pointerleave', aoSair);
      cena.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
  };
}
