/** Z-Anatomy / BodyParts3D meshes. See assets/anatomy/NOTICE.md. */
import { BufferGeometry, BufferAttribute, Group, Mesh, MeshStandardMaterial } from '../../vendor/three.module.min.js';
import { applyOcclusionToMaterial } from '../geometry/occlusion.js';

async function downloadModel(response, onProgress) {
  if (!response.ok) throw new Error('The anatomical model could not be downloaded. Please reload.');
  const total = response.headers.get('content-encoding') ? 0 : Number(response.headers.get('content-length')) || 0;
  if (!response.body) return response.arrayBuffer();
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); loaded += value.byteLength;
    onProgress({ loaded, total });
  }
  const binary = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) { binary.set(chunk, offset); offset += chunk.byteLength; }
  return binary.buffer;
}

export async function loadAtlas({ onProgress = () => {} } = {}) {
  const compressed = typeof DecompressionStream === 'function';
  const [manifestResponse, binaryResponse] = await Promise.all([
    fetch(new URL('../../assets/anatomy/atlas.json', import.meta.url)),
    fetch(new URL(`../../assets/anatomy/atlas.bin${compressed ? '.gz' : ''}`, import.meta.url)),
  ]);
  if (!manifestResponse.ok) throw new Error('The anatomical model index could not be downloaded. Please reload.');
  const [manifest, download] = await Promise.all([manifestResponse.json(), downloadModel(binaryResponse, onProgress)]);
  // A server may already decode HTTP compression, or wrap the .gz asset in
  // another transport encoding. Inspect the remaining payload, not its header.
  const signature = new Uint8Array(download, 0, Math.min(3, download.byteLength));
  const stillCompressed = signature[0] === 0x1f && signature[1] === 0x8b && signature[2] === 8;
  const binary = compressed && stillCompressed
    ? await new Response(new Blob([download]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
    : download;
  onProgress({ loaded: download.byteLength, total: download.byteLength, preparing: true });
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  const muscles = new Map();
  const skeleton = new Group();
  const head = new Group();
  const face = new Group();
  const boneMaterial = new MeshStandardMaterial({ color: 0xd7cbb4, roughness: .86 });
  boneMaterial.onBeforeCompile = applyOcclusionToMaterial;
  const headBones = /frontal|parietal|temporal|occipital|sphenoid|ethmoid|zygomatic|maxilla|mandible|nasal|lacrimal|vomer|palatine|concha|tooth/i;
  for (const entry of manifest) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(binary, entry.positionOffset, entry.vertexCount * 3), 3));
    geometry.setIndex(new BufferAttribute(new Uint32Array(binary, entry.indexOffset, entry.indexCount), 1));
    geometry.setAttribute('tendon', new BufferAttribute(new Float32Array(binary, entry.tendonOffset, entry.vertexCount), 1));
    // Reflected source objects can arrive with inward-facing triangle winding.
    // Closed muscle surfaces must face outward before lighting and boundary shading.
    if (entry.kind === 'muscle') {
      const positions = geometry.attributes.position.array;
      const indices = geometry.index.array;
      let volume6 = 0;
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
        volume6 += positions[a] * (positions[b + 1] * positions[c + 2] - positions[b + 2] * positions[c + 1])
          + positions[a + 1] * (positions[b + 2] * positions[c] - positions[b] * positions[c + 2])
          + positions[a + 2] * (positions[b] * positions[c + 1] - positions[b + 1] * positions[c]);
      }
      if (volume6 < -1e-10) {
        for (let i = 0; i < indices.length; i += 3) {
          [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
        }
      }
    }
    geometry.computeVertexNormals();
    if (entry.kind === 'muscle') { muscles.set(entry.name, geometry); continue; }
    const pale = /aponeurosis|sclera/i.test(entry.name);
    const material = entry.kind === 'bone' ? boneMaterial : new MeshStandardMaterial({ color: pale ? 0xcbbda5 : 0x9f5148, roughness: .85 });
    if (entry.kind !== 'bone') material.onBeforeCompile = applyOcclusionToMaterial;
    const mesh = new Mesh(geometry, material);
    mesh.name = entry.name.toLowerCase().replaceAll(' ', '-');
    if (entry.kind === 'face') face.add(mesh);
    else (headBones.test(entry.name) ? head : skeleton).add(mesh);
  }
  return { muscles, skeleton, head, face };
}
