/* ==========================================================================
   MÉTODO CAPTA+ · v2.4 · RADAR 3D (módulo isolado — carregado sob demanda)
   --------------------------------------------------------------------------
   Metáfora do Radar: uma nuvem dispersa de partículas que se FILTRA e
   CONVERGE para um funil central — onde ficam os poucos "com aderência".
   O 3D ENQUADRA o número (1689 -> 10); nunca o substitui.

   Reusa o Three.js já carregado pelo hero (mesmo módulo = mesmo download).
   Guardrails: paleta navy/teal/teal-claro; fundo transparente; loop pausado
   fora da viewport e em aba oculta; DPR <= 2. Fallback: a varredura 2D atual.
   ========================================================================== */
import * as THREE from './three.module.min.js';

const TEAL = 0x0abcb0;
const TEAL_LIGHT = 0x7fe3d8;

const N = 1400;        // partículas da nuvem
const NUCLEO = 12;     // as que "ficam" (com aderência)

const suave = (x) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export function iniciarRadar(sec) {
  if (!sec) return null;

  let largura = sec.clientWidth || 1100;
  let altura = sec.clientHeight || 720;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(largura, altura, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const canvas = renderer.domElement;
  canvas.className = 'fm-radar-3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  sec.appendChild(canvas);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, largura / altura, 0.1, 200);
  camera.position.set(0, 1.4, 12.5);

  // --- funil: 3 anéis que afunilam ---
  const funil = new THREE.Group();
  [3.0, 2.0, 1.05].forEach((r, i) => {
    const anel = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.012, 10, 150),
      new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.18 - i * 0.035, depthWrite: false })
    );
    anel.rotation.x = Math.PI / 2;
    anel.position.y = 1.7 - i * 1.55;
    funil.add(anel);
  });
  cena.add(funil);

  // --- nuvem de partículas: dispersa -> converge ---
  const pos = new Float32Array(N * 3);
  const inicio = new Float32Array(N * 3);
  const fim = new Float32Array(N * 3);
  const atraso = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const ang = Math.random() * Math.PI * 2;
    const raio = 3.2 + Math.random() * 5.6;
    inicio[i * 3] = Math.cos(ang) * raio;
    inicio[i * 3 + 1] = (Math.random() - 0.5) * 7.4 + 1.4;
    inicio[i * 3 + 2] = Math.sin(ang) * raio;

    const prof = Math.random();                       // 0 topo -> 1 base do funil
    const r2 = 0.16 + (1 - prof) * 0.85;
    const a2 = Math.random() * Math.PI * 2;
    fim[i * 3] = Math.cos(a2) * r2;
    fim[i * 3 + 1] = 1.7 - prof * 3.1;
    fim[i * 3 + 2] = Math.sin(a2) * r2;

    atraso[i] = Math.random();
    pos[i * 3] = inicio[i * 3];
    pos[i * 3 + 1] = inicio[i * 3 + 1];
    pos[i * 3 + 2] = inicio[i * 3 + 2];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const nuvem = new THREE.Points(geo, new THREE.PointsMaterial({
    color: TEAL_LIGHT, size: 0.05, transparent: true, opacity: 0.62,
    sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  cena.add(nuvem);

  // --- núcleo: as poucas que "passam no filtro" ---
  const nucPos = new Float32Array(NUCLEO * 3);
  for (let i = 0; i < NUCLEO; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.12 + Math.random() * 0.26;
    nucPos[i * 3] = Math.cos(a) * r;
    nucPos[i * 3 + 1] = -1.44 + (Math.random() - 0.5) * 0.45;
    nucPos[i * 3 + 2] = Math.sin(a) * r;
  }
  const nucGeo = new THREE.BufferGeometry();
  nucGeo.setAttribute('position', new THREE.BufferAttribute(nucPos, 3));
  const nucleo = new THREE.Points(nucGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.14, transparent: true, opacity: 0.95,
    sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  cena.add(nucleo);

  // --- ponteiro (parallax) ---
  const alvo = { x: 0, y: 0 };
  const sm = { x: 0, y: 0 };
  const aoMover = (ev) => {
    const r = sec.getBoundingClientRect();
    if (!r.width || !r.height) return;
    alvo.x = ((ev.clientX - r.left) / r.width - 0.5) * 2;
    alvo.y = ((ev.clientY - r.top) / r.height - 0.5) * 2;
  };
  const aoSair = () => { alvo.x = 0; alvo.y = 0; };
  sec.addEventListener('pointermove', aoMover, { passive: true });
  sec.addEventListener('pointerleave', aoSair, { passive: true });

  // --- loop (ciclo: converge -> sustenta -> dispersa) ---
  let vivo = true;
  let visivel = true;
  let extra = 0;                 // empurrão de scroll (opcional)
  let t0 = performance.now();

  function animar(agora) {
    if (!vivo) return;
    if (!visivel || document.hidden) return;   // não agenda: economiza GPU
    requestAnimationFrame(animar);

    const tempo = (agora - t0) / 1000;
    const ciclo = (tempo % 9) / 9;
    let alvoK;
    if (ciclo < 0.5) alvoK = ciclo / 0.5;             // converge
    else if (ciclo < 0.72) alvoK = 1;                 // sustenta
    else alvoK = 1 - (ciclo - 0.72) / 0.28;           // dispersa

    sm.x += (alvo.x - sm.x) * 0.05;
    sm.y += (alvo.y - sm.y) * 0.05;

    const p = geo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      const k = suave((alvoK - atraso[i] * 0.4 - extra) / 0.6);
      p[i * 3] = inicio[i * 3] * (1 - k) + fim[i * 3] * k;
      p[i * 3 + 1] = inicio[i * 3 + 1] * (1 - k) + fim[i * 3 + 1] * k;
      p[i * 3 + 2] = inicio[i * 3 + 2] * (1 - k) + fim[i * 3 + 2] * k;
    }
    geo.attributes.position.needsUpdate = true;

    nuvem.rotation.y = tempo * 0.06 + sm.x * 0.25;
    funil.rotation.y = -tempo * 0.1;
    nucleo.scale.setScalar(0.85 + Math.sin(tempo * 2.2) * 0.12);

    camera.position.x = sm.x * 0.8;
    camera.position.y = 1.4 - sm.y * 0.5;
    camera.lookAt(0, 0.2, 0);

    renderer.render(cena, camera);
  }

  const obs = ('IntersectionObserver' in window)
    ? new IntersectionObserver((ents) => {
        const antes = visivel;
        visivel = ents.some((e) => e.isIntersecting);
        if (visivel && !antes) requestAnimationFrame(animar);
      }, { threshold: 0.05 })
    : null;
  if (obs) obs.observe(sec);

  const aoVisibilidade = () => { if (!document.hidden && visivel) requestAnimationFrame(animar); };
  document.addEventListener('visibilitychange', aoVisibilidade);

  const redimensionar = () => {
    largura = sec.clientWidth || largura;
    altura = sec.clientHeight || altura;
    if (!largura || !altura) return;
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
    renderer.setSize(largura, altura, false);
  };
  const ro = ('ResizeObserver' in window) ? new ResizeObserver(redimensionar) : null;
  if (ro) ro.observe(sec);
  window.addEventListener('resize', redimensionar, { passive: true });

  t0 = performance.now();
  renderer.render(cena, camera);
  requestAnimationFrame(animar);

  return {
    destroy() {
      vivo = false;
      if (obs) obs.disconnect();
      if (ro) ro.disconnect();
      document.removeEventListener('visibilitychange', aoVisibilidade);
      window.removeEventListener('resize', redimensionar);
      sec.removeEventListener('pointermove', aoMover);
      sec.removeEventListener('pointerleave', aoSair);
      cena.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
  };
}
