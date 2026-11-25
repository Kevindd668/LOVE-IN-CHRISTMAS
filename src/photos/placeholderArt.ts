import * as THREE from 'three';
import { makeCanvas, mulberry32 } from '../core/utils';

export interface PlaceholderArt {
  texture: THREE.CanvasTexture;
  dataUrl: string;
}

const drawVignette = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const gradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    width * 0.12,
    width * 0.5,
    height * 0.5,
    width * 0.82
  );
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.72, 'rgba(2,10,14,0.08)');
  gradient.addColorStop(1, 'rgba(2,8,12,0.42)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
};

const drawGrain = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number,
  opacity = 0.08
): void => {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (rng() - 0.5) * 255 * opacity;
    data[i] = Math.max(0, Math.min(255, data[i] + grain));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
  }
  ctx.putImageData(image, 0, 0);
};

const drawStars = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
  rng: () => number,
  maxY = 0.7
): void => {
  for (let i = 0; i < count; i += 1) {
    const x = rng() * width;
    const y = rng() * height * maxY;
    const size = rng() * 1.6 + 0.35;
    const glow = rng() > 0.75;
    ctx.fillStyle = `rgba(${225 + rng() * 30}, ${235 + rng() * 20}, 255, ${0.28 + rng() * 0.7})`;
    if (glow) {
      ctx.shadowColor = 'rgba(184,221,255,0.8)';
      ctx.shadowBlur = 7;
    }
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (glow && size > 1.2) {
      ctx.strokeStyle = `rgba(220,240,255,${0.12 + rng() * 0.22})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x - 5, y);
      ctx.lineTo(x + 5, y);
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y + 5);
      ctx.stroke();
    }
  }
};

const drawSnowfall = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
  rng: () => number
): void => {
  for (let i = 0; i < count; i += 1) {
    const near = rng() > 0.86;
    const x = rng() * width;
    const y = rng() * height;
    const r = near ? 1.4 + rng() * 2.8 : 0.4 + rng() * 1.5;
    ctx.fillStyle = `rgba(244,250,255,${near ? 0.42 + rng() * 0.28 : 0.16 + rng() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawPines = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  baseline: number,
  color: string,
  count: number,
  rng: () => number,
  maxHeight = 260
): void => {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    const x = (i / Math.max(1, count - 1)) * width + (rng() - 0.5) * 46;
    const treeHeight = maxHeight * (0.3 + rng() * 0.7);
    const treeWidth = treeHeight * (0.24 + rng() * 0.1);
    const levels = 4 + Math.floor(rng() * 4);
    for (let level = 0; level < levels; level += 1) {
      const progress = level / levels;
      const levelY = baseline - treeHeight * progress;
      const levelWidth = treeWidth * (1 - progress * 0.72);
      const levelHeight = (treeHeight / levels) * 1.8;
      ctx.beginPath();
      ctx.moveTo(x, levelY - levelHeight);
      ctx.lineTo(x - levelWidth / 2, levelY);
      ctx.lineTo(x + levelWidth / 2, levelY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(x - treeWidth * 0.035, baseline - 8, treeWidth * 0.07, 20);
  }
};

const drawBokeh = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  count: number,
  rng: () => number,
  colors: string[]
): void => {
  for (let i = 0; i < count; i += 1) {
    const x = rng() * width;
    const y = height * (0.1 + rng() * 0.85);
    const radius = 8 + rng() * 74;
    const color = colors[Math.floor(rng() * colors.length)];
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.72, color.replace(/[\d.]+\)$/, '0.12)'));
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawMoon = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number
): void => {
  const glow = ctx.createRadialGradient(x, y, radius * 0.25, x, y, radius * 4.3);
  glow.addColorStop(0, 'rgba(255,242,215,0.3)');
  glow.addColorStop(0.42, 'rgba(255,230,190,0.09)');
  glow.addColorStop(1, 'rgba(255,220,175,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 4.3, 0, Math.PI * 2);
  ctx.fill();

  const surface = ctx.createRadialGradient(
    x - radius * 0.3,
    y - radius * 0.32,
    radius * 0.1,
    x,
    y,
    radius
  );
  surface.addColorStop(0, '#fff8e7');
  surface.addColorStop(0.7, '#efdfc4');
  surface.addColorStop(1, '#cbb796');
  ctx.fillStyle = surface;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(173,151,122,0.08)';
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const distance = radius * (0.25 + (i % 4) * 0.12);
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance,
      2 + (i % 3),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
};

const drawBrandMark = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  index: number,
  color = 'rgba(247,232,205,0.42)'
): void => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = '500 11px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.letterSpacing = '3px';
  ctx.fillText(`OUR STORY · ${String(index + 1).padStart(2, '0')}`, 32, height - 31);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(width - 97, height - 35);
  ctx.lineTo(width - 32, height - 35);
  ctx.stroke();
  ctx.restore();
};

const paintWinterMoon = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number
): void => {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#071825');
  sky.addColorStop(0.5, '#122d3b');
  sky.addColorStop(1, '#9a8871');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  drawStars(ctx, width, height, 130, rng, 0.55);
  drawMoon(ctx, width * 0.74, height * 0.23, 42);

  const ridgeFar = ctx.createLinearGradient(0, height * 0.6, 0, height);
  ridgeFar.addColorStop(0, 'rgba(83,112,123,0.62)');
  ridgeFar.addColorStop(1, 'rgba(27,47,54,0.9)');
  ctx.fillStyle = ridgeFar;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.74);
  ctx.lineTo(width * 0.18, height * 0.59);
  ctx.lineTo(width * 0.34, height * 0.71);
  ctx.lineTo(width * 0.51, height * 0.56);
  ctx.lineTo(width * 0.7, height * 0.74);
  ctx.lineTo(width, height * 0.64);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  const ridgeNear = ctx.createLinearGradient(0, height * 0.73, 0, height);
  ridgeNear.addColorStop(0, '#1c333d');
  ridgeNear.addColorStop(1, '#09161b');
  ctx.fillStyle = ridgeNear;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.88);
  ctx.lineTo(width * 0.2, height * 0.74);
  ctx.lineTo(width * 0.42, height * 0.88);
  ctx.lineTo(width * 0.63, height * 0.76);
  ctx.lineTo(width * 0.8, height * 0.9);
  ctx.lineTo(width, height * 0.8);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  drawPines(ctx, width, height, height * 0.95, 'rgba(5,15,19,0.8)', 9, rng, 190);
  drawSnowfall(ctx, width, height, 80, rng);
};

const paintAurora = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number
): void => {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#050e18');
  sky.addColorStop(0.6, '#0b1e2b');
  sky.addColorStop(1, '#1e3d42');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  drawStars(ctx, width, height, 85, rng, 0.65);

  ctx.filter = 'blur(35px)';
  for (let layer = 0; layer < 5; layer += 1) {
    const gradient = ctx.createLinearGradient(width * 0.1, 0, width * 0.9, height * 0.7);
    gradient.addColorStop(0, 'rgba(30,155,135,0)');
    gradient.addColorStop(0.35, `rgba(${44 + layer * 9}, ${170 - layer * 9}, ${149 - layer * 5}, ${0.18 - layer * 0.018})`);
    gradient.addColorStop(0.65, `rgba(${90 + layer * 12}, ${213 - layer * 6}, ${180 + layer * 3}, ${0.21 - layer * 0.02})`);
    gradient.addColorStop(1, 'rgba(30,120,130,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-80, height * (0.24 + layer * 0.045));
    ctx.bezierCurveTo(
      width * 0.22,
      height * (0.55 + layer * 0.03),
      width * 0.5,
      height * (0.04 + layer * 0.08),
      width + 80,
      height * (0.36 + layer * 0.03)
    );
    ctx.lineTo(width + 80, height * 0.79);
    ctx.bezierCurveTo(width * 0.6, height * 0.53, width * 0.3, height * 0.7, -80, height * 0.62);
    ctx.closePath();
    ctx.fill();
  }
  ctx.filter = 'none';

  const snowField = ctx.createLinearGradient(0, height * 0.7, 0, height);
  snowField.addColorStop(0, '#2e5355');
  snowField.addColorStop(1, '#dbe4df');
  ctx.fillStyle = snowField;
  ctx.beginPath();
  ctx.moveTo(0, height * 0.84);
  ctx.bezierCurveTo(width * 0.25, height * 0.74, width * 0.6, height * 0.89, width, height * 0.77);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  drawPines(ctx, width, height, height * 0.9, 'rgba(6,22,23,0.9)', 7, rng, 220);
  drawSnowfall(ctx, width, height, 60, rng);
};

const paintGoldenBokeh = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number
): void => {
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#2d2530');
  bg.addColorStop(0.5, '#634d43');
  bg.addColorStop(1, '#251b22');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.filter = 'blur(14px)';
  drawBokeh(ctx, width, height, 28, rng, [
    'rgba(255, 210, 139, 0.45)',
    'rgba(255, 167, 133, 0.3)',
    'rgba(246, 228, 189, 0.4)',
    'rgba(211, 148, 95, 0.32)'
  ]);
  ctx.filter = 'none';

  ctx.strokeStyle = 'rgba(255, 228, 175, 0.32)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-20, height * 0.32);
  ctx.bezierCurveTo(width * 0.3, height * 0.48, width * 0.55, height * 0.24, width + 20, height * 0.4);
  ctx.stroke();
  for (let i = 0; i < 14; i += 1) {
    const x = width * (i / 13) + (rng() - 0.5) * 20;
    const y = height * (0.32 + Math.sin(i * 0.7) * 0.055 + rng() * 0.05);
    const r = 3 + rng() * 5;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    glow.addColorStop(0, 'rgba(255,248,219,0.95)');
    glow.addColorStop(0.2, 'rgba(255,205,131,0.55)');
    glow.addColorStop(1, 'rgba(255,193,105,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,249,225,0.94)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  drawBokeh(ctx, width, height * 0.55, 10, rng, [
    'rgba(255, 222, 165, 0.22)',
    'rgba(255, 186, 160, 0.18)'
  ]);
  drawSnowfall(ctx, width, height, 30, rng);
};

const paintSnowGlobe = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number
): void => {
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#c6d6d5');
  bg.addColorStop(0.48, '#8aa5a6');
  bg.addColorStop(1, '#354c50');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const light = ctx.createRadialGradient(
    width * 0.38,
    height * 0.32,
    20,
    width * 0.38,
    height * 0.32,
    width * 0.72
  );
  light.addColorStop(0, 'rgba(255,244,213,0.35)');
  light.addColorStop(1, 'rgba(255,244,213,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.45;
  const radius = width * 0.31;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  const globe = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.35, 10, cx, cy, radius);
  globe.addColorStop(0, 'rgba(225,244,243,0.94)');
  globe.addColorStop(0.55, 'rgba(123,162,166,0.76)');
  globe.addColorStop(1, 'rgba(23,53,60,0.96)');
  ctx.fillStyle = globe;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  drawStars(ctx, width, height, 45, rng, 0.55);
  drawMoon(ctx, cx + radius * 0.35, cy - radius * 0.38, 22);
  drawPines(ctx, width, height, cy + radius * 0.63, 'rgba(6,30,26,0.95)', 6, rng, 195);
  drawSnowfall(ctx, width, height, 70, rng);
  ctx.restore();

  const rim = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  rim.addColorStop(0, 'rgba(255,248,225,0.8)');
  rim.addColorStop(0.3, 'rgba(255,255,255,0.1)');
  rim.addColorStop(0.7, 'rgba(229,199,147,0.4)');
  rim.addColorStop(1, 'rgba(255,249,230,0.5)');
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const base = ctx.createLinearGradient(cx - radius * 0.7, 0, cx + radius * 0.7, 0);
  base.addColorStop(0, '#4a3526');
  base.addColorStop(0.5, '#b18b5e');
  base.addColorStop(1, '#443024');
  ctx.fillStyle = base;
  ctx.beginPath();
  ctx.ellipse(cx, cy + radius + 43, radius * 0.72, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,237,203,0.26)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + radius + 37, radius * 0.55, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  drawVignette(ctx, width, height);
};

const paintTwoHearts = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number
): void => {
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0a2824');
  bg.addColorStop(0.55, '#133b35');
  bg.addColorStop(1, '#061c1b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.filter = 'blur(40px)';
  const bloom = ctx.createRadialGradient(width * 0.44, height * 0.44, 20, width * 0.44, height * 0.44, 300);
  bloom.addColorStop(0, 'rgba(208,159,92,0.3)');
  bloom.addColorStop(1, 'rgba(22,75,64,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, width, height);
  ctx.filter = 'none';
  drawStars(ctx, width, height, 44, rng, 0.9);

  const drawHeart = (cx: number, cy: number, scale: number, rotation: number, color: string, alpha: number): void => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2.4;
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    for (let i = 0; i <= 180; i += 1) {
      const t = (i / 180) * Math.PI * 2;
      const x = (16 * Math.pow(Math.sin(t), 3)) / 18;
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 18;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  };

  drawHeart(width * 0.44, height * 0.47, 110, -0.08, '#f4d59a', 0.82);
  drawHeart(width * 0.56, height * 0.5, 84, 0.16, '#e6ada0', 0.5);
  ctx.strokeStyle = 'rgba(247,224,182,0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(width * 0.28, height * 0.7);
  ctx.bezierCurveTo(width * 0.4, height * 0.63, width * 0.58, height * 0.75, width * 0.72, height * 0.66);
  ctx.stroke();
  drawSnowfall(ctx, width, height, 25, rng);
};

const paintWinterWindow = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number
): void => {
  const wall = ctx.createLinearGradient(0, 0, width, height);
  wall.addColorStop(0, '#1a2428');
  wall.addColorStop(1, '#080f13');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, width, height);

  const windowX = width * 0.16;
  const windowY = height * 0.12;
  const windowW = width * 0.68;
  const windowH = height * 0.66;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(windowX - 16, windowY - 16, windowW + 32, windowH + 32);

  const outside = ctx.createLinearGradient(0, windowY, 0, windowY + windowH);
  outside.addColorStop(0, '#122939');
  outside.addColorStop(0.55, '#33535c');
  outside.addColorStop(1, '#d6dbd1');
  ctx.fillStyle = outside;
  ctx.fillRect(windowX, windowY, windowW, windowH);

  ctx.save();
  ctx.beginPath();
  ctx.rect(windowX, windowY, windowW, windowH);
  ctx.clip();
  drawStars(ctx, width, height, 34, rng, 0.38);
  drawPines(ctx, width, height, windowY + windowH * 0.8, 'rgba(12,31,31,0.9)', 5, rng, 165);
  drawSnowfall(ctx, width, height, 100, rng);
  const glass = ctx.createLinearGradient(windowX, windowY, windowX + windowW, windowY + windowH);
  glass.addColorStop(0, 'rgba(255,255,255,0.12)');
  glass.addColorStop(0.5, 'rgba(255,255,255,0)');
  glass.addColorStop(1, 'rgba(255,255,255,0.08)');
  ctx.fillStyle = glass;
  ctx.fillRect(windowX, windowY, windowW, windowH);
  ctx.restore();

  const frameGradient = ctx.createLinearGradient(windowX, windowY, windowX + windowW, windowY + windowH);
  frameGradient.addColorStop(0, '#4f3d2e');
  frameGradient.addColorStop(0.5, '#7c6045');
  frameGradient.addColorStop(1, '#2d2119');
  ctx.strokeStyle = frameGradient;
  ctx.lineWidth = 15;
  ctx.strokeRect(windowX, windowY, windowW, windowH);
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(windowX + windowW / 2, windowY);
  ctx.lineTo(windowX + windowW / 2, windowY + windowH);
  ctx.moveTo(windowX, windowY + windowH / 2);
  ctx.lineTo(windowX + windowW, windowY + windowH / 2);
  ctx.stroke();

  const lamp = ctx.createRadialGradient(width * 0.82, height * 0.84, 4, width * 0.82, height * 0.84, 150);
  lamp.addColorStop(0, 'rgba(255,205,126,0.78)');
  lamp.addColorStop(0.22, 'rgba(255,184,95,0.28)');
  lamp.addColorStop(1, 'rgba(255,177,86,0)');
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255,240,205,0.85)';
  ctx.beginPath();
  ctx.ellipse(width * 0.82, height * 0.83, 15, 25, 0, 0, Math.PI * 2);
  ctx.fill();
  drawVignette(ctx, width, height);
};

const paintStarryPines = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number
): void => {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#030a12');
  sky.addColorStop(0.45, '#071d2a');
  sky.addColorStop(0.75, '#163745');
  sky.addColorStop(1, '#503e33');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  drawStars(ctx, width, height, 195, rng, 0.76);
  drawMoon(ctx, width * 0.22, height * 0.22, 30);

  ctx.filter = 'blur(18px)';
  const haze = ctx.createLinearGradient(0, height * 0.52, 0, height);
  haze.addColorStop(0, 'rgba(167,175,165,0.1)');
  haze.addColorStop(1, 'rgba(88,111,110,0.34)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, height * 0.52, width, height * 0.48);
  ctx.filter = 'none';
  drawPines(ctx, width, height, height * 0.89, 'rgba(4,14,17,0.86)', 12, rng, 290);
  drawPines(ctx, width, height, height * 0.96, 'rgba(2,8,10,0.93)', 9, rng, 220);
  drawSnowfall(ctx, width, height, 40, rng);
};

const paintFirstSnow = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rng: () => number
): void => {
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#150f18');
  bg.addColorStop(0.37, '#3c2931');
  bg.addColorStop(0.74, '#755551');
  bg.addColorStop(1, '#9b7d6d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.filter = 'blur(24px)';
  drawBokeh(ctx, width, height, 15, rng, [
    'rgba(255, 228, 198, 0.28)',
    'rgba(238, 186, 183, 0.23)',
    'rgba(255, 210, 160, 0.22)'
  ]);
  ctx.filter = 'none';

  const light = ctx.createRadialGradient(width * 0.72, height * 0.26, 0, width * 0.72, height * 0.26, 145);
  light.addColorStop(0, 'rgba(255,245,223,0.95)');
  light.addColorStop(0.08, 'rgba(255,236,198,0.8)');
  light.addColorStop(0.3, 'rgba(255,215,167,0.24)');
  light.addColorStop(1, 'rgba(255,200,144,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,241,218,0.3)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(width * 0.72, height * 0.26);
  ctx.lineTo(width * 0.68, 0);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,230,194,0.88)';
  const starX = width * 0.72;
  const starY = height * 0.27;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 22 : 8;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = starX + Math.cos(angle) * radius;
    const y = starY + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  drawPines(ctx, width, height, height * 0.86, 'rgba(13,18,21,0.72)', 7, rng, 190);
  ctx.filter = 'blur(10px)';
  const snowBank = ctx.createLinearGradient(0, height * 0.82, 0, height);
  snowBank.addColorStop(0, 'rgba(125,143,144,0.05)');
  snowBank.addColorStop(1, 'rgba(218,215,202,0.5)');
  ctx.fillStyle = snowBank;
  ctx.fillRect(0, height * 0.82, width, height * 0.18);
  ctx.filter = 'none';
  drawSnowfall(ctx, width, height, 120, rng);
  drawVignette(ctx, width, height);
};

export const createPlaceholderArt = (index: number): PlaceholderArt => {
  const width = 640;
  const height = 800;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  const rng = mulberry32(9137 + index * 771);

  switch (index % 8) {
    case 0:
      paintWinterMoon(ctx, width, height, rng);
      break;
    case 1:
      paintAurora(ctx, width, height, rng);
      break;
    case 2:
      paintGoldenBokeh(ctx, width, height, rng);
      break;
    case 3:
      paintSnowGlobe(ctx, width, height, rng);
      break;
    case 4:
      paintTwoHearts(ctx, width, height, rng);
      break;
    case 5:
      paintWinterWindow(ctx, width, height, rng);
      break;
    case 6:
      paintStarryPines(ctx, width, height, rng);
      break;
    default:
      paintFirstSnow(ctx, width, height, rng);
      break;
  }

  drawGrain(ctx, width, height, rng, 0.055);
  drawVignette(ctx, width, height);
  drawBrandMark(
    ctx,
    width,
    height,
    index,
    index === 3 ? 'rgba(46,64,61,0.48)' : 'rgba(247,232,205,0.42)'
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return {
    texture,
    dataUrl: canvas.toDataURL('image/jpeg', 0.86)
  };
};
