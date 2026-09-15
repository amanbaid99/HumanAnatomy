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
  Mesh, CircleGeometry, MeshBasicMaterial, CanvasTexture, SphereGeometry,
  Line, LineDashedMaterial, BufferGeometry,
  ACESFilmicToneMapping, SRGBColorSpace, DoubleSide, Layers,
  PMREMGenerator, EquirectangularReflectionMapping,
} from '../vendor/three.module.min.js';

import { OrbitControls } from './controls.js';
import { buildMuscles, LAYERS, GROUPS } from './anatomy/build.js';
import { buildSkeleton, extractHead } from './anatomy/skeleton.js';
import { buildFace } from './anatomy/face.js';
import { bakeOcclusion } from './geometry/occlusion.js';

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
// Two passes share one frame, so clearing is done by hand.
renderer.autoClear = false;
wrap.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// A phone in portrait is tall and narrow; pull back so the whole figure fits.
const narrowQuery = window.matchMedia('(max-width: 860px)');
const isNarrow = () => narrowQuery.matches;
const HOME = { radius: isNarrow() ? 3.35 : 3.0, theta: 0.30, phi: 1.36 };
controls.spherical.radius = HOME.radius;
controls._goalSpherical.radius = HOME.radius;
controls.update(true);

/**
 * Image-based lighting from a procedural sky. A single directional light makes
 * everything look stamped from the same die; an environment gives each surface
 * a different tint depending on which way it faces, which is most of what
 * separates a rendered body from a diagram.
 */
function buildEnvironment() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 128);
  sky.addColorStop(0.00, '#c8d6e4');   // cool overhead
  sky.addColorStop(0.42, '#7d8794');
  sky.addColorStop(0.55, '#4a525c');   // horizon
  sky.addColorStop(1.00, '#14181d');   // dark floor, so undersides stay grounded
  g.fillStyle = sky;
  g.fillRect(0, 0, 256, 128);
  // A warm patch where the key light sits, so the bounce agrees with it.
  const warm = g.createRadialGradient(66, 34, 4, 66, 34, 72);
  warm.addColorStop(0, 'rgba(255,236,208,0.92)');
  warm.addColorStop(1, 'rgba(255,236,208,0)');
  g.fillStyle = warm;
  g.fillRect(0, 0, 256, 128);

  const tex = new CanvasTexture(c);
  tex.mapping = EquirectangularReflectionMapping;
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return env;
}
scene.environment = buildEnvironment();
// The environment carries the ambient, but at full strength it washes the
// muscle out to pink. Keep it as a tint on the shadows, not a second key.
scene.environmentIntensity = 0.42;

// Direct lights now shape the form; the environment carries the ambient.
scene.add(new HemisphereLight(0xb4c6d6, 0x3a2820, 0.12));
scene.add(new AmbientLight(0xffffff, 0.05));

const key = new DirectionalLight(0xfff2e6, 1.95);
key.position.set(1.3, 2.7, 3.5);
scene.add(key);

const fill = new DirectionalLight(0xa8c2dc, 0.62);
fill.position.set(-2.8, 1.2, 2.2);
scene.add(fill);

const rim = new DirectionalLight(0x8fb8c4, 0.48);
rim.position.set(-1.0, 2.2, -3.2);
scene.add(rim);

const under = new DirectionalLight(0x59697a, 0.16);
under.position.set(0, -2.0, 1.0);
scene.add(under);

/**
 * Layer 1 is the overlay pass: the selected muscle and its markers are drawn a
 * second time, after the depth buffer is cleared, so a muscle buried under
 * three other layers is still fully visible when you pick it. The lights have
 * to be on that layer too or the overlay renders unlit.
 */
const OVERLAY = 1;
[key, fill, rim, under].forEach((l) => l.layers.enable(OVERLAY));
scene.children.forEach((o) => { if (o.isLight) o.layers.enable(OVERLAY); });

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
const head = extractHead(skeleton);
figure.add(head);

const face = buildFace();
figure.add(face);

// One material is shared by every bone, so dimming it dims the whole skeleton.
const boneMat = skeleton.children.find((c) => c.material).material;
const BONE_BASE = boneMat.color.getHex();

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

/**
 * Bake occlusion once, per depth. A deep muscle is shaded by bone and the deep
 * layer only, so peeling the superficial layer away does not leave what is
 * underneath still wearing a shadow cast by something no longer on screen.
 */
(function bakeAll() {
  figure.updateMatrixWorld(true);
  const bones = [skeleton, head].flatMap((g) => g.children.filter((c) => c.geometry));
  const faceParts = face.children.filter((c) => c.geometry);
  const layer = (n) => records.filter((r) => r.layer === n).map((r) => r.mesh);
  const deep = layer(3);
  const mid = layer(2);
  const superficial = layer(1);

  const bounds = new Box3().expandByObject(figure);
  const t0 = performance.now();
  bakeOcclusion(bones, bones, bounds);
  bakeOcclusion(faceParts, [...bones, ...faceParts], bounds);
  bakeOcclusion(deep, [...bones, ...deep], bounds);
  bakeOcclusion(mid, [...bones, ...deep, ...mid], bounds);
  bakeOcclusion(superficial, [...bones, ...deep, ...mid, ...superficial, ...faceParts], bounds);
  console.info(`occlusion baked in ${Math.round(performance.now() - t0)} ms`);
})();

/**
 * Attachment markers.
 *
 * A muscle is only meaningful as a connection between two bones, and for a deep
 * muscle the two ends are usually buried. These sit on top of everything
 * (depthTest off) so the anchors stay readable however far inside the body they
 * are, with a dashed line between them showing the line of pull.
 */
const GHOST_TINT = new Color(0x241e1d);
const _tint = new Color();

const markers = new Group();
markers.visible = false;
markers.renderOrder = 999;
markers.layers.enable(OVERLAY);
scene.add(markers);

const dot = (color) => {
  const m = new Mesh(
    new SphereGeometry(0.0105, 18, 14),
    new MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 }),
  );
  m.renderOrder = 1000;
  m.layers.enable(OVERLAY);
  markers.add(m);
  return m;
};
const originDot = dot(0xf0c07a);     // warm, matching bone
const insertionDot = dot(0x53c9bc);  // the accent, matching the selection glow

const pullGeometry = new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]);
const pullLine = new Line(pullGeometry, new LineDashedMaterial({
  color: 0x9fdcd5, dashSize: 0.014, gapSize: 0.011,
  transparent: true, opacity: 0.7, depthTest: false,
}));
pullLine.renderOrder = 999;
pullLine.layers.enable(OVERLAY);
markers.add(pullLine);

function showAttachments(rec) {
  const from = new Vector3(...rec.originPoint);
  const to = new Vector3(...rec.insertionPoint);
  originDot.position.copy(from);
  insertionDot.position.copy(to);
  pullGeometry.setFromPoints([from, to]);
  pullLine.computeLineDistances();
  markers.visible = true;
}

/** Keep the two floating labels pinned to their markers. */
const labelOrigin = $('#label-origin');
const labelInsertion = $('#label-insertion');
const _proj = new Vector3();

function positionLabels() {
  if (!markers.visible) {
    labelOrigin.hidden = true;
    labelInsertion.hidden = true;
    return;
  }
  const rect = renderer.domElement.getBoundingClientRect();
  [[originDot, labelOrigin], [insertionDot, labelInsertion]].forEach(([m, el]) => {
    _proj.copy(m.position).project(camera);
    // Behind the camera, or off screen: hide rather than pinning to an edge.
    if (_proj.z > 1 || Math.abs(_proj.x) > 1.15 || Math.abs(_proj.y) > 1.15) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.style.left = `${rect.left + (_proj.x * 0.5 + 0.5) * rect.width}px`;
    el.style.top = `${rect.top + (-_proj.y * 0.5 + 0.5) * rect.height}px`;
  });
}

// ---------------------------------------------------------------- state ----

const state = {
  layers: { 1: true, 2: true, 3: true },
  groups: new Set(GROUPS.map((g) => g.id)),
  skeleton: true,
  skeletonFilter: null,
  sideFilter: null,
  xray: 1,
  isolate: false,
  focus: true,
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
  // With something selected, everything else drops back so the picked muscle
  // is readable even when it sits under three other layers.
  const focusing = state.focus && !!state.selected;

  records.forEach((rec) => {
    rec.mesh.visible = meshVisible(rec);
    const isSelected = focusing && rec.id === state.selected.id;

    // X-ray fades the outer layers so the deep ones show through.
    const fade = rec.layer === 3 ? 1 : rec.layer === 2 ? 0.55 : 0;
    const opacity = 1 - (1 - state.xray) * (1 - fade);
    const mat = rec.mesh.material;
    mat.opacity = opacity;
    mat.transparent = opacity < 0.995;
    mat.depthWrite = opacity > 0.72;

    // Dimming darkens rather than fades. Fading 180 overlapping surfaces just
    // stacks their alpha back up to opaque, and looks like fog.
    if (focusing && !isSelected) mat.color.copy(_tint.setHex(rec.baseColor)).lerp(GHOST_TINT, 0.56);
    else mat.color.setHex(rec.baseColor);

    // The selection is drawn again in the overlay pass, on top of everything.
    if (isSelected) rec.mesh.layers.enable(OVERLAY);
    else rec.mesh.layers.disable(OVERLAY);
  });

  // The skeleton stays as orientation, but recedes.
  boneMat.color.copy(_tint.setHex(BONE_BASE)).lerp(GHOST_TINT, focusing ? 0.42 : 0);

  face.visible = state.layers[1];
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
  // A selection lights both sides of a mirrored pair; a hover lights only the
  // mesh under the cursor.
  const targets = strong || !on
    ? records.filter((r) => r.id === rec.id)
    : [rec];
  targets.forEach((r) => {
    const mat = r.mesh.material;
    mat.emissive.setHex(on ? (strong ? 0x35908a : 0x1b4a47) : 0x000000);
    mat.emissiveIntensity = on ? (strong ? 1.15 : 0.5) : 0;
  });
}

function select(rec, fly = true) {
  if (state.selected) setHighlight(state.selected, false);
  state.selected = rec;
  if (!rec) {
    $('#detail').hidden = true;
    $('#detail-empty').hidden = false;
    $('#peek').hidden = true;
    markers.visible = false;
    applyVisibility();
    return;
  }
  setHighlight(rec, true, true);
  showDetail(rec);
  showPeek(rec);
  showAttachments(rec);
  if (fly) frame(rec);
  applyVisibility();
}

/** The compact card. Only meaningful on narrow screens; CSS hides it elsewhere. */
function showPeek(rec) {
  if (!isNarrow()) return;
  const peek = $('#peek');
  $('#peek-layer').style.background = `#${LAYERS[rec.layer].color.toString(16).padStart(6, '0')}`;
  $('#peek-name').textContent = rec.name + (rec.sideLabel || '');
  $('#peek-region').textContent = rec.region;
  $('#peek-fn').textContent = rec.fn;
  peek.hidden = false;
  // If the full panel is already open there is no point in the summary.
  if ($('#panel').classList.contains('open')) peek.hidden = true;
}

function frame(rec) {
  rec.mesh.geometry.computeBoundingSphere();
  const bs = rec.mesh.geometry.boundingSphere;
  const centre = bs.center.clone();

  // Fit the muscle to whichever axis is tighter. A fixed multiple of the
  // bounding radius over-zooms badly in portrait, where the horizontal field
  // of view is far narrower than the vertical one.
  // Enough padding that a small deep muscle is seen in context rather than
  // filling the frame from the inside.
  const want = Math.max(bs.radius, 0.05) * 3.0;
  const vFov = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const radius = Math.max(
    want / Math.sin(vFov / 2),
    want / Math.sin(hFov / 2),
    0.46,
  );
  // Swing to whichever side of the body the muscle is on. Anything close to
  // the midline is framed square, since there is no side to swing toward.
  const theta = Math.abs(centre.x) < 0.025 ? 0 : (centre.x > 0 ? 0.85 : -0.85);
  const front = centre.z >= 0;
  const target = centre.clone();
  if (isNarrow()) target.y -= radius * 0.16;
  controls.flyTo(target, radius, front ? theta : Math.PI - theta * 0.6, 1.42);
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
$('#toggle-focus').addEventListener('change', (e) => {
  state.focus = e.target.checked;
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
  state.focus = true; $('#toggle-focus').checked = true;
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
  const open = $('#panel').classList.toggle('open');
  // The card and the panel say the same thing; never show both.
  if (open) $('#peek').hidden = true;
  else if (state.selected) showPeek(state.selected);
});

$('#peek-close').addEventListener('click', () => select(null));

/**
 * Swipe the card away. A close button alone is not what anyone reaches for on
 * a phone: the instinct is to push the sheet back down.
 */
(function makePeekDismissable() {
  const peek = $('#peek');
  let startY = null;
  let startX = null;
  let dy = 0;
  let dragging = false;

  const reset = (animate) => {
    peek.classList.remove('dragging');
    if (animate) {
      peek.classList.add('settling');
      setTimeout(() => peek.classList.remove('settling'), 200);
    }
    peek.style.transform = '';
    peek.style.opacity = '';
  };

  peek.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    startY = e.clientY;
    startX = e.clientX;
    dy = 0;
    dragging = false;
  });

  peek.addEventListener('pointermove', (e) => {
    if (startY === null) return;
    const moveY = e.clientY - startY;
    const moveX = e.clientX - startX;
    // Only take over once the gesture is clearly a downward drag.
    if (!dragging) {
      if (moveY > 6 && Math.abs(moveY) > Math.abs(moveX)) {
        dragging = true;
        peek.classList.add('dragging');
        peek.setPointerCapture(e.pointerId);
      } else if (Math.abs(moveX) > 10) {
        startY = null;
        return;
      } else {
        return;
      }
    }
    dy = Math.max(0, moveY);
    peek.style.transform = `translateY(${dy}px)`;
    peek.style.opacity = String(Math.max(0, 1 - dy / 160));
  });

  const release = () => {
    if (startY === null) return;
    const dismissed = dragging && dy > 48;
    startY = null;
    dragging = false;
    if (dismissed) { reset(false); select(null); }
    else reset(true);
  };
  peek.addEventListener('pointerup', release);
  peek.addEventListener('pointercancel', release);
})();
$('#peek-more').addEventListener('click', () => {
  $('#peek').hidden = true;
  $('#panel').classList.add('open');
  $('#detail-pane').scrollTop = 0;
});

// Keyboard
window.addEventListener('keydown', (e) => {
  // Only swallow shortcuts while text is genuinely being typed. A focused
  // checkbox or slider should not disable the layer keys.
  const el = e.target;
  const typing = el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'range';
  if (typing) {
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
  // Project labels against a current camera matrix; the renderer only refreshes
  // it during render, so doing this first would lag the camera by a frame.
  camera.updateMatrixWorld();
  positionLabels();

  renderer.clear();
  camera.layers.set(0);
  renderer.render(scene, camera);

  if (state.focus && state.selected) {
    // A scene background that is a Color forces a clear inside render(),
    // regardless of autoClear, which would wipe the pass above. Detaching it
    // for the overlay pass is what keeps the first image on screen.
    const background = scene.background;
    scene.background = null;
    renderer.clearDepth();
    camera.layers.set(OVERLAY);
    renderer.render(scene, camera);
    scene.background = background;
    camera.layers.set(0);
  }
}

applyVisibility();
$('#muscle-total').textContent = records.length;
animate();

// Fade the loading veil once the first frame is on screen.
requestAnimationFrame(() => requestAnimationFrame(() => {
  const veil = $('#loading');
  if (veil) { veil.classList.add('gone'); setTimeout(() => veil.remove(), 500); }
}));
