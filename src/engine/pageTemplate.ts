import type { PageTemplate } from '../types/document';

export function renderPageBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: PageTemplate,
  isDarkMode: boolean = false
) {
  const paperColor = isDarkMode ? '#18181B' : '#FFFFFF';
  ctx.fillStyle = paperColor;
  ctx.fillRect(0, 0, width, height);

  const lineColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)';
  const marginColor = isDarkMode ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.35)';
  const dotColor = isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.18)';

  ctx.save();

  if (template === 'ruled') {
    const lineSpacing = 32;
    const topMargin = 80;
    const leftMargin = 72;

    ctx.strokeStyle = marginColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftMargin, 0);
    ctx.lineTo(leftMargin, height);
    ctx.stroke();

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    for (let y = topMargin; y < height - 20; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (template === 'grid') {
    const gridSize = 24;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;

    for (let x = gridSize; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(y, 0);
      ctx.lineTo(y, height);
      ctx.stroke();
    }
  } else if (template === 'dot') {
    const dotSpacing = 24;
    const dotRadius = 1.2;
    ctx.fillStyle = dotColor;

    for (let x = dotSpacing; x < width; x += dotSpacing) {
      for (let y = dotSpacing; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (template === 'cornell') {
    const cueColumnWidth = width * 0.28;
    const headerHeight = 70;
    const summaryHeight = 120;
    const summaryY = height - summaryHeight;

    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(width, headerHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, summaryY);
    ctx.lineTo(width, summaryY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cueColumnWidth, headerHeight);
    ctx.lineTo(cueColumnWidth, summaryY);
    ctx.stroke();

    ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
    ctx.font = '11px sans-serif';
    ctx.fillText('CUE / KEY POINTS', 16, headerHeight + 20);
    ctx.fillText('LECTURE NOTES', cueColumnWidth + 16, headerHeight + 20);
    ctx.fillText('SUMMARY', 16, summaryY + 24);

    const lineSpacing = 28;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 0.8;
    for (let y = headerHeight + 35; y < summaryY - 10; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(cueColumnWidth, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}
