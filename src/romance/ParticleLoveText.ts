import * as THREE from 'three';

const COUNT = 1800;
const WIDTH = 5.8;
const HEIGHT = 2.6;

type LoveLabel = '520' | '1314' | '520 ♡ 1314';

const sample = (text: string): Array<[number, number]> => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 280;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${text.length > 6 ? 104 : 154}px Georgia, "Songti SC", serif`;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const points: Array<[number, number]> = [];
  for (let y = 0; y < canvas.height; y += 3) {
    for (let x = 0; x < canvas.width; x += 3) {
      if (data[(y * canvas.width + x) * 4 + 3] > 110) {
        points.push([(x / canvas.width - 0.5) * WIDTH, -(y / canvas.height - 0.5) * HEIGHT]);
      }
    }
  }
  return points;
};

export class ParticleLoveText {
  readonly group = new THREE.Group();
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.PointsMaterial;
  private readonly targets: Record<LoveLabel, Float32Array>;
  private readonly colors: Float32Array;
  private readonly points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private label: LoveLabel = '520';

  constructor() {
    this.group.name = 'particle-love-numbers';
    this.group.position.set(0, 8.1, 6.2);
    this.group.scale.setScalar(1.12);
    this.targets = {
      '520': this.makeTarget('520'),
      '1314': this.makeTarget('1314'),
      '520 ♡ 1314': this.makeTarget('520 ♡ 1314')
    };
    const positions = new Float32Array(COUNT * 3);
    this.colors = new Float32Array(COUNT * 3);
    const gold = new THREE.Color('#FFD58A');
    const rose = new THREE.Color('#FF9CBA');
    for (let i = 0; i < COUNT; i += 1) {
      const tint = i % 4 === 0 ? rose : gold;
      this.colors[i * 3] = tint.r;
      this.colors[i * 3 + 1] = tint.g;
      this.colors[i * 3 + 2] = tint.b;
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setDrawRange(0, COUNT);
    this.material = new THREE.PointsMaterial({
      size: 0.078,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
    this.group.add(this.points);
    this.group.visible = false;
    this.setLabel('520');
  }

  private makeTarget(text: string): Float32Array {
    const samples = sample(text);
    const target = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i += 1) {
      const [x, y] = samples[i % Math.max(1, samples.length)] ?? [0, 0];
      target[i * 3] = x + (Math.random() - 0.5) * 0.018;
      target[i * 3 + 1] = y + (Math.random() - 0.5) * 0.018;
      target[i * 3 + 2] = (Math.random() - 0.5) * 0.16;
    }
    return target;
  }

  setLabel(label: LoveLabel): void {
    this.label = label;
    const position = this.geometry.attributes.position as THREE.BufferAttribute;
    position.copyArray(this.targets[label]);
    position.needsUpdate = true;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  update(time: number): void {
    if (!this.group.visible) return;
    this.points.rotation.z = Math.sin(time * 0.35) * 0.012;
    this.material.opacity = 0.82 + Math.sin(time * 1.2) * 0.1;
  }

  get currentLabel(): LoveLabel {
    return this.label;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
