/*
 * Adapted from Saklin Ali, Heart-Star
 * Repository: https://github.com/saklincodes/Heart-Star
 * Source commit: 9317aeb
 * Original file: Heart-Star/geometry.js
 *
 * Five authors authorized this project to copy, reuse and modify their code;
 * attribution is retained. See docs/F2/SOURCE_REUSE_REPORT.md and
 * docs/F3/DIRECT_REUSE_INVENTORY.md.
 */

import * as THREE from 'three';

// Star shape parameters from the original module.
const STAR_ARMS = 5;
const STAR_OUTER_RADIUS = 35;
const STAR_INNER_RADIUS = 15;
const STAR_DEPTH = 4;

// Heart shape parameters from the original module.
const HEART_SCALE = 2.2;

const starPolygon = buildStarPolygon();

function buildStarPolygon(): THREE.Vector2[] {
  const vertices: THREE.Vector2[] = [];
  for (let arm = 0; arm < STAR_ARMS; arm += 1) {
    const outerAngle = (arm / STAR_ARMS) * Math.PI * 2 - Math.PI / 2;
    vertices.push(
      new THREE.Vector2(
        STAR_OUTER_RADIUS * Math.cos(outerAngle),
        STAR_OUTER_RADIUS * Math.sin(outerAngle)
      )
    );

    const innerAngle = outerAngle + Math.PI / STAR_ARMS;
    vertices.push(
      new THREE.Vector2(
        STAR_INNER_RADIUS * Math.cos(innerAngle),
        STAR_INNER_RADIUS * Math.sin(innerAngle)
      )
    );
  }
  return vertices;
}

/**
 * Samples the five-pointed star outline at normalized t in [0, 1).
 * Copied from Heart-Star geometry.js, with only the type annotations added.
 */
export function sampleStar(t: number): THREE.Vector3 {
  const edgeCount = starPolygon.length;
  const edge = t * edgeCount;
  const edgeIndex = Math.floor(edge) % edgeCount;
  const edgeProgress = edge - Math.floor(edge);

  const from = starPolygon[edgeIndex];
  const to = starPolygon[(edgeIndex + 1) % edgeCount];

  return new THREE.Vector3(
    THREE.MathUtils.lerp(from.x, to.x, edgeProgress),
    THREE.MathUtils.lerp(from.y, to.y, edgeProgress),
    Math.sin(t * Math.PI * 4) * (STAR_DEPTH / 2)
  );
}

/**
 * Samples the classic parametric heart curve from Heart-Star:
 *   x = 16 sin^3(theta)
 *   y = 13 cos(theta) - 5 cos(2 theta) - 2 cos(3 theta) - cos(4 theta)
 * and adds the source module's z ripple.
 */
export function sampleHeart(t: number): THREE.Vector3 {
  const theta = t * Math.PI * 2;
  const x = 16 * Math.pow(Math.sin(theta), 3);
  const y =
    13 * Math.cos(theta) -
    5 * Math.cos(2 * theta) -
    2 * Math.cos(3 * theta) -
    Math.cos(4 * theta);
  const z = Math.sin(theta * 4) * 2;
  return new THREE.Vector3(x * HEART_SCALE, y * HEART_SCALE, z);
}

/**
 * Original jitter helper, with an injectable rng so callers can keep the
 * formal project's seeded/deterministic generation paths.
 */
export function jitter(
  point: THREE.Vector3,
  strength: number,
  rng: () => number = Math.random
): THREE.Vector3 {
  return new THREE.Vector3(
    point.x + (rng() - 0.5) * strength,
    point.y + (rng() - 0.5) * strength,
    point.z + (rng() - 0.5) * strength * 0.5
  );
}

export interface HeartOutlineOptions {
  width?: number;
  height?: number;
  samples?: number;
}

/**
 * Normalized 2D heart outline built from the reused parametric curve.
 * The source curve is not centered or unit-sized; this function centers it
 * and maps its bounding box to the requested dimensions so existing F3
 * ornament scales and crystal-heart dimensions remain unchanged.
 */
export function createHeartOutline(options: HeartOutlineOptions = {}): THREE.Vector2[] {
  const width = options.width ?? 1;
  const height = options.height ?? 1.18;
  const samples = Math.max(8, Math.round(options.samples ?? 64));
  const raw = Array.from({ length: samples }, (_, index) =>
    sampleHeart(index / samples)
  );

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of raw) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const sx = width / Math.max(0.001, maxX - minX);
  const sy = height / Math.max(0.001, maxY - minY);

  return raw.map(
    (point) => new THREE.Vector2((point.x - cx) * sx, (point.y - cy) * sy)
  );
}

/**
 * Closed THREE.Shape for ExtrudeGeometry consumers. The outline is reversed
 * when needed so the outer contour remains counter-clockwise, which keeps
 * front-face lighting consistent with the previous F3 heart geometry.
 */
export function createHeartShape(options: HeartOutlineOptions = {}): THREE.Shape {
  const points = createHeartOutline(options);
  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  const ordered = area < 0 ? [...points].reverse() : points;
  const shape = new THREE.Shape();
  shape.moveTo(ordered[0].x, ordered[0].y);
  for (let i = 1; i < ordered.length; i += 1) {
    shape.lineTo(ordered[i].x, ordered[i].y);
  }
  shape.closePath();
  return shape;
}
