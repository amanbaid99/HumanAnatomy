/**
 * Turns muscle definitions into meshes.
 *
 * Also owns the muscle material, which shades tendon differently from belly
 * using the `tendon` attribute the loft engine emits, and lays fine striations
 * along the fibre direction. Both are cheap and both are most of the reason
 * the result reads as tissue rather than as coloured plastic.
 */

import {
  Group, Mesh, MeshStandardMaterial, Color,
} from '../../vendor/three.module.min.js';
import { tubeLoft, sheetLoft } from '../geometry/loft.js';
import { applyOcclusionToMaterial } from '../geometry/occlusion.js';
import { MUSCLES } from './muscles.js';

export const LAYERS = {
  1: { key: 'superficial', label: 'Superficial', color: 0xc25349 },
  2: { key: 'intermediate', label: 'Intermediate', color: 0xa93f31 },
  3: { key: 'deep', label: 'Deep', color: 0x9c352c },
};

export const GROUPS = [
  { id: 'neck', label: 'Neck' },
  { id: 'shoulder', label: 'Shoulder & cuff' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'arm', label: 'Upper arm' },
  { id: 'forearm', label: 'Forearm' },
  { id: 'abdomen', label: 'Abdomen' },
  { id: 'hip', label: 'Hip' },
  { id: 'thigh', label: 'Thigh' },
  { id: 'lowerleg', label: 'Lower leg' },
];

const TENDON_COLOR = new Color(0xb3a189);

/** Mirror a list of points across the sagittal plane. */
const flipPoints = (pts) => pts.map(([x, y, z]) => [-x, y, z]);

function muscleMaterial(layer) {
  const mat = new MeshStandardMaterial({
    color: LAYERS[layer].color,
    roughness: 0.52,
    metalness: 0.0,
  });

  mat.onBeforeCompile = (shader) => {
    applyOcclusionToMaterial(shader);
    shader.uniforms.uTendonColor = { value: TENDON_COLOR };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float tendon;
        varying float vTendon;
        varying vec2 vFiberUv;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vTendon = tendon;
        vFiberUv = uv;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vTendon;
        varying vec2 vFiberUv;
        uniform vec3 uTendonColor;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // Fibres run along the sweep, so striate across the cross-section.
        float fiber = sin(vFiberUv.x * 96.0) * 0.5 + 0.5;
        float fine  = sin(vFiberUv.x * 233.0 + vFiberUv.y * 7.0) * 0.5 + 0.5;
        diffuseColor.rgb *= 0.90 + 0.10 * fiber + 0.035 * fine;
        // Tendon is pale, and glossier than the belly.
        float t = smoothstep(0.12, 0.92, vTendon);
        diffuseColor.rgb = mix(diffuseColor.rgb, uTendonColor, t * 0.70);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.34, smoothstep(0.12, 0.92, vTendon));`);
  };

  return mat;
}

function geometryFor(def) {
  if (def.shape === 'sheet') {
    return sheetLoft({
      origin: def.origin,
      insertion: def.insertion,
      thickness: def.thickness ?? 0.014,
      bulge: def.bulge ?? 0.018,
      outward: def.outward ?? 'radial',
      taper: def.taper ?? null,
      uSeg: def.uSeg ?? 16,
      vSeg: def.vSeg ?? 12,
    });
  }
  // Tessellate to the muscle's actual size and curvature. A thin strap needs
  // far fewer rings than a curving quadriceps, and this halves the triangle
  // count with no visible difference.
  const w = def.width ?? 0.02;
  return tubeLoft({
    path: def.path,
    width: w,
    flat: def.flat ?? 1,
    profile: def.profile,
    squareness: def.squareness ?? 2.4,
    segments: def.segments ?? Math.min(30, Math.max(10, (def.path.length - 1) * 7)),
    radial: def.radial ?? (w > 0.030 ? 14 : w > 0.018 ? 11 : 8),
  });
}

/** Apply the side flip to whichever attachment fields this shape uses. */
function sideVariant(def, flip) {
  if (!flip) return def;
  const out = { ...def };
  if (def.path) out.path = flipPoints(def.path);
  if (def.origin) out.origin = flipPoints(def.origin);
  if (def.insertion) out.insertion = flipPoints(def.insertion);
  if (Array.isArray(def.outward)) out.outward = [-def.outward[0], def.outward[1], def.outward[2]];
  return out;
}

/**
 * Build every muscle mesh.
 * @returns {{ group: Group, records: Array }}
 */
export function buildMuscles() {
  const group = new Group();
  group.name = 'muscles';
  const records = [];

  MUSCLES.forEach((def) => {
    const sides = def.mirror ? [false, true] : [false];
    sides.forEach((flip) => {
      const variant = sideVariant(def, flip);
      const geo = geometryFor(variant);
      const mat = muscleMaterial(def.layer);
      const mesh = new Mesh(geo, mat);

      const side = def.mirror ? (flip ? 'left' : 'right') : null;
      mesh.name = def.mirror ? `${def.id}.${side}` : def.id;

      const record = {
        ...def,
        uid: mesh.name,
        side,
        sideLabel: side ? ` (${side})` : '',
        mesh,
        baseColor: LAYERS[def.layer].color,
      };
      mesh.userData.record = record;
      records.push(record);
      group.add(mesh);
    });
  });

  return { group, records };
}
