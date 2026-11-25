import * as THREE from 'three';

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const inverseLerp = (a: number, b: number, value: number): number =>
  a === b ? 0 : clamp((value - a) / (b - a), 0, 1);

export const smoothstep = (min: number, max: number, value: number): number => {
  const x = inverseLerp(min, max, value);
  return x * x * (3 - 2 * x);
};

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

/** Frame-rate independent damping. */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const dampVec3 = (
  current: THREE.Vector3,
  target: THREE.Vector3,
  lambda: number,
  dt: number
): THREE.Vector3 => {
  const factor = 1 - Math.exp(-lambda * dt);
  current.x += (target.x - current.x) * factor;
  current.y += (target.y - current.y) * factor;
  current.z += (target.z - current.z) * factor;
  return current;
};

export const randomRange = (min: number, max: number): number =>
  min + Math.random() * (max - min);

export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const value = hex.replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map((c) => c + c).join('')
    : value.padEnd(6, '0').slice(0, 6);
  const number = Number.parseInt(normalized, 16);
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255
  };
};

export const withAlpha = (hex: string, alpha: number): string => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const colorFromHex = (hex: string): THREE.Color => new THREE.Color(hex);

export const mixColor = (a: string, b: string, amount: number): THREE.Color =>
  new THREE.Color(a).lerp(new THREE.Color(b), clamp(amount, 0, 1));

export const adjustColor = (
  hex: string,
  lightness: number,
  saturation = 1
): THREE.Color => {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL(hsl.h, clamp(hsl.s * saturation, 0, 1), clamp(lightness, 0, 1));
  return color;
};

export const formatHex = (hex: string): string => hex.toUpperCase();

export const formatNumber = (value: number, digits = 2): string =>
  Number.isFinite(value) ? value.toFixed(digits) : '--';

export const makeCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const makeCanvasTexture = (
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void
): THREE.CanvasTexture => {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
};

export const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

/** A warm, soft radial sprite used for halos, contact shadows and glows. */
export const makeRadialTexture = (
  inner = 'rgba(255,255,255,1)',
  outer = 'rgba(255,255,255,0)',
  size = 256
): THREE.CanvasTexture =>
  makeCanvasTexture(size, size, (ctx) => {
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.24, inner);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  });

export const makeTextTexture = (
  text: string,
  options: {
    width?: number;
    height?: number;
    font?: string;
    color?: string;
    shadow?: string;
    align?: CanvasTextAlign;
    letterSpacing?: number;
  } = {}
): THREE.CanvasTexture => {
  const {
    width = 512,
    height = 128,
    font = '400 58px "Cormorant Garamond", Georgia, serif',
    color = '#f6dfb0',
    shadow = 'rgba(237,193,114,0.62)',
    align = 'center',
    letterSpacing = 0
  } = options;

  return makeCanvasTexture(width, height, (ctx) => {
    ctx.clearRect(0, 0, width, height);
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.shadowColor = shadow;
    ctx.shadowBlur = 22;
    const x = align === 'left' ? 18 : align === 'right' ? width - 18 : width / 2;
    const textWidth = ctx.measureText(text).width + Math.max(0, text.length - 1) * letterSpacing;
    let cursor = x - (align === 'center' ? textWidth / 2 : 0);
    if (letterSpacing > 0) {
      for (const character of text) {
        ctx.fillText(character, cursor + letterSpacing / 2, height / 2 + 1);
        cursor += ctx.measureText(character).width + letterSpacing;
      }
    } else {
      ctx.fillText(text, x, height / 2 + 1);
    }
  });
};

export const isAsciiText = (value: string): boolean => /^[\x20-\x7E]+$/.test(value);

export const formatTime = (seconds: number): string => {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = Math.floor(clamped % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const disposeMaterial = (material: THREE.Material | THREE.Material[]): void => {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
    return;
  }
  material.dispose();
};

export const disposeObject = (object: THREE.Object3D): void => {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) disposeMaterial(mesh.material);
  });
  object.parent?.remove(object);
};

export const setMaterialOpacity = (
  material: THREE.Material | THREE.Material[],
  opacity: number
): void => {
  const materials = Array.isArray(material) ? material : [material];
  for (const item of materials) {
    item.transparent = true;
    item.opacity = opacity;
    item.depthWrite = opacity >= 0.999;
  }
};
