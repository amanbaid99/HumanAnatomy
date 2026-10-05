/**
 * Loft geometry engine.
 *
 * Muscles are not cylinders. The two shapes that matter anatomically:
 *
 *   tubeLoft   - fusiform / strap muscles. A variable elliptical cross-section
 *                swept along a curved centerline. Biceps, sartorius, the calf.
 *   sheetLoft  - flat fan muscles. A ruled surface between a broad bony origin
 *                and a narrow insertion, bulged outward so it drapes over the
 *                trunk, then given thickness. Trapezius, lat, pec major, glute.
 *
 * Sweeping along a curve naively makes the cross-section spin around the
 * tangent and the mesh visibly twists. We use rotation-minimizing frames
 * (double reflection, Wang et al. 2008) so the frame carries along the curve
 * with as little roll as possible.
 */

import {
  BufferGeometry, BufferAttribute, CatmullRomCurve3, Vector3,
} from '../../vendor/three.module.min.js';

const _v = () => new Vector3();

/** Sample a Catmull-Rom through the control points, returning positions + unit tangents. */
function sampleCurve(points, segments, closed = false, tension = 0.5) {
  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(p[0], p[1], p[2])),
    closed, 'catmullrom', tension,
  );
  const pos = [];
  const tan = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    pos.push(curve.getPointAt(t));
    tan.push(curve.getTangentAt(t).normalize());
  }
  return { pos, tan, curve };
}

/**
 * Rotation-minimizing frames by double reflection.
 * Returns per-sample orthonormal { r, s } with r,s perpendicular to the tangent.
 */
function rmFrames(pos, tan, up) {
  const n = pos.length;
  const r = new Array(n);
  const s = new Array(n);

  // Seed: any vector perpendicular to the first tangent, biased toward `up`
  // so flat muscles keep a predictable orientation.
  let seed = up ? up.clone() : new Vector3(0, 1, 0);
  if (Math.abs(seed.dot(tan[0])) > 0.95) seed = new Vector3(1, 0, 0);
  if (Math.abs(seed.dot(tan[0])) > 0.95) seed = new Vector3(0, 0, 1);
  r[0] = seed.clone().sub(tan[0].clone().multiplyScalar(seed.dot(tan[0]))).normalize();
  s[0] = _v().crossVectors(tan[0], r[0]).normalize();

  for (let i = 0; i < n - 1; i++) {
    const v1 = _v().subVectors(pos[i + 1], pos[i]);
    const c1 = v1.dot(v1);
    if (c1 < 1e-12) { r[i + 1] = r[i].clone(); s[i + 1] = s[i].clone(); continue; }

    // Reflect the frame and the tangent across the plane of the chord.
    const rL = r[i].clone().sub(v1.clone().multiplyScalar((2 / c1) * v1.dot(r[i])));
    const tL = tan[i].clone().sub(v1.clone().multiplyScalar((2 / c1) * v1.dot(tan[i])));

    // Second reflection lines tL up with the next tangent.
    const v2 = _v().subVectors(tan[i + 1], tL);
    const c2 = v2.dot(v2);
    const rNext = c2 < 1e-12
      ? rL
      : rL.clone().sub(v2.clone().multiplyScalar((2 / c2) * v2.dot(rL)));

    r[i + 1] = rNext.normalize();
    s[i + 1] = _v().crossVectors(tan[i + 1], r[i + 1]).normalize();
  }
  return { r, s };
}

/** Piecewise-linear lookup over [[t, value], ...] keyframes, clamped at the ends. */
function keyframe(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (t >= t0 && t <= t1) {
      const k = (t - t0) / (t1 - t0 || 1);
      // Smoothstep between keys so bellies swell instead of creasing.
      const e = k * k * (3 - 2 * k);
      return v0 + (v1 - v0) * e;
    }
  }
  return last[1];
}

/** Fusiform default: thin tendon, swelling belly, thin tendon. */
export const FUSIFORM = [[0, 0.30], [0.22, 0.95], [0.5, 1.0], [0.78, 0.92], [1, 0.28]];
/** Strap muscle: nearly constant, slight taper. */
export const STRAP = [[0, 0.72], [0.3, 1.0], [0.7, 1.0], [1, 0.68]];
/** Tapers to a point at the insertion only (deltoid, glute med). */
export const TAPERED = [[0, 0.95], [0.35, 1.0], [1, 0.30]];

/**
 * Sweep a cross-section along a curve.
 *
 * @param {number[][]} path      centerline control points
 * @param {number}     width     max half-width (meters)
 * @param {number}     flat      height/width ratio; <1 flattens against the body
 * @param {Array}      profile   [[t, scale], ...] width scale along the muscle
 * @param {number}     squareness superellipse exponent; 2 = ellipse, higher = slab-like
 * @param {number[]}   alignRadial [x, z] of a vertical axis. When given, the
 *        thin side of the cross-section is held along the outward direction
 *        from that axis instead of being carried by the transported frame.
 *        A flat band following a closed loop on a curved surface needs this:
 *        transported frames drift around the loop, so the ribbon ends up
 *        standing edge-on to the surface rather than lying on it.
 */
export function tubeLoft({
  path,
  width = 0.03,
  flat = 1.0,
  profile = FUSIFORM,
  squareness = 2.4,
  twist = 0,
  segments = 34,
  radial = 14,
  up = null,
  tension = 0.5,
  alignRadial = null,
}) {
  const { pos, tan } = sampleCurve(path, segments, false, tension);
  const { r, s } = alignRadial
    ? radialFrames(pos, tan, alignRadial)
    : rmFrames(pos, tan, up ? new Vector3(...up) : null);

  const verts = [];
  const norms = [];
  const uvs = [];
  const tendon = [];
  const rings = segments + 1;

  for (let i = 0; i < rings; i++) {
    const t = i / segments;
    const scale = keyframe(profile, t);
    const w = width * scale;
    const h = width * flat * scale;
    const roll = typeof twist === 'function' ? twist(t) : twist * t;

    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2 + roll;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // Superellipse: |cos|^(2/n) keeps the silhouette from reading as a pipe.
      const p = 2 / squareness;
      const ex = Math.sign(ca) * Math.pow(Math.abs(ca), p);
      const ey = Math.sign(sa) * Math.pow(Math.abs(sa), p);

      const off = r[i].clone().multiplyScalar(ex * w).add(s[i].clone().multiplyScalar(ey * h));
      const vert = pos[i].clone().add(off);
      verts.push(vert.x, vert.y, vert.z);

      // Normal from the ellipse gradient, mapped into the frame.
      const nx = ex / Math.max(w, 1e-6);
      const ny = ey / Math.max(h, 1e-6);
      const nrm = r[i].clone().multiplyScalar(nx).add(s[i].clone().multiplyScalar(ny)).normalize();
      norms.push(nrm.x, nrm.y, nrm.z);
      uvs.push(j / radial, t);
      // Thin stretches are tendon. Feed that out so the material can pale them.
      tendon.push(tendonWeight(scale));
    }
  }

  const idx = [];
  const perRing = radial + 1;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * perRing + j;
      const b = a + perRing;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  // Caps: fan each end ring to its centre so the muscle reads as a closed body.
  const capEnds = [0, segments];
  capEnds.forEach((ringIdx, k) => {
    const centre = pos[ringIdx];
    const ci = verts.length / 3;
    verts.push(centre.x, centre.y, centre.z);
    const cn = tan[ringIdx].clone().multiplyScalar(k === 0 ? -1 : 1);
    norms.push(cn.x, cn.y, cn.z);
    uvs.push(0.5, k);
    tendon.push(tendonWeight(keyframe(profile, ringIdx / segments)));
    const base = ringIdx * perRing;
    for (let j = 0; j < radial; j++) {
      if (k === 0) idx.push(ci, base + j + 1, base + j);
      else idx.push(ci, base + j, base + j + 1);
    }
  });

  return buildGeometry(verts, norms, uvs, idx, tendon);
}

/**
 * Frames whose thin axis points away from a vertical axis, so a band lies flat
 * against a rounded surface like the face or the skull.
 */
function radialFrames(pos, tan, [ax, az]) {
  const r = [];
  const s = [];
  const outward = new Vector3();
  for (let i = 0; i < pos.length; i++) {
    outward.set(pos[i].x - ax, 0, pos[i].z - az);
    if (outward.lengthSq() < 1e-10) outward.set(0, 0, 1);
    outward.normalize();
    // Drop any component along the path, so the frame stays orthonormal.
    const thin = outward.clone().sub(tan[i].clone().multiplyScalar(outward.dot(tan[i])));
    if (thin.lengthSq() < 1e-10) thin.set(0, 0, 1);
    thin.normalize();
    s.push(thin);
    r.push(new Vector3().crossVectors(tan[i], thin).normalize());
  }
  return { r, s };
}

/** A muscle narrows into its tendon, so thinness is a good proxy for tendon. */
function tendonWeight(scale) {
  return Math.min(1, Math.max(0, (0.70 - scale) / 0.46));
}

/**
 * A polyline is taken to be a closed loop when its last point repeats its
 * first. That is the only signal needed: a caller that wants a ring says so by
 * drawing one.
 */
function isLoop(points) {
  if (!Array.isArray(points) || points.length < 4) return false;
  const a = points[0];
  const b = points[points.length - 1];
  return Math.abs(a[0] - b[0]) < 1e-7
    && Math.abs(a[1] - b[1]) < 1e-7
    && Math.abs(a[2] - b[2]) < 1e-7;
}

/** Sample a polyline (given as control points) at parameter u in [0,1]. */
function sampleLine(points, u, tension = 0.5, closed = false) {
  if (closed) {
    // Drop the repeated point; a closed curve joins the ends itself, and
    // leaving the duplicate in puts a cusp at the join.
    const curve = new CatmullRomCurve3(
      points.slice(0, -1).map((p) => new Vector3(p[0], p[1], p[2])),
      true, 'catmullrom', tension,
    );
    return curve.getPointAt(((u % 1) + 1) % 1);
  }
  if (points.length === 1) return new Vector3(...points[0]);
  if (points.length === 2) {
    const a = new Vector3(...points[0]);
    const b = new Vector3(...points[1]);
    return a.lerp(b, u);
  }
  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(p[0], p[1], p[2])), false, 'catmullrom', tension,
  );
  return curve.getPointAt(Math.min(Math.max(u, 0), 1));
}

/**
 * Flat fan muscle: a ruled surface from a broad origin to a narrow insertion,
 * bulged outward so it drapes over the trunk rather than cutting through it,
 * then thickened into a solid.
 *
 * Both edges may instead be closed loops - a polyline whose last point repeats
 * its first - and the sheet is then swept as an annulus: a ribbon with a hole
 * through it rather than a strip with two free ends. That is what a muscle like
 * orbicularis oculi is. There is no seam column, because the grid wraps in u,
 * and only the two loop edges need stitching.
 *
 * @param {number[][]} origin     broad bony attachment, as a polyline or loop
 * @param {number[][]} insertion  narrow attachment, as a polyline or loop
 * @param {number}     thickness  slab thickness (meters)
 * @param {number}     bulge      outward displacement at mid-span
 * @param {string|number[]|Function} outward which way is out: 'radial' (away
 *        from the body's Y axis), a fixed direction, or a function of a point
 *        returning the local surface normal there. The function form is what a
 *        sheet lying on a curved surface needs - the slab is then thickened
 *        along that surface rather than along a radius from the body's axis,
 *        which around the eye is tens of degrees out.
 * @param {Array} taper  [[v, scale], ...] narrowing from origin to insertion.
 *        Ignored for a loop, which has no edges to draw in.
 */
export function sheetLoft({
  origin,
  insertion,
  thickness = 0.012,
  bulge = 0.02,
  outward = 'radial',
  uSeg = 26,
  vSeg = 18,
  taper = null,
  axisY = null,
}) {
  const grid = [];
  const fixedOut = Array.isArray(outward) ? new Vector3(...outward).normalize() : null;
  const outFn = typeof outward === 'function' ? outward : null;
  const closed = isLoop(origin) && isLoop(insertion);
  // A ring has no seam column: the last column's neighbour is the first.
  const cols = closed ? uSeg : uSeg + 1;
  const uWrap = (iu) => (closed ? (iu + cols) % cols : Math.min(Math.max(iu, 0), uSeg));

  for (let iv = 0; iv <= vSeg; iv++) {
    const v = iv / vSeg;
    const row = [];
    for (let iu = 0; iu < cols; iu++) {
      const u = iu / uSeg;
      // Taper pulls the sheet's edges toward its centre as it nears the
      // insertion. A loop has no edges to pull, so it is left alone.
      const shrink = taper && !closed ? keyframe(taper, v) : 1;
      const uu = closed ? u : 0.5 + (u - 0.5) * shrink;

      const p0 = sampleLine(origin, uu, 0.5, closed);
      const p1 = sampleLine(insertion, uu, 0.5, closed);
      const p = p0.clone().lerp(p1, v);

      // Bulge outward, peaking mid-span, so the sheet has believable relief.
      let dir;
      if (outFn) {
        dir = new Vector3().fromArray(outFn(p).toArray ? outFn(p).toArray() : outFn(p)).normalize();
      } else if (fixedOut) {
        dir = fixedOut.clone();
      } else {
        const axis = new Vector3(0, p.y, 0);
        if (axisY !== null) axis.setY(axisY);
        dir = p.clone().sub(axis);
        dir.y = 0;
        if (dir.lengthSq() < 1e-8) dir.set(0, 0, 1);
        dir.normalize();
      }
      // Fade the bulge at both attachments; muscles are flat where they anchor.
      // A ring fades only across its width, since it never ends in u.
      const archU = closed ? 1 : Math.sin(Math.PI * Math.min(Math.max(uu, 0), 1)) ** 0.5;
      p.add(dir.clone().multiplyScalar(bulge * Math.sin(Math.PI * v) * archU));
      row.push(p);
    }
    grid.push(row);
  }

  // Surface normals. Where the caller can say which way is out, that answer is
  // used directly, because it knows the surface the sheet lies on and the grid
  // only knows the sheet. Otherwise take them from the grid's own neighbours.
  const normals = grid.map((row, iv) => row.map((p, iu) => {
    if (outFn) {
      const n = outFn(p);
      return new Vector3().fromArray(n.toArray ? n.toArray() : n).normalize();
    }
    const a = grid[iv][uWrap(iu + 1)].clone().sub(grid[iv][uWrap(iu - 1)]);
    const b = grid[Math.min(iv + 1, vSeg)][iu].clone().sub(grid[Math.max(iv - 1, 0)][iu]);
    const n = _v().crossVectors(b, a);
    if (n.lengthSq() < 1e-12) n.set(0, 0, 1);
    return n.normalize();
  }));

  // Flip so normals point away from the body axis. Not needed when the caller
  // supplied them: those already point out of the surface.
  let flip = 0;
  if (!outFn) {
    for (let iv = 0; iv <= vSeg; iv += Math.max(1, Math.floor(vSeg / 4))) {
      const p = grid[iv][Math.floor(uSeg / 2)];
      const out = new Vector3(p.x, 0, p.z);
      if (out.lengthSq() > 1e-8) flip += normals[iv][Math.floor(uSeg / 2)].dot(out.normalize()) < 0 ? 1 : -1;
    }
  }
  if (flip > 0) normals.forEach((row) => row.forEach((n) => n.negate()));

  const verts = [];
  const norms = [];
  const uvs = [];
  const tendon = [];
  const idx = [];
  const half = thickness / 2;

  // Two shells: outer (+normal) and inner (-normal).
  const shellStart = [];
  [1, -1].forEach((side) => {
    shellStart.push(verts.length / 3);
    for (let iv = 0; iv <= vSeg; iv++) {
      for (let iu = 0; iu < cols; iu++) {
        // Thin the slab toward its edges so it does not end in a hard wall.
        // A ring is only thinned across its width; thinning it in u would
        // pinch it to nothing at an arbitrary point on the loop.
        const edgeU = closed ? 1 : Math.sin(Math.PI * (iu / uSeg)) ** 0.35;
        const edge = edgeU * Math.sin(Math.PI * (iv / vSeg)) ** 0.25;
        const t = half * (0.25 + 0.75 * edge);
        const n = normals[iv][iu];
        const p = grid[iv][iu].clone().add(n.clone().multiplyScalar(side * t));
        verts.push(p.x, p.y, p.z);
        const nn = n.clone().multiplyScalar(side);
        norms.push(nn.x, nn.y, nn.z);
        // A ring's u wraps, so it is divided by the column count; an open
        // sheet still runs 0 to 1 across its last column.
        uvs.push(iu / (closed ? cols : uSeg), iv / vSeg);
        // Sheets go aponeurotic where they meet bone, at both v edges. A ring
        // meets no bone along an edge - it has no origin or insertion line at
        // all - so it stays belly all the way across. Leaving the rule on put
        // a pale circle round each margin, and two of those around an eye read
        // as a target rather than as a muscle.
        const v = iv / vSeg;
        tendon.push(closed ? 0 : Math.min(1, Math.max(0, 1 - Math.sin(Math.PI * v) / 0.40)));
      }
    }
  });

  const perRow = cols;
  const quads = closed ? cols : uSeg;
  shellStart.forEach((start, si) => {
    for (let iv = 0; iv < vSeg; iv++) {
      for (let iu = 0; iu < quads; iu++) {
        const a = start + iv * perRow + iu;
        const a1 = start + iv * perRow + uWrap(iu + 1);
        const b = a + perRow;
        const b1 = a1 + perRow;
        if (si === 0) idx.push(a, b, a1, b, b1, a1);
        else idx.push(a, a1, b, b, a1, b1);
      }
    }
  });

  // Stitch the two shells around the border so the slab is watertight.
  const [o, i2] = shellStart;
  for (let iu = 0; iu < quads; iu++) {
    const u1 = iu;
    const u2 = uWrap(iu + 1);
    // top edge (v = 0)
    idx.push(o + u1, o + u2, i2 + u1, i2 + u1, o + u2, i2 + u2);
    // bottom edge (v = vSeg)
    const bo = vSeg * perRow;
    idx.push(o + bo + u2, o + bo + u1, i2 + bo + u1, o + bo + u2, i2 + bo + u1, i2 + bo + u2);
  }
  // A ring has no free ends in u, so only the two loop edges above need it.
  if (!closed) {
    for (let iv = 0; iv < vSeg; iv++) {
      const r1 = iv * perRow;
      const r2 = (iv + 1) * perRow;
      // left edge (u = 0)
      idx.push(o + r2, o + r1, i2 + r1, o + r2, i2 + r1, i2 + r2);
      // right edge (u = uSeg)
      const e = uSeg;
      idx.push(o + r1 + e, o + r2 + e, i2 + r1 + e, i2 + r1 + e, o + r2 + e, i2 + r2 + e);
    }
  }

  return buildGeometry(verts, norms, uvs, idx, tendon);
}

function buildGeometry(verts, norms, uvs, idx, tendon) {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(norms), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  if (tendon) g.setAttribute('tendon', new BufferAttribute(new Float32Array(tendon), 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export { sampleCurve, sampleLine, keyframe };
