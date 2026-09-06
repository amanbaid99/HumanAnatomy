/**
 * Orbit controls.
 *
 * Hand-rolled rather than pulled from three's examples so the app stays a
 * dependency-free static site. Left drag orbits, right drag or two fingers
 * pans, wheel or pinch dollies. Everything is damped, and the camera can be
 * animated to frame a target when you pick a muscle.
 */

import { Vector3, Spherical } from '../vendor/three.module.min.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

export class OrbitControls {
  constructor(camera, dom, opts = {}) {
    this.camera = camera;
    this.dom = dom;

    this.target = new Vector3(0, 1.02, 0);
    this.spherical = new Spherical(3.0, 1.36, 0.30);

    this.minRadius = opts.minRadius ?? 0.32;
    this.maxRadius = opts.maxRadius ?? 7.5;
    this.minPolar = 0.16;
    this.maxPolar = Math.PI - 0.16;
    this.tau = 0.075;      // seconds to settle, independent of frame rate
    this._lastT = performance.now();

    this._goalTarget = this.target.clone();
    this._goalSpherical = this.spherical.clone();
    this._flight = null;
    this._pointers = new Map();
    this._lastPinch = null;
    this._mode = null;

    this._bind();
    this.update(true);
  }

  _bind() {
    const dom = this.dom;
    dom.style.touchAction = 'none';

    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('pointerdown', (e) => {
      dom.setPointerCapture(e.pointerId);
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this._pointers.size === 1) {
        this._mode = (e.button === 2 || e.shiftKey) ? 'pan' : 'orbit';
        this._flight = null;
      } else if (this._pointers.size === 2) {
        this._mode = 'touch2';
        this._lastPinch = null;
      }
    });

    const end = (e) => {
      this._pointers.delete(e.pointerId);
      if (this._pointers.size === 0) this._mode = null;
      if (this._pointers.size < 2) this._lastPinch = null;
    };
    dom.addEventListener('pointerup', end);
    dom.addEventListener('pointercancel', end);
    dom.addEventListener('lostpointercapture', end);

    dom.addEventListener('pointermove', (e) => {
      const prev = this._pointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this._mode === 'orbit' && this._pointers.size === 1) {
        this._goalSpherical.theta -= dx * 0.0062;
        this._goalSpherical.phi = clamp(
          this._goalSpherical.phi - dy * 0.0062, this.minPolar, this.maxPolar,
        );
      } else if (this._mode === 'pan' && this._pointers.size === 1) {
        this._pan(dx, dy);
      } else if (this._pointers.size === 2) {
        const pts = [...this._pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (this._lastPinch !== null) {
          this._dolly(-(dist - this._lastPinch) * 0.006);
          // The midpoint drifting is a two-finger pan.
          this._pan(dx * 0.5, dy * 0.5);
        }
        this._lastPinch = dist;
      }
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._flight = null;
      this._dolly(e.deltaY * 0.0016);
    }, { passive: false });
  }

  _dolly(delta) {
    // Scale by distance so zooming stays proportional when you are close in.
    const r = this._goalSpherical.radius;
    this._goalSpherical.radius = clamp(r + delta * r, this.minRadius, this.maxRadius);
  }

  _pan(dx, dy) {
    const el = this.dom;
    const dist = this._goalSpherical.radius;
    const fovScale = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * dist;
    const right = new Vector3().setFromMatrixColumn(this.camera.matrix, 0);
    const up = new Vector3().setFromMatrixColumn(this.camera.matrix, 1);
    this._goalTarget
      .add(right.multiplyScalar((-dx * fovScale) / el.clientHeight))
      .add(up.multiplyScalar((dy * fovScale) / el.clientHeight));
    this._flight = null;
  }

  /** Smoothly frame a point at a given distance and, optionally, a new angle. */
  flyTo(point, radius, theta = null, phi = null, ms = 620) {
    this._flight = {
      t0: performance.now(),
      ms,
      fromTarget: this._goalTarget.clone(),
      toTarget: point.clone(),
      from: this._goalSpherical.clone(),
      toRadius: clamp(radius, this.minRadius, this.maxRadius),
      toTheta: theta ?? this._goalSpherical.theta,
      toPhi: phi === null ? this._goalSpherical.phi : clamp(phi, this.minPolar, this.maxPolar),
    };
  }

  setView(theta, phi, radius = null) {
    this.flyTo(this._goalTarget, radius ?? this._goalSpherical.radius, theta, phi);
  }

  update(immediate = false) {
    if (this._flight) {
      const f = this._flight;
      const k = clamp((performance.now() - f.t0) / f.ms, 0, 1);
      const e = easeInOut(k);
      this._goalTarget.lerpVectors(f.fromTarget, f.toTarget, e);
      this._goalSpherical.radius = f.from.radius + (f.toRadius - f.from.radius) * e;
      // Take the short way round the circle.
      let dTheta = f.toTheta - f.from.theta;
      while (dTheta > Math.PI) dTheta -= Math.PI * 2;
      while (dTheta < -Math.PI) dTheta += Math.PI * 2;
      this._goalSpherical.theta = f.from.theta + dTheta * e;
      this._goalSpherical.phi = f.from.phi + (f.toPhi - f.from.phi) * e;
      if (k >= 1) this._flight = null;
    }

    const now = performance.now();
    const dt = Math.min((now - this._lastT) / 1000, 0.1);
    this._lastT = now;
    const k = immediate ? 1 : 1 - Math.exp(-dt / this.tau);
    this.target.lerp(this._goalTarget, k);
    this.spherical.radius += (this._goalSpherical.radius - this.spherical.radius) * k;
    this.spherical.phi += (this._goalSpherical.phi - this.spherical.phi) * k;
    let dTheta = this._goalSpherical.theta - this.spherical.theta;
    while (dTheta > Math.PI) dTheta -= Math.PI * 2;
    while (dTheta < -Math.PI) dTheta += Math.PI * 2;
    this.spherical.theta += dTheta * k;

    const s = this.spherical;
    this.camera.position.set(
      this.target.x + s.radius * Math.sin(s.phi) * Math.sin(s.theta),
      this.target.y + s.radius * Math.cos(s.phi),
      this.target.z + s.radius * Math.sin(s.phi) * Math.cos(s.theta),
    );
    this.camera.lookAt(this.target);
  }

  get isMoving() {
    return !!this._flight
      || this.target.distanceToSquared(this._goalTarget) > 1e-8
      || Math.abs(this.spherical.radius - this._goalSpherical.radius) > 1e-4
      || Math.abs(this.spherical.theta - this._goalSpherical.theta) > 1e-4
      || Math.abs(this.spherical.phi - this._goalSpherical.phi) > 1e-4;
  }
}
