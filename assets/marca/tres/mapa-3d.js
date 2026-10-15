/* ==========================================================================
   MÉTODO CAPTA+ · v2.5 · MAPA 3D DO MÉTODO (F4 — módulo isolado, sob demanda)
   --------------------------------------------------------------------------
   As SEIS etapas como SISTEMA navegável: uma hélice ascendente onde cada etapa
   é um nó; o nó ativo acende e a câmera o enquadra.

   Contrato (importante):
   • O 3D NAVEGA, não substitui o conteúdo. Os nomes/artefatos continuam no HTML
     (cards .fm-pillar + painéis #fm-engine) — interface acessível, indexável e
     a que funciona sem WebGL.
   • A fonte da verdade é a interação que JÁ EXISTE: clicar num nó chama
     .click() no card correspondente; a ativação (por clique, foco, hover ou
     scroll) é observada no DOM via MutationObserver. Zero duplicação de estado.
   • Reusa o Three.js já baixado pelo hero (mesmo módulo = mesmo download).
   Guardrails: paleta da marca; fundo transparente; loop pausado fora da
   viewport e em aba oculta; DPR <= 2. Fallback: a imagem + os anéis 2D atuais.
   ========================================================================== */
import * as THREE from './three.module.min.js';
import { fatorNitidez } from './nitidez.js';

const TEAL = 0x0abcb0;
const TEAL_LIGHT = 0x7fe3d8;

export function iniciarMapa(alvo, opts) {
  if (!alvo) return null;
  const lite = !!(opts && opts.lite);

  /* ---------------------------------------------------------- 1) as 6 etapas */
  const cards = Array.prototype.slice.call(document.querySelectorAll('.fm-capta-section .fm-pillars .fm-pillar'));
  if (cards.length < 2) return null;
  const N = cards.length;

  // rótulos lidos do PRÓPRIO HTML (sem duplicar conteúdo no JS)
  const rotulos = cards.map((c) => {
    const s = c.querySelector('span');
    return s ? s.textContent.replace(/\s+/g, ' ').trim() : '';
  });

  const nos = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const r = 2.5 - i * 0.15;                      // espiral que afina ao subir
    nos.push(new THREE.Vector3(Math.cos(a) * r, -2.0 + i * (4.0 / (N - 1)), Math.sin(a) * r));
  }

  /* ------------------------------------------------------------- 2) cena */
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const canvas = renderer.domElement;
  canvas.className = 'fm-mapa3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  // caixa (sobre a imagem) + rótulos em HTML (acessíveis ficam nos cards)
  const caixa = document.createElement('div');
  caixa.className = 'fm-mapa3d';
  caixa.setAttribute('aria-hidden', 'true');
  caixa.appendChild(canvas);
  const els = nos.map((_, i) => {
    const s = document.createElement('span');
    s.className = 'fm-mapa3d-rot';
    s.textContent = rotulos[i];
    caixa.appendChild(s);
    return s;
  });
  alvo.appendChild(caixa);

  let largura = alvo.clientWidth || 520;
  let altura = alvo.clientHeight || 560;
  renderer.setPixelRatio(fatorNitidez(largura, altura, lite));   // auditoria V2.5, 2.3: teto 2
  renderer.setSize(largura, altura, false);

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, largura / altura, 0.1, 100);
  camera.position.set(0, 0.15, 9.2);

  const grupo = new THREE.Group();
  cena.add(grupo);

  // Enquadra o conjunto em QUALQUER proporção (mobile estreito incluído):
  // encolhe a hélice com folga, para os rótulos das pontas não saírem da caixa.
  function enquadrar() {
    if (!largura || !altura) return;
    const s = Math.max(0.5, Math.min(1, Math.min(largura / 760, altura / 640)));
    grupo.scale.setScalar(s);
  }

  // --- caminho: a curva que liga as etapas (o "fluxo" do método em 3D) ---
  const curva = new THREE.CatmullRomCurve3(nos, false, 'catmullrom', 0.4);
  const trilha = new THREE.Mesh(
    new THREE.TubeGeometry(curva, 220, 0.011, 6, false),
    new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.32, depthWrite: false })
  );
  grupo.add(trilha);

  // --- nós: anel + núcleo (um material por etapa, para acender individual) ---
  const aneis = [];
  const nucleos = [];
  const alvosRay = [];
  nos.forEach((p) => {
    const anel = new THREE.Mesh(
      new THREE.TorusGeometry(0.33, 0.011, 8, 76),
      new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.34, depthWrite: false })
    );
    anel.position.copy(p);
    grupo.add(anel);
    aneis.push(anel);

    const nucleo = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      new THREE.MeshBasicMaterial({ color: TEAL_LIGHT, transparent: true, opacity: 0.85, depthWrite: false })
    );
    nucleo.position.copy(p);
    grupo.add(nucleo);
    nucleos.push(nucleo);

  });

  // área de toque (invisível mas "raycastável"): as 6 esferas viraram UM
  // InstancedMesh (auditoria V2.5, §2.4 / §8 #11). Eram 6 draw calls por quadro
  // que não desenhavam nada; agora é 1. O índice da etapa vem do instanceId —
  // os anéis e os núcleos seguem individuais porque animam OPACIDADE por
  // material (não há opacidade por instância).
  const toque = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.52, 8, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    N
  );
  const matrizToque = new THREE.Matrix4();
  nos.forEach((p, i) => {
    matrizToque.makeTranslation(p.x, p.y, p.z);
    toque.setMatrixAt(i, matrizToque);
  });
  toque.instanceMatrix.needsUpdate = true;
  toque.frustumCulled = false;   // as instâncias não entram no bound do mesh
  grupo.add(toque);
  alvosRay.push(toque);

  // --- campo de partículas (profundidade, sem peso visual) ---
  const NP = lite ? 110 : 180;
  const pp = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) {
    pp[i * 3] = (Math.random() - 0.5) * 15;
    pp[i * 3 + 1] = (Math.random() - 0.5) * 11;
    pp[i * 3 + 2] = (Math.random() - 0.5) * 9 - 1.5;
  }
  const pgeo = new THREE.BufferGeometry();
  pgeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const poeira = new THREE.Points(pgeo, new THREE.PointsMaterial({
    color: TEAL_LIGHT, size: 0.035, transparent: true, opacity: 0.42,
    sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  grupo.add(poeira);

  /* --------------------------------------------------- 3) estado + interação */
  let ativa = 0;          // índice da etapa ativa
  let hover = -1;

  // a etapa ativa segue a interação que JÁ EXISTE no DOM
  function lerAtiva() {
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].classList.contains('is-ativa')) return i;
    }
    return ativa;
  }
  const obsDom = ('MutationObserver' in window)
    ? new MutationObserver(() => { ativa = lerAtiva(); })
    : null;
  if (obsDom) {
    cards.forEach((c) => obsDom.observe(c, { attributes: true, attributeFilter: ['class'] }));
  }

  // ponteiro: parallax + hover + clique (delega no card: 1 fonte da verdade)
  const ray = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2(-2, -2);
  const alvoPtr = { x: 0, y: 0 };
  const sm = { x: 0, y: 0 };
  const mover = (ev) => {
    const r = caixa.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const nx = (ev.clientX - r.left) / r.width;
    const ny = (ev.clientY - r.top) / r.height;
    alvoPtr.x = (nx - 0.5) * 2;
    alvoPtr.y = (ny - 0.5) * 2;
    ponteiro.set(nx * 2 - 1, -(ny * 2 - 1));
  };
  // a área de toque é UM InstancedMesh: a etapa acesa vem do instanceId
  const etapaDe = (achados) => (achados.length && achados[0].instanceId != null) ? achados[0].instanceId : -1;

  const sair = () => { alvoPtr.x = 0; alvoPtr.y = 0; ponteiro.set(-2, -2); hover = -1; };
  const clicar = (ev) => {
    // raycast NO EVENTO (não depende do estado do loop): o clique é determinístico
    const r = caixa.getBoundingClientRect();
    if (!r.width || !r.height) return;
    ponteiro.set(((ev.clientX - r.left) / r.width) * 2 - 1, -(((ev.clientY - r.top) / r.height) * 2 - 1));
    ray.setFromCamera(ponteiro, camera);
    const achados = ray.intersectObjects(alvosRay, false);
    const i = etapaDe(achados);
    if (i >= 0 && cards[i]) cards[i].click();   // <- ativa pelo card (1 fonte da verdade)
  };
  caixa.addEventListener('pointermove', mover, { passive: true });
  caixa.addEventListener('pointerleave', sair, { passive: true });
  caixa.addEventListener('click', clicar);

  /* ------------------------------------------------------------- 4) loop */
  const vb = new THREE.Vector3();
  const foco = new THREE.Vector3();
  const alvoFoco = new THREE.Vector3();
  let vivo = true;
  let visivel = true;
  let t0 = performance.now();
  let quadro = 0;

  function animar(agora) {
    if (!vivo) return;
    if (!visivel || document.hidden) return;      // não agenda: economiza GPU
    requestAnimationFrame(animar);
    quadro++;

    const t = (agora - t0) / 1000;
    sm.x += (alvoPtr.x - sm.x) * 0.05;
    sm.y += (alvoPtr.y - sm.y) * 0.05;

    grupo.rotation.y = t * 0.075 + sm.x * 0.35;   // giro lento (leitura, não espetáculo)

    // hover por raycast (a cada 2 quadros basta)
    if (quadro % 2 === 0) {
      ray.setFromCamera(ponteiro, camera);
      const achados = ray.intersectObjects(alvosRay, false);
      hover = etapaDe(achados);
      canvas.style.cursor = hover >= 0 ? 'pointer' : 'default';
    }

    // a etapa ativa acende: anel maior, núcleo branco
    for (let i = 0; i < N; i++) {
      const on = i === ativa;
      const perto = i === hover;
      const alvoEsc = on ? 1.3 : (perto ? 1.14 : 1);
      aneis[i].scale.setScalar(aneis[i].scale.x + (alvoEsc - aneis[i].scale.x) * 0.12);
      aneis[i].material.opacity += ((on ? 0.95 : (perto ? 0.6 : 0.3)) - aneis[i].material.opacity) * 0.12;
      nucleos[i].material.color.setHex(on ? 0xffffff : TEAL_LIGHT);
      nucleos[i].material.opacity += ((on ? 1 : 0.7) - nucleos[i].material.opacity) * 0.12;
      nucleos[i].scale.setScalar(nucleos[i].scale.x + ((on ? 1.65 : 1) - nucleos[i].scale.x) * 0.12);
      aneis[i].quaternion.copy(camera.quaternion);   // anel sempre "de frente"
    }

    // câmera: enquadra o conjunto e pende (de leve) para a etapa ativa —
    // o deslocamento é pequeno de propósito: a hélice inteira continua legível
    nos[ativa].clone().multiplyScalar(0.3).toArray(alvoFoco);
    foco.lerp(alvoFoco, 0.06);
    camera.position.x = sm.x * 0.7;
    camera.position.y = 0.15 - sm.y * 0.5;
    camera.lookAt(foco.x, foco.y, foco.z);
    poeira.rotation.y = -t * 0.02;

    // rótulos em HTML projetados na tela (texto real, não textura)
    for (let i = 0; i < N; i++) {
      vb.copy(nos[i]).applyMatrix4(grupo.matrixWorld).project(camera);
      const x = (vb.x * 0.5 + 0.5) * largura;
      const y = (-vb.y * 0.5 + 0.5) * altura;
      const el = els[i];
      el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) translate(-50%,-118%)';
      // a etapa ATIVA é a que mais importa: nome visível e mais forte
      // (contraste: inativo em 0.72 = 9,3:1 sobre o fundo; era 0.42 = 3,74:1)
      el.style.opacity = (vb.z < 1) ? (i === ativa ? '1' : (i === hover ? '0.92' : '0.72')) : '0';
      el.style.color = i === ativa ? '#ffffff' : '';
    }

    renderer.render(cena, camera);
  }

  /* ------------------------------------------------- 5) visibilidade/resize */
  const redimensionar = () => {
    largura = alvo.clientWidth || largura;
    altura = alvo.clientHeight || altura;
    if (!largura || !altura) return;
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(fatorNitidez(largura, altura, lite));
    renderer.setSize(largura, altura, false);
    enquadrar();
  };

  const obs = ('IntersectionObserver' in window)
    ? new IntersectionObserver((ents) => {
        const antes = visivel;
        visivel = ents.some((e) => e.isIntersecting);
        if (visivel && !antes) { redimensionar(); requestAnimationFrame(animar); }
      }, { threshold: 0.05 })
    : null;
  if (obs) obs.observe(caixa);

  const aoVisibilidade = () => { if (!document.hidden && visivel) requestAnimationFrame(animar); };
  document.addEventListener('visibilitychange', aoVisibilidade);

  const ro = ('ResizeObserver' in window) ? new ResizeObserver(redimensionar) : null;
  if (ro) ro.observe(alvo);
  window.addEventListener('resize', redimensionar, { passive: true });

  ativa = lerAtiva();
  enquadrar();
  t0 = performance.now();
  renderer.render(cena, camera);
  requestAnimationFrame(animar);

  /* WebGL: se o contexto for perdido (driver reiniciado, GPU trocada, aba
     suspensa por muito tempo), o canvas fica preto e travado. Aqui o mapa sai
     de cena e o visual 2D (imagem + anéis) volta — nunca um retângulo preto. */
  const aoPerderContexto = (ev) => {
    if (ev) ev.preventDefault();
    vivo = false;
    if (obs) obs.disconnect();
    try { renderer.dispose(); } catch (e) { /* noop */ }
    caixa.style.display = 'none';
    document.documentElement.removeAttribute('data-fm-mapa3d');
  };
  canvas.addEventListener('webglcontextlost', aoPerderContexto, false);

  return {
    destroy() {
      vivo = false;
      canvas.removeEventListener('webglcontextlost', aoPerderContexto);
      if (obs) obs.disconnect();
      if (ro) ro.disconnect();
      if (obsDom) obsDom.disconnect();
      document.removeEventListener('visibilitychange', aoVisibilidade);
      window.removeEventListener('resize', redimensionar);
      caixa.removeEventListener('pointermove', mover);
      caixa.removeEventListener('pointerleave', sair);
      caixa.removeEventListener('click', clicar);
      cena.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      renderer.dispose();
      if (caixa.parentNode) caixa.parentNode.removeChild(caixa);
    },
  };
}
