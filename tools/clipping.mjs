/**
 * Muscle/bone intersection, measured by voxelising the skeleton and asking how
 * much of each muscle's surface falls inside it.
 *
 * Contact at an attachment is correct and expected, so the number never goes
 * to zero. What it catches is a muscle passing through a bone rather than
 * resting on it.
 *
 * Same voxel approach as src/geometry/occlusion.js, kept separate so measuring
 * never perturbs what it measures.
 */
import { buildMuscles } from '../src/anatomy/build.js';
import { buildSkeleton } from '../src/anatomy/skeleton.js';
import { Box3, Vector3 } from '../vendor/three.module.min.js';

const CELL = 0.006;

function voxelise(meshes) {
  const box = new Box3();
  meshes.forEach((m) => box.expandByObject(m));
  const min = box.min.clone().subScalar(CELL * 2);
  const size = box.max.clone().sub(min).addScalar(CELL * 4);
  const nx = Math.ceil(size.x / CELL);
  const ny = Math.ceil(size.y / CELL);
  const nz = Math.ceil(size.z / CELL);
  const data = new Uint8Array(nx * ny * nz);
  const at = (x, y, z) => {
    const a = ((x - min.x) / CELL) | 0;
    const b = ((y - min.y) / CELL) | 0;
    const c = ((z - min.z) / CELL) | 0;
    if (a < 0 || b < 0 || c < 0 || a >= nx || b >= ny || c >= nz) return -1;
    return (c * ny + b) * nx + a;
  };
  const v = new Vector3();
  const a = new Vector3(); const b = new Vector3(); const c = new Vector3();
  meshes.forEach((m) => {
    const pos = m.geometry.attributes.position;
    const index = m.geometry.index;
    const mw = m.matrixWorld;
    const count = index ? index.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const i0 = index ? index.getX(i) : i;
      const i1 = index ? index.getX(i + 1) : i + 1;
      const i2 = index ? index.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(mw);
      b.fromBufferAttribute(pos, i1).applyMatrix4(mw);
      c.fromBufferAttribute(pos, i2).applyMatrix4(mw);
      const k = Math.min(6, Math.max(1, Math.ceil(
        Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) / CELL,
      )));
      for (let u = 0; u <= k; u++) {
        for (let w = 0; u + w <= k; w++) {
          const bu = u / k; const bw = w / k; const bv = 1 - bu - bw;
          v.set(a.x * bv + b.x * bu + c.x * bw,
                a.y * bv + b.y * bu + c.y * bw,
                a.z * bv + b.z * bu + c.z * bw);
          const idx = at(v.x, v.y, v.z);
          if (idx >= 0) data[idx] = 1;
        }
      }
    }
  });
  return { data, at };
}

const { records } = buildMuscles();
const skeleton = buildSkeleton();
const head = skeleton.userData.head;
[skeleton, head].forEach((g) => g.updateMatrixWorld(true));
const bones = [...skeleton.children, ...head.children].filter((c) => c.geometry);
// The girdle as a whole, and the blade on its own. The blade is the number
// that matters for the cuff: contact with the spine, acromion or glenoid is
// where these muscles actually attach, but the blade is something they should
// lie on rather than pass through.
const scapulaOnly = bones.filter((b) => /^(scapula|acromion|coracoid|glenoid)/.test(b.name));
const bladeOnly = bones.filter((b) => /^scapula\.(r|l)$/.test(b.name));

const allBone = voxelise(bones);
const scapula = voxelise(scapulaOnly);
const blade = voxelise(bladeOnly);

function buried(mesh, grid) {
  const p = mesh.geometry.attributes.position;
  const v = new Vector3();
  let n = 0;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
    const k = grid.at(v.x, v.y, v.z);
    if (k >= 0 && grid.data[k]) n++;
  }
  return { n, total: p.count };
}

const WATCH = ['supraspinatus', 'infraspinatus', 'subscapularis',
               'teres-minor', 'teres-major', 'levator-scapulae'];

let gIn = 0; let gTot = 0;
const perMuscle = new Map();
records.forEach((r) => {
  const a = buried(r.mesh, allBone);
  gIn += a.n; gTot += a.total;
  if (!perMuscle.has(r.id)) perMuscle.set(r.id, { bone: 0, scap: 0, blade: 0, total: 0 });
  const e = perMuscle.get(r.id);
  e.bone += a.n; e.total += a.total;
  e.scap += buried(r.mesh, scapula).n;
  e.blade += buried(r.mesh, blade).n;
});

console.log('muscle                   in any bone   in girdle   in blade');
WATCH.forEach((id) => {
  const e = perMuscle.get(id);
  if (!e) { console.log(`  ${id.padEnd(22)} (not found)`); return; }
  const pct = (n) => String((n / e.total * 100).toFixed(1)).padStart(6);
  console.log(`  ${id.padEnd(22)} ${pct(e.bone)}%      ${pct(e.scap)}%    ${pct(e.blade)}%`);
});
const watchIn = WATCH.reduce((s, id) => s + (perMuscle.get(id)?.bone || 0), 0);
const watchTot = WATCH.reduce((s, id) => s + (perMuscle.get(id)?.total || 0), 0);
console.log(`  ${'--- these six'.padEnd(22)} ${String((watchIn / watchTot * 100).toFixed(1)).padStart(7)}%`);
console.log(`  ${'--- whole model'.padEnd(22)} ${String((gIn / gTot * 100).toFixed(1)).padStart(7)}%`);
