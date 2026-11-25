import * as THREE from 'three';
import type { QualityLevel } from '../config';
import { clamp, mulberry32, smoothstep } from '../core/utils';

interface GalaxyOptions {
  count?: number;
  farCount?: number;
  waterfallCount?: number;
  quality?: QualityLevel;
}

interface MeteorRuntime {
  line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  positions: Float32Array;
  attributes: THREE.BufferAttribute;
  life: number;
  speed: number;
  x: number;
  y: number;
  z: number;
}

const SKY_VERTEX = /* glsl */ `
  varying vec3 vWorldDir;
  void main(){
    vWorldDir=normalize(position);
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldDir;
  void main(){
    float h=clamp(vWorldDir.y*0.5+0.5,0.0,1.0);
    vec3 top=vec3(0.031,0.055,0.125);
    vec3 mid=vec3(0.043,0.075,0.16);
    vec3 horizon=vec3(0.10,0.16,0.28);
    vec3 color=mix(horizon,mid,smoothstep(0.18,0.55,h));
    color=mix(color,top,smoothstep(0.55,0.96,h));
    float haze=sin(vWorldDir.x*3.2+uTime*0.006)*0.5+0.5;
    color+=vec3(0.018,0.024,0.05)*haze*smoothstep(0.55,0.0,h);
    gl_FragColor=vec4(color,1.0);
  }
`;

const STAR_VERTEX = /* glsl */ `
  attribute float aPhase;
  attribute float aSize;
  attribute float aHue;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uDust;
  varying vec3 vColor;
  varying float vAlpha;
  void main(){
    vec4 mv=modelViewMatrix*vec4(position,1.0);
    float twinkle=0.35+0.65*(0.5+0.5*sin(uTime*1.25+aPhase));
    float dustGain=1.0+uDust*0.55;
    gl_PointSize=clamp(aSize*uPixelRatio*(112.0/max(1.0,-mv.z))*(0.55+twinkle)*dustGain,0.35,3.2);
    gl_Position=projectionMatrix*mv;
    vec3 far=mix(vec3(0.48,0.62,1.0),vec3(1.0,0.78,0.58),aHue);
    vec3 dust=mix(vec3(0.28,0.38,0.95),vec3(0.95,0.56,0.92),aHue);
    vColor=mix(far,dust,uDust);
    vAlpha=(0.2+twinkle*0.36)*(1.0+uDust*0.35);
  }
`;

const STAR_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main(){
    vec2 p=gl_PointCoord-.5; float d=length(p); if(d>.5) discard;
    float core=1.0-smoothstep(0.0,0.18,d);
    float halo=1.0-smoothstep(0.08,0.5,d);
    gl_FragColor=vec4(vColor*(0.62+core*0.95),(halo*0.18+core*0.62)*vAlpha);
  }
`;

const GALAXY_BAND_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(7.1,3.7);a*=.5;} return v; }
  void main(){
    vec2 uv=vUv;
    float diagonal=uv.y - (uv.x*0.22 + 0.46);
    float band=exp(-pow(diagonal*5.5,2.0));
    float cloud=fbm(vec2(uv.x*5.0+uTime*.006,uv.y*3.2));
    float core=exp(-pow(diagonal*18.0,2.0));
    vec3 blue=vec3(0.055,0.11,0.27);
    vec3 violet=vec3(0.24,0.14,0.34);
    vec3 color=mix(blue,violet,smoothstep(.25,.82,cloud));
    color+=vec3(.55,.62,1.0)*core*.16;
    float stars=step(.995,hash(floor(uv*vec2(520.0,220.0))))*band;
    color+=vec3(.8,.86,1.0)*stars*.8;
    float alpha=(band*.2+core*.1)*smoothstep(0.,.22,uv.y)*smoothstep(1.,.78,uv.y);
    gl_FragColor=vec4(color,alpha);
  }
`;

const NEBULA_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;

const NEBULA_FRAGMENT = /* glsl */ `
  uniform float uTime; uniform float uSeed; uniform vec3 uColor; uniform vec3 uColorB; uniform float uOpacity;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(11.7,7.3);a*=.5;} return v; }
  void main(){
    vec2 uv=vUv;
    float n=fbm(uv*vec2(3.2,2.2)+vec2(uSeed,uTime*.008));
    float vein=fbm(vec2(uv.x*5.0+uSeed*.7,uv.y*2.4-uTime*.012));
    float cloud=smoothstep(.34,.78,n)*smoothstep(.22,.65,vein);
    float edge=smoothstep(0.,.18,uv.x)*smoothstep(1.,.82,uv.x)*smoothstep(0.,.2,uv.y)*smoothstep(1.,.8,uv.y);
    float alpha=(cloud*.78+vein*.24)*uOpacity*edge;
    vec3 color=mix(uColorB,uColor,smoothstep(.22,.86,n));
    gl_FragColor=vec4(color*(.66+cloud*.62),alpha);
  }
`;

const AURORA_VERTEX = /* glsl */ `
  uniform float uTime; uniform float uSeed;
  varying vec2 vUv;
  void main(){
    vUv=uv;
    vec3 p=position;
    p.y += sin(p.x*.32+uTime*.18+uSeed)*1.1;
    p.x += sin(p.y*.41+uTime*.12)*.28;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
  }
`;

const AURORA_FRAGMENT = /* glsl */ `
  uniform float uTime; uniform vec3 uColor; uniform float uSeed; uniform float uOpacity;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453); }
  float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
  void main(){
    vec2 uv=vUv;
    float wave=noise(vec2(uv.x*9.0+uTime*.11+uSeed,uv.y*3.5-uTime*.05));
    float band=smoothstep(.22,.55,uv.y)*smoothstep(.95,.66,uv.y);
    float curtain=pow(max(0.,wave-.28),1.5)*1.8;
    float sideFade=smoothstep(0.,.22,uv.x)*smoothstep(1.,.78,uv.x);
    float topFade=smoothstep(0.,.18,uv.y)*smoothstep(1.,.82,uv.y);
    float alpha=(band*.11+curtain*.22)*uOpacity*sideFade*topFade;
    vec3 c=mix(uColor,vec3(.35,.98,.82),curtain*.3);
    gl_FragColor=vec4(c*(.78+curtain*.6),alpha);
  }
`;

const WATERFALL_VERTEX = /* glsl */ `
  attribute float aPath;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uPathMask;
  varying vec3 vColor;
  varying float vAlpha;
  void main(){
    float bit=mod(floor(uPathMask/pow(2.0,aPath)),2.0);
    if(bit<0.5){
      gl_Position=vec4(2.0,2.0,2.0,1.0);
      gl_PointSize=0.0;
      return;
    }
    float t=fract(aPhase+uTime*aSpeed*0.055);
    float r1=fract(sin(aPhase*127.1)*43758.5453);
    float r2=fract(sin(aPhase*311.7)*43758.5453);
    vec3 p;
    if(aPath<0.5){
      // Left champagne stream: a broad veil, not a single glowing rope.
      p.y=mix(0.35,9.2,1.0-t)+(r1-0.5)*0.55;
      p.x=-5.0+sin(t*4.2+aPhase*6.283)*0.62+(r1-0.5)*2.4;
      p.z=-0.8+cos(t*3.1+aPhase*5.0)*1.05+(r2-0.5)*2.1;
    } else if(aPath<1.5){
      // Right rose-gold stream: opposite curl and a wider drift.
      p.y=mix(0.35,9.2,1.0-t)+(r2-0.5)*0.6;
      p.x=5.0+sin(t*3.7+aPhase*6.283+2.0)*0.75+(r1-0.5)*2.7;
      p.z=-0.6+cos(t*3.5+aPhase*4.0)*1.15+(r2-0.5)*2.3;
    } else if(aPath<2.5){
      // Sparse rear curtain: breadth without a solid golden wall.
      p.x=(fract(aPhase*7.13)-0.5)*13.0;
      p.y=mix(0.1,10.8,1.0-t)+(r1-0.5)*0.4;
      p.z=-5.8+(fract(aPhase*3.71)-0.5)*3.2+(r2-0.5)*1.4;
      p.x+=sin(t*2.0+aPhase*8.0)*0.42;
    } else {
      // Crown fountain: rises and opens toward the sky.
      p.y=mix(9.35,16.8,t)+(r1-0.5)*1.1;
      float angle=aPhase*6.283+t*4.8+(r2-0.5)*1.1;
      float radius=0.35+t*4.4+(r1-0.5)*1.4;
      p.x=cos(angle)*radius;
      p.z=sin(angle)*radius*0.75;
    }
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_PointSize=clamp(aSize*uPixelRatio*(420.0/max(1.0,-mv.z)),.6,7.5);
    gl_Position=projectionMatrix*mv;
    vColor=aColor;
    vAlpha=aAlpha*sin(3.14159265*clamp(t,0.0,1.0))*(0.7+0.3*sin(aPhase*19.0+uTime*1.5));
  }
`;

const WATERFALL_FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main(){
    vec2 p=gl_PointCoord-.5; float d=length(p); if(d>.5) discard;
    float core=1.0-smoothstep(0.,.18,d);
    float halo=1.0-smoothstep(.12,.5,d);
    gl_FragColor=vec4(vColor*(0.9+core*1.3),(core*.72+halo*.24)*vAlpha);
  }
`;

/**
 * F2 experiment 03's starfield, nebula, aurora, meteors, golden waterfall and
 * three orbit tracks, adapted into one formal-scene module. It owns no
 * renderer, composer or RAF loop; main.ts drives update() from AnimationManager.
 */
export class GalaxyEnvironment {
  readonly group = new THREE.Group();
  private skyDome: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private galaxyBand: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private nearStars: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
  private farStars: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> | null = null;
  private nebulaGroup = new THREE.Group();
  private auroraGroup = new THREE.Group();
  private orbitGroup = new THREE.Group();
  private meteorGroup = new THREE.Group();
  private meteorRuntime: MeteorRuntime[] = [];
  private waterfallGroups: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>[] = [];
  private waterfallMask = 15;
  private baseCount: number;
  private baseFarCount: number;
  private baseWaterfall: number;
  private starCount: number;
  private farCount: number;
  private waterfallCount: number;
  private quality: QualityLevel;
  private starsEnabled = true;
  private auroraEnabled = true;
  private meteorsEnabled = true;
  private waterfallEnabled = true;
  private orbitsEnabled = true;
  private rng = mulberry32(71237);

  constructor(options: GalaxyOptions = {}) {
    this.baseCount = 8000;
    this.baseFarCount = 6000;
    this.baseWaterfall = 5800;
    this.starCount = options.count ?? this.baseCount;
    this.farCount = options.farCount ?? this.baseFarCount;
    this.waterfallCount = options.waterfallCount ?? this.baseWaterfall;
    this.quality = options.quality ?? 'ultra';
    this.group.name = 'galaxy-environment';
    this.group.renderOrder = -20;
    this.skyDome = this.buildSkyDome();
    this.group.add(this.skyDome);
    this.galaxyBand = this.buildGalaxyBand();
    this.group.add(this.galaxyBand);
    this.buildStars();
    this.buildNebula();
    this.buildAurora();
    this.buildMeteors();
    this.buildWaterfall();
    this.buildOrbits();
    this.group.add(this.nebulaGroup, this.auroraGroup, this.meteorGroup, this.orbitGroup);
    this.applyQuality(this.quality);
  }

  private buildSkyDome(): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
    const geometry = new THREE.SphereGeometry(155, 40, 20);
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -50;
    return mesh;
  }

  private buildGalaxyBand(): THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> {
    const geometry = new THREE.PlaneGeometry(150, 70);
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: NEBULA_VERTEX,
      fragmentShader: GALAXY_BAND_FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 22, -58);
    mesh.rotation.z = -0.08;
    mesh.renderOrder = -19;
    mesh.frustumCulled = false;
    return mesh;
  }

  private buildStars(): void {
    // Layer 2: far stars; layer 3: denser dust locked to a diagonal
    // galactic band rather than another uniform sphere.
    this.nearStars = this.buildStarLayer(this.starCount, 34, 72, 0.66, 1.15, true);
    this.farStars = this.buildStarLayer(this.farCount, 72, 118, 0.32, 0.6, false);
    this.group.add(this.farStars, this.nearStars);
  }

  private buildStarLayer(
    count: number,
    radiusMin: number,
    radiusMax: number,
    sizeScale: number,
    speed: number,
    dust: boolean
  ): THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial> {
    const n = Math.max(1, Math.round(count));
    const positions = new Float32Array(n * 3);
    const phases = new Float32Array(n);
    const sizes = new Float32Array(n);
    const hues = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const radius = radiusMin + Math.pow(this.rng(), 0.55) * (radiusMax - radiusMin);
      if (dust) {
        // A dense diagonal river in the far sky, not another uniform shell.
        // The band is deliberately broad but has a bright narrow core so it
        // reads like the Milky Way at panorama scale.
        const bandX = (this.rng() - 0.5) * 126;
        const core = this.rng() < 0.68;
        const bandY =
          20 + bandX * 0.155 + (this.rng() - 0.5) * (core ? 4.2 : 11);
        const z = -50 - this.rng() * 24;
        positions[i * 3] = bandX;
        positions[i * 3 + 1] = bandY;
        positions[i * 3 + 2] = z;
        sizes[i] = (core ? 0.8 : 0.45) + this.rng() * (core ? 1.7 : 1.1);
        hues[i] = this.rng();
      } else {
        const theta = this.rng() * Math.PI * 2;
        const phi = Math.acos(2 * this.rng() - 1);
        positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
        positions[i * 3 + 1] = Math.cos(phi) * radius * 0.72 + 5;
        positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
        sizes[i] = 0.7 + this.rng() * 1.9;
        hues[i] = this.rng();
      }
      phases[i] = this.rng() * Math.PI * 2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aHue', new THREE.BufferAttribute(hues, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uDust: { value: dust ? 1 : 0 }
      },
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = -20;
    points.userData.speed = speed;
    points.userData.baseCount = n;
    points.userData.sizeScale = sizeScale;
    const scale = geometry.getAttribute('aSize') as THREE.BufferAttribute;
    for (let i = 0; i < n; i += 1) scale.setX(i, (scale.getX(i) as number) * sizeScale);
    return points;
  }

  private buildNebula(): void {
    const colors = ['#704A91', '#243F78', '#3B5AA6'];
    for (let i = 0; i < 3; i += 1) {
      const geometry = new THREE.PlaneGeometry(132, 78);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: 2.1 + i * 4.7 },
          uColor: { value: new THREE.Color(colors[i % colors.length]) },
          uColorB: { value: new THREE.Color('#080E20') },
          uOpacity: { value: 0.98 - i * 0.06 }
        },
        vertexShader: NEBULA_VERTEX,
        fragmentShader: NEBULA_FRAGMENT,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(-4 + i * 4, 15 + i * 4.2, -46 - i * 8);
      mesh.rotation.z = i * 0.08 - 0.06;
      mesh.renderOrder = -18 + i;
      this.nebulaGroup.add(mesh);
    }
  }

  private buildAurora(): void {
    const colors = ['#36C9B0', '#2E9AAE', '#5DE0C0', '#2B7F9A'];
    for (let i = 0; i < 4; i += 1) {
      const geometry = new THREE.PlaneGeometry(62 + i * 7, 18 + i * 2, 60, 16);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: i * 4.3 },
          uColor: { value: new THREE.Color(colors[i]) },
          uOpacity: { value: 0.62 - i * 0.055 }
        },
        vertexShader: AURORA_VERTEX,
        fragmentShader: AURORA_FRAGMENT,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, 18 + i * 2.2, -52 - i * 5);
      mesh.rotation.x = -0.05 + i * 0.03;
      mesh.renderOrder = -12;
      this.auroraGroup.add(mesh);
    }
  }

  private buildMeteors(): void {
    for (let i = 0; i < 5; i += 1) {
      const positions = new Float32Array(6);
      const geometry = new THREE.BufferGeometry();
      const attribute = new THREE.BufferAttribute(positions, 3);
      geometry.setAttribute('position', attribute);
      const material = new THREE.LineBasicMaterial({
        color: i % 2 ? '#FFD58A' : '#B68AFF',
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const line = new THREE.Line(geometry, material);
      line.frustumCulled = false;
      this.meteorGroup.add(line);
      const meteor: MeteorRuntime = {
        line,
        positions,
        attributes: attribute,
        life: 0,
        speed: 4 + this.rng() * 5,
        x: 0,
        y: 0,
        z: 0
      };
      this.resetMeteor(meteor);
      this.meteorRuntime.push(meteor);
    }
  }

  private resetMeteor(meteor: MeteorRuntime): void {
    meteor.life = 0;
    meteor.x = -22 + this.rng() * 40;
    meteor.y = 16 + this.rng() * 12;
    meteor.z = -38 + this.rng() * 30;
    meteor.speed = 3.5 + this.rng() * 6;
  }

  private buildWaterfall(): void {
    const pathCounts = [1200, 1800, 2000, 800];
    const palette = [
      new THREE.Color('#E8C98A'),
      new THREE.Color('#D88978'),
      new THREE.Color('#C9A260'),
      new THREE.Color('#FFD7A0')
    ];
    for (let path = 0; path < pathCounts.length; path += 1) {
      const count = pathCounts[path];
      const positions = new Float32Array(count * 3);
      const pathAttribute = new Float32Array(count).fill(path);
      const phases = new Float32Array(count);
      const speeds = new Float32Array(count);
      const sizes = new Float32Array(count);
      const alphas = new Float32Array(count);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        phases[i] = this.rng();
        speeds[i] = [0.42, 0.52, 0.3, 0.65][path] * (0.72 + this.rng() * 0.7);
        sizes[i] = [0.78, 0.88, 0.92, 1.05][path] * (0.75 + this.rng() * 0.7);
        alphas[i] = [0.82, 0.8, 0.72, 0.95][path] * (0.7 + this.rng() * 0.3);
        const tint = palette[path].clone().lerp(new THREE.Color('#FFF4DE'), this.rng() * 0.22);
        colors[i * 3] = tint.r;
        colors[i * 3 + 1] = tint.g;
        colors[i * 3 + 2] = tint.b;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aPath', new THREE.BufferAttribute(pathAttribute, 1));
      geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
      geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
      geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
      geometry.setDrawRange(0, count);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
          uPathMask: { value: 15 }
        },
        vertexShader: WATERFALL_VERTEX,
        fragmentShader: WATERFALL_FRAGMENT,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        toneMapped: false
      });
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      points.renderOrder = 3;
      points.userData.path = path;
      points.userData.baseCount = count;
      points.userData.basePathCount = pathCounts[path];
      this.waterfallGroups.push(points);
      this.group.add(points);
    }
  }

  private buildOrbits(): void {
    const radii = [5.1, 6.5, 8.1];
    const colors = ['#FFD58A', '#FF75A9', '#B68AFF'];
    for (let i = 0; i < 3; i += 1) {
      const points: number[] = [];
      for (let j = 0; j < 180; j += 1) {
        const t = (j / 180) * Math.PI * 2;
        points.push(Math.cos(t) * radii[i], 2.25 + i * 0.08, Math.sin(t) * radii[i]);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      const material = new THREE.LineBasicMaterial({
        color: colors[i],
        transparent: true,
        opacity: 0.34,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const line = new THREE.LineLoop(geometry, material);
      const dots = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color: colors[i],
          size: 0.045,
          transparent: true,
          opacity: 0.62,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      const track = new THREE.Group();
      track.add(line, dots);
      track.userData.speed = [0.19, -0.13, 0.08][i];
      this.orbitGroup.add(track);
    }
  }

  setStarsEnabled(enabled: boolean): void {
    this.starsEnabled = enabled;
    if (this.nearStars) this.nearStars.visible = enabled;
    if (this.farStars) this.farStars.visible = enabled;
  }

  setAuroraEnabled(enabled: boolean): void {
    this.auroraEnabled = enabled;
    this.auroraGroup.visible = enabled && this.quality !== 'performance';
  }

  setMeteorsEnabled(enabled: boolean): void {
    this.meteorsEnabled = enabled;
    this.meteorGroup.visible = enabled;
  }

  setWaterfallEnabled(enabled: boolean): void {
    this.waterfallEnabled = enabled;
    for (const points of this.waterfallGroups) {
      points.visible = enabled && ((this.waterfallMask >> (points.userData.path as number)) & 1) === 1;
    }
  }

  setWaterfallPathMask(mask: number): void {
    this.waterfallMask = mask;
    for (const points of this.waterfallGroups) {
      points.visible = this.waterfallEnabled && ((mask >> (points.userData.path as number)) & 1) === 1;
    }
  }

  setOrbitsEnabled(enabled: boolean): void {
    this.orbitsEnabled = enabled;
    this.orbitGroup.visible = enabled;
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  setQuality(quality: QualityLevel): void {
    this.quality = quality;
    this.applyQuality(quality);
  }

  getStats(): {
    stars: number;
    farStars: number;
    waterfall: number;
    nebulaLayers: number;
    auroraLayers: number;
    meteors: number;
    orbits: number;
    quality: QualityLevel;
  } {
    return {
      stars: this.nearStars?.geometry.drawRange.count ?? 0,
      farStars: this.farStars?.geometry.drawRange.count ?? 0,
      waterfall: this.waterfallGroups.reduce(
        (sum, points) => sum + points.geometry.drawRange.count,
        0
      ),
      nebulaLayers: this.nebulaGroup.visible ? this.nebulaGroup.children.length : 0,
      auroraLayers: this.auroraGroup.visible ? this.auroraGroup.children.length : 0,
      meteors: this.meteorRuntime.length,
      orbits: this.orbitGroup.children.length,
      quality: this.quality
    };
  }

  private applyQuality(quality: QualityLevel): void {
    const starScale = quality === 'performance' ? 0.3 : quality === 'balanced' ? 0.6 : 1;
    const waterfallScale = quality === 'performance' ? 0.35 : quality === 'balanced' ? 0.65 : 1;
    if (this.nearStars) {
      this.nearStars.geometry.setDrawRange(0, Math.round(8000 * starScale));
    }
    if (this.farStars) {
      this.farStars.geometry.setDrawRange(0, Math.round(6000 * starScale));
    }
    for (const points of this.waterfallGroups) {
      points.geometry.setDrawRange(
        0,
        Math.round((points.userData.basePathCount as number) * waterfallScale)
      );
    }
    this.auroraGroup.visible = this.auroraEnabled && quality !== 'performance';
    this.nebulaGroup.visible = quality !== 'performance';
  }

  update(dt: number, elapsed: number): void {
    if (!this.group.visible) return;
    this.skyDome.material.uniforms.uTime.value = elapsed;
    this.galaxyBand.material.uniforms.uTime.value = elapsed;
    for (const points of [this.nearStars, this.farStars]) {
      if (!points) continue;
      points.material.uniforms.uTime.value = elapsed;
      points.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    }
    for (const mesh of this.nebulaGroup.children) {
      const material = (mesh as THREE.Mesh).material as THREE.ShaderMaterial;
      if (material.uniforms?.uTime) material.uniforms.uTime.value = elapsed;
    }
    for (const mesh of this.auroraGroup.children) {
      const material = (mesh as THREE.Mesh).material as THREE.ShaderMaterial;
      if (material.uniforms?.uTime) material.uniforms.uTime.value = elapsed;
    }
    for (const points of this.waterfallGroups) {
      points.material.uniforms.uTime.value = elapsed;
      points.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
    }
    for (const meteor of this.meteorRuntime) {
      meteor.life += dt;
      if (meteor.life > 3.8) this.resetMeteor(meteor);
      const headX = meteor.x - meteor.life * meteor.speed;
      const headY = meteor.y - meteor.life * meteor.speed * 0.55;
      meteor.positions[0] = headX;
      meteor.positions[1] = headY;
      meteor.positions[2] = meteor.z;
      meteor.positions[3] = headX + meteor.speed * 0.36;
      meteor.positions[4] = headY + meteor.speed * 0.2;
      meteor.positions[5] = meteor.z;
      meteor.attributes.needsUpdate = true;
    }
    for (const track of this.orbitGroup.children) {
      track.rotation.y += dt * (track.userData.speed as number);
    }
    this.orbitGroup.rotation.x = Math.sin(elapsed * 0.08) * 0.04;
  }

  dispose(): void {
    this.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.group.clear();
    this.meteorRuntime = [];
    this.nearStars = null;
    this.farStars = null;
    this.waterfallGroups = [];
  }
}
