/**
 * The head.
 *
 * Built to match the anatomical plates it is modelled on: the face is muscle,
 * not skin, capped by the pale galea aponeurotica over the top of the skull.
 * That cream cap against salmon muscle is the single most recognisable thing
 * about an écorché head, and it is what the reference plates all share.
 *
 * It is lofted from horizontal slices rather than sculpted, because a head is
 * really a stack of cross-sections that change shape as they descend: round at
 * the crown, widest at the temples, then narrowing at the front only as the
 * jaw runs down to the chin while the skull behind stays broad. That is why
 * each slice carries a separate front and back half-width.
 */

import {
  Group, Mesh, MeshStandardMaterial, SphereGeometry, BufferGeometry,
  BufferAttribute, Vector3, Color,
} from '../../vendor/three.module.min.js';
import { tubeLoft } from '../geometry/loft.js';
import { applyOcclusionToMaterial } from '../geometry/occlusion.js';

/** y, front half-width, back half-width, front z, back z. */
const SLICES = [
  [1.794, 0.026, 0.030, 0.020, -0.034],
  [1.780, 0.046, 0.050, 0.044, -0.056],
  [1.764, 0.058, 0.064, 0.062, -0.070],
  [1.748, 0.066, 0.071, 0.073, -0.080],
  [1.734, 0.070, 0.075, 0.079, -0.086],
  [1.722, 0.072, 0.077, 0.082, -0.089],
  [1.712, 0.072, 0.077, 0.085, -0.090],
  [1.702, 0.072, 0.077, 0.086, -0.091],  // eye level
  [1.692, 0.071, 0.077, 0.088, -0.091],
  [1.682, 0.070, 0.076, 0.089, -0.089],  // cheekbone
  [1.672, 0.067, 0.074, 0.090, -0.086],
  [1.662, 0.063, 0.072, 0.090, -0.082],
  [1.652, 0.056, 0.070, 0.088, -0.076],  // mouth
  [1.642, 0.049, 0.068, 0.085, -0.068],
  [1.632, 0.040, 0.065, 0.080, -0.060],  // jaw narrows, skull does not
  [1.622, 0.030, 0.059, 0.071, -0.052],
  [1.613, 0.021, 0.050, 0.058, -0.045],  // chin
  [1.606, 0.016, 0.042, 0.044, -0.040],
];

/** Hollows pressed into the shell after lofting: [x, y, z, radius, depth]. */
const HOLLOWS = [
  [0.0305, 1.7015, 0.086, 0.025, 0.015],   // right orbit
  [-0.0305, 1.7015, 0.086, 0.025, 0.015],  // left orbit
  [0, 1.6515, 0.088, 0.026, 0.005],        // mouth
  [0.052, 1.674, 0.070, 0.026, 0.004],     // right temple hollow
  [-0.052, 1.674, 0.070, 0.026, 0.004],    // left temple hollow
];

const RADIAL = 56;
const SQUARENESS = 2.3;   // slightly fuller than an ellipse; heads are not eggs

/**
 * The aponeurosis does not stop at a line. It fades into the frontalis above
 * the brow, so the shell carries a colour gradient rather than being split in
 * two, which was reading as a swim cap.
 */
const FLESH = new Color(0xc47a69);
const APONEUROSIS = new Color(0xded4c2);
const FADE_LOW = 1.706;   // all muscle below this
const FADE_HIGH = 1.756;  // all aponeurosis above it

export function skinMaterial(color = 0xbe9a80, roughness = 0.78) {
  const mat = new MeshStandardMaterial({ color, roughness, metalness: 0 });
  mat.onBeforeCompile = applyOcclusionToMaterial;
  return mat;
}

/** Loft the slices into a closed head shell. */
function headGeometry() {
  const verts = [];
  const uvs = [];
  const idx = [];
  const perRing = RADIAL + 1;
  const p = 2 / SQUARENESS;

  const rows = SLICES;
  const colors = [];
  const tint = new Color();
  rows.forEach(([y, wFront, wBack, zFront, zBack], row) => {
    for (let j = 0; j <= RADIAL; j++) {
      const a = (j / RADIAL) * Math.PI * 2;
      const s = Math.sin(a);
      const c = Math.cos(a);
      // Front and back are shaped separately, which is what gives a jawline.
      const w = c >= 0 ? wFront : wBack;
      const depth = c >= 0 ? zFront : -zBack;
      const ex = Math.sign(s) * Math.abs(s) ** p;
      const ez = Math.sign(c) * Math.abs(c) ** p;
      verts.push(ex * w, y, ez * depth);
      uvs.push(j / RADIAL, row / Math.max(1, rows.length - 1));
      colors.push(...scalpTint(y, tint));
    }
  });

  for (let r = 0; r < rows.length - 1; r++) {
    for (let j = 0; j < RADIAL; j++) {
      const a = r * perRing + j;
      const b = a + perRing;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  // Cap the crown and the underside of the jaw.
  [[0, 1], [rows.length - 1, -1]].forEach(([row, dir]) => {
    const y = rows[row][0] + dir * 0.006;
    const centre = verts.length / 3;
    verts.push(0, y, row === 0 ? -0.006 : -0.004);
    uvs.push(0.5, row === 0 ? 0 : 1);
    colors.push(...scalpTint(y, tint));
    const base = row * perRing;
    for (let j = 0; j < RADIAL; j++) {
      if (dir > 0) idx.push(centre, base + j + 1, base + j);
      else idx.push(centre, base + j, base + j + 1);
    }
  });

  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  g.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  g.setIndex(idx);
  carve(g);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** Muscle at the face, aponeurosis at the crown, smoothly between. */
function scalpTint(y, out) {
  const t = Math.min(1, Math.max(0, (y - FADE_LOW) / (FADE_HIGH - FADE_LOW)));
  out.copy(FLESH).lerp(APONEUROSIS, t * t * (3 - 2 * t));
  return [out.r, out.g, out.b];
}

/**
 * Press the hollows in. An eye sitting on a smooth ovoid bulges out and stares;
 * the socket is what makes it read as an eye, and the rim left around it is the
 * brow ridge and cheekbone.
 */
function carve(geo) {
  const pos = geo.attributes.position;
  const v = new Vector3();
  const centre = new Vector3();
  const inward = new Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    for (const [cx, cy, cz, radius, depth] of HOLLOWS) {
      centre.set(cx, cy, cz);
      const d = v.distanceTo(centre);
      if (d >= radius) continue;
      // Cosine falloff, so the hollow meets the surrounding surface smoothly.
      const k = Math.cos((d / radius) * Math.PI * 0.5) ** 2;
      inward.set(v.x, 0, v.z - 0.005);
      if (inward.lengthSq() < 1e-8) continue;
      v.addScaledVector(inward.normalize(), -depth * k);
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
}

/**
 * The head surface plus the features that make it read as a face rather than
 * an ovoid: nose, ears, eyes.
 */
export function buildFace() {
  const group = new Group();
  group.name = 'face';

  // Facial muscle mass, graded into the aponeurosis over the crown. The named
  // muscles sit proud of this, but even where one is not modelled individually
  // the face still reads as muscle.
  const flesh = skinMaterial(0xc47a69, 0.60);
  const shellMat = skinMaterial(0xffffff, 0.58);
  shellMat.vertexColors = true;

  const shell = new Mesh(headGeometry(), shellMat);
  shell.name = 'face.shell';
  group.add(shell);

  // Nose: bridge, tip, then tucking back under to the base.
  const nose = new Mesh(tubeLoft({
    path: [
      [0, 1.722, 0.072], [0, 1.707, 0.082], [0, 1.691, 0.094],
      [0, 1.678, 0.104], [0, 1.669, 0.101], [0, 1.663, 0.088],
    ],
    width: 0.013, flat: 0.92, squareness: 2.2,
    profile: [[0, 0.32], [0.28, 0.54], [0.62, 0.92], [0.80, 1.0], [1, 0.72]],
    segments: 26, radial: 16,
  }), flesh);
  nose.name = 'face.nose';
  group.add(nose);

  // Lips, as a low band around the mouth.
  const lips = new Mesh(tubeLoft({
    path: [
      [-0.022, 1.6505, 0.0800], [0, 1.6535, 0.0878], [0.022, 1.6505, 0.0800],
    ],
    width: 0.0085, flat: 0.5, squareness: 2.6,
    profile: [[0, 0.4], [0.5, 1.0], [1, 0.4]],
    segments: 16, radial: 12,
  }), skinMaterial(0xa9564a, 0.58));
  lips.name = 'face.lips';
  group.add(lips);

  [1, -1].forEach((side) => {
    const s = side > 0 ? 'r' : 'l';

    // Ear: a flattened disc set against the side of the head.
    const ear = new Mesh(new SphereGeometry(0.024, 16, 12), skinMaterial(0xc2a08c, 0.68));
    ear.position.set(0.072 * side, 1.686, -0.016);
    ear.scale.set(0.30, 1.06, 0.60);
    ear.rotation.z = -0.12 * side;
    ear.name = `face.ear.${s}`;
    group.add(ear);

    // Eye, open, as the plates show it: sclera in the socket, iris and pupil
    // on its front, and a thin muscular rim for the lid margin.
    const sclera = new Mesh(new SphereGeometry(0.0104, 20, 16), skinMaterial(0xc6bfb2, 0.38));
    sclera.position.set(0.0305 * side, 1.7005, 0.0718);
    sclera.name = `face.sclera.${s}`;
    group.add(sclera);

    const iris = new Mesh(new SphereGeometry(0.0051, 18, 14), skinMaterial(0x6d7f86, 0.30));
    iris.position.set(0.0314 * side, 1.7002, 0.0792);
    iris.scale.set(1, 1, 0.42);
    iris.name = `face.iris.${s}`;
    group.add(iris);

    const pupil = new Mesh(new SphereGeometry(0.0023, 12, 10), skinMaterial(0x140f0c, 0.25));
    pupil.position.set(0.0315 * side, 1.7002, 0.0812);
    pupil.scale.set(1, 1, 0.35);
    pupil.name = `face.pupil.${s}`;
    group.add(pupil);

    [[1.7075, 0.0790, 0.0044], [1.6938, 0.0784, 0.0034]].forEach(([ly, lz, lw], i) => {
      const rim = new Mesh(tubeLoft({
        path: [
          [0.017 * side, ly - (i ? -0.002 : 0.002), 0.0768],
          [0.031 * side, ly, lz],
          [0.045 * side, ly - (i ? -0.002 : 0.002), 0.0742],
        ],
        width: lw, flat: 0.55, profile: [[0, 0.45], [0.5, 1.0], [1, 0.45]],
        segments: 14, radial: 10,
      }), flesh);
      rim.name = `face.lidrim.${i ? 'lower' : 'upper'}.${s}`;
      group.add(rim);
    });

    // Nostril wing.
    const nostril = new Mesh(new SphereGeometry(0.0082, 14, 10), flesh);
    nostril.position.set(0.0135 * side, 1.6675, 0.0945);
    nostril.scale.set(0.92, 0.74, 0.86);
    nostril.name = `face.nostril.${s}`;
    group.add(nostril);
  });

  group.traverse((o) => { if (o.isMesh) o.userData.isFace = true; });
  return group;
}
