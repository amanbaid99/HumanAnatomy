/** Z-Anatomy / BodyParts3D meshes. See assets/anatomy/NOTICE.md. */
import { BufferGeometry, BufferAttribute, Group, Mesh, MeshStandardMaterial } from '../../vendor/three.module.min.js';
import { applyOcclusionToMaterial } from '../geometry/occlusion.js';

export async function loadAtlas() {
  const [manifestResponse, binaryResponse] = await Promise.all([
    fetch(new URL('../../assets/anatomy/atlas.json', import.meta.url)),
    fetch(new URL('../../assets/anatomy/atlas.bin', import.meta.url)),
  ]);
  if (!manifestResponse.ok || !binaryResponse.ok) throw new Error('The anatomical model could not be downloaded. Please reload.');
  const [manifest, binary] = await Promise.all([manifestResponse.json(), binaryResponse.arrayBuffer()]);
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
