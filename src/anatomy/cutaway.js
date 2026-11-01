import { BufferGeometry, Float32BufferAttribute } from '../../vendor/three.module.min.js';

// An educational fascia window over the rectus footprint. This removes covering
// surface only; it does not sculpt or split the underlying abdominal muscles.
export function abdominalCutaway(cover, rectus) {
  const rp = rectus.attributes.position;
  rectus.computeBoundingBox();
  const { min, max } = rectus.boundingBox;
  const bins = new Float32Array(24);
  const maxWidth = Math.max(Math.abs(min.x), Math.abs(max.x));
  for (let i = 0; i < rp.count; i++) {
    const bin = Math.min(23, Math.floor((rp.getY(i) - min.y) / (max.y - min.y) * 24));
    bins[bin] = Math.max(bins[bin], Math.abs(rp.getX(i)));
  }
  const field = ([x, y, z]) => {
    const f = Math.max(0, Math.min(23, (y - min.y) / (max.y - min.y) * 23));
    const lo = Math.floor(f), hi = Math.min(23, lo + 1);
    const width = (bins[lo] || maxWidth) * (1 - f + lo) + (bins[hi] || maxWidth) * (f - lo);
    return Math.max(Math.abs(x) - width - .003, min.y - y, y - max.y, .025 - z);
  };
  const attributes = Object.entries(cover.attributes);
  const arrays = Object.fromEntries(attributes.map(([name]) => [name, []]));
  const indices = cover.index?.array;
  const count = indices?.length ?? cover.attributes.position.count;
  const vertex = (index) => Object.fromEntries(attributes.map(([name, attr]) => [name,
    Array.from({ length: attr.itemSize }, (_, c) => attr.array[index * attr.itemSize + c]) ]));
  const interpolate = (a, b, t) => Object.fromEntries(attributes.map(([name]) => [name,
    a[name].map((v, c) => v + (b[name][c] - v) * t)]));
  for (let i = 0; i < count; i += 3) {
    const triangle = [0, 1, 2].map(j => vertex(indices ? indices[i + j] : i + j));
    const polygon = [];
    for (let j = 0; j < 3; j++) {
      const a = triangle[j], b = triangle[(j + 1) % 3];
      const da = field(a.position), db = field(b.position);
      if (da >= 0) polygon.push(a);
      if ((da >= 0) !== (db >= 0)) polygon.push(interpolate(a, b, da / (da - db)));
    }
    for (let j = 1; j + 1 < polygon.length; j++) {
      for (const v of [polygon[0], polygon[j], polygon[j + 1]]) {
        for (const [name] of attributes) arrays[name].push(...v[name]);
      }
    }
  }
  const geometry = new BufferGeometry();
  for (const [name, attr] of attributes) geometry.setAttribute(name, new Float32BufferAttribute(arrays[name], attr.itemSize));
  geometry.normalizeNormals();
  return geometry;
}
