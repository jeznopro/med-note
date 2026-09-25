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

export function getPenStrokeOptions(size: number): StrokeOptions {
  return {
    size,
    thinning: 0.45,       // subtle pressure sensitivity
    smoothing: 0.65,      // smooth jitter
    streamline: 0.45,     // stabilizes stroke direction
    easing: (t: number) => Math.sin((t * Math.PI) / 2),
    start: {
      taper: 4,
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

export function generateStrokeOutline(points: Point[], tool: 'pen' | 'highlighter', size: number): number[][] {
  if (points.length === 0) return [];
  
  const options = tool === 'pen' ? getPenStrokeOptions(size) : getHighlighterStrokeOptions(size);
  return getStroke(points, options);
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
  if (stroke.points.length === 0) return false;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const pt of stroke.points) {
    if (pt[0] < minX) minX = pt[0];
    if (pt[0] > maxX) maxX = pt[0];
    if (pt[1] < minY) minY = pt[1];
    if (pt[1] > maxY) maxY = pt[1];
  }

  const effectiveRadius = radius + (stroke.size / 2);
  if (
    targetX < minX - effectiveRadius ||
    targetX > maxX + effectiveRadius ||
    targetY < minY - effectiveRadius ||
    targetY > maxY + effectiveRadius
  ) {
    return false;
  }

  const r2 = effectiveRadius * effectiveRadius;
  for (let i = 0; i < stroke.points.length; i++) {
    const p1 = stroke.points[i];
    const dx = p1[0] - targetX;
    const dy = p1[1] - targetY;
    if (dx * dx + dy * dy <= r2) {
      return true;
    }

    if (i > 0) {
      const p0 = stroke.points[i - 1];
      if (distToSegmentSquared(targetX, targetY, p0[0], p0[1], p1[0], p1[1]) <= r2) {
        return true;
      }
    }
  }

  return false;
}

function distToSegmentSquared(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}
