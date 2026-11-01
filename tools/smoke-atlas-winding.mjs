// The real atlas contains reflected source objects. Their outward surfaces
// must stay outward so lighting, culling and boundary shading agree.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { abdominalCutaway } from '../src/anatomy/cutaway.js';
import { Mesh, Raycaster, Vector3, MeshBasicMaterial, DoubleSide } from '../vendor/three.module.min.js';
import { loadAtlas } from '../src/anatomy/atlas.js';
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url) => new Response(await readFile(url));
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
try {
  const { muscles } = await loadAtlas();
  for (const [name, geometry] of muscles) {
    const p = geometry.attributes.position.array, ix = geometry.index.array;
    let volume = 0;
    for (let i = 0; i < ix.length; i += 3) {
      const a = ix[i] * 3, b = ix[i + 1] * 3, c = ix[i + 2] * 3;
      volume += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1])
        + p[a + 1] * (p[b + 2] * p[c] - p[b] * p[c + 2])
        + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
    }
    assert.ok(volume >= -1e-10, `${name} faces inward`);
    assert.ok(geometry.attributes.normal.array.every(Number.isFinite), `${name} has invalid normals`);
  }
  for (const side of ['left', 'right']) {
    const rectus = muscles.get(`rectus-abdominis.${side}`);
    const cover = muscles.get(`external-oblique.${side}`);
    const cut = abdominalCutaway(cover, rectus);
    const sign = side === 'right' ? 1 : -1;
    const material = new MeshBasicMaterial({ side: DoubleSide });
    const mesh = new Mesh(cut, material);
    mesh.updateMatrixWorld();
    for (const y of [.97, 1.08, 1.18]) {
      const ray = new Raycaster(new Vector3(sign * .035, y, .5), new Vector3(0, 0, -1));
      assert.ok(ray.intersectObject(mesh).every(h => h.point.z <= .0251), `${side}: fascia still covers central rectus`);
    }
    assert.ok(cut.attributes.position.array.every(Number.isFinite));
    assert.ok(cover.index, 'original covering geometry is retained');
  }
  console.log(`Both abdominal cutaways expose the rectus and preserve the original geometry`);
  console.log(`${muscles.size} atlas muscles have outward winding and finite normals`);
} finally { globalThis.fetch = originalFetch; }
