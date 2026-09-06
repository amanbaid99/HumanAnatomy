/**
 * Human Anatomy Explorer.
 *
 * Scene assembly, interaction and UI wiring. The anatomy itself lives in
 * src/anatomy; the shapes come from src/geometry/loft.js.
 */

import {
  Scene, PerspectiveCamera, WebGLRenderer, Color, Fog, Group,
  AmbientLight, DirectionalLight, HemisphereLight,
  Raycaster, Vector2, Vector3, Box3, Sphere,
  Mesh, CircleGeometry, MeshBasicMaterial, CanvasTexture,
  ACESFilmicToneMapping, SRGBColorSpace, DoubleSide,
} from '../vendor/three.module.min.js';

import { OrbitControls } from './controls.js';
import { buildMuscles, LAYERS, GROUPS } from './anatomy/build.js';
import { buildSkeleton, extractHead } from './anatomy/skeleton.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ---------------------------------------------------------------- scene ----

const wrap = $('#stage');
const scene = new Scene();
scene.background = new Color(0x0d1116);
scene.fog = new Fog(0x0d1116, 3.6, 9.5);

const camera = new PerspectiveCamera(36, 1, 0.05, 60);

const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
wrap.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// A phone in portrait is tall and narrow; pull back so the whole figure fits.
const NARROW = window.matchMedia('(max-width: 860px)').matches;
const HOME = { radius: NARROW ? 3.35 : 3.0, theta: 0.30, phi: 1.36 };
controls.spherical.radius = HOME.radius;
controls._goalSpherical.radius = HOME.radius;
controls.update(true);

// Lighting: a warm key from the front-left, a cool fill, and a rim to peel the
// silhouette off the background.
scene.add(new HemisphereLight(0xb4c6d6, 0x3a2820, 0.70));
scene.add(new AmbientLight(0xffffff, 0.52));

const key = new DirectionalLight(0xfff2e6, 1.75);
key.position.set(2.4, 3.2, 2.8);
scene.add(key);

const fill = new DirectionalLight(0xa8c2dc, 0.85);
fill.position.set(-3.0, 1.4, 1.6);
scene.add(fill);

const rim = new DirectionalLight(0x8fb8c4, 0.55);
rim.position.set(-1.0, 2.2, -3.2);
scene.add(rim);

const under = new DirectionalLight(0x59697a, 0.42);
under.position.set(0, -2.0, 1.0);
scene.add(under);

// A soft blob under the figure so it does not float.
function contactShadow() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const mesh = new Mesh(
    new CircleGeometry(0.62, 48),
    new MeshBasicMaterial({
      map: new CanvasTexture(c), transparent: true, depthWrite: false, side: DoubleSide,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.002;
  return mesh;
}
scene.add(contactShadow());

// ------------------------------------------------------------- anatomy ----

const figure = new Group();
scene.add(figure);

const { group: muscleGroup, records } = buildMuscles();
figure.add(muscleGroup);

const skeleton = buildSkeleton();
figure.add(skeleton);

// The head stays regardless of the skeleton toggle.
figure.add(extractHead(skeleton));

/**
 * Show only part of the skeleton. At shoulder zoom the ribcage hides the very
 * thing you came to look at, so the cuff view narrows this to the girdle.
 */
const SHOULDER_GIRDLE = /^(scapula|acromion|clavicle|coracoid|glenoid|humerus|greaterTubercle|lesserTubercle|epicondyle)/;
function setSkeletonFilter(re, side) {
  skeleton.children.forEach((b) => {
    let on = re ? re.test(b.name) : true;
    // Bone names carry a .r / .l suffix; midline bones carry neither.
    if (on && side) on = !/\.(r|l)$/.test(b.name) || b.name.endsWith(side === 'right' ? '.r' : '.l');
    b.visible = on;
  });
}

const byId = new Map(records.map((r) => [r.uid, r]));

// ---------------------------------------------------------------- state ----

const state = {
  layers: { 1: true, 2: true, 3: true },
  groups: new Set(GROUPS.map((g) => g.id)),
  skeleton: true,
  skeletonFilter: null,
  sideFilter: null,
  xray: 1,
  isolate: false,
  selected: null,
  hovered: null,
};

function meshVisible(rec) {
  if (!state.layers[rec.layer]) return false;
  if (!state.groups.has(rec.group)) return false;
  if (state.sideFilter && rec.side && rec.side !== state.sideFilter) return false;
  if (state.isolate && state.selected) {
    // Keep the selected muscle and its opposite side.
    return rec.id === state.selected.id;
  }
  return true;
}

function applyVisibility() {
  records.forEach((rec) => {
    rec.mesh.visible = meshVisible(rec);
    // X-ray fades the outer layers so the deep ones show through.
    const fade = rec.layer === 3 ? 1 : rec.layer === 2 ? 0.55 : 0;
    const opacity = 1 - (1 - state.xray) * (1 - fade);
    const mat = rec.mesh.material;
    mat.opacity = opacity;
    mat.transparent = opacity < 0.995;
    mat.depthWrite = opacity > 0.72;
  });
  skeleton.visible = state.skeleton;
  setSkeletonFilter(state.skeletonFilter, state.sideFilter);
  updateCounts();
}

function updateCounts() {
  Object.keys(LAYERS).forEach((l) => {
    const shown = records.filter((r) => r.layer === +l && state.groups.has(r.group)).length;
    const el = $(`#count-${l}`);
    if (el) el.textContent = shown;
  });
  const visible = records.filter((r) => r.mesh.visible).length;
  $('#stat-visible').textContent = visible;
}

// ------------------------------------------------------------ highlight ----

function setHighlight(rec, on, strong) {
  if (!rec) return;
  const mat = rec.mesh.material;
  mat.emissive.setHex(on ? (strong ? 0x2f7d78 : 0x1b4a47) : 0x000000);
  mat.emissiveIntensity = on ? (strong ? 0.85 : 0.5) : 0;
}

function select(rec, fly = true) {
  if (state.selected) setHighlight(state.selected, false);
  state.selected = rec;
  if (!rec) {
    $('#detail').hidden = true;
    $('#detail-empty').hidden = false;
    if (state.isolate) applyVisibility();
    return;
  }
  setHighlight(rec, true, true);
  showDetail(rec);
  if (fly) frame(rec);
  if (state.isolate) applyVisibility();
}

function frame(rec) {
  rec.mesh.geometry.computeBoundingSphere();
  const bs = rec.mesh.geometry.boundingSphere;
  const centre = bs.center.clone();
  // Pull back far enough to see the whole muscle plus context around it.
  const radius = Math.max(bs.radius * 4.2, 0.34);
  // Swing to whichever side of the body the muscle is on.
  const theta = centre.x >= 0 ? 0.85 : -0.85;
  const front = centre.z >= 0;
  controls.flyTo(centre, radius, front ? theta : Math.PI - theta * 0.6, 1.42);
}

function showDetail(rec) {
  $('#detail-empty').hidden = true;
  const d = $('#detail');
  d.hidden = false;
  $('#d-name').textContent = rec.name;
  $('#d-side').textContent = rec.side ? rec.side : 'midline';
  $('#d-region').textContent = rec.region;
  $('#d-layer').textContent = LAYERS[rec.layer].label;
  $('#d-layer').style.background = `#${LAYERS[rec.layer].color.toString(16).padStart(6, '0')}`;
  $('#d-function').textContent = rec.fn;
  $('#d-origin').textContent = rec.or;
  $('#d-insertion').textContent = rec.ins;
  $('#d-nerve').textContent = rec.nerve || 'Not recorded';
  const clin = $('#d-clinical-row');
  if (rec.clinical) {
    clin.hidden = false;
    $('#d-clinical').textContent = rec.clinical;
  } else {
    clin.hidden = true;
  }
}

// -------------------------------------------------------------- picking ----

const raycaster = new Raycaster();
const ndc = new Vector2();
const tooltip = $('#tooltip');
let downAt = null;

function pick(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const targets = muscleGroup.children.filter((m) => m.visible);
  const hits = raycaster.intersectObjects(targets, false);
  return hits.length ? hits[0].object.userData.record : null;
}

renderer.domElement.addEventListener('pointerdown', (e) => {
  downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
});

renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  downAt = null;
  if (moved > 6) return; // a drag, not a click
  const rec = pick(e.clientX, e.clientY);
  select(rec, !!rec);
});

renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || downAt) { tooltip.hidden = true; return; }
  const rec = pick(e.clientX, e.clientY);
  if (rec !== state.hovered) {
    if (state.hovered && state.hovered !== state.selected) setHighlight(state.hovered, false);
    state.hovered = rec;
    if (rec && rec !== state.selected) setHighlight(rec, true, false);
  }
  if (rec) {
    tooltip.hidden = false;
    tooltip.textContent = rec.name + (rec.sideLabel || '');
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY}px`;
    renderer.domElement.style.cursor = 'pointer';
  } else {
    tooltip.hidden = true;
    renderer.domElement.style.cursor = 'grab';
  }
});

renderer.domElement.addEventListener('pointerleave', () => { tooltip.hidden = true; });

// ------------------------------------------------------------------ UI ----

// Layer checkboxes
$$('[data-layer]').forEach((cb) => {
  cb.addEventListener('change', () => {
    state.layers[+cb.dataset.layer] = cb.checked;
    applyVisibility();
  });
});

// Region checkboxes, built from the group table.
const regionBox = $('#regions');
GROUPS.forEach((g) => {
  const count = records.filter((r) => r.group === g.id).length;
  const label = document.createElement('label');
  label.className = 'chip';
  label.innerHTML = `<input type="checkbox" checked data-group="${g.id}">
    <span>${g.label}</span><em>${count}</em>`;
  regionBox.appendChild(label);
});
$$('[data-group]').forEach((cb) => {
  cb.addEventListener('change', () => {
    if (cb.checked) state.groups.add(cb.dataset.group);
    else state.groups.delete(cb.dataset.group);
    applyVisibility();
  });
});

function setRegions(ids) {
  $$('[data-group]').forEach((cb) => {
    cb.checked = ids === 'all' || ids.includes(cb.dataset.group);
    if (cb.checked) state.groups.add(cb.dataset.group);
    else state.groups.delete(cb.dataset.group);
  });
}
function setLayers(on) {
  $$('[data-layer]').forEach((cb) => {
    cb.checked = on.includes(+cb.dataset.layer);
    state.layers[+cb.dataset.layer] = cb.checked;
  });
}

$('#regions-all').addEventListener('click', () => { setRegions('all'); applyVisibility(); });
$('#regions-none').addEventListener('click', () => { setRegions([]); applyVisibility(); });

// X-ray slider
$('#xray').addEventListener('input', (e) => {
  state.xray = +e.target.value / 100;
  $('#xray-val').textContent = `${e.target.value}%`;
  applyVisibility();
});

// Toggles
$('#toggle-skeleton').addEventListener('change', (e) => {
  state.skeleton = e.target.checked;
  applyVisibility();
});
$('#toggle-isolate').addEventListener('change', (e) => {
  state.isolate = e.target.checked;
  applyVisibility();
});

// View presets
const VIEWS = {
  front: [0, 1.40], back: [Math.PI, 1.40],
  left: [-Math.PI / 2, 1.42], right: [Math.PI / 2, 1.42],
  top: [0, 0.30],
};
$$('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const [theta, phi] = VIEWS[btn.dataset.view];
    controls.flyTo(new Vector3(0, 1.02, 0), HOME.radius, theta, phi);
  });
});

$('#reset').addEventListener('click', () => {
  setLayers([1, 2, 3]);
  setRegions('all');
  state.isolate = false; $('#toggle-isolate').checked = false;
  state.skeleton = true; $('#toggle-skeleton').checked = true;
  state.skeletonFilter = null;
  state.sideFilter = null;
  state.xray = 1; $('#xray').value = 100; $('#xray-val').textContent = '100%';
  select(null);
  applyVisibility();
  controls.flyTo(new Vector3(0, 1.02, 0), HOME.radius, HOME.theta, HOME.phi);
});

/**
 * Rotator cuff study view: peel the deltoid and trapezius away, keep the
 * shoulder, and come in from behind and above, which is the angle that shows
 * the supraspinatus running under the acromion.
 */
$('#cuff-view').addEventListener('click', () => {
  setLayers([3]);
  setRegions(['shoulder']);
  state.skeleton = true;
  $('#toggle-skeleton').checked = true;
  state.skeletonFilter = SHOULDER_GIRDLE;
  state.sideFilter = 'right';
  state.xray = 1; $('#xray').value = 100; $('#xray-val').textContent = '100%';
  applyVisibility();
  const sup = byId.get('supraspinatus.right');
  if (sup) {
    select(sup, false);
    controls.flyTo(new Vector3(0.116, 1.372, -0.046), 0.62, 2.42, 1.14, 900);
  }
});

// Search
const searchInput = $('#search');
const resultsBox = $('#results');

function runSearch() {
  const q = searchInput.value.trim().toLowerCase();
  resultsBox.innerHTML = '';
  if (q.length < 2) { resultsBox.hidden = true; return; }

  // One row per muscle rather than one per side; picking a row selects the right side.
  const seen = new Set();
  const matches = [];
  for (const rec of records) {
    if (seen.has(rec.id)) continue;
    const hay = `${rec.name} ${rec.region} ${rec.fn}`.toLowerCase();
    if (hay.includes(q)) { seen.add(rec.id); matches.push(rec); }
    if (matches.length >= 10) break;
  }

  if (!matches.length) {
    resultsBox.hidden = false;
    resultsBox.innerHTML = '<div class="no-hit">No muscle matches that</div>';
    return;
  }

  resultsBox.hidden = false;
  matches.forEach((rec) => {
    const row = document.createElement('button');
    row.className = 'result';
    row.innerHTML = `<span class="dot" style="background:#${LAYERS[rec.layer].color.toString(16).padStart(6, '0')}"></span>
      <span class="r-name">${rec.name}</span><span class="r-region">${rec.region}</span>`;
    row.addEventListener('click', () => {
      // Make sure the muscle is actually showing before we fly to it.
      if (!state.layers[rec.layer]) {
        state.layers[rec.layer] = true;
        $(`[data-layer="${rec.layer}"]`).checked = true;
      }
      if (!state.groups.has(rec.group)) {
        state.groups.add(rec.group);
        $(`[data-group="${rec.group}"]`).checked = true;
      }
      applyVisibility();
      select(rec);
      resultsBox.hidden = true;
      searchInput.value = rec.name;
    });
    resultsBox.appendChild(row);
  });
}
searchInput.addEventListener('input', runSearch);
searchInput.addEventListener('focus', runSearch);
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrap')) resultsBox.hidden = true;
});

// Panel toggle on small screens
$('#panel-toggle').addEventListener('click', () => {
  $('#panel').classList.toggle('open');
});

// Keyboard
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') {
    if (e.key === 'Escape') { searchInput.blur(); resultsBox.hidden = true; }
    return;
  }
  if (e.key === 'Escape') select(null);
  if (e.key === '/') { e.preventDefault(); searchInput.focus(); }
  if (e.key >= '1' && e.key <= '3') {
    const cb = $(`[data-layer="${e.key}"]`);
    cb.checked = !cb.checked;
    state.layers[+e.key] = cb.checked;
    applyVisibility();
  }
});

// ------------------------------------------------------------- lifecycle ---

function resize() {
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

applyVisibility();
$('#muscle-total').textContent = records.length;
animate();

// Fade the loading veil once the first frame is on screen.
requestAnimationFrame(() => requestAnimationFrame(() => {
  const veil = $('#loading');
  if (veil) { veil.classList.add('gone'); setTimeout(() => veil.remove(), 500); }
}));
