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

import { STUDIES } from './studies.js';
import { createQuizRounds } from './quiz.js';
import { createMovementController } from './movement.js';

import { OrbitControls } from './controls.js?v=study-views-1';
import { buildMuscles, LAYERS, GROUPS } from './anatomy/build.js?v=mobile-quiz-1';
import { loadAtlas } from './anatomy/atlas.js?v=mobile-quiz-1';
import { bakeOcclusion } from './geometry/occlusion.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const movement = createMovementController();

// ---------------------------------------------------------------- scene ----

const wrap = $('#stage');
const viewport = $('#scene');
let renderDirty = true;
const scene = new Scene();
// The page behind the figure, per theme. The fog matches it so the far end of
// the body fades into the page rather than into a different colour. The
// figure itself - tissue, bone, lights - is the same in both.
const THEMES = {
  dark: { page: 0x171c1c, ghost: 0x241e1d },
  light: { page: 0xf1eee7, ghost: 0xd6d1cb },
};
const themeNow = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
scene.background = new Color(THEMES[themeNow()].page);
scene.fog = new Fog(THEMES[themeNow()].page, 3.6, 9.5);

const camera = new PerspectiveCamera(36, 1, 0.05, 60);

const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(max-width: 860px)').matches ? 1.5 : 2));
renderer.outputColorSpace = SRGBColorSpace;
// The filmic curve is kept: it rolls the brightest tissue off toward white
// instead of letting it go to a hot red, which is what keeps the palette
// restrained. The evenness this pass is after comes from the light rig below,
// not from the transfer curve.
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
// Two passes share one frame, so clearing is done by hand.
renderer.autoClear = false;
viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// A phone in portrait is tall and narrow; pull back so the whole figure fits.
const narrowQuery = window.matchMedia('(max-width: 860px)');
const isNarrow = () => narrowQuery.matches;
function homeRadius() {
  const aspect = viewport.clientWidth / Math.max(1, viewport.clientHeight);
  const halfHorizontal = Math.atan(Math.tan(camera.fov * Math.PI / 360) * aspect);
  return isNarrow() ? Math.max(3.3, .42 / Math.sin(halfHorizontal)) : 3.0;
}
const HOME = { radius: homeRadius(), theta: 0.30, phi: 1.36 };
controls.target.set(0, 0.94, 0);
controls._goalTarget.copy(controls.target);
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
  // A neutral softbox dome rather than a sky. No hot spot and no colour cast,
  // so the bounce lifts the form without tinting the tissue.
  const sky = g.createLinearGradient(0, 0, 0, 128);
  sky.addColorStop(0.00, '#dfe3e6');   // bright, neutral overhead
  sky.addColorStop(0.45, '#aeb3b8');
  sky.addColorStop(0.58, '#7c8186');   // horizon
  sky.addColorStop(1.00, '#2a2d30');   // darker floor, so undersides stay grounded
  g.fillStyle = sky;
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
// The dome does more of the work than it used to: soft wraparound light is
// what keeps both sides of the face readable.
scene.environmentIntensity = 0.52;

// Near-neutral lights. Anything with a hue in it shifts the tissue colour,
// and tissue colour is information here.
scene.add(new HemisphereLight(0xdde4ea, 0x33302e, 0.16));
scene.add(new AmbientLight(0xffffff, 0.07));

// Key: frontal and only a little off to one side, so it models the form
// without throwing half the face into shadow.
const key = new DirectionalLight(0xfffaf4, 1.12);
key.position.set(2.1, 2.9, 3.5);
scene.add(key);

// Fill is deliberately close to the key in strength. A 1.5:1 ratio reads as
// even clinical illumination; the 3:1 it was reads as a portrait.
const fill = new DirectionalLight(0xf4f7fa, 0.50);
fill.position.set(-2.2, 1.00, 3.05);
scene.add(fill);

// Just enough edge to separate the figure from the background.
const rim = new DirectionalLight(0xeef2f5, 0.26);
rim.position.set(0.0, 2.0, -3.2);
scene.add(rim);

// A little bounce from below so undersides do not go to black.
const under = new DirectionalLight(0xe4e9ee, 0.20);
under.position.set(0.2, -1.9, 1.3);
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

let atlas;
try {
  atlas = await loadAtlas({ onProgress: ({ loaded, total, preparing }) => {
    const progress = $('#load-progress');
    if (total) progress.value = Math.min(100, loaded / total * 100);
    else progress.removeAttribute('value');
    $('#loading p').textContent = preparing ? 'Preparing 3D anatomy…'
      : `Downloading model · ${(loaded / 1048576).toFixed(1)} MB${total ? ` of ${(total / 1048576).toFixed(1)} MB` : ''}`;
  } });
} catch (error) {
  $('#loading .spin').hidden = true;
  $('#loading p').textContent = 'The model couldn’t load. Check your connection and try again.';
  $('#load-progress').hidden = true;
  $('#load-retry').hidden = false;
  $('#load-retry').onclick = () => location.reload();
  throw error;
}
const { group: muscleGroup, records } = buildMuscles(atlas.muscles);
figure.add(muscleGroup);
const { skeleton, head, face } = atlas;
figure.add(skeleton, head, face);

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
// What dimmed muscles recede towards: dark on a dark page, pale on a light one.
const GHOST_TINT = new Color(THEMES[themeNow()].ghost);
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
  const blocked = ['#masthead', '.stage-actions', '#study-guide', '#peek', '#panel', '#view-dock', '#pick-choices']
    .map((selector) => $(selector)).filter((element) => !element.hidden)
    .map((element) => element.getBoundingClientRect()).filter((box) => box.width && box.height);
  [[originDot, labelOrigin], [insertionDot, labelInsertion]].forEach(([m, el]) => {
    _proj.copy(m.position).project(camera);
    // Behind the camera, or off screen: hide rather than pinning to an edge.
    if (_proj.z > 1 || Math.abs(_proj.x) > (isNarrow() ? .98 : 1.15) || Math.abs(_proj.y) > (isNarrow() ? .98 : 1.15)) {
      el.hidden = true;
      return;
    }
    const x = rect.left + (_proj.x * .5 + .5) * rect.width;
    const y = rect.top + (-_proj.y * .5 + .5) * rect.height;
    if (blocked.some((box) => x + 100 > box.left && x < box.right && y + 12 > box.top && y - 12 < box.bottom)) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });
}

// ---------------------------------------------------------------- state ----

let quiz = null;
let activeStudy = null;
let studyStep = 0;

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
  // Set by a link (see "Links" below): muscles to light up, and how much each was trained.
  marked: new Set(),
  heat: new Map(),
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
  renderDirty = true;
  // With something selected, everything else drops back so the picked muscle
  // is readable even when it sits under three other layers.
  const focusing = state.focus && !!state.selected;
  // A link that names muscles drops everything else back the same way.
  const marking = !focusing && state.marked.size > 0;

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
    else if (marking && !state.marked.has(rec.id)) mat.color.copy(_tint.setHex(rec.baseColor)).lerp(GHOST_TINT, 0.86);
    else if (marking) mat.color.copy(_tint.setHex(rec.baseColor)).lerp(heatColor(state.heat.get(rec.id) ?? 1), 0.85);
    else mat.color.setHex(rec.baseColor);

    // The selection is drawn again in the overlay pass, on top of everything.
    if (isSelected) rec.mesh.layers.enable(OVERLAY);
    else rec.mesh.layers.disable(OVERLAY);
  });

  // The skeleton stays as orientation, but recedes.
  boneMat.color.copy(_tint.setHex(BONE_BASE)).lerp(GHOST_TINT, focusing ? 0.42 : 0);

  // Facial muscles recede with the rest when a link names muscles.
  face.children.forEach((m) => {
    if (!m.isMesh || !m.material?.color) return;
    m.userData.baseColor ??= m.material.color.getHex();
    m.material.color.copy(_tint.setHex(m.userData.baseColor)).lerp(GHOST_TINT, marking ? 0.86 : 0);
  });

  head.visible = !state.skeletonFilter;
  face.visible = state.layers[1] && !state.skeletonFilter;
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
  renderDirty = true;
  if (!rec) return;
  // A muscle named in the link keeps its mark when hover or selection leaves it.
  if (!on && state.marked.has(rec.id)) { on = true; strong = true; }
  // A selection lights both sides of a mirrored pair; a hover lights only the
  // mesh under the cursor.
  const targets = strong || !on
    ? records.filter((r) => r.id === rec.id)
    : [rec];
  targets.forEach((r) => {
    const mat = r.mesh.material;
    // The muscle keeps its own colour. What marks it is a small lift in level
    // and a thin bright edge, the way a structure is called out in an atlas,
    // rather than the teal wash it used to take on.
    mat.emissive.setHex(on ? (strong ? 0x120806 : 0x090403) : 0x000000);
    mat.emissiveIntensity = on ? (strong ? 0.8 : 0.5) : 0;
    const level = on ? (strong ? 0.40 : 0.12) : 0;
    mat.userData.rim = level;
    mat.userData.tissueDetail = on && strong ? 1 : 0;
    if (mat.userData.shader?.uniforms.uFiberDetail) mat.userData.shader.uniforms.uFiberDetail.value = mat.userData.tissueDetail;
    if (mat.userData.shader) mat.userData.shader.uniforms.uRim.value = level;
  });
}

function select(rec, fly = true) {
  if (state.selected) setHighlight(state.selected, false);
  state.selected = rec;
  $('#return-body').hidden = !rec && !activeStudy;
  $('#selection-status').textContent = rec ? quiz ? 'Quiz muscle highlighted. Rotate to inspect it.' : `${rec.name}${rec.sideLabel} selected.` : 'Selection cleared.';
  if (!rec) {
    movement.stop();
    $('#detail').hidden = true;
    $('#detail-empty').hidden = false;
    $('#peek').hidden = true;
    markers.visible = false;
    updateSceneLayout(); resize();
    applyVisibility();
    return;
  }
  setHighlight(rec, true, true);
  if (quiz) {
    $('#detail').hidden = true; $('#peek').hidden = true; markers.visible = false;
    updateSceneLayout(); resize();
    if (fly) frame(rec);
    applyVisibility();
    return;
  }
  showDetail(rec);
  showPeek(rec);
  showAttachments(rec);
  updateSceneLayout(); resize();
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
  const want = Math.max(bs.radius, isNarrow() ? .10 : .05) * (isNarrow() ? 1.5 : 3.0);
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

  controls.flyTo(target, radius, front ? theta : Math.PI - theta * 0.6, 1.42);
}

/** On a phone the sheet is one scrolling page; bring the detail card into view. */
function revealDetail() {
  if (!isNarrow()) return;
  const panel = $('#panel');
  const pane = $('#detail-pane');
  const handle = $('#panel-toggle').offsetHeight;
  panel.scrollTop = Math.max(0, pane.offsetTop - handle);
}

function showDetail(rec) {
  movement.update(rec);
  $('#detail-empty').hidden = true;
  const d = $('#detail');
  d.hidden = false;
  requestAnimationFrame(revealDetail);
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
const pointers = new Set();
let multiTouch = false;
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', 'Interactive anatomy model. Drag to rotate; tap to select. Hold a touch to choose nearby muscles.');

function hitAt(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const targets = muscleGroup.children.filter((m) => m.visible);
  // Reference facial structures block selection of muscles behind the head.
  for (const group of [face, head]) {
    if (group.visible) group.children.forEach((m) => { if (m.isMesh && m.visible) targets.push(m); });
  }
  return raycaster.intersectObjects(targets, false)[0] || null;
}

function pick(clientX, clientY) {
  return hitAt(clientX, clientY)?.object.userData.record ?? null;
}

function nearbyMuscles(x, y) {
  const centre = hitAt(x, y);
  if (centre && !centre.object.userData.record) return [];
  const candidates = new Map();
  // CSS pixels keep the tolerance the same on retina and ordinary displays.
  const offsets = [[0, 0], [-10, 0], [10, 0], [0, -10], [0, 10], [-7, -7], [7, -7], [-7, 7], [7, 7]];
  for (const [dx, dy] of offsets) {
    const rec = pick(x + dx, y + dy);
    if (rec && !candidates.has(rec.uid)) candidates.set(rec.uid, rec);
  }
  return [...candidates.values()].slice(0, 4);
}

function closeChoices(restoreFocus = false) {
  $('#pick-choices').hidden = true;
  if (restoreFocus) renderer.domElement.focus({ preventScroll: true });
}

function showChoices(candidates, x, y) {
  const options = $('#pick-options');
  options.replaceChildren();
  for (const rec of candidates) {
    const button = document.createElement('button');
    button.textContent = rec.name;
    const side = document.createElement('small');
    side.textContent = `${rec.region}${rec.sideLabel}`;
    button.append(side);
    button.addEventListener('click', () => { closeChoices(); select(rec); });
    options.append(button);
  }
  const popup = $('#pick-choices');
  popup.hidden = false;
  popup.style.left = `${Math.max(12, Math.min(x - 140, innerWidth - 292))}px`;
  popup.style.top = `${Math.max(12, Math.min(y + 16, innerHeight - popup.offsetHeight - 70))}px`;
  options.querySelector('button')?.focus({ preventScroll: true });
}

$('#pick-close').addEventListener('click', () => closeChoices(true));
document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('#pick-choices')) closeChoices();
  if (!event.target.closest('#study-picker')) $('#study-picker').open = false;
});

renderer.domElement.addEventListener('pointerdown', (e) => {
  pointers.add(e.pointerId);
  if (pointers.size > 1) { multiTouch = true; downAt = null; return; }
  downAt = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, travelled: 0 };
});

renderer.domElement.addEventListener('pointercancel', (e) => {
  pointers.delete(e.pointerId);
  downAt = null;
  if (!pointers.size) multiTouch = false;
});

renderer.domElement.addEventListener('pointerup', (e) => {
  pointers.delete(e.pointerId);
  if (multiTouch) { if (!pointers.size) multiTouch = false; downAt = null; return; }
  if (!downAt || downAt.id !== e.pointerId || e.button > 0) { downAt = null; return; }
  const gesture = downAt;
  downAt = null;
  if (Math.max(gesture.travelled, Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y)) > 6) return;
  if (quiz) return;
  const rec = pick(e.clientX, e.clientY);
  if (e.pointerType === 'touch' && (!rec || performance.now() - gesture.t > 450)) {
    const candidates = nearbyMuscles(e.clientX, e.clientY);
    if (candidates.length > 1) { showChoices(candidates, e.clientX, e.clientY); return; }
    if (candidates.length === 1) { select(candidates[0]); return; }
  }
  select(rec, !!rec);
});

renderer.domElement.addEventListener('pointermove', (e) => {
  if (downAt) downAt.travelled = Math.max(downAt.travelled, Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y));
  if (quiz || e.pointerType === 'touch' || downAt) { tooltip.hidden = true; return; }
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
  if (!count) return;     // a region with nothing in it is not a filter
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
    if (activeStudy) restoreFullBody({ fly: false });
    controls.flyTo(new Vector3(0, 0.94, 0), HOME.radius, theta, phi);
  });
});

function restoreFullBody({ fly = true } = {}) {
  if (quiz) closeQuiz();
  activeStudy = null;
  studyStep = 0;
  $('#study-guide').hidden = true;
  $('#study-picker').open = false;
  closeChoices();
  $('#panel').classList.remove('open');
  $('#panel-toggle').setAttribute('aria-expanded', 'false');
  $('#search').value = '';
  $('#results').hidden = true;
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
  if (fly) {
    controls.flyTo(new Vector3(0, 0.94, 0), HOME.radius, HOME.theta, HOME.phi);
    $('#study-picker summary').focus({ preventScroll: true });
  }
}
$('#reset').addEventListener('click', () => restoreFullBody());
$('#return-body').addEventListener('click', () => restoreFullBody());
$('#detail-full-body').addEventListener('click', () => restoreFullBody());
$('#study-exit').addEventListener('click', () => restoreFullBody());

function runStudyStep() {
  const study = STUDIES[activeStudy];
  const step = study.steps[studyStep];
  const rec = byId.get(`${step.muscle}.right`);
  setLayers(step.layers);
  setRegions(study.groups);
  state.sideFilter = study.bothSides ? null : 'right';
  state.skeletonFilter = study.bones;
  state.skeleton = true; $('#toggle-skeleton').checked = true;
  state.focus = true; $('#toggle-focus').checked = true;
  state.isolate = false; $('#toggle-isolate').checked = false;
  state.xray = 1; $('#xray').value = 100; $('#xray-val').textContent = '100%';
  $('#panel').classList.remove('open');
  $('#panel-toggle').setAttribute('aria-expanded', 'false');
  $('#study-picker').open = false;
  $('#study-guide').hidden = false;
  $('#study-progress').textContent = `${study.title} · ${studyStep + 1} of ${study.steps.length}`;
  $('#study-muscle').textContent = rec.name;
  $('#study-hint').textContent = step.hint;
  $('#study-prev').disabled = studyStep === 0;
  $('#study-next').textContent = studyStep === study.steps.length - 1 ? 'Finish study →' : 'Next →';
  select(rec, false);
  const anchor = skeleton.children.find((bone) => bone.name === study.anchor);
  const target = new Box3().setFromObject(anchor || rec.mesh).getCenter(new Vector3());
  const radius = study.radius;
  // The mobile viewport already excludes both cards, so its centre is usable.
  controls.flyTo(target, radius, step.angle, 1.42, 850);
}

for (const [id, study] of Object.entries(STUDIES)) {
  const button = document.createElement('button');
  button.dataset.study = id;
  const title = document.createElement('strong'); title.textContent = study.title;
  const description = document.createElement('span'); description.textContent = study.description;
  button.append(title, description);
  button.addEventListener('click', () => { activeStudy = id; studyStep = 0; runStudyStep(); });
  $('#study-options').append(button);
}
$('#study-prev').addEventListener('click', () => { if (studyStep > 0) { studyStep--; runStudyStep(); } });
$('#study-next').addEventListener('click', () => {
  if (studyStep === STUDIES[activeStudy].steps.length - 1) restoreFullBody();
  else { studyStep++; runStudyStep(); }
});

// --------------------------------------------------------------- quiz ----
function closeQuiz() {
  quiz = null;
  document.body.classList.remove('quiz-mode');
  $('#quiz-card').hidden = true;
  $('#quiz-start').textContent = 'Quiz';
  $('#panel-toggle').textContent = 'Explore & muscle details';
  $('.panel-intro h2').textContent = 'Explore the anatomy';
  $('.panel-intro p').textContent = 'Start with a muscle. Follow your curiosity.';
}
function startQuiz() {
  restoreFullBody({ fly: false });
  quiz = { rounds: createQuizRounds(records), index: 0, score: 0, answered: false };
  document.body.classList.add('quiz-mode');
  $('#quiz-card').hidden = false;
  $('#quiz-start').textContent = 'End quiz';
  $('#panel-toggle').textContent = 'Exit quiz & explore';
  $('.panel-intro h2').textContent = 'Test your anatomy';
  $('.panel-intro p').textContent = 'Five muscles. Take your time.';
  tooltip.hidden = true;
  if (state.hovered) setHighlight(state.hovered, false);
  state.hovered = null;
  renderQuizQuestion();
}
function renderQuizQuestion() {
  const round = quiz.rounds[quiz.index];
  quiz.answered = false;
  $('#quiz-progress').textContent = `Question ${quiz.index + 1} of ${quiz.rounds.length}`;
  $('#quiz-question').textContent = 'Which muscle is highlighted?';
  $('#quiz-instruction').textContent = 'Rotate the model if you need another angle.';
  $('#quiz-feedback').hidden = true;
  $('#quiz-next').hidden = true;
  $('#quiz-restart').hidden = true;
  $('#quiz-score').textContent = `${quiz.score} correct so far`;
  $('#quiz-choices').replaceChildren();
  for (const option of round.choices) {
    const button = document.createElement('button');
    button.textContent = option.name;
    button.dataset.muscle = option.id;
    button.addEventListener('click', () => answerQuiz(option.id));
    $('#quiz-choices').append(button);
  }
  $('#quiz-card').scrollTop = 0;
  setLayers([1, 2, 3]); setRegions('all');
  state.sideFilter = null; state.skeletonFilter = null;
  select(round.answer);
  $('#quiz-question').focus({ preventScroll: true });
}
function answerQuiz(id) {
  if (!quiz || quiz.answered) return;
  quiz.answered = true;
  const round = quiz.rounds[quiz.index];
  const correct = id === round.answer.id;
  if (correct) quiz.score++;
  for (const button of $$('#quiz-choices button')) {
    button.disabled = true;
    if (button.dataset.muscle === round.answer.id) button.classList.add('answer-correct');
    else if (button.dataset.muscle === id) button.classList.add('answer-wrong');
  }
  $('#quiz-answer').textContent = `${correct ? 'Correct' : 'Not quite'} — ${round.answer.name}`;
  $('#quiz-action').textContent = round.answer.fn;
  $('#quiz-nerve').textContent = `Nerve supply: ${round.answer.nerve || 'Not recorded'}`;
  $('#quiz-feedback').hidden = false;
  $('#quiz-next').hidden = false;
  $('#quiz-next').textContent = quiz.index === quiz.rounds.length - 1 ? 'See results →' : 'Next question →';
  $('#quiz-score').textContent = `${quiz.score} correct from ${quiz.index + 1} answered`;
  updateSceneLayout(); resize();
  $('#quiz-card').scrollTop = $('#quiz-card').scrollHeight;
  $('#quiz-next').focus({ preventScroll: true });
}
$('#quiz-start').addEventListener('click', () => quiz ? restoreFullBody() : startQuiz());
$('#quiz-exit').addEventListener('click', () => restoreFullBody());
$('#quiz-restart').addEventListener('click', startQuiz);
$('#quiz-next').addEventListener('click', () => {
  if (!quiz?.answered) return;
  if (quiz.index < quiz.rounds.length - 1) { quiz.index++; renderQuizQuestion(); return; }
  $('#quiz-progress').textContent = 'Quiz complete';
  $('#quiz-question').textContent = `${quiz.score} out of ${quiz.rounds.length}`;
  $('#quiz-instruction').textContent = 'Keep exploring, or try five more muscles.';
  $('#quiz-choices').replaceChildren();
  $('#quiz-feedback').hidden = true;
  $('#quiz-next').hidden = true;
  $('#quiz-restart').hidden = false;
  $('#quiz-score').textContent = 'Practice at your own pace. There is no time limit.';
  $('#quiz-card').scrollTop = 0;
  updateSceneLayout(); resize();
});

/**
 * Rotator cuff study view: peel the deltoid and trapezius away, keep the
 * shoulder, and come in from behind and above, which is the angle that shows
 * the supraspinatus running under the acromion.
 */
$('#cuff-view').addEventListener('click', () => {
  restoreFullBody({ fly: false });
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
  const ranked = [];
  for (const rec of records) {
    if (seen.has(rec.id)) continue;
    seen.add(rec.id);
    const name = rec.name.toLowerCase();
    const rank = name === q ? 0 : name.startsWith(q) ? 1 : name.includes(q) ? 2
      : rec.region.toLowerCase().includes(q) ? 3 : rec.fn.toLowerCase().includes(q) ? 4 : Infinity;
    if (Number.isFinite(rank)) ranked.push({ rec, rank });
  }
  // A muscle's name is a better match than a mention in another muscle's action.
  const matches = ranked.sort((a, b) => a.rank - b.rank).slice(0, 10).map(({ rec }) => rec);

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
      // Leaving a scoped study restores the full anatomical context, including
      // bones, before the result is selected.
      if (activeStudy || state.skeletonFilter) {
        activeStudy = null;
        $('#study-guide').hidden = true;
        setLayers([1, 2, 3]); setRegions('all');
        state.sideFilter = null; state.skeletonFilter = null;
      }
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
  movement.stop();
  if (quiz) restoreFullBody({ fly: false });
  const open = $('#panel').classList.toggle('open');
  $('#panel-toggle').setAttribute('aria-expanded', String(open));
  // The card and the panel say the same thing; never show both.
  if (open) $('#peek').hidden = true;
  else if (state.selected) showPeek(state.selected);
  updateSceneLayout(); resize();
  if (!open && state.selected && !activeStudy) frame(state.selected);
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
function openMuscleDetails(showMovement = false) {
  $('#peek').hidden = true;
  $('#panel').classList.add('open');
  $('#panel-toggle').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => showMovement ? movement.reveal() : revealDetail());
}
$('#peek-more').addEventListener('click', () => openMuscleDetails());
$('#peek-motion').addEventListener('click', () => openMuscleDetails(true));

// Keyboard
window.addEventListener('keydown', (e) => {
  if (quiz) {
    if (e.key === 'Escape') restoreFullBody();
    return;
  }
  // Only swallow shortcuts while text is genuinely being typed. A focused
  // checkbox or slider should not disable the layer keys.
  const el = e.target;
  const typing = el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'range';
  if (typing) {
    if (e.key === 'Escape') { searchInput.blur(); resultsBox.hidden = true; }
    return;
  }
  if (e.key === 'Escape') {
    if (!$('#pick-choices').hidden) { closeChoices(true); return; }
    if ($('#study-picker').open) { $('#study-picker').open = false; $('#study-picker summary').focus(); return; }
    select(null);
  }
  if (e.key === '/') { e.preventDefault(); searchInput.focus(); }
  if (e.key >= '1' && e.key <= '3') {
    const cb = $(`[data-layer="${e.key}"]`);
    cb.checked = !cb.checked;
    state.layers[+e.key] = cb.checked;
    applyVisibility();
  }
});

// ------------------------------------------------------------- lifecycle ---

function updateSceneLayout() {
  if (!isNarrow()) {
    wrap.style.setProperty('--scene-left', '0px');
    wrap.style.setProperty('--scene-top', '0px');
    wrap.style.setProperty('--scene-bottom', '0px');
    return;
  }
  const actions = $('.stage-actions').getBoundingClientRect();
  const guide = $('#study-guide');
  const panelOpen = $('#panel').classList.contains('open');
  const landscape = innerWidth > innerHeight && innerHeight < 500;
  let left = 0;
  if (landscape && quiz) left = $('#quiz-card').getBoundingClientRect().right + 12;
  else if (landscape && !guide.hidden && !panelOpen) left = guide.getBoundingClientRect().right + 12;
  wrap.style.setProperty('--scene-left', `${Math.round(left)}px`);
  let top = actions.bottom - wrap.getBoundingClientRect().top + 10;
  if (!guide.hidden && !panelOpen && !landscape) top += guide.offsetHeight + 10;
  const footer = $('#panel-toggle').offsetHeight || 52;
  const peek = $('#peek');
  const bottom = panelOpen ? $('#panel').offsetHeight + 8
    : quiz ? landscape ? footer + 12 : footer + $('#quiz-card').offsetHeight + 20
    : !peek.hidden ? footer + peek.offsetHeight + 20 : footer + 76;
  wrap.style.setProperty('--scene-top', `${Math.round(top)}px`);
  wrap.style.setProperty('--scene-bottom', panelOpen ? `${Math.round(bottom)}px` : `calc(${Math.round(bottom)}px + env(safe-area-inset-bottom, 0px))`);
}
function resize() {
  renderDirty = true;
  const w = Math.max(1, viewport.clientWidth);
  const h = Math.max(1, viewport.clientHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const ratio = Math.min(devicePixelRatio, isNarrow() ? 1.5 : 2);
  if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
  renderer.setSize(w, h, false);
  HOME.radius = homeRadius();
}
let layoutQueued = false;
function scheduleLayout() {
  if (layoutQueued) return;
  layoutQueued = true;
  requestAnimationFrame(() => {
    layoutQueued = false;
    updateSceneLayout(); resize();
  });
}
const layoutObserver = new ResizeObserver(scheduleLayout);
[wrap, $('#peek'), $('#study-guide'), $('#panel'), $('#quiz-card')].forEach((element) => layoutObserver.observe(element));
new MutationObserver(scheduleLayout).observe($('#panel'), { attributes: true, attributeFilter: ['class'] });
window.addEventListener('resize', scheduleLayout);
window.visualViewport?.addEventListener('resize', scheduleLayout);
updateSceneLayout(); resize();

function animate() {
  requestAnimationFrame(animate);
  const moving = controls.isMoving;
  controls.update();
  // Labels also follow moving sheets even when the 3D scene is idle.
  camera.updateMatrixWorld();
  positionLabels();
  // Static anatomy needs no repeated GPU work while idle. This also keeps
  // the mobile sheet responsive on devices with a slower graphics processor.
  if (!renderDirty && !moving) return;
  renderDirty = false;

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

// ---------------------------------------------------------------- theme ----

function setTheme(name, remember) {
  const t = THEMES[name] ? name : 'dark';
  document.documentElement.dataset.theme = t;
  scene.background.setHex(THEMES[t].page);
  scene.fog.color.setHex(THEMES[t].page);
  GHOST_TINT.setHex(THEMES[t].ghost);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', `#${THEMES[t].page.toString(16).padStart(6, '0')}`);
  const other = t === 'light' ? 'dark' : 'light';
  const btn = $('#theme-toggle');
  btn.setAttribute('aria-label', `Switch to ${other} mode`);
  btn.title = `Switch to ${other} mode`;
  if (remember) {
    try { localStorage.setItem('theme', t); } catch (e) { /* private mode: choice lasts the visit */ }
  }
  applyVisibility();
}

$('#theme-toggle').addEventListener('click', () => {
  setTheme(themeNow() === 'light' ? 'dark' : 'light', true);
});

// Until the visitor picks one, follow the system as it changes.
const systemLight = window.matchMedia ? matchMedia('(prefers-color-scheme: light)') : null;
systemLight?.addEventListener?.('change', (e) => {
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch (err) { /* ignore */ }
  if (!saved) setTheme(e.matches ? 'light' : 'dark', false);
});
// ---------------------------------------------------------------- links ----
//
// Other apps (the Repd workout tracker) open the atlas at a set of muscles:
//   ?muscles=latissimus-dorsi,biceps-long   light these up, dim the rest;
//                                           the first is described in the card
//   ?heat=pectoralis-major:1,soleus:0.2     tint by how much each was trained,
//                                           from pale amber (little) to red (most)
//   ?view=front|back   ?theme=light|dark    ?embed=1 hides the masthead
// Unknown ids are ignored, so an old link never breaks the page.

const HEAT_COOL = new Color(0xf3c44f);
const HEAT_HOT = new Color(0xe5372a);
const _heat = new Color();
function heatColor(h) {
  return _heat.copy(HEAT_COOL).lerp(HEAT_HOT, Math.min(1, Math.max(0, h)));
}

const params = new URLSearchParams(location.search);
const knownIds = new Set(records.map((r) => r.id));
const listParam = (name) => (params.get(name) || '').split(',').map((s) => s.trim()).filter(Boolean);
const linked = listParam('muscles').filter((id) => knownIds.has(id));
for (const pair of listParam('heat')) {
  const [id, value] = pair.split(':');
  if (knownIds.has(id) && Number.isFinite(+value)) state.heat.set(id, Math.min(1, Math.max(0, +value)));
}
state.marked = new Set([...linked, ...state.heat.keys()]);
if (params.get('embed') === '1') document.documentElement.dataset.embed = '1';
const linkTheme = params.get('theme');

if (state.marked.size) {
  records.filter((r) => state.marked.has(r.id)).forEach((r) => setHighlight(r, true, true));
  // Face the side most of the named muscles are on, unless the link says.
  const marked = records.filter((r) => state.marked.has(r.id));
  const back = marked.filter((r) => { r.mesh.geometry.computeBoundingSphere(); return r.mesh.geometry.boundingSphere.center.z < 0; }).length;
  const view = params.get('view') || (back > marked.length / 2 ? 'back' : 'front');
  const [theta, phi] = VIEWS[view] || VIEWS.front;
  controls.flyTo(new Vector3(0, 0.94, 0), HOME.radius, theta, phi);
  const main = records.find((r) => r.id === linked[0]);
  if (main) { showDetail(main); showPeek(main); }
}

setTheme(linkTheme === 'light' || linkTheme === 'dark' ? linkTheme : themeNow(), false);

applyVisibility();
$('#muscle-total').textContent = records.length;
animate();

// Fade the loading veil once the first frame is on screen.
requestAnimationFrame(() => requestAnimationFrame(() => {
  const veil = $('#loading');
  if (veil) { veil.classList.add('gone'); setTimeout(() => veil.remove(), 500); }
}));
