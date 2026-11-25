import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { QualityPreset } from '../config';

export interface PostPipeline {
  composer: EffectComposer;
  renderPass: RenderPass;
  bloomPass: UnrealBloomPass;
  outputPass: OutputPass;
  dispose: () => void;
}

export const createBloomPipeline = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  pixelRatio: number,
  preset: QualityPreset
): PostPipeline => {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    depthBuffer: true,
    stencilBuffer: false
  });
  target.samples = preset.samples;
  target.texture.colorSpace = THREE.LinearSRGBColorSpace;

  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(Math.max(1, width), Math.max(1, height));

  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(Math.max(1, width), Math.max(1, height)),
    preset.bloomStrength,
    preset.bloomRadius,
    preset.bloomThreshold
  );
  const outputPass = new OutputPass();

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);

  const dispose = (): void => {
    composer.dispose();
    bloomPass.dispose();
    outputPass.dispose();
    renderPass.dispose();
    target.dispose();
  };

  return { composer, renderPass, bloomPass, outputPass, dispose };
};
