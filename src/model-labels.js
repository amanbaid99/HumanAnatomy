import { Box3, Raycaster, Vector2, Vector3 } from '../vendor/three.module.min.js';

const MAJOR = new Set(['pectoralis-major','pectoralis-minor','serratus-anterior','rectus-abdominis','external-oblique','deltoid-lateral','biceps-long','biceps-short','triceps-long','triceps-lateral','brachialis','latissimus-dorsi','trapezius-upper','trapezius-middle','trapezius-lower','gluteus-maximus','gluteus-medius','gluteus-minimus','rectus-femoris','vastus-lateralis','gastrocnemius-medial','tibialis-anterior']);
export function createModelLabels({ camera, canvas, records, references, container, onSelect }) {
  const ray = new Raycaster(), centre = new Vector3(), projected = new Vector3(), box = new Box3();
  const svgNS = 'http://www.w3.org/2000/svg';
  let signature = '', lastUpdate = -Infinity;
  function clear() { container.hidden = true; container.replaceChildren(); signature = ''; }
  return { update({ enabled, selected }) {
    if (!enabled) { if (!container.hidden) clear(); return; }
    if (performance.now() - lastUpdate < 220) return;
    lastUpdate = performance.now();
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 100 || rect.height < 100) { clear(); return; }
    const visible = records.filter(r => r.mesh.visible && r.mesh.material.opacity > .85);
    const next = [camera.matrixWorld.elements.join(','), rect.x, rect.y, rect.width, rect.height, innerWidth, innerHeight, selected?.uid,
      visible.map(r => r.uid).join(','), document.querySelector('#panel').className].join('|');
    if (signature === next) return;
    signature = next;
    const mobile = innerWidth <= 860, width = mobile ? 112 : 148, height = 38;
    const blockers = ['#masthead','.stage-actions','#study-guide','#peek','#panel','#view-dock','#label-origin','#label-insertion','#pick-choices']
      .map(s => document.querySelector(s)).filter(e => e && !e.hidden && getComputedStyle(e).visibility !== 'hidden')
      .map(e => e.getBoundingClientRect()).filter(r => r.width && r.height);
    const targets = visible.map(r => r.mesh);
    for (const group of references) {
      if (group.visible) group.traverseVisible(object => { if (object.isMesh) targets.push(object); });
    }
    const candidates = visible.filter(r => MAJOR.has(r.id) || r === selected)
      .map(rec => { box.copy(rec.mesh.geometry.boundingBox || (rec.mesh.geometry.computeBoundingBox(), rec.mesh.geometry.boundingBox));
        box.getCenter(centre).applyMatrix4(rec.mesh.matrixWorld);
        return { rec, centre: centre.clone(), distance: centre.distanceToSquared(camera.position) }; })
      .sort((a,b) => (b.rec === selected) - (a.rec === selected) || a.distance - b.distance);
    const svg = document.createElementNS(svgNS, 'svg'); svg.setAttribute('aria-hidden','true');
    const nodes = [svg], occupied = [], used = new Set();
    const overlaps = (a,b) => a.left < b.right + 5 && a.right > b.left - 5 && a.top < b.bottom + 5 && a.bottom > b.top - 5;
    for (const item of candidates.slice(0, 26)) {
      if (used.has(item.rec.id)) continue;
      projected.copy(item.centre).project(camera);
      if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > .98 || Math.abs(projected.y) > .98) continue;
      ray.setFromCamera(new Vector2(projected.x, projected.y),camera);
      const hit = ray.intersectObjects(targets, false)[0];
      if (!hit || hit.object !== item.rec.mesh) continue;
      projected.copy(hit.point).project(camera);
      const x = rect.left + (projected.x + 1) * rect.width / 2, y = rect.top + (1 - projected.y) * rect.height / 2;
      const left = projected.x < 0 ? rect.left + 8 : rect.right - width - 8;
      let slot;
      for (const offset of [0,-44,44,-88,88,-132,132]) {
        const top = y - height / 2 + offset;
        const candidate = { left, right:left + width, top, bottom:top + height };
        if (top < rect.top + 8 || candidate.bottom > rect.bottom - 8) continue;
        if ([...blockers,...occupied].some(b => overlaps(candidate,b))) continue;
        slot = candidate; break;
      }
      if (!slot) continue;
      occupied.push(slot); used.add(item.rec.id);
      const line = document.createElementNS(svgNS,'line');
      line.setAttribute('x1',x); line.setAttribute('y1',y);
      line.setAttribute('x2', projected.x < 0 ? slot.right : slot.left); line.setAttribute('y2',slot.top + height / 2); svg.append(line);
      const button = document.createElement('button');
      button.dataset.uid = item.rec.uid; button.type = 'button'; button.className = 'model-name'; button.textContent = item.rec.name;
      button.setAttribute('aria-label',`Select ${item.rec.name}${item.rec.sideLabel}`); button.title = item.rec.name + item.rec.sideLabel;
      button.style.left = `${slot.left}px`; button.style.top = `${slot.top}px`; button.style.width = `${width}px`;
      button.addEventListener('click',() => onSelect(item.rec)); nodes.push(button);
      if (occupied.length >= (mobile ? 3 : 6)) break;
    }
    const focused = container.contains(document.activeElement) ? document.activeElement.dataset.uid : null;
    container.replaceChildren(...nodes); container.hidden = !occupied.length;
    if (focused) nodes.find(node => node.dataset?.uid === focused)?.focus({ preventScroll: true });
  }};
}
