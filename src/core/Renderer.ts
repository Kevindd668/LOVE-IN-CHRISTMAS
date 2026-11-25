import * as THREE from 'three';
import { QUALITY_PRESETS, type QualityLevel } from '../config';
import { createBloomPipeline, type PostPipeline } from '../effects/BloomEffect';

export interface RenderStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  pixelRatio: number;
}

export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  private pipeline: PostPipeline | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private quality: QualityLevel;
  private bloomStrength = 0.36;
  private directRendering = false;

  constructor(canvas: HTMLCanvasElement, quality: QualityLevel) {
    this.quality = quality;
    this.bloomStrength = QUALITY_PRESETS[quality].bloomStrength;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      // The scene is always composited through an offscreen MSAA target, so the
      // default framebuffer does not need its own multisample swap chain.
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.info.autoReset = false;
    this.renderer.setClearColor(new THREE.Color('#061522'), 1);
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      console.warn('[ChristmasWish] WebGL context lost. The scene will resume when the browser restores it.');
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      // Recreate the post-processing targets as well; a restored driver context
      // may have discarded the old framebuffer allocations.
      this.rebuildPipeline();
      this.render();
    });
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  attachScene(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    this.scene = scene;
    this.camera = camera;
    this.rebuildPipeline();
  }

  setSize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.applyPixelRatio();
    this.renderer.setSize(this.width, this.height, false);
    if (this.pipeline) {
      this.pipeline.composer.setSize(this.width, this.height);
    }
  }

  private calculatePixelRatio(): number {
    const preset = QUALITY_PRESETS[this.quality];
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return Math.max(0.6, Math.min(preset.pixelRatioCap, dpr) * preset.resolutionScale);
  }

  private applyPixelRatio(): void {
    this.pixelRatio = this.calculatePixelRatio();
    this.renderer.setPixelRatio(this.pixelRatio);
    if (this.pipeline) {
      this.pipeline.composer.setPixelRatio(this.pixelRatio);
    }
  }

  setQuality(quality: QualityLevel): void {
    if (this.quality === quality) return;
    this.quality = quality;
    this.bloomStrength = QUALITY_PRESETS[quality].bloomStrength;
    this.applyPixelRatio();
    this.renderer.setSize(this.width, this.height, false);
    this.rebuildPipeline();
  }

  /** Emergency compatibility path for GPU/compositor issues: no offscreen
   * HDR target, no bloom, straight to the default framebuffer. */
  setDirectRendering(enabled: boolean): void {
    if (this.directRendering === enabled) return;
    this.directRendering = enabled;
    if (enabled) {
      this.pipeline?.dispose();
      this.pipeline = null;
    } else {
      this.rebuildPipeline();
    }
  }

  setBloomStrength(strength: number): void {
    this.bloomStrength = strength;
    if (this.pipeline) this.pipeline.bloomPass.strength = strength;
  }

  setExposure(value: number): void {
    this.renderer.toneMappingExposure = value;
  }

  private rebuildPipeline(): void {
    if (!this.scene || !this.camera || this.directRendering) return;
    this.pipeline?.dispose();
    const preset = QUALITY_PRESETS[this.quality];
    const pipeline = createBloomPipeline(
      this.renderer,
      this.scene,
      this.camera,
      this.width,
      this.height,
      this.pixelRatio,
      preset
    );
    pipeline.bloomPass.strength = this.bloomStrength;
    this.pipeline = pipeline;
  }

  render(): void {
    if (!this.scene || !this.camera) return;
    this.renderer.info.reset();
    if (this.directRendering) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.pipeline?.composer.render();
  }

  /**
   * Compile the cinematic intro and formal scene before the first visible
   * intro frame. This is intentionally on the existing renderer; no second
   * WebGL context or post-processing pipeline is created.
   */
  async warmup(scene: THREE.Scene, camera: THREE.PerspectiveCamera): Promise<void> {
    const renderer = this.renderer as THREE.WebGLRenderer & {
      compileAsync?: (scene: THREE.Scene, camera: THREE.Camera) => Promise<void>;
    };
    try {
      if (typeof renderer.compileAsync === 'function') {
        await renderer.compileAsync(scene, camera);
      } else {
        renderer.compile(scene, camera);
      }
      // Compile the bloom/composer programs as well. The entry overlay hides
      // this single warm-up frame.
      this.render();
    } catch (error) {
      console.warn('[ChristmasWish] intro warmup failed; continuing without prewarm', error);
    }
  }

  get info(): THREE.WebGLInfo {
    return this.renderer.info;
  }

  get currentPixelRatio(): number {
    return this.pixelRatio;
  }

  dispose(): void {
    this.pipeline?.dispose();
    this.pipeline = null;
    this.renderer.dispose();
  }
}
