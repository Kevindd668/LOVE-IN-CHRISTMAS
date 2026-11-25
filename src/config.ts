export type QualityLevel = 'ultra' | 'balanced' | 'performance';
export type LightMode = 'warm' | 'gold' | 'ice' | 'rainbow' | 'pink';
export type HeartMode = 'orbit' | 'gather' | 'drift';
export type MusicTrack = 'starlight' | 'sleigh' | 'quiet';

export interface WishSettings {
  // Tree
  treeHeight: number;
  crownRadius: number;
  density: number;
  layers: number;
  foliageColor: string;
  treeRotate: boolean;
  treeRotateSpeed: number;
  treeBrightness: number;

  // Double helix / ornaments
  helixOn: boolean;
  helixSpeed: number;
  helixPhase: number;
  ornamentsOn: boolean;
  crownHeartOn: boolean;

  // Lights
  lightsOn: boolean;
  lightColor: string;
  lightCount: number;
  lightBrightness: number;
  lightFlashSpeed: number;
  lightMode: LightMode;

  // Hearts
  heartsOn: boolean;
  heartCount: number;
  heartColor: string;
  heartSize: number;
  heartSpeed: number;
  heartMode: HeartMode;

  // F2 giant heart / galaxy integration
  giantHeartOn: boolean;
  giantHeartPaused: boolean;
  giantHeartCount: number;
  giantHeartColor: string;
  meteorsOn: boolean;
  waterfallOn: boolean;
  orbitsOn: boolean;

  // Photos
  photoRadius: number;
  photoSpeed: number;
  cardScale: number;
  showCaptions: boolean;
  photosPaused: boolean;

  // Environment
  snowOn: boolean;
  snowCount: number;
  snowSpeed: number;
  starsOn: boolean;
  auroraOn: boolean;
  backgroundColor: string;
  ambientBrightness: number;

  // Romance
  text520: string;
  text1314: string;
  blessingTitle: string;
  blessingMessage: string;
  signature: string;
  giftMessage0: string;
  giftMessage1: string;
  giftMessage2: string;
  musicTrack: MusicTrack;
  musicVolume: number;
  musicOn: boolean;

  // Rendering
  quality: QualityLevel;
}

export const DEFAULT_SETTINGS: WishSettings = {
  treeHeight: 9.5,
  crownRadius: 3,
  density: 210,
  layers: 9,
  foliageColor: '#0B5D3B',
  treeRotate: true,
  treeRotateSpeed: 0.28,
  treeBrightness: 1,
  helixOn: true,
  helixSpeed: 0.32,
  helixPhase: 0,
  ornamentsOn: true,
  crownHeartOn: true,

  lightsOn: true,
  lightColor: '#FFD9A4',
  lightCount: 360,
  lightBrightness: 1.45,
  lightFlashSpeed: 1,
  lightMode: 'warm',

  heartsOn: true,
  heartCount: 600,
  heartColor: '#FF5F91',
  heartSize: 1,
  heartSpeed: 0.7,
  heartMode: 'orbit',

  giantHeartOn: true,
  giantHeartPaused: false,
  giantHeartCount: 10000,
  giantHeartColor: '#FF75A9',
  meteorsOn: true,
  waterfallOn: true,
  orbitsOn: true,

  photoRadius: 1,
  photoSpeed: 0.58,
  cardScale: 1,
  showCaptions: true,
  photosPaused: false,

  snowOn: true,
  snowCount: 1800,
  snowSpeed: 1,
  starsOn: true,
  auroraOn: true,
  backgroundColor: '#061522',
  ambientBrightness: 1,

  text520: '520',
  text1314: '1314',
  blessingTitle: 'Merry Christmas',
  blessingMessage: '希望未来的每一个圣诞节，都有你。愿我们的爱，从 520 走到 1314。',
  signature: '永远爱你的我 · 2026',
  giftMessage0: '今年的圣诞礼物，是希望未来每一个冬天都有你。',
  giftMessage1: '和你在一起以后，连冬天都开始变得温柔。',
  giftMessage2: '圣诞快乐，我最喜欢的女孩。以后每一场雪，都想和你一起看。',
  musicTrack: 'starlight',
  musicVolume: 0.45,
  musicOn: false,

  quality: 'ultra'
};

export interface QualityPreset {
  label: string;
  pixelRatioCap: number;
  resolutionScale: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  shadowMapSize: number;
  samples: number;
  snowCount: number;
  lightCount: number;
  heartCount: number;
  starCount: number;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  ultra: {
    label: 'Ultra',
    pixelRatioCap: 2,
    resolutionScale: 1,
    bloomStrength: 0.36,
    bloomRadius: 0.42,
    bloomThreshold: 0.84,
    shadowMapSize: 2048,
    samples: 4,
    snowCount: 1800,
    lightCount: 360,
    heartCount: 600,
    starCount: 1200
  },
  balanced: {
    label: 'Balanced',
    pixelRatioCap: 1.5,
    resolutionScale: 1,
    bloomStrength: 0.3,
    bloomRadius: 0.4,
    bloomThreshold: 0.88,
    shadowMapSize: 1024,
    samples: 2,
    snowCount: 1300,
    lightCount: 360,
    heartCount: 500,
    starCount: 920
  },
  performance: {
    label: 'Performance',
    pixelRatioCap: 1.15,
    resolutionScale: 0.82,
    bloomStrength: 0.24,
    bloomRadius: 0.36,
    bloomThreshold: 0.92,
    shadowMapSize: 512,
    samples: 0,
    snowCount: 720,
    lightCount: 360,
    heartCount: 300,
    starCount: 540
  }
};

export const LIGHT_PALETTES: Record<LightMode, string[]> = {
  warm: ['#FFD9A4', '#FFF2D7', '#FFBE7C', '#F5E4C6'],
  gold: ['#F5C86E', '#FFF0B9', '#D89A45', '#FFE39B'],
  ice: ['#9DE6FF', '#D5F8FF', '#72BDE4', '#EAFBFF'],
  rainbow: ['#FF7B93', '#FFDA7A', '#8AEAB7', '#8FC8FF', '#F7B6FF'],
  pink: ['#FF87AC', '#FFD0DA', '#FF5F91', '#FFF0F3']
};

export const PHOTO_TRACKS = [
  { radius: 3.15, minHeight: 1.75, maxHeight: 4.15, speed: 0.18 },
  { radius: 3.82, minHeight: 2.75, maxHeight: 5.65, speed: -0.125 },
  { radius: 4.5, minHeight: 1.5, maxHeight: 6.05, speed: 0.09 }
] as const;

export const DEFAULT_CAPTIONS = [
  '我们的第一次见面',
  '第一次一起看的雪',
  '最喜欢的一张照片',
  '想和你重复很多次的瞬间',
  '冬天也可以很温柔',
  '一起去过的地方',
  '未来还有很多个 1314',
  '圣诞快乐，我的女孩'
];

export const PHOTO_MAX = 24;

export const GIFT_MESSAGES_FALLBACK = [
  '今年的圣诞礼物，是希望未来每一个冬天都有你。',
  '和你在一起以后，连冬天都开始变得温柔。',
  '圣诞快乐，我最喜欢的女孩。以后每一场雪，都想和你一起看。',
  '想把余生的每一个冬天，都写成我们的故事。',
  '这一份小小的心意，藏着我全部的喜欢。'
];

export const MUSIC_LABELS: Record<MusicTrack, string> = {
  starlight: '冬夜星光',
  sleigh: '雪橇轻响',
  quiet: '静谧雪夜'
};

export const CINEMA_CHAPTERS = [
  { time: 0, act: '第一幕 · 星河落雪', line: 'The night begins for you.' },
  { time: 5, act: '第二幕 · 树影成形', line: 'Every branch grows toward you.' },
  { time: 10, act: '第三幕 · 点亮心愿', line: 'Three hundred and sixty lights. One wish.' },
  { time: 15, act: '第四幕 · 520', line: 'Five hundred and twenty ways to love you.' },
  { time: 20, act: '第五幕 · 1314', line: 'One life, three lives, four seasons.' },
  { time: 25, act: '第六幕 · 我们的冬天', line: 'Every photograph, a moment we keep.' },
  { time: 32, act: '第七幕 · 心之所向', line: 'All my heart, gathered here.' },
  { time: 38, act: '终章 · 圣诞心愿', line: 'And so, this Christmas wish is yours.' }
] as const;

export const CINEMA_DURATION = 45;

export const WISH_STORAGE_KEY = 'a-christmas-wish.settings.v1';
