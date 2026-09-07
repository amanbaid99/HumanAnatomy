/**
 * Baked ambient occlusion.
 *
 * The thing that makes 154 separate meshes read as one body is darkness in the
 * creases where they meet. Screen-space AO would cost every frame, which is
 * exactly what a phone cannot spare, and none of this geometry ever moves. So
 * occlusion is computed once at load and written into the vertex data.
 *
 * Method: voxelise the figure into an occupancy grid, then from each vertex
 * march a short cosine-weighted bundle of rays through that grid and count how
 * many are blocked. Cheap, and accurate enough that the eye reads contact.
 *
 * Peeling is handled by baking against depth-appropriate grids. A deep muscle
 * is occluded by bone and other deep muscles only, so when you strip the
 * superficial layer away what is underneath is not still wearing its shadow.
 */

import { Vector3, BufferAttribute } from '../../vendor/three.module.min.js';

const CELL = 0.012;      // metres per voxel, about a fingertip
const RAYS = 9;
const STEPS = 8;         // reach = CELL * STEPS, roughly 10 cm
// Tuned against the full model. More anatomy means more blockers, so this
// wants revisiting whenever a region gets filled in.
const STRENGTH = 0.78;

/** A dense occupancy grid over an axis-aligned box. */
class Grid {
  constructor(min, max, cell) {
    this.cell = cell;
    this.min = min.clone().subScalar(cell * 2);
    const size = max.clone().sub(this.min).addScalar(cell * 2);
    this.nx = Math.max(1, Math.ceil(size.x / cell));
    this.ny = Math.max(1, Math.ceil(size.y / cell));
    this.nz = Math.max(1, Math.ceil(size.z / cell));
    this.data = new Uint8Array(this.nx * this.ny * this.nz);
  }

  mark(x, y, z) {
    const ix = ((x - this.min.x) / this.cell) | 0;
    const iy = ((y - this.min.y) / this.cell) | 0;
    const iz = ((z - this.min.z) / this.cell) | 0;
    if (ix < 0 || iy < 0 || iz < 0 || ix >= this.nx || iy >= this.ny || iz >= this.nz) return;
    this.data[(iz * this.ny + iy) * this.nx + ix] = 1;
  }

  occupied(x, y, z) {
    const ix = ((x - this.min.x) / this.cell) | 0;
    const iy = ((y - this.min.y) / this.cell) | 0;
    const iz = ((z - this.min.z) / this.cell) | 0;
    if (ix < 0 || iy < 0 || iz < 0 || ix >= this.nx || iy >= this.ny || iz >= this.nz) return 0;
    return this.data[(iz * this.ny + iy) * this.nx + ix];
  }

  /** Stamp a mesh's triangles into the grid, densely enough that rays cannot slip through. */
  addMesh(mesh) {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const index = geo.index;
    const m = mesh.matrixWorld;
    const a = new Vector3();
    const b = new Vector3();
    const c = new Vector3();
    const p = new Vector3();
    const count = index ? index.count : pos.count;

    for (let i = 0; i < count; i += 3) {
      const i0 = index ? index.getX(i) : i;
      const i1 = index ? index.getX(i + 1) : i + 1;
      const i2 = index ? index.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(m);
      b.fromBufferAttribute(pos, i1).applyMatrix4(m);
      c.fromBufferAttribute(pos, i2).applyMatrix4(m);

      // Sample the triangle at roughly one point per voxel along its longest edge.
      const longest = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
      const k = Math.min(6, Math.max(1, Math.ceil(longest / this.cell)));
      for (let u = 0; u <= k; u++) {
        for (let v = 0; u + v <= k; v++) {
          const bu = u / k;
          const bv = v / k;
          const bw = 1 - bu - bv;
          p.set(
            a.x * bw + b.x * bu + c.x * bv,
            a.y * bw + b.y * bu + c.y * bv,
            a.z * bw + b.z * bu + c.z * bv,
          );
          this.mark(p.x, p.y, p.z);
        }
      }
    }
  }
}

/**
 * Cosine-weighted directions around +Z, generated once and rotated per vertex.
 * A fixed set rather than random keeps the result stable between loads.
 */
function hemisphereDirections(n) {
  const dirs = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    // Bias samples toward the normal so grazing rays do not dominate.
    const cosT = Math.sqrt(1 - (i + 0.5) / n);
    const sinT = Math.sqrt(1 - cosT * cosT);
    const phi = i * golden;
    dirs.push(new Vector3(Math.cos(phi) * sinT, Math.sin(phi) * sinT, cosT));
  }
  return dirs;
}

const DIRS = hemisphereDirections(RAYS);

/** Basis that takes +Z onto the surface normal. */
function basisFromNormal(n, t, b) {
  if (Math.abs(n.z) < 0.9) t.set(0, 0, 1).cross(n).normalize();
  else t.set(1, 0, 0).cross(n).normalize();
  b.crossVectors(n, t);
}

/**
 * Write an `ao` attribute onto every mesh in `targets`, occluded by `blockers`.
 * @returns {number} vertices processed
 */
export function bakeOcclusion(targets, blockers, bounds) {
  const grid = new Grid(bounds.min, bounds.max, CELL);
  blockers.forEach((m) => grid.addMesh(m));

  const n = new Vector3();
  const p = new Vector3();
  const t = new Vector3();
  const b = new Vector3();
  const d = new Vector3();
  let processed = 0;

  targets.forEach((mesh) => {
    const geo = mesh.geometry;
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const m = mesh.matrixWorld;
    const ao = new Float32Array(pos.count);

    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(m);
      n.fromBufferAttribute(nor, i).transformDirection(m).normalize();
      basisFromNormal(n, t, b);

      // Start clear of the surface so a vertex does not shadow itself.
      const ox = p.x + n.x * CELL * 1.5;
      const oy = p.y + n.y * CELL * 1.5;
      const oz = p.z + n.z * CELL * 1.5;

      let blocked = 0;
      for (let r = 0; r < RAYS; r++) {
        const s = DIRS[r];
        d.set(
          t.x * s.x + b.x * s.y + n.x * s.z,
          t.y * s.x + b.y * s.y + n.y * s.z,
          t.z * s.x + b.z * s.y + n.z * s.z,
        );
        for (let step = 1; step <= STEPS; step++) {
          const dist = step * CELL;
          if (grid.occupied(ox + d.x * dist, oy + d.y * dist, oz + d.z * dist)) {
            // Near hits darken more than distant ones.
            blocked += 1 - (step - 1) / STEPS;
            break;
          }
        }
      }
      ao[i] = Math.max(0, 1 - (blocked / RAYS) * STRENGTH);
      processed++;
    }

    geo.setAttribute('ao', new BufferAttribute(ao, 1));
  });

  return processed;
}

/**
 * Inject the baked term into a MeshStandardMaterial. Applied to indirect light
 * only, the way real occlusion behaves, so direct highlights stay crisp.
 */
export function applyOcclusionToMaterial(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>
      attribute float ao;
      varying float vAO;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      vAO = ao;`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
      varying float vAO;`)
    .replace('#include <aomap_fragment>', `#include <aomap_fragment>
      reflectedLight.indirectDiffuse *= vAO;
      reflectedLight.indirectSpecular *= vAO;
      reflectedLight.directDiffuse *= mix(1.0, vAO, 0.45);`);
}
