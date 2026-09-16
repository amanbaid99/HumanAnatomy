/**
 * Anatomical landmarks for a standing 1.80 m adult male figure.
 *
 * One source of truth. Bones and muscles both attach to these, so a muscle's
 * origin lands on the bone it actually originates from instead of floating
 * near it. Proportions follow standard anthropometric fractions of stature.
 *
 * Axes:  +x = the figure's left as you look at it (mirrored to -x)
 *        +y = up, floor at 0
 *        +z = anterior (front)
 *
 * Every x here is positive. Mirroring negates x to produce the other side.
 */

export const H = 1.80;

/** Heights, as fractions of stature where a standard fraction exists. */
export const Y = {
  vertex:        1.800,
  glabella:      1.729,
  chin:          1.599,
  c1:            1.597,
  c7:            1.499,   // vertebra prominens, the bump at the base of the neck
  t1:            1.486,
  t4:            1.400,   // level of the sternal angle and the spine of the scapula
  t12:           1.160,
  l1:            1.140,
  l3:            1.075,   // umbilicus
  l5:            1.000,
  sacrumTop:     0.990,
  coccyx:        0.885,

  suprasternal:  1.462,   // jugular notch
  sternalAngle:  1.392,
  xiphoid:       1.235,
  acromion:      1.472,
  glenoid:       1.432,
  scapulaSup:    1.452,   // superior angle
  scapulaInf:    1.243,   // inferior angle
  scapulaSpine:  1.400,

  iliacCrest:    1.030,
  asis:          0.978,   // anterior superior iliac spine
  psis:          1.005,   // posterior superior iliac spine
  pubis:         0.928,
  ischialTub:    0.905,   // sit bone
  hipJoint:      0.940,
  trochanter:    0.948,

  elbow:         1.128,
  wrist:         0.872,
  fingertip:     0.735,

  knee:          0.512,
  tibialTub:     0.470,
  ankle:         0.075,
  heel:          0.038,
  toe:           0.020,
};

/** Half-widths (distance from the midline out to the landmark). */
export const X = {
  neck:          0.055,
  acromion:      0.196,
  glenoid:       0.163,
  scapulaMedial: 0.038,   // medial border, a few cm off the spinous processes
  scapulaLateral:0.142,
  scapulaInf:    0.082,
  coracoid:      0.108,
  sternum:       0.021,
  ribMax:        0.148,   // widest point of the ribcage, around ribs 8-9
  waist:         0.118,
  iliacCrest:    0.135,
  asis:          0.118,
  psis:          0.038,
  pubis:         0.028,
  ischialTub:    0.062,
  hipJoint:      0.088,
  trochanter:    0.163,

  humerusHead:   0.170,
  elbow:         0.196,
  wrist:         0.196,

  knee:          0.104,
  ankle:         0.082,
};

/** Depths along z. Negative is posterior. */
export const Z = {
  spineFront:   -0.028,   // anterior face of the vertebral bodies
  spineBack:    -0.072,   // tips of the spinous processes
  sternum:       0.082,
  ribFront:      0.092,
  ribBack:      -0.082,
  bellyFront:    0.108,
  sacrum:       -0.058,
  pubis:         0.048,
  ischialTub:   -0.048,
  acromion:     -0.012,
  glenoid:      -0.026,
  scapulaPlate: -0.078,
  coracoid:      0.028,
  hipJoint:      0.004,
  knee:          0.006,
  ankle:         0.002,
  heel:         -0.052,
  toeTip:        0.128,
};

/** Named points assembled from the tables above, for readability at call sites. */
export const P = {
  suprasternal: [X.sternum * 0.2, Y.suprasternal, Z.sternum],
  xiphoid:      [0, Y.xiphoid, Z.sternum - 0.006],
  acromion:     [X.acromion, Y.acromion, Z.acromion],
  glenoid:      [X.glenoid, Y.glenoid, Z.glenoid],
  coracoid:     [X.coracoid, Y.glenoid + 0.014, Z.coracoid],
  scapulaSup:   [X.scapulaMedial + 0.004, Y.scapulaSup, Z.scapulaPlate],
  scapulaInf:   [X.scapulaInf, Y.scapulaInf, Z.scapulaPlate + 0.006],
  humerusHead:  [X.humerusHead, Y.glenoid, Z.glenoid + 0.004],
  greaterTub:   [X.humerusHead + 0.021, Y.glenoid + 0.012, Z.glenoid + 0.012],
  lesserTub:    [X.humerusHead + 0.004, Y.glenoid + 0.010, Z.glenoid + 0.030],
  deltoidTub:   [X.acromion + 0.008, 1.268, 0.010],
  elbow:        [X.elbow, Y.elbow, Z.knee + 0.010],
  wrist:        [X.wrist, Y.wrist, 0.028],
  asis:         [X.asis, Y.asis, 0.062],
  psis:         [X.psis, Y.psis, Z.sacrum - 0.004],
  ischialTub:   [X.ischialTub, Y.ischialTub, Z.ischialTub],
  pubis:        [X.pubis, Y.pubis, Z.pubis],
  trochanter:   [X.trochanter, Y.trochanter, Z.hipJoint - 0.008],
  knee:         [X.knee, Y.knee, Z.knee],
  ankle:        [X.ankle, Y.ankle, Z.ankle],
};

/**
 * Radius of the torso shell at a given height, used to drape sheet muscles
 * and to keep deep muscles from poking through superficial ones.
 */
export function torsoHalfWidth(y) {
  if (y > Y.c7) return X.neck + (Y.vertex - y) * 0.02;
  if (y > Y.t4) return X.neck + (Y.c7 - y) / (Y.c7 - Y.t4) * (X.ribMax - X.neck) * 0.92;
  if (y > Y.t12) return X.ribMax;
  if (y > Y.l5) return X.waist + (y - Y.l5) / (Y.t12 - Y.l5) * (X.ribMax - X.waist) * 0.7;
  return X.iliacCrest;
}
