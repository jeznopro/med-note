import { getStroke } from 'perfect-freehand';
import type { Point, Stroke } from '../types/document';

export interface StrokeOptions {
  size: number;
  thinning?: number;
  smoothing?: number;
  streamline?: number;
  easing?: (t: number) => number;
  start?: {
    taper?: number | boolean;
    cap?: boolean;
  };
  end?: {
    taper?: number | boolean;
    cap?: boolean;
  };
}

// WeakMap cache so committed strokes NEVER re-run `getStroke()` from perfect-freehand (B1/B2)
const committedOutlineCache = new WeakMap<Stroke, number[][]>();

// Runtime Float32Array cache per stroke for ultra-low memory footprint (C2)
const runtimeFloat32Cache = new WeakMap<Stroke, Float32Array>();

/**
 * C2: Pack Point[] ([x, y, pressure][]) into a compact Float32Array ([x0, y0, p0, x1, y1, p1, ...])
 */
export function packPointsToFloat32(points: Point[]): Float32Array {
  const arr = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    const base = i * 3;
    arr[base] = Math.round(pt[0] * 100) / 100;
    arr[base + 1] = Math.round(pt[1] * 100) / 100;
    arr[base + 2] = Math.round((pt[2] ?? 0.5) * 1000) / 1000;
  }
  return arr;
}

/**
 * C2: Unpack Float32Array or flat number[] back to Point[] when needed by perfect-freehand
 */
export function unpackFloat32ToPoints(flat: Float32Array | number[]): Point[] {
  const count = Math.floor(flat.length / 3);
  const pts: Point[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const base = i * 3;
    pts[i] = [flat[base], flat[base + 1], flat[base + 2]];
  }
  return pts;
}

/**
 * Retrieve points from a Stroke, supporting both compact `flatPoints` (Float32Array/number[]) and legacy `points`
 */
export function getStrokePoints(stroke: Stroke): Point[] {
  if (stroke.points && stroke.points.length > 0) {
    return stroke.points;
  }
  const cachedTyped = runtimeFloat32Cache.get(stroke);
  if (cachedTyped) {
    return unpackFloat32ToPoints(cachedTyped);
  }
  if (stroke.flatPoints && stroke.flatPoints.length >= 3) {
    if (!(stroke.flatPoints instanceof Float32Array)) {
      const f32 = new Float32Array(stroke.flatPoints);
      runtimeFloat32Cache.set(stroke, f32);
      return unpackFloat32ToPoints(f32);
    }
    return unpackFloat32ToPoints(stroke.flatPoints);
  }
  return [];
}

/**
 * C2: Create a memory-optimized Stroke object using Float32Array & flat numeric array
 */
export function createCompactStroke(
  id: string,
  tool: 'pen' | 'highlighter',
  color: string,
  size: number,
  opacity: number,
  points: Point[]
): Stroke {
  const f32 = packPointsToFloat32(points);
  // Keep flat number[] for JSON serialization compatibility while storing Float32Array in WeakMap
  const flatArray = Array.from(f32);
  const stroke: Stroke = {
    id,
    tool,
    color,
    size,
    opacity,
    points, // preserved for backward compatibility
    flatPoints: flatArray,
    createdAt: Date.now(),
  };
  runtimeFloat32Cache.set(stroke, f32);
  return stroke;
}

export function getPenStrokeOptions(size: number, isSlidingSegment = false): StrokeOptions {
  return {
    size,
    thinning: 0.45,       // subtle pressure sensitivity
    smoothing: 0.65,      // smooth jitter
    streamline: 0.45,     // stabilizes stroke direction
    easing: (t: number) => Math.sin((t * Math.PI) / 2),
    start: {
      taper: isSlidingSegment ? 0 : 4,
      cap: true,
    },
    end: {
      taper: 6,
      cap: true,
    },
  };
}

export function getHighlighterStrokeOptions(size: number): StrokeOptions {
  return {
    size,
    thinning: 0.08,      // consistent width like chisel marker
    smoothing: 0.7,
    streamline: 0.5,
    start: {
      taper: 0,
      cap: true,
    },
    end: {
      taper: 0,
      cap: true,
    },
  };
}

export function generateStrokeOutline(
  points: Point[],
  tool: 'pen' | 'highlighter',
  size: number,
  isSlidingSegment = false
): number[][] {
  if (points.length === 0) return [];

  const options =
    tool === 'pen'
      ? getPenStrokeOptions(size, isSlidingSegment)
      : getHighlighterStrokeOptions(size);
  return getStroke(points, options);
}

/**
 * Get cached polygon outline for a committed stroke so Layer 2 redraws never recompute `getStroke()`
 */
export function getCachedStrokeOutline(stroke: Stroke): number[][] {
  let outline = committedOutlineCache.get(stroke);
  if (!outline) {
    const pts = getStrokePoints(stroke);
    outline = generateStrokeOutline(pts, stroke.tool, stroke.size);
    committedOutlineCache.set(stroke, outline);
  }
  return outline;
}

export function drawOutline(
  ctx: CanvasRenderingContext2D,
  outline: number[][],
  color: string,
  opacity: number = 1,
  isHighlighter: boolean = false
) {
  if (!outline || outline.length === 0) return;

  ctx.save();
  if (isHighlighter) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = opacity;
  } else {
    ctx.globalAlpha = opacity;
  }
  ctx.fillStyle = color;

  ctx.beginPath();
  const first = outline[0];
  ctx.moveTo(first[0], first[1]);

  for (let i = 1; i < outline.length; i++) {
    const prev = outline[i - 1];
    const curr = outline[i];
    const midX = (prev[0] + curr[0]) / 2;
    const midY = (prev[1] + curr[1]) / 2;
    ctx.quadraticCurveTo(prev[0], prev[1], midX, midY);
  }

  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function getSvgPathFromStroke(outline: number[][]): string {
  if (!outline || outline.length === 0) return '';

  const d: (string | number)[] = ['M', outline[0][0], outline[0][1], 'Q'];
  for (let i = 0; i < outline.length; i++) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % outline.length];
    d.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  d.push('Z');
  return d.join(' ');
}

// Bounding Box check and collision for Stroke Eraser
export function isStrokeIntersectingPoint(
  stroke: Stroke,
  targetX: number,
  targetY: number,
  radius: number
): boolean {
  const pts = getStrokePoints(stroke);
  if (pts.length === 0) return false;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const pt of pts) {
    if (pt[0] < minX) minX = pt[0];
    if (pt[0] > maxX) maxX = pt[0];
    if (pt[1] < minY) minY = pt[1];
    if (pt[1] > maxY) maxY = pt[1];
  }

  const effectiveRadius = radius + stroke.size / 2;
  if (
    targetX < minX - effectiveRadius ||
    targetX > maxX + effectiveRadius ||
    targetY < minY - effectiveRadius ||
    targetY > maxY + effectiveRadius
  ) {
    return false;
  }

  const r2 = effectiveRadius * effectiveRadius;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const dx = p1[0] - targetX;
    const dy = p1[1] - targetY;
    if (dx * dx + dy * dy <= r2) {
      return true;
    }

    if (i > 0) {
      const p0 = pts[i - 1];
      if (distToSegmentSquared(targetX, targetY, p0[0], p0[1], p1[0], p1[1]) <= r2) {
        return true;
      }
    }
  }

  return false;
}

function distToSegmentSquared(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}
