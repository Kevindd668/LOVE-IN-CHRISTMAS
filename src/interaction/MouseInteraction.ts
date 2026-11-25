import * as THREE from 'three';

export type PickTarget =
  | { type: 'tree'; point: THREE.Vector3 }
  | { type: 'star'; point: THREE.Vector3 }
  | { type: 'gift'; index: number; point: THREE.Vector3 }
  | { type: 'photo'; id: string; point: THREE.Vector3 }
  | { type: 'empty'; point: THREE.Vector3 };

interface MouseInteractionOptions {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  scene: THREE.Scene;
  getMeshes: () => THREE.Object3D[];
  onPick: (target: PickTarget) => void;
  onHover: (target: PickTarget | null) => void;
  isEnabled: () => boolean;
}

export class MouseInteraction {
  private readonly options: MouseInteractionOptions;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private pointerDownAt = 0;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private pointerDownId = -1;
  private dragging = false;
  private lastHover: string | null = null;
  private hoverRaf = 0;
  private pendingHover: PointerEvent | null = null;
  private enabled = true;

  constructor(options: MouseInteractionOptions) {
    this.options = options;
    const canvas = options.canvas;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerCancel);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.options.canvas.classList.remove('is-hovering', 'is-dragging');
      this.lastHover = null;
      this.options.onHover(null);
    }
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (!this.enabled || event.button !== 0) return;
    this.pointerDownAt = performance.now();
    this.pointerDownX = event.clientX;
    this.pointerDownY = event.clientY;
    this.pointerDownId = event.pointerId;
    this.dragging = true;
    this.options.canvas.classList.add('is-dragging');
  };

  private handlePointerCancel = (): void => {
    this.dragging = false;
    this.options.canvas.classList.remove('is-dragging');
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.enabled || event.button !== 0) return;
    this.dragging = false;
    this.options.canvas.classList.remove('is-dragging');
    if (event.pointerId !== this.pointerDownId) return;
    const distance = Math.hypot(event.clientX - this.pointerDownX, event.clientY - this.pointerDownY);
    const elapsed = performance.now() - this.pointerDownAt;
    this.pointerDownId = -1;
    if (distance > 7 || elapsed > 700) return;
    this.pickAt(event.clientX, event.clientY, true);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    this.pendingHover = event;
    if (this.hoverRaf) return;
    this.hoverRaf = requestAnimationFrame(() => {
      this.hoverRaf = 0;
      if (this.pendingHover) {
        const pending = this.pendingHover;
        this.pendingHover = null;
        if (!this.enabled || this.dragging) return;
        this.updateHover(pending.clientX, pending.clientY);
      }
    });
  };

  private handlePointerLeave = (): void => {
    this.options.canvas.classList.remove('is-hovering');
    this.lastHover = null;
    this.options.onHover(null);
  };

  private setPointerFromEvent(clientX: number, clientY: number): void {
    const rect = this.options.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
  }

  private intersect(clientX: number, clientY: number): THREE.Intersection | null {
    this.setPointerFromEvent(clientX, clientY);
    this.raycaster.setFromCamera(this.pointer, this.options.camera);
    const meshes = this.options.getMeshes();
    if (meshes.length === 0) return null;
    this.options.scene.updateMatrixWorld(true);
    const intersections = this.raycaster.intersectObjects(meshes, false);
    for (const intersection of intersections) {
      const pickType = intersection.object.userData.pickType;
      if (pickType) return intersection;
    }
    return null;
  }

  private targetFromIntersection(intersection: THREE.Intersection | null, clientX: number, clientY: number): PickTarget {
    if (intersection) {
      const pickType = intersection.object.userData.pickType;
      const point = intersection.point.clone();
      if (pickType === 'gift') {
        return {
          type: 'gift',
          index: Number(intersection.object.userData.giftIndex ?? 0),
          point
        };
      }
      if (pickType === 'photo') {
        return {
          type: 'photo',
          id: String(intersection.object.userData.photoId ?? ''),
          point
        };
      }
      if (pickType === 'star') {
        return { type: 'star', point };
      }
      if (pickType === 'tree') {
        return { type: 'tree', point };
      }
    }
    this.setPointerFromEvent(clientX, clientY);
    this.raycaster.setFromCamera(this.pointer, this.options.camera);
    const fallback = this.raycaster.ray.at(12, new THREE.Vector3());
    return { type: 'empty', point: fallback };
  }

  private pickAt(clientX: number, clientY: number, notify: boolean): PickTarget {
    const intersection = this.intersect(clientX, clientY);
    const target = this.targetFromIntersection(intersection, clientX, clientY);
    if (notify) this.options.onPick(target);
    return target;
  }

  private updateHover(clientX: number, clientY: number): void {
    const intersection = this.intersect(clientX, clientY);
    const target = intersection ? this.targetFromIntersection(intersection, clientX, clientY) : null;
    const signature = target
      ? target.type === 'gift'
        ? `gift-${target.index}`
        : target.type === 'photo'
          ? `photo-${target.id}`
          : target.type
      : null;
    if (signature === this.lastHover) return;
    this.lastHover = signature;
    this.options.canvas.classList.toggle('is-hovering', Boolean(target));
    this.options.onHover(target);
  }

  dispose(): void {
    const canvas = this.options.canvas;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointercancel', this.handlePointerCancel);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    if (this.hoverRaf) cancelAnimationFrame(this.hoverRaf);
  }
}
