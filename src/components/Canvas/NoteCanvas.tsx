import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Page, Stroke, Point, CanvasTransform } from '../../types/document';
import type { ToolState } from '../../types/tools';
import { generateStrokeOutline, drawOutline, isStrokeIntersectingPoint } from '../../engine/stroke';
import { renderPageBackground } from '../../engine/pageTemplate';
import { PageHistory } from '../../engine/history';
import { getPdfDocument, renderPdfPageToContext, cancelActiveRender } from '../../pdf/pdfLoader';
import { Plus, Sparkles, ArrowRight } from 'lucide-react';

interface NoteCanvasProps {
  page: Page;
  notebookId?: string;
  pdfDataUrl?: string;
  toolState: ToolState;
  transform: CanvasTransform;
  isDarkMode: boolean;
  history: PageHistory;
  onPageChange: (updatedPage: Page) => void;
  onHistoryChange: () => void;
  isLastPage?: boolean;
  onAutoAddNewPage?: (navigateNow?: boolean) => void;
  isPencilMode?: boolean;
}

export const NoteCanvas: React.FC<NoteCanvasProps> = ({
  page,
  notebookId,
  pdfDataUrl,
  toolState,
  transform,
  isDarkMode,
  history,
  onPageChange,
  onHistoryChange,
  isLastPage = false,
  onAutoAddNewPage,
  isPencilMode = true,
}) => {
  const [showAutoPageToast, setShowAutoPageToast] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Only first 2 pages initialize active; subsequent pages wait for viewport intersection
  const [isInViewport, setIsInViewport] = useState(() => (page.pageNumber ?? 1) <= 2);

  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const draftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorDotRef = useRef<HTMLDivElement | null>(null);

  const isDrawingRef = useRef(false);
  const isFingerPanningRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  const erasedStrokesInSessionRef = useRef<Stroke[]>([]);
  const panStartRef = useRef<{ clientX: number; clientY: number; scrollLeft: number; scrollTop: number } | null>(null);

  const { width, height, template, strokes, pdfPageNumber } = page;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // Viewport intersection observer with generous threshold for pre-rendering
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInViewport(entry.isIntersecting);
      },
      { rootMargin: '800px 0px 800px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 1. Redraw Background Layer (PDF Page OR Template lines/grid/dots)
  const redrawBackground = useCallback(async () => {
    if (!isInViewport) return;
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    if (pdfPageNumber && (pdfDataUrl || notebookId)) {
      try {
        const pdfDoc = await getPdfDocument(pdfDataUrl || '', notebookId);
        await renderPdfPageToContext(pdfDoc, pdfPageNumber, canvas, width, height, dpr, notebookId);
      } catch (err) {
        console.error('Failed to render PDF page on canvas:', err);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.scale(dpr, dpr);
          // Always fill clean white paper for PDF documents to prevent pitch-black screen
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          ctx.fillStyle = '#334155';
          ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Trang PDF ${pdfPageNumber}`, width / 2, height / 2 - 24);

          ctx.fillStyle = '#64748B';
          ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText('Đang nạp hoặc cần đồng bộ file PDF gốc từ Cloud...', width / 2, height / 2 + 8);

          ctx.fillStyle = '#94A3B8';
          ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText('(Nếu dùng thiết bị mới, vui lòng bấm biểu tượng Cloud để tải dữ liệu)', width / 2, height / 2 + 32);
          ctx.restore();
        }
      }
    } else {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);
        renderPageBackground(ctx, width, height, template, isDarkMode);
        ctx.restore();
      }
    }
  }, [width, height, template, isDarkMode, dpr, pdfDataUrl, pdfPageNumber, notebookId, isInViewport]);

  // 2. Redraw Committed Ink Layer (Highlighters then Pens)
  const redrawInk = useCallback(() => {
    if (!isInViewport) return;
    const canvas = inkCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // Pass 1: Highlighters (drawn underneath pen strokes with multiply blend)
    for (const stroke of strokes) {
      if (stroke.tool === 'highlighter') {
        const outline = generateStrokeOutline(stroke.points, 'highlighter', stroke.size);
        drawOutline(ctx, outline, stroke.color, stroke.opacity, true);
      }
    }

    // Pass 2: Pen strokes (opaque vector lines with pressure sensitivity)
    for (const stroke of strokes) {
      if (stroke.tool === 'pen') {
        const outline = generateStrokeOutline(stroke.points, 'pen', stroke.size);
        drawOutline(ctx, outline, stroke.color, stroke.opacity, false);
      }
    }

    ctx.restore();
  }, [strokes, width, height, dpr, isInViewport]);

  // Handle render cancellation when moving out of viewport, or re-render when entering
  useEffect(() => {
    if (!isInViewport) {
      if (bgCanvasRef.current) {
        cancelActiveRender(bgCanvasRef.current);
      }
    } else {
      redrawBackground();
      redrawInk();
    }
  }, [isInViewport, redrawBackground, redrawInk]);

  // Transform client coordinates to page canvas space
  const getCanvasPointFromEvent = useCallback(
    (clientX: number, clientY: number, pressure: number, pointerType: string): Point => {
      const canvas = draftCanvasRef.current;
      if (!canvas) return [0, 0, 0.5];

      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      let p = pressure;
      if (pointerType === 'mouse') {
        p = p > 0 ? p : 0.5;
      } else if (p === 0) {
        p = 0.5;
      }

      return [x, y, p];
    },
    [width, height]
  );

  const getCanvasPoint = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): Point => {
      return getCanvasPointFromEvent(e.clientX, e.clientY, e.pressure, e.pointerType);
    },
    [getCanvasPointFromEvent]
  );

  // Update position of the custom circular pen dot cursor
  const updateCursorDotPosition = useCallback((x: number, y: number, pointerType?: string) => {
    if (cursorDotRef.current) {
      if (toolState.currentTool === 'pan' || isFingerPanningRef.current || (isPencilMode && pointerType === 'touch')) {
        cursorDotRef.current.style.display = 'none';
      } else {
        cursorDotRef.current.style.display = 'block';
        cursorDotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    }
  }, [toolState.currentTool, isPencilMode]);

  // Pointer Down (Start stroke, erase, or pan drag-scroll)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const isFinger = e.pointerType === 'touch';

    // 1. Apple Pencil mode: Finger automatically scrolls the document (Palm Rejection)
    if (isPencilMode && isFinger) {
      const scrollEl = document.getElementById('editor-main-container');
      if (scrollEl) {
        panStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          scrollLeft: scrollEl.scrollLeft,
          scrollTop: scrollEl.scrollTop,
        };
        isDrawingRef.current = true;
        isFingerPanningRef.current = true;
        const canvas = draftCanvasRef.current;
        if (canvas) canvas.setPointerCapture(e.pointerId);
      }
      return;
    }

    // 2. Pan tool explicitly active
    if (toolState.currentTool === 'pan') {
      const scrollEl = document.getElementById('editor-main-container');
      if (scrollEl) {
        panStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          scrollLeft: scrollEl.scrollLeft,
          scrollTop: scrollEl.scrollTop,
        };
        isDrawingRef.current = true;
        isFingerPanningRef.current = false;
        const canvas = draftCanvasRef.current;
        if (canvas) canvas.setPointerCapture(e.pointerId);
      }
      return;
    }

    // 3. Drawing / Writing with Apple Pencil, Mouse, or finger (when Pencil Mode is disabled)
    e.preventDefault();

    const canvas = draftCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    isDrawingRef.current = true;
    isFingerPanningRef.current = false;
    const pt = getCanvasPoint(e);
    updateCursorDotPosition(pt[0], pt[1], e.pointerType);

    if (toolState.currentTool === 'eraser') {
      erasedStrokesInSessionRef.current = [];
      eraseAtPoint(pt[0], pt[1]);
    } else {
      currentPointsRef.current = [pt];
      renderDraftStroke();
    }
  };

  // Erase logic
  const eraseAtPoint = (x: number, y: number) => {
    const eraserRadius = toolState.eraser.size;
    const remainingStrokes: Stroke[] = [];
    const newlyErased: Stroke[] = [];

    for (const stroke of page.strokes) {
      if (isStrokeIntersectingPoint(stroke, x, y, eraserRadius)) {
        newlyErased.push(stroke);
      } else {
        remainingStrokes.push(stroke);
      }
    }

    if (newlyErased.length > 0) {
      erasedStrokesInSessionRef.current.push(...newlyErased);
      onPageChange({
        ...page,
        strokes: remainingStrokes,
      });
    }
  };

  // Render the in-progress stroke on the Draft Canvas (ultra low-latency)
  const renderDraftStroke = () => {
    const canvas = draftCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    const points = currentPointsRef.current;
    if (points.length > 0 && toolState.currentTool !== 'eraser' && toolState.currentTool !== 'pan') {
      const tool = toolState.currentTool === 'highlighter' ? 'highlighter' : 'pen';
      const size = tool === 'highlighter' ? toolState.highlighter.size : toolState.pen.size;
      const color = tool === 'highlighter' ? toolState.highlighter.color : toolState.pen.color;
      const opacity = tool === 'highlighter' ? toolState.highlighter.opacity : 1;

      const outline = generateStrokeOutline(points, tool, size);
      drawOutline(ctx, outline, color, opacity, tool === 'highlighter');
    }

    ctx.restore();
  };

  // Pointer Move (Collect coalesced events for 120Hz-240Hz styluses + update cursor dot + Pan drag)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    updateCursorDotPosition(pt[0], pt[1], e.pointerType);

    if (!isDrawingRef.current) return;

    if (isFingerPanningRef.current || toolState.currentTool === 'pan') {
      if (panStartRef.current) {
        const scrollEl = document.getElementById('editor-main-container');
        if (scrollEl) {
          const dx = e.clientX - panStartRef.current.clientX;
          const dy = e.clientY - panStartRef.current.clientY;
          scrollEl.scrollLeft = panStartRef.current.scrollLeft - dx;
          scrollEl.scrollTop = panStartRef.current.scrollTop - dy;
        }
      }
      return;
    }

    e.preventDefault();

    if (toolState.currentTool === 'eraser') {
      eraseAtPoint(pt[0], pt[1]);
      return;
    }

    const nativeEv = e.nativeEvent as unknown as { getCoalescedEvents?: () => PointerEvent[] };
    const coalesced = typeof nativeEv.getCoalescedEvents === 'function'
      ? nativeEv.getCoalescedEvents()
      : [e.nativeEvent as PointerEvent];

    for (const ev of coalesced) {
      const subPt = getCanvasPointFromEvent(ev.clientX, ev.clientY, ev.pressure, ev.pointerType);
      currentPointsRef.current.push(subPt);
    }

    renderDraftStroke();
  };

  // Pointer Up (Commit stroke or end pan)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const wasFingerPanning = isFingerPanningRef.current;
    isFingerPanningRef.current = false;
    panStartRef.current = null;

    const canvas = draftCanvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (wasFingerPanning || toolState.currentTool === 'pan') return;

    if (toolState.currentTool === 'eraser') {
      if (erasedStrokesInSessionRef.current.length > 0) {
        history.push({
          type: 'REMOVE_STROKES',
          strokes: [...erasedStrokesInSessionRef.current],
        });
        onHistoryChange();
        erasedStrokesInSessionRef.current = [];
      }
      return;
    }

    const points = [...currentPointsRef.current];
    currentPointsRef.current = [];

    // Clear draft canvas
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }

    if (points.length < 2) return;

    const isHighlighter = toolState.currentTool === 'highlighter';
    const newStroke: Stroke = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tool: isHighlighter ? 'highlighter' : 'pen',
      color: isHighlighter ? toolState.highlighter.color : toolState.pen.color,
      size: isHighlighter ? toolState.highlighter.size : toolState.pen.size,
      opacity: isHighlighter ? toolState.highlighter.opacity : 1,
      points,
      createdAt: Date.now(),
    };

    history.push({
      type: 'ADD_STROKE',
      stroke: newStroke,
    });
    onHistoryChange();

    onPageChange({
      ...page,
      strokes: [...page.strokes, newStroke],
    });

    // Check if stroke was drawn near the bottom of the page on the last page
    if (isLastPage && onAutoAddNewPage) {
      const isNearBottom = points.some((pt) => pt[1] >= height - 100);
      const isAtBottomEdge = points.some((pt) => pt[1] >= height - 40);

      if (isNearBottom) {
        if (isAtBottomEdge) {
          setShowAutoPageToast(true);
          setTimeout(() => {
            onAutoAddNewPage(true);
            setShowAutoPageToast(false);
          }, 600);
        } else {
          onAutoAddNewPage(false);
          setShowAutoPageToast(true);
          setTimeout(() => setShowAutoPageToast(false), 3500);
        }
      }
    }
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    updateCursorDotPosition(pt[0], pt[1], e.pointerType);
  };

  const handlePointerLeave = () => {
    if (cursorDotRef.current) {
      cursorDotRef.current.style.display = 'none';
    }
  };

  // Compute cursor visual style matching the current tool, color, and size
  const isPen = toolState.currentTool === 'pen';
  const isHighlighter = toolState.currentTool === 'highlighter';
  const isEraser = toolState.currentTool === 'eraser';

  let cursorSize = 6;
  let cursorBg = toolState.pen.color;
  let cursorBorder = 'none';
  let cursorShadow = isDarkMode
    ? '0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 0 2px rgba(0, 0, 0, 0.7)'
    : '0 0 0 1px rgba(255, 255, 255, 0.95), 0 0 0 2px rgba(0, 0, 0, 0.4)';
  let cursorOpacity = 1;

  if (isPen) {
    cursorSize = Math.max(5, toolState.pen.size);
    cursorBg = toolState.pen.color;
    cursorBorder = 'none';
    cursorOpacity = 1;
  } else if (isHighlighter) {
    cursorSize = toolState.highlighter.size;
    cursorBg = toolState.highlighter.color;
    cursorBorder = `1.5px solid ${toolState.highlighter.color}`;
    cursorShadow = '0 0 0 1px rgba(0, 0, 0, 0.2)';
    cursorOpacity = 0.65;
  } else if (isEraser) {
    cursorSize = toolState.eraser.size * 2;
    cursorBg = 'rgba(239, 68, 68, 0.12)';
    cursorBorder = '1.5px solid rgba(239, 68, 68, 0.85)';
    cursorShadow = '0 0 0 1px rgba(255, 255, 255, 0.5)';
    cursorOpacity = 1;
  }

  const scaledWidth = Math.round(width * transform.scale);
  const scaledHeight = Math.round(height * transform.scale);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center select-none"
      style={{
        width: `${scaledWidth}px`,
        minWidth: `${scaledWidth}px`,
      }}
    >
      {/* Real-dimension layout viewport matching the exact scaled paper size */}
      <div
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          minWidth: `${scaledWidth}px`,
          minHeight: `${scaledHeight}px`,
        }}
        className="relative overflow-visible"
      >
        {/* Scaled paper container with transformOrigin: 0 0 */}
        <div
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transform: `scale(${transform.scale}) translate(${transform.offsetX}px, ${transform.offsetY}px)`,
            transformOrigin: '0 0',
          }}
        >
          {/* Paper Sheet Container with GoodNotes-style elevation */}
          <div
            className={`relative shadow-2xl transition-shadow ${
              isDarkMode
                ? 'shadow-black/60 ring-1 ring-zinc-800 bg-[#18181B]'
                : 'shadow-slate-400/30 ring-1 ring-slate-200 bg-white'
            }`}
            style={{
              width: `${width}px`,
              height: `${height}px`,
              touchAction: toolState.currentTool === 'pan' ? 'pan-x pan-y' : 'none',
            }}
          >
            {/* Layer 1: Background Canvas (PDF Page or Template lines, grid, dots) */}
            <canvas
              ref={bgCanvasRef}
              width={width * dpr}
              height={height * dpr}
              className="absolute inset-0 w-full h-full pointer-events-none rounded-xs"
            />

            {/* Layer 2: Ink Canvas (Committed Strokes) */}
            <canvas
              ref={inkCanvasRef}
              width={width * dpr}
              height={height * dpr}
              className="absolute inset-0 w-full h-full pointer-events-none rounded-xs"
            />

            {/* Dynamic Pen Tip Dot Cursor (Same color & size as active pen) */}
            {toolState.currentTool !== 'pan' && (
              <div
                ref={cursorDotRef}
                className="pointer-events-none absolute top-0 left-0 rounded-full z-20 will-change-transform"
                style={{
                  display: 'none',
                  width: `${cursorSize}px`,
                  height: `${cursorSize}px`,
                  marginLeft: `-${cursorSize / 2}px`,
                  marginTop: `-${cursorSize / 2}px`,
                  backgroundColor: cursorBg,
                  border: cursorBorder,
                  boxShadow: cursorShadow,
                  opacity: cursorOpacity,
                  transition: 'width 0.12s ease, height 0.12s ease, background-color 0.12s ease',
                }}
              />
            )}

            {/* Layer 3: Draft / Interactive Canvas (Pointer events & active stroke) */}
            <canvas
              ref={draftCanvasRef}
              width={width * dpr}
              height={height * dpr}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerEnter={handlePointerEnter}
              onPointerLeave={handlePointerLeave}
              className="absolute inset-0 w-full h-full rounded-xs"
              style={{
                touchAction: toolState.currentTool === 'pan' || isPencilMode ? 'pan-x pan-y' : 'none',
                cursor:
                  toolState.currentTool === 'pan'
                    ? isDrawingRef.current
                      ? 'grabbing'
                      : 'grab'
                    : isPencilMode && isDrawingRef.current && isFingerPanningRef.current
                    ? 'grabbing'
                    : 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* If this is the last page, show the GoodNotes-style pull-to-add / next-page prompt */}
      {isLastPage && (
        <div className="w-full flex flex-col items-center gap-2 pt-8 pb-14 select-none">
          <button
            onClick={() => onAutoAddNewPage?.(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 shadow-md hover:shadow-lg hover:border-blue-500 text-xs font-bold text-blue-600 dark:text-blue-400 cursor-pointer transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tạo & viết tiếp trang mới (Trang {page.pageNumber + 1})</span>
          </button>
          <span className="text-[11px] text-slate-400">
            Tự động tạo trang mới khi viết đến gần cuối trang
          </span>
        </div>
      )}

      {/* Floating Auto-Add Toast Notification */}
      {showAutoPageToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 dark:bg-zinc-100/90 text-white dark:text-slate-900 px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Đã tự động tạo trang mới</span>
          <button
            onClick={() => {
              onAutoAddNewPage?.(true);
              setShowAutoPageToast(false);
            }}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-500 cursor-pointer text-[11px] transition-colors"
          >
            <span>Sang trang mới</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
