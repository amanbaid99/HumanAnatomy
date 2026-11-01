/**
 * Turns muscle definitions into meshes.
 *
 * Also owns the muscle material, which shades tendon differently from belly
 * using the `tendon` attribute the loft engine emits, and lays fine striations
 * along the fibre direction. Both are cheap and both are most of the reason
 * the result reads as tissue rather than as coloured plastic.
 */

import {
  Group, Mesh, MeshStandardMaterial, Color, Vector3,
} from '../../vendor/three.module.min.js';
import { tubeLoft, sheetLoft } from '../geometry/loft.js';
import { applyOcclusionToMaterial } from '../geometry/occlusion.js';
import { MUSCLES } from './muscles.js';

export const LAYERS = {
  1: { key: 'superficial', label: 'Superficial', color: 0xad5148 },
  2: { key: 'intermediate', label: 'Intermediate', color: 0x9e493f },
  3: { key: 'deep', label: 'Deep', color: 0x914035 },
};

export const GROUPS = [
  { id: 'head', label: 'Head & jaw' },
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

const TENDON_COLOR = new Color(0xe6ddcd);
// The edge put on a selected muscle. Pale and slightly cool so it reads as a
// callout against warm tissue, matching the accent the interface already uses.
const RIM_COLOR = new Color(0x8fd8d0);

/** Mirror a list of points across the sagittal plane. */
const flipPoints = (pts) => pts.map(([x, y, z]) => [-x, y, z]);

/** Mean of a list of points. */
const centroid = (pts) => [0, 1, 2].map(
  (axis) => pts.reduce((sum, p) => sum + p[axis], 0) / pts.length,
);

/**
 * Where the muscle actually anchors, in world coordinates. A tube runs from the
 * start of its centreline to the end; a sheet spreads across a whole line of
 * bone, so its attachment is taken as the middle of that line.
 */
function attachments(def) {
  if (def.shape === 'sheet') {
    return { from: centroid(def.origin), to: centroid(def.insertion) };
  }
  return { from: def.path[0], to: def.path[def.path.length - 1] };
}

// The original authored attachment coordinates are approximate. Project them
// onto the imported muscle so reference markers stay on the displayed surface.
function closestVertex(geometry, point) {
  const positions = geometry.getAttribute('position');
  let best = Infinity;
  let result = point;
  for (let i = 0; i < positions.count; i++) {
    const candidate = [positions.getX(i), positions.getY(i), positions.getZ(i)];
    const distance = candidate.reduce((sum, v, axis) => sum + (v - point[axis]) ** 2, 0);
    if (distance < best) { best = distance; result = candidate; }
  }
  return result;
}

function muscleMaterial(layer, anatomical = false) {
  // Muscle is matte and damp, not wet. At 0.52 the broad highlight read as
  // plastic; this keeps enough of a sheen to show curvature and no more.
  const mat = new MeshStandardMaterial({
    color: LAYERS[layer].color,
    roughness: 0.78,
    metalness: 0.0,
  });

  if (anatomical) {
    // Imported layers can share almost coincident boundary surfaces. Prefer
    // superficial tissue there instead of flickering between two materials.
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = (layer - 2) * 1.5;
    mat.polygonOffsetUnits = (layer - 2) * 1.5;
    mat.onBeforeCompile = (shader) => {
      applyOcclusionToMaterial(shader);
      shader.uniforms.uTendonColor = { value: TENDON_COLOR };
      shader.uniforms.uRim = { value: mat.userData.rim || 0 };
      shader.uniforms.uRimColor = { value: RIM_COLOR };
      shader.uniforms.uFiberDetail = { value: mat.userData.tissueDetail || 0 };
      shader.uniforms.uFiberAxis = { value: mat.userData.fiberAxis };
      shader.uniforms.uFiberAcross = { value: mat.userData.fiberAcross };
      mat.userData.shader = shader;
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
        attribute float tendon; varying float vTendon; varying vec2 vTissueUv;
        uniform float uFiberDetail; uniform vec3 uFiberAxis; uniform vec3 uFiberAcross;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vTendon = tendon;
          vTissueUv = uFiberDetail > 0.5 ? vec2(dot(position, uFiberAcross), dot(position, uFiberAxis)) : vec2(0.0);`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
        varying float vTendon; varying vec2 vTissueUv; uniform float uFiberDetail;
        uniform vec3 uTendonColor; uniform float uRim; uniform vec3 uRimColor;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb = mix(diffuseColor.rgb, uTendonColor, smoothstep(0.1, 0.9, vTendon) * 0.93);
          if (uFiberDetail > 0.5) {
            float phase = vTissueUv.x * 2500.0 + sin(vTissueUv.y * 37.0) * 0.6;
            float resolved = 1.0 - smoothstep(0.7, 3.0, fwidth(phase));
            float grain = sin(vTissueUv.y * 83.0 + sin(vTissueUv.x * 59.0) * 0.7) * sin(vTissueUv.x * 41.0 + vTissueUv.y * 13.0);
            diffuseColor.rgb *= 1.0 + (1.0 - vTendon) * (0.025 * grain + 0.015 * sin(phase) * resolved);
          }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          if (uFiberDetail > 0.5) {
            float fiberPhase = vTissueUv.x * 2500.0 + sin(vTissueUv.y * 37.0) * 0.6;
            float fiberResolved = 1.0 - smoothstep(0.7, 3.0, fwidth(fiberPhase));
            float fiberSlope = 0.00010 * (1.0 - vTendon) * fiberResolved * cos(fiberPhase);
            vec3 tissueDx = dFdx(-vViewPosition), tissueDy = dFdy(-vViewPosition);
            vec3 tissueCrossX = cross(tissueDy, normal), tissueCrossY = cross(normal, tissueDx);
            float tissueDet = dot(tissueDx, tissueCrossX);
            vec3 tissueGradient = fiberSlope * (dFdx(fiberPhase) * tissueCrossX + dFdy(fiberPhase) * tissueCrossY);
            if (abs(tissueDet) > 0.0000000001) normal = normalize(abs(tissueDet) * normal - sign(tissueDet) * tissueGradient);
          }`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.62, smoothstep(0.15, 0.9, vTendon));`)
        .replace('#include <opaque_fragment>', `
          float edge = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
          outgoingLight += uRimColor * smoothstep(0.58, 0.94, edge) * uRim;
          #include <opaque_fragment>`);
    };
    return mat;
  }

  mat.onBeforeCompile = (shader) => {
    applyOcclusionToMaterial(shader);
    shader.uniforms.uTendonColor = { value: TENDON_COLOR };
    // Selection emphasis. A fresnel term in the shader the muscle already
    // compiles costs a few instructions and no extra pass, which is why the
    // selected muscle gets an edge rather than an outline hull.
    shader.uniforms.uRim = { value: mat.userData.rim || 0 };
    shader.uniforms.uRimColor = { value: RIM_COLOR };
    mat.userData.shader = shader;
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
        uniform vec3 uTendonColor;
        uniform float uRim;
        uniform vec3 uRimColor;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // Fibres run along the sweep, so striate across the cross-section.
        float fiber = sin(vFiberUv.x * 96.0) * 0.5 + 0.5;
        float fine  = sin(vFiberUv.x * 233.0 + vFiberUv.y * 7.0) * 0.5 + 0.5;
        diffuseColor.rgb *= 0.90 + 0.10 * fiber + 0.035 * fine;
        // Tendon is pale, and glossier than the belly.
        float t = smoothstep(0.12, 0.92, vTendon);
        diffuseColor.rgb = mix(diffuseColor.rgb, uTendonColor, t * 0.88);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        // Tendon is the one part that is genuinely shiny, but only relative
        // to the belly beside it.
        roughnessFactor = mix(roughnessFactor, 0.58, smoothstep(0.12, 0.92, vTendon));`)
      .replace('#include <opaque_fragment>', `
        // Built from the renderer's own shaded normal and view vector rather
        // than hand-rolled varyings, and thresholded so it lands on the
        // silhouette only. The muscle keeps its own colour; just its outline
        // is picked out.
        float rimF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        outgoingLight += uRimColor * (smoothstep(0.62, 0.94, rimF) * uRim);
        #include <opaque_fragment>`);
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
      margins: def.margins ?? true,
      orient: def.orient ?? true,
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
    alignRadial: def.alignRadial ?? null,
  });
}

/** Apply the side flip to whichever attachment fields this shape uses. */
function sideVariant(def, flip) {
  if (!flip) return def;
  const out = { ...def };
  if (def.path) out.path = flipPoints(def.path);
  if (def.alignRadial) out.alignRadial = [-def.alignRadial[0], def.alignRadial[1]];
  if (def.origin) out.origin = flipPoints(def.origin);
  if (def.insertion) out.insertion = flipPoints(def.insertion);
  if (Array.isArray(def.outward)) out.outward = [-def.outward[0], def.outward[1], def.outward[2]];
  return out;
}

/**
 * Build every muscle mesh.
 * @returns {{ group: Group, records: Array }}
 */
export function buildMuscles(atlas = null) {
  const group = new Group();
  group.name = 'muscles';
  const records = [];

  MUSCLES.forEach((def) => {
    const sides = def.mirror ? [false, true] : [false];
    sides.forEach((flip) => {
      const variant = sideVariant(def, flip);
      const sideKey = def.mirror ? (flip ? 'left' : 'right') : null;
      const atlasGeometry = atlas?.get(`${def.id}.${sideKey}`);
      const geo = atlasGeometry || geometryFor(variant);
      const mat = muscleMaterial(def.layer, !!atlasGeometry);
      const mesh = new Mesh(geo, mat);

      const side = def.mirror ? (flip ? 'left' : 'right') : null;
      mesh.name = def.mirror ? `${def.id}.${side}` : def.id;

      let { from, to } = attachments(variant);
      if (atlasGeometry) {
        from = closestVertex(geo, from);
        to = closestVertex(geo, to);
      }
      const fiberAxis = new Vector3(...to).sub(new Vector3(...from));
      if (fiberAxis.lengthSq() < 1e-8) fiberAxis.set(0, 1, 0);
      fiberAxis.normalize();
      const fiberAcross = new Vector3(0, 0, 1).cross(fiberAxis);
      if (fiberAcross.lengthSq() < 1e-8) fiberAcross.set(1, 0, 0);
      mat.userData.fiberAxis = fiberAxis;
      mat.userData.fiberAcross = fiberAcross.normalize();
      const record = {
        ...def,
        uid: mesh.name,
        originPoint: from,
        insertionPoint: to,
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
