/**
 * Skeleton.
 *
 * Not a decorative wireframe: the muscles attach to these landmarks, so the
 * bones need real form. A long bone is wide at both ends and narrow through
 * the shaft, the spine carries its three curves, the ribcage is twelve pairs
 * sloping down and forward, and the scapula is a plate with a spine, an
 * acromion and a coracoid, because that is what the rotator cuff wraps.
 */

import {
  Group, Mesh, SphereGeometry, MeshStandardMaterial, Vector3,
} from '../../vendor/three.module.min.js';
import { tubeLoft, sheetLoft } from '../geometry/loft.js';
import { Y, X, Z, P } from './landmarks.js';

/** Wide at the epiphyses, narrow through the diaphysis. That silhouette reads as bone. */
const LONG_BONE = [[0, 1.0], [0.10, 0.60], [0.45, 0.52], [0.55, 0.52], [0.90, 0.62], [1, 1.0]];
const RIB       = [[0, 0.85], [0.15, 1.0], [0.85, 0.95], [1, 0.7]];

export function boneMaterial() {
  return new MeshStandardMaterial({
    color: 0xded2bd, roughness: 0.74, metalness: 0.0,
    transparent: true, opacity: 0.97,
  });
}

export function buildSkeleton() {
  const group = new Group();
  group.name = 'skeleton';
  // The head is kept separate: there are no head muscles in this model, so the
  // figure would be decapitated whenever the skeleton is switched off.
  const head = new Group();
  head.name = 'head';
  group.userData.head = head;
  const mat = boneMaterial();

  const add = (geo, name) => {
    const m = new Mesh(geo, mat);
    m.name = name;
    m.userData.isBone = true;
    group.add(m);
    return m;
  };

  const tube = (name, path, width, opts = {}) =>
    add(tubeLoft({ path, width, segments: 18, radial: 10, ...opts }), name);

  const knob = (name, p, r, scale = [1, 1, 1]) => {
    const m = new Mesh(new SphereGeometry(r, 13, 9), mat);
    m.position.set(p[0], p[1], p[2]);
    m.scale.set(scale[0], scale[1], scale[2]);
    m.name = name;
    m.userData.isBone = true;
    group.add(m);
    return m;
  };

  // ---- Skull and jaw ----
  // A head is about an eighth of stature, so roughly 0.23 m from crown to chin.
  const cranium = knob('cranium', [0, 1.698, 0.002], 0.077, [0.96, 1.12, 1.18]);
  cranium.rotation.x = -0.08;
  head.add(cranium);
  const face = knob('maxilla', [0, 1.650, 0.050], 0.046, [0.86, 0.92, 0.86]);
  head.add(face);
  const brow = knob('brow', [0, 1.694, 0.058], 0.036, [1.10, 0.44, 0.70]);
  head.add(brow);
  [1, -1].forEach((s2) => {
    head.add(tube(`mandible.${s2 > 0 ? 'r' : 'l'}`, [
      [0, 1.618, 0.076], [0.042 * s2, 1.626, 0.050], [0.055 * s2, 1.646, -0.004],
      [0.052 * s2, 1.672, -0.014],
    ], 0.0092, { flat: 0.72, profile: [[0, 0.85], [0.5, 1], [1, 0.6]] }));
  });

  // ---- Vertebral column ----
  // Cervical lordosis forward, thoracic kyphosis back, lumbar lordosis forward.
  const spine = spinePath();
  spine.forEach((v, i) => {
    const scale = v.y > Y.c7 ? 0.62 : v.y > Y.t12 ? 0.86 + (Y.t1 - v.y) * 0.55 : 1.22;
    // Vertebral body
    knob(`vertebra.${i}`, [0, v.y, v.z], 0.0155 * scale, [1.15, 0.62, 1.0]);
    // Spinous process, angled down and back
    const droop = v.y > Y.c7 ? 0.010 : v.y > Y.t12 ? 0.022 : 0.012;
    tube(`spinous.${i}`, [
      [0, v.y, v.z - 0.012 * scale],
      [0, v.y - droop, Z.spineBack + (v.y > Y.t12 ? 0.006 : 0.016)],
    ], 0.0062 * scale, { flat: 0.6, radial: 8, segments: 6 });
  });
  // Sacrum and coccyx
  add(sheetLoft({
    origin: [[0.052, Y.sacrumTop, Z.sacrum + 0.014], [0, Y.sacrumTop + 0.004, Z.sacrum + 0.006], [-0.052, Y.sacrumTop, Z.sacrum + 0.014]],
    insertion: [[0.016, Y.coccyx, Z.sacrum + 0.030], [0, Y.coccyx - 0.012, Z.sacrum + 0.026], [-0.016, Y.coccyx, Z.sacrum + 0.030]],
    thickness: 0.020, bulge: -0.014, outward: [0, 0, -1], uSeg: 14, vSeg: 12,
  }), 'sacrum');

  // ---- Sternum ----
  tube('manubrium', [
    [0, Y.suprasternal, Z.sternum], [0, Y.sternalAngle, Z.sternum + 0.004],
  ], 0.026, { flat: 0.30, squareness: 3.2, profile: [[0, 0.9], [0.5, 1], [1, 0.8]] });
  tube('sternum.body', [
    [0, Y.sternalAngle, Z.sternum + 0.004], [0, Y.xiphoid + 0.016, Z.sternum - 0.004],
  ], 0.019, { flat: 0.34, squareness: 3.2, profile: [[0, 0.95], [1, 0.8]] });
  tube('xiphoid', [
    [0, Y.xiphoid + 0.016, Z.sternum - 0.004], [0, Y.xiphoid - 0.016, Z.sternum - 0.014],
  ], 0.010, { flat: 0.5, profile: [[0, 1], [1, 0.4]] });

  // ---- Ribcage, clavicle, scapula, limbs: mirrored ----
  [1, -1].forEach((s) => {
    buildRibs(group, mat, s, tube);
    buildShoulderGirdle(group, mat, s, tube, add, knob);
    buildArm(group, mat, s, tube, knob);
    buildPelvis(group, mat, s, add, tube, knob);
    buildLeg(group, mat, s, tube, knob);
  });

  return group;
}

/**
 * The head, pulled out of the skeleton group so it can stay on screen while
 * the rest of the skeleton is hidden.
 */
export function extractHead(skeleton) {
  const head = skeleton.userData.head;
  skeleton.children
    .filter((c) => head.children.includes(c))
    .forEach((c) => skeleton.remove(c));
  head.children.forEach((c) => head.add(c));
  return head;
}

/** Vertebral levels with the three sagittal curves. */
function spinePath() {
  const levels = [];
  // Cervical: C1 down to C7, gently convex forward.
  for (let i = 0; i < 7; i++) {
    const k = i / 6;
    const y = Y.c1 - k * (Y.c1 - Y.c7);
    levels.push({ y, z: Z.spineFront + 0.020 - Math.sin(k * Math.PI) * 0.014 });
  }
  // Thoracic: T1 to T12, convex backward.
  for (let i = 0; i < 12; i++) {
    const k = i / 11;
    const y = Y.t1 - k * (Y.t1 - Y.t12);
    levels.push({ y, z: Z.spineFront + 0.004 - Math.sin(k * Math.PI) * 0.026 });
  }
  // Lumbar: L1 to L5, convex forward again.
  for (let i = 0; i < 5; i++) {
    const k = i / 4;
    const y = Y.l1 - k * (Y.l1 - Y.l5);
    levels.push({ y, z: Z.spineFront + 0.010 + Math.sin(k * Math.PI) * 0.020 });
  }
  return levels;
}

/** Twelve pairs, each sloping down and forward from its vertebra. */
function buildRibs(group, mat, s, tube) {
  const n = 12;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    const vy = Y.t1 - k * (Y.t1 - Y.t12);
    // Ribcage is narrow at the top, widest around ribs 8-9, tapering below.
    const spread = Math.sin(Math.PI * Math.min(1, (k + 0.16) * 0.86)) ** 0.7;
    const wide = (0.055 + (X.ribMax - 0.055) * spread);
    // Ribs slope downward as they run forward; lower ribs slope more.
    const drop = 0.052 + k * 0.060;
    const floating = i >= 10;

    const path = [
      [0.020 * s, vy, Z.spineFront - 0.014],
      [0.052 * s, vy - drop * 0.10, Z.ribBack - 0.006],
      [wide * 0.94 * s, vy - drop * 0.34, Z.ribBack + 0.052],
      [wide * s, vy - drop * 0.62, 0.016],
    ];
    if (!floating) {
      path.push([wide * 0.74 * s, vy - drop * 0.88, Z.ribFront - 0.006]);
      // Costal cartilage angles back up toward the sternum or the costal arch.
      const toSternum = i < 7;
      const endX = toSternum ? X.sternum * s : (0.058 + k * 0.02) * s;
      const endY = toSternum ? vy - drop : vy - drop * 1.16;
      path.push([endX, endY, Z.sternum + (toSternum ? 0.002 : -0.014)]);
    } else {
      path.push([wide * 0.62 * s, vy - drop * 0.9, 0.030]);
    }

    tube(`rib.${i}.${s > 0 ? 'r' : 'l'}`, path, 0.0092 - k * 0.0012, {
      flat: 0.62, profile: RIB, squareness: 2.6, segments: 22, radial: 8,
    });
  }
}

/** Clavicle, scapula plate, scapular spine, acromion, coracoid. */
function buildShoulderGirdle(group, mat, s, tube, add, knob) {
  const side = s > 0 ? 'r' : 'l';

  // Clavicle: the classic lazy S, convex forward medially, concave laterally.
  tube(`clavicle.${side}`, [
    [X.sternum * 0.9 * s, Y.suprasternal + 0.008, Z.sternum - 0.004],
    [0.062 * s, Y.acromion - 0.004, Z.sternum - 0.014],
    [0.124 * s, Y.acromion + 0.002, Z.acromion + 0.038],
    [X.acromion * 0.96 * s, Y.acromion, Z.acromion - 0.004],
  ], 0.0105, { flat: 0.82, profile: [[0, 1.1], [0.5, 0.78], [1, 1.0]], segments: 26 });

  // Scapula blade: a thin plate between the medial and lateral borders,
  // curved to sit against the back of the ribcage.
  add(sheetLoft({
    origin: [
      [X.scapulaMedial * s, Y.scapulaSup, Z.scapulaPlate + 0.012],
      [(X.scapulaMedial + 0.006) * s, Y.scapulaSpine, Z.scapulaPlate + 0.004],
      [(X.scapulaMedial + 0.020) * s, Y.scapulaInf + 0.030, Z.scapulaPlate + 0.008],
      [X.scapulaInf * s, Y.scapulaInf, Z.scapulaPlate + 0.012],
    ],
    insertion: [
      [(X.glenoid - 0.016) * s, Y.glenoid - 0.004, Z.glenoid - 0.030],
      [X.scapulaLateral * s, Y.scapulaSpine - 0.048, Z.scapulaPlate + 0.004],
      [(X.scapulaInf + 0.012) * s, Y.scapulaInf + 0.026, Z.scapulaPlate + 0.010],
      [X.scapulaInf * s, Y.scapulaInf, Z.scapulaPlate + 0.012],
    ],
    thickness: 0.0075, bulge: -0.012, uSeg: 18, vSeg: 16,
  }), `scapula.${side}`);

  // Scapular spine: the ridge you can feel across the back of the shoulder.
  tube(`scapula.spine.${side}`, [
    [(X.scapulaMedial + 0.002) * s, Y.scapulaSpine + 0.008, Z.scapulaPlate + 0.004],
    [0.088 * s, Y.scapulaSpine + 0.026, Z.scapulaPlate - 0.012],
    [0.152 * s, Y.acromion - 0.026, Z.acromion - 0.038],
  ], 0.0125, { flat: 0.44, squareness: 3.0, profile: [[0, 0.5], [0.5, 1], [1, 0.95]] });

  // Acromion: the bony roof over the joint. The supraspinatus tendon passes
  // under this, which is exactly where it gets pinched and torn.
  tube(`acromion.${side}`, [
    [0.152 * s, Y.acromion - 0.024, Z.acromion - 0.040],
    [X.acromion * s, Y.acromion + 0.002, Z.acromion - 0.014],
    [(X.acromion - 0.018) * s, Y.acromion - 0.002, Z.acromion + 0.026],
  ], 0.0125, { flat: 0.52, squareness: 3.0 });

  // Coracoid: the hook on the front, anchor for pec minor and the short head.
  tube(`coracoid.${side}`, [
    [(X.coracoid - 0.030) * s, Y.glenoid + 0.030, Z.glenoid + 0.010],
    [(X.coracoid - 0.010) * s, Y.glenoid + 0.026, Z.coracoid - 0.006],
    [X.coracoid * s, Y.glenoid + 0.014, Z.coracoid],
  ], 0.0088, { flat: 0.8 });

  // Glenoid fossa: the shallow socket. Shallow is why the cuff has to work.
  knob(`glenoid.${side}`, [X.glenoid * s, Y.glenoid, Z.glenoid], 0.021, [0.55, 1.15, 0.95]);
}

function buildArm(group, mat, s, tube, knob) {
  const side = s > 0 ? 'r' : 'l';
  const head = P.humerusHead;

  knob(`humerus.head.${side}`, [head[0] * s, head[1], head[2]], 0.0235, [1, 1, 1]);
  knob(`greaterTubercle.${side}`, [P.greaterTub[0] * s, P.greaterTub[1], P.greaterTub[2]], 0.0135, [1, 0.9, 0.9]);
  knob(`lesserTubercle.${side}`, [P.lesserTub[0] * s, P.lesserTub[1], P.lesserTub[2]], 0.0098, [0.9, 0.9, 0.9]);

  tube(`humerus.${side}`, [
    [head[0] * s, head[1] - 0.010, head[2] + 0.002],
    [(X.acromion - 0.012) * s, 1.300, 0.004],
    [X.elbow * s, Y.elbow + 0.014, 0.006],
  ], 0.0155, { profile: LONG_BONE, flat: 0.94, segments: 28 });

  knob(`epicondyle.med.${side}`, [(X.elbow - 0.022) * s, Y.elbow + 0.006, 0.004], 0.0115, [0.9, 0.8, 0.9]);
  knob(`epicondyle.lat.${side}`, [(X.elbow + 0.020) * s, Y.elbow + 0.006, 0.002], 0.0122, [0.9, 0.8, 0.9]);

  // Radius (thumb side) and ulna (little-finger side), slightly divergent.
  tube(`ulna.${side}`, [
    [(X.elbow - 0.012) * s, Y.elbow + 0.016, -0.014],
    [(X.wrist - 0.008) * s, 1.000, 0.014],
    [(X.wrist + 0.006) * s, Y.wrist, 0.020],
  ], 0.0108, { profile: [[0, 1.25], [0.18, 0.62], [0.6, 0.5], [1, 0.72]], flat: 0.9, segments: 24 });
  tube(`radius.${side}`, [
    [(X.elbow + 0.016) * s, Y.elbow + 0.004, 0.010],
    [(X.wrist + 0.016) * s, 1.000, 0.026],
    [(X.wrist - 0.010) * s, Y.wrist, 0.030],
  ], 0.0098, { profile: [[0, 0.72], [0.2, 0.5], [0.7, 0.56], [1, 1.15]], flat: 0.9, segments: 24 });

  // Hand: carpal block plus a metacarpal fan.
  knob(`carpus.${side}`, [(X.wrist - 0.002) * s, Y.wrist - 0.020, 0.028], 0.020, [1.0, 0.62, 0.52]);
  for (let f = 0; f < 4; f++) {
    const spread = (f - 1.5) * 0.016;
    tube(`metacarpal.${f}.${side}`, [
      [(X.wrist - 0.002 + spread * 0.4) * s, Y.wrist - 0.032, 0.028],
      [(X.wrist - 0.002 + spread) * s, Y.fingertip + 0.030, 0.030 - Math.abs(spread) * 0.2],
    ], 0.0052, { flat: 0.8, segments: 8, radial: 8 });
    tube(`phalanx.${f}.${side}`, [
      [(X.wrist - 0.002 + spread) * s, Y.fingertip + 0.030, 0.030],
      [(X.wrist - 0.002 + spread * 1.1) * s, Y.fingertip, 0.028],
    ], 0.0040, { flat: 0.85, segments: 6, radial: 8 });
  }
  tube(`thumb.${side}`, [
    [(X.wrist - 0.016) * s, Y.wrist - 0.026, 0.036],
    [(X.wrist - 0.034) * s, Y.wrist - 0.058, 0.048],
  ], 0.0058, { flat: 0.9, segments: 8, radial: 8 });
}

function buildPelvis(group, mat, s, add, tube, knob) {
  const side = s > 0 ? 'r' : 'l';

  // Iliac blade: a broad curved plate from the crest down to the socket.
  add(sheetLoft({
    origin: [
      [X.psis * s, Y.psis, Z.sacrum - 0.006],
      [(X.iliacCrest - 0.020) * s, Y.iliacCrest, -0.010],
      [X.iliacCrest * s, Y.iliacCrest - 0.006, 0.028],
      [X.asis * s, Y.asis, 0.062],
    ],
    insertion: [
      [(X.hipJoint - 0.020) * s, Y.hipJoint + 0.006, Z.sacrum + 0.024],
      [X.hipJoint * s, Y.hipJoint + 0.014, 0.000],
      [(X.hipJoint + 0.004) * s, Y.hipJoint + 0.012, 0.024],
      [(X.hipJoint - 0.004) * s, Y.hipJoint + 0.018, 0.044],
    ],
    thickness: 0.013, bulge: 0.020, uSeg: 22, vSeg: 14,
  }), `ilium.${side}`);

  // Crest rim, thickened so the blade reads as bone not paper.
  tube(`iliacCrest.${side}`, [
    [X.psis * s, Y.psis, Z.sacrum - 0.006],
    [(X.iliacCrest - 0.018) * s, Y.iliacCrest + 0.004, -0.014],
    [X.iliacCrest * s, Y.iliacCrest, 0.030],
    [X.asis * s, Y.asis, 0.062],
  ], 0.0105, { flat: 0.62, squareness: 2.8, segments: 20 });

  // Acetabulum, pubic ramus and ischial tuberosity.
  knob(`acetabulum.${side}`, [X.hipJoint * s, Y.hipJoint, Z.hipJoint], 0.0225, [0.9, 1, 1]);
  tube(`pubis.${side}`, [
    [X.hipJoint * s, Y.hipJoint - 0.014, Z.hipJoint + 0.014],
    [(X.pubis + 0.020) * s, Y.pubis + 0.004, 0.044],
    [X.pubis * 0.3 * s, Y.pubis, Z.pubis],
  ], 0.0098, { flat: 0.8, segments: 16 });
  tube(`ischium.${side}`, [
    [X.hipJoint * s, Y.hipJoint - 0.018, Z.hipJoint - 0.010],
    [X.ischialTub * s, Y.ischialTub, Z.ischialTub],
    [(X.pubis + 0.014) * s, Y.pubis - 0.006, 0.020],
  ], 0.0108, { flat: 0.9, segments: 18 });
}

function buildLeg(group, mat, s, tube, knob) {
  const side = s > 0 ? 'r' : 'l';

  // Femoral head, neck and greater trochanter, then the shaft angling inward.
  knob(`femur.head.${side}`, [X.hipJoint * s, Y.hipJoint, Z.hipJoint], 0.0225);
  tube(`femur.neck.${side}`, [
    [X.hipJoint * s, Y.hipJoint, Z.hipJoint],
    [X.trochanter * s, Y.trochanter - 0.014, Z.hipJoint - 0.006],
  ], 0.0135, { flat: 0.9, segments: 10 });
  knob(`trochanter.${side}`, [P.trochanter[0] * s, P.trochanter[1], P.trochanter[2]], 0.0175, [0.95, 1.1, 0.95]);
  tube(`femur.${side}`, [
    [X.trochanter * s * 0.97, Y.trochanter - 0.020, Z.hipJoint - 0.006],
    [0.128 * s, 0.740, 0.012],
    [X.knee * s, Y.knee + 0.030, Z.knee + 0.002],
  ], 0.0185, { profile: LONG_BONE, flat: 0.95, segments: 26 });
  knob(`femur.condyles.${side}`, [X.knee * s, Y.knee + 0.014, Z.knee - 0.004], 0.0245, [1.15, 0.85, 1.05]);
  knob(`patella.${side}`, [X.knee * s, Y.knee + 0.020, Z.knee + 0.038], 0.0138, [1.0, 1.25, 0.55]);

  // Tibia carries the load; fibula sits lateral and thin.
  tube(`tibia.${side}`, [
    [X.knee * s, Y.knee - 0.006, Z.knee],
    [(X.ankle + 0.014) * s, 0.290, 0.014],
    [(X.ankle + 0.004) * s, Y.ankle, Z.ankle],
  ], 0.0165, { profile: [[0, 1.35], [0.16, 0.66], [0.6, 0.58], [1, 0.86]], flat: 0.92, segments: 24 });
  tube(`fibula.${side}`, [
    [(X.knee + 0.026) * s, Y.knee - 0.020, Z.knee - 0.010],
    [(X.ankle + 0.032) * s, 0.290, 0.004],
    [(X.ankle + 0.030) * s, Y.ankle + 0.004, 0.000],
  ], 0.0082, { profile: [[0, 1.15], [0.2, 0.62], [0.8, 0.66], [1, 1.2]], flat: 0.9, segments: 22 });

  // Foot: calcaneus, midfoot, metatarsal fan.
  knob(`talus.${side}`, [(X.ankle + 0.004) * s, Y.ankle - 0.014, Z.ankle + 0.006], 0.0175, [0.9, 0.8, 1.0]);
  tube(`calcaneus.${side}`, [
    [(X.ankle + 0.004) * s, Y.ankle - 0.020, 0.000],
    [(X.ankle + 0.002) * s, Y.heel - 0.006, Z.heel],
  ], 0.0165, { flat: 0.85, profile: [[0, 0.8], [1, 1.05]], segments: 10 });
  for (let t = 0; t < 5; t++) {
    const spread = (t - 2) * 0.014;
    tube(`metatarsal.${t}.${side}`, [
      [(X.ankle + 0.004 + spread * 0.3) * s, Y.heel + 0.020, 0.010],
      [(X.ankle + spread) * s, Y.toe + 0.008, Z.toeTip - 0.030],
      [(X.ankle + spread * 1.1) * s, Y.toe, Z.toeTip - Math.abs(spread) * 0.6],
    ], 0.0052 - t * 0.0004, { flat: 0.85, segments: 10, radial: 8 });
  }
}
