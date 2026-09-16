/**
 * Geometry measurements, for checking anatomical changes against numbers
 * rather than against an impression.
 *
 *   topology  - open edges in the head shell (F1)
 *   breadth   - silhouette half-width at named heights (F2)
 *   symmetry  - left/right agreement of every mirrored muscle
 *
 * Run before and after a change and diff the output.
 */
import { buildMuscles } from '../src/anatomy/build.js';
import { buildSkeleton } from '../src/anatomy/skeleton.js';
import { buildFace } from '../src/anatomy/face.js';
import { Box3, Vector3 } from '../vendor/three.module.min.js';

const H = 1.80;
const pad = (s, n) => String(s).padStart(n);

// ---------------------------------------------------------------- build ----
const { group: muscles, records } = buildMuscles();
const skeleton = buildSkeleton();
const head = skeleton.userData.head;
const face = buildFace();
[muscles, skeleton, head, face].forEach((g) => g.updateMatrixWorld(true));

const allMeshes = [];
[muscles, skeleton, head, face].forEach((g) => g.traverse((o) => {
  if (o.geometry) allMeshes.push(o);
}));

// Torso breadth has to exclude the arms, which hang beside the trunk and
// otherwise dominate the silhouette at chest, waist and hip height.
const ARM_BONE = /^(humerus|radius|ulna|carpus|metacarpal|phalanx|thumb|epicondyle)/;
const ARM_GROUP = new Set(['arm', 'forearm']);
const trunkMeshes = allMeshes.filter((m) => {
  const rec = m.userData.record;
  if (rec) return !ARM_GROUP.has(rec.group);
  return !ARM_BONE.test(m.name);
});

// ------------------------------------------------------------- topology ----
function openEdges(mesh) {
  const idx = mesh.geometry.index.array;
  const seen = new Map();
  const key = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  for (let i = 0; i < idx.length; i += 3) {
    [[idx[i], idx[i + 1]], [idx[i + 1], idx[i + 2]], [idx[i + 2], idx[i]]]
      .forEach(([a, b]) => { const k = key(a, b); seen.set(k, (seen.get(k) || 0) + 1); });
  }
  let open = 0; let over = 0;
  seen.forEach((n) => { if (n === 1) open++; else if (n > 2) over++; });
  return { open, over, tris: idx.length / 3, verts: mesh.geometry.attributes.position.count };
}

console.log('=== F1  HEAD SHELL TOPOLOGY ===');
const shell = face.children.find((c) => c.name === 'face.shell');
const t = openEdges(shell);
console.log(`  vertices ${pad(t.verts, 6)}   triangles ${pad(t.tris, 6)}`);
console.log(`  open edges ${pad(t.open, 4)}   over-shared ${pad(t.over, 4)}   ` +
            (t.open === 0 && t.over === 0 ? 'CLOSED' : 'NOT CLOSED'));

// -------------------------------------------------------------- breadth ----
// Silhouette half-width in a thin slab, over every mesh in the figure.
function halfWidthAt(y, slab = 0.012, meshes = allMeshes) {
  let max = 0;
  const v = new Vector3();
  meshes.forEach((m) => {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
      if (Math.abs(v.y - y) <= slab) max = Math.max(max, Math.abs(v.x));
    }
  });
  return max;
}

const box = new Box3();
allMeshes.forEach((m) => box.expandByObject(m));

// Chin: lowest point of the head shell, which is where the jaw ends.
const shellBox = new Box3().setFromObject(shell);

console.log('\n=== F2  PROPORTIONS ===');
console.log(`  figure height        ${box.max.y.toFixed(3)} m   (target ${H.toFixed(2)})`);
const headH = box.max.y - shellBox.min.y;
console.log(`  head vertex to chin  ${headH.toFixed(3)} m   canonical ${(0.130 * H).toFixed(3)}   ` +
            `${(((headH - 0.130 * H) / (0.130 * H)) * 100).toFixed(0)}%`);
console.log(`  heads tall           ${(box.max.y / headH).toFixed(2)}        canonical 7.50`);

// frac = canonical breadth as a fraction of stature; arms = include the arms.
const LEVELS = [
  ['shoulder, bideltoid', 1.472, 0.245, true],
  ['chest, trunk only', 1.330, 0.174, false],
  ['waist, trunk only', 1.075, 0.152, false],
  ['hip, trunk only', 0.948, 0.191, false],
];
console.log('\n  rendered breadth at height     model    canonical   dev');
LEVELS.forEach(([name, y, frac, withArms]) => {
  const b = halfWidthAt(y, 0.012, withArms ? allMeshes : trunkMeshes) * 2;
  const canon = frac * H;
  console.log(`  ${name.padEnd(28)} ${b.toFixed(3)}    ${canon.toFixed(3)}   ` +
              `${(((b - canon) / canon) * 100).toFixed(0)}%`);
});
// Bony shoulder width, which is the landmark rather than the silhouette.
console.log(`  ${'shoulder, biacromial (bone)'.padEnd(28)} ${(0.196 * 2).toFixed(3)}    ` +
            `${(0.215 * H).toFixed(3)}   ${(((0.392 - 0.215 * H) / (0.215 * H)) * 100).toFixed(0)}%`);

// ------------------------------------------------------------- symmetry ----
let asym = 0;
const byId = new Map();
records.forEach((r) => {
  if (!r.side) return;
  if (!byId.has(r.id)) byId.set(r.id, {});
  byId.get(r.id)[r.side] = r.mesh;
});
byId.forEach((pair, id) => {
  if (!pair.left || !pair.right) return;
  const L = new Box3().setFromObject(pair.left);
  const R = new Box3().setFromObject(pair.right);
  const d = Math.max(
    Math.abs(-L.max.x - R.min.x), Math.abs(-L.min.x - R.max.x),
    Math.abs(L.min.y - R.min.y), Math.abs(L.max.y - R.max.y),
    Math.abs(L.min.z - R.min.z), Math.abs(L.max.z - R.max.z),
  );
  if (d > 1e-6) { asym++; console.log(`  ASYMMETRIC ${id}  ${d.toFixed(6)} m`); }
});
console.log(`\n=== SYMMETRY ===\n  mirrored pairs checked ${byId.size}, mismatched ${asym}`);
