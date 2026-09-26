import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Page, Stroke, Point, CanvasTransform } from '../../types/document';
import type { ToolState } from '../../types/tools';
import {
  generateStrokeOutline,
  getCachedStrokeOutline,
  createCompactStroke,
  drawOutline,
  isStrokeIntersectingPoint,
} from '../../engine/stroke';
import { renderPageBackground } from '../../engine/pageTemplate';
import { PageHistory } from '../../engine/history';
import {
  getPdfDocument,
  renderPdfPageToContext,
  cancelActiveRender,
  cleanupPdfPage,
} from '../../pdf/pdfLoader';
import { Plus, Sparkles, ArrowRight, FileText, RefreshCw, Upload } from 'lucide-react';

interface NoteCanvasProps {
  page: Page;
  notebookId?: string;
  notebookTitle?: string;
  pdfFileName?: string;
  drivePdfFileId?: string;
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

// Sliding window constants for ultra-long strokes (B2)
const SLIDING_WINDOW_THRESHOLD = 150;
const SLIDING_WINDOW_TAIL = 75;
const SLIDING_WINDOW_OVERLAP = 12;

const NoteCanvasComponent: React.FC<NoteCanvasProps> = ({
  page,
  notebookId,
  notebookTitle,
  pdfFileName,
  drivePdfFileId,
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
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [isRetryingPdf, setIsRetryingPdf] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isInViewport, setIsInViewport] = useState(() => (page.pageNumber ?? 1) <= 2);

  // A2: Keep canvas references and renderTasks in useRef Maps, never in React state
  const renderTasksRef = useRef(new Map<number, { cancel: () => void }>());
  const canvasRefs = useRef(new Map<number, HTMLCanvasElement>());

  // B1: 3 Distinct Canvas Layers
  // Layer 1 (Bottom): PDF & Page Template background
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Layer 2 (Middle): Committed strokes (only redraws on stroke add/remove)
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Layer 3 (Top): Live active stroke (redraws via RAF during pen movement, clears immediately on pointerup)
  const draftCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Offscreen baked buffer for sliding-window long strokes on Layer 3 (B2)
  const bakedLiveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bakedPointCountRef = useRef<number>(0);

  const cursorDotRef = useRef<HTMLDivElement | null>(null);

  const isDrawingRef = useRef(false);
  const isFingerPanningRef = useRef(false);
  const currentPointsRef = useRef<Point[]>([]);
  // B2: RAF batching queue for coalesced high-frequency stylus events (120Hz-240Hz)
  const pendingPointsRef = useRef<Point[]>([]);
  const rafIdRef = useRef<number | null>(null);

  // B1: Track incremental stroke commit on Layer 2 so we don't redraw all historical strokes on pen lift
  const lastIncrementalStrokeIdRef = useRef<string | null>(null);
  const prevStrokesCountRef = useRef<number>(0);

  // B3: Practical hardware palm rejection state (pen active + 500ms cooldown after pen lift)
  const palmRejectionActiveRef = useRef<boolean>(false);
  const palmRejectionTimeoutRef = useRef<number | null>(null);

  const erasedStrokesInSessionRef = useRef<Stroke[]>([]);
  const panStartRef = useRef<{ clientX: number; clientY: number; scrollLeft: number; scrollTop: number } | null>(null);

  const { width, height, template, strokes, pdfPageNumber } = page;
  // A4: Cap DPI to max 2.0 (or 1.5 on mobile) to avoid excessive GPU texture allocation
  const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 768;
  const dpr = Math.min(rawDpr, isMobileScreen ? 1.5 : 2.0);

  // Register bgCanvas into canvasRefs Map (A2)
  const setBgCanvasRef = useCallback(
    (el: HTMLCanvasElement | null) => {
      bgCanvasRef.current = el;
      const pNum = pdfPageNumber || page.pageNumber;
      if (el) {
        canvasRefs.current.set(pNum, el);
      } else {
        canvasRefs.current.delete(pNum);
      }
    },
    [pdfPageNumber, page.pageNumber]
  );

  // Viewport intersection observer
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

  // A4/A5: Cleanup pdf.js render tasks, page memory, and pending RAF/timeouts on unmount or page change
  useEffect(() => {
    const currentRenderTasks = renderTasksRef.current;
    return () => {
      if (pdfPageNumber) {
        currentRenderTasks.get(pdfPageNumber)?.cancel();
        currentRenderTasks.delete(pdfPageNumber);
        cleanupPdfPage(notebookId, pdfPageNumber);
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (palmRejectionTimeoutRef.current !== null) {
        window.clearTimeout(palmRejectionTimeoutRef.current);
        palmRejectionTimeoutRef.current = null;
      }
    };
  }, [pdfPageNumber, notebookId]);

  // Layer 1: Redraw Background Layer (PDF Page OR Template lines/grid/dots)
  const redrawBackground = useCallback(async () => {
    if (!isInViewport) return;
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    if (pdfPageNumber && (pdfDataUrl || notebookId)) {
      // 1. Immediately paint clean crisp white paper so it is NEVER dark or empty
      const initialCtx = canvas.getContext('2d');
      if (initialCtx) {
        initialCtx.save();
        initialCtx.setTransform(1, 0, 0, 1, 0, 0);
        initialCtx.clearRect(0, 0, canvas.width, canvas.height);
        initialCtx.scale(dpr, dpr);
        initialCtx.fillStyle = '#FFFFFF';
        initialCtx.fillRect(0, 0, width, height);

        initialCtx.fillStyle = '#64748B';
        initialCtx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        initialCtx.textAlign = 'center';
        initialCtx.fillText(`Đang nạp Trang ${pdfPageNumber}...`, width / 2, height / 2);
        initialCtx.restore();
      }

      try {
        const pdfDoc = await getPdfDocument(
          pdfDataUrl || '',
          notebookId,
          notebookTitle,
          pdfFileName,
          drivePdfFileId
        );
        await renderPdfPageToContext(
          pdfDoc,
          pdfPageNumber,
          canvas,
          width,
          height,
          dpr,
          notebookId,
          (task) => {
            renderTasksRef.current.set(pdfPageNumber, task);
          }
        );
        setPdfLoadError(false);
      } catch (err) {
        console.warn('Failed to render PDF page on canvas:', err);
        setPdfLoadError(true);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.scale(dpr, dpr);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
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
  }, [width, height, template, isDarkMode, dpr, pdfDataUrl, pdfPageNumber, notebookId, notebookTitle, pdfFileName, drivePdfFileId, isInViewport]);

  // Layer 2: Redraw Committed Ink Layer (Highlighters then Pens)
  const redrawInk = useCallback(
    (forceFullRedraw = false) => {
      if (!isInViewport) return;
      const canvas = inkCanvasRef.current;
      if (!canvas) return;

      // B1 Optimization: If the only change to `strokes` is the single pen stroke we JUST drew incrementally onto Layer 2,
      // skip clearing and redrawing the entire history of strokes!
      if (
        !forceFullRedraw &&
        strokes.length === prevStrokesCountRef.current + 1 &&
        strokes.length > 0 &&
        strokes[strokes.length - 1].id === lastIncrementalStrokeIdRef.current &&
        strokes[strokes.length - 1].tool === 'pen'
      ) {
        prevStrokesCountRef.current = strokes.length;
        return;
      }

      prevStrokesCountRef.current = strokes.length;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Pass 1: Highlighters (drawn underneath pen strokes with multiply blend, using WeakMap cached outlines)
      for (const stroke of strokes) {
        if (stroke.tool === 'highlighter') {
          const outline = getCachedStrokeOutline(stroke);
          drawOutline(ctx, outline, stroke.color, stroke.opacity, true);
        }
      }

      // Pass 2: Pen strokes (opaque vector lines with pressure sensitivity, using WeakMap cached outlines)
      for (const stroke of strokes) {
        if (stroke.tool === 'pen') {
          const outline = getCachedStrokeOutline(stroke);
          drawOutline(ctx, outline, stroke.color, stroke.opacity, false);
        }
      }

      ctx.restore();
    },
    [strokes, dpr, isInViewport]
  );

  // Trigger Layer 1 when background dependencies change
  useEffect(() => {
    if (!isInViewport) {
      if (bgCanvasRef.current) {
        cancelActiveRender(bgCanvasRef.current);
      }
    } else {
      redrawBackground();
    }
  }, [isInViewport, redrawBackground]);

  // Trigger Layer 2 when committed strokes or viewport visibility change
  useEffect(() => {
    if (isInViewport) {
      redrawInk();
    }
  }, [isInViewport, redrawInk]);

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
  const updateCursorDotPosition = useCallback(
    (x: number, y: number, pointerType?: string) => {
      if (cursorDotRef.current) {
        if (
          toolState.currentTool === 'pan' ||
          isFingerPanningRef.current ||
          (pointerType === 'touch' && (isPencilMode || palmRejectionActiveRef.current))
        ) {
          cursorDotRef.current.style.display = 'none';
        } else {
          cursorDotRef.current.style.display = 'block';
          cursorDotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        }
      }
    },
    [toolState.currentTool, isPencilMode]
  );

  // B2: Flush pending coalesced points and render live stroke on Layer 3 inside requestAnimationFrame
  const flushLiveStroke = useCallback(() => {
    rafIdRef.current = null;

    if (pendingPointsRef.current.length > 0) {
      currentPointsRef.current.push(...pendingPointsRef.current);
      pendingPointsRef.current = [];
    }

    const canvas = draftCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const points = currentPointsRef.current;
    if (points.length === 0 || toolState.currentTool === 'eraser' || toolState.currentTool === 'pan') {
      return;
    }

    const tool = toolState.currentTool === 'highlighter' ? 'highlighter' : 'pen';
    const size = tool === 'highlighter' ? toolState.highlighter.size : toolState.pen.size;
    const color = tool === 'highlighter' ? toolState.highlighter.color : toolState.pen.color;
    const opacity = tool === 'highlighter' ? toolState.highlighter.opacity : 1;

    // B2 Sliding Window Optimization:
    // For very long continuous pen strokes (> 150 points), bake stabilized earlier segments into an offscreen buffer
    // and only run `perfect-freehand` `getStroke()` on the recent sliding window tail!
    if (tool === 'pen' && points.length - bakedPointCountRef.current > SLIDING_WINDOW_THRESHOLD) {
      if (!bakedLiveCanvasRef.current) {
        const off = document.createElement('canvas');
        off.width = canvas.width;
        off.height = canvas.height;
        bakedLiveCanvasRef.current = off;
      }
      const bakedCanvas = bakedLiveCanvasRef.current;
      if (bakedCanvas.width !== canvas.width || bakedCanvas.height !== canvas.height) {
        bakedCanvas.width = canvas.width;
        bakedCanvas.height = canvas.height;
      }
      const bakedCtx = bakedCanvas.getContext('2d');
      if (bakedCtx) {
        const freezeEnd = points.length - SLIDING_WINDOW_TAIL;
        const segmentStart = Math.max(0, bakedPointCountRef.current - SLIDING_WINDOW_OVERLAP);
        const segmentPoints = points.slice(segmentStart, freezeEnd + SLIDING_WINDOW_OVERLAP);
        const segOutline = generateStrokeOutline(segmentPoints, 'pen', size, segmentStart > 0);

        bakedCtx.save();
        bakedCtx.setTransform(1, 0, 0, 1, 0, 0);
        bakedCtx.scale(dpr, dpr);
        drawOutline(bakedCtx, segOutline, color, opacity, false);
        bakedCtx.restore();

        bakedPointCountRef.current = freezeEnd;
      }
    }

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (tool === 'pen' && bakedPointCountRef.current > 0 && bakedLiveCanvasRef.current) {
      // Draw already-stabilized prefix from offscreen baked canvas
      ctx.drawImage(bakedLiveCanvasRef.current, 0, 0);
      // Compute perfect-freehand outline ONLY for the active sliding window tail
      const tailStart = Math.max(0, bakedPointCountRef.current - SLIDING_WINDOW_OVERLAP);
      const tailPoints = points.slice(tailStart);
      ctx.scale(dpr, dpr);
      const tailOutline = generateStrokeOutline(tailPoints, 'pen', size, true);
      drawOutline(ctx, tailOutline, color, opacity, false);
    } else {
      ctx.scale(dpr, dpr);
      const outline = generateStrokeOutline(points, tool, size);
      drawOutline(ctx, outline, color, opacity, tool === 'highlighter');
    }

    ctx.restore();
  }, [dpr, toolState]);

  // Pointer Down (Start stroke, erase, or pan drag-scroll)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const isPenInput = e.pointerType === 'pen';
    const isFinger = e.pointerType === 'touch';

    // B3: Activate hardware Palm Rejection lock immediately when pen touches/approaches screen
    if (isPenInput) {
      palmRejectionActiveRef.current = true;
      if (palmRejectionTimeoutRef.current !== null) {
        window.clearTimeout(palmRejectionTimeoutRef.current);
        palmRejectionTimeoutRef.current = null;
      }
    }

    // B3: Ignore any touch event while pen is active or within the 500ms palm-rejection cooldown window
    if (isFinger && palmRejectionActiveRef.current) {
      return;
    }

    // 1. Apple Pencil Discrimination Mode: Finger scrolls the document while Stylus writes
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

    // 3. Drawing / Writing on Layer 3 (Live Stroke Canvas)
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
      pendingPointsRef.current = [];
      bakedPointCountRef.current = 0;
      if (bakedLiveCanvasRef.current) {
        const bCtx = bakedLiveCanvasRef.current.getContext('2d');
        bCtx?.clearRect(0, 0, bakedLiveCanvasRef.current.width, bakedLiveCanvasRef.current.height);
      }
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(flushLiveStroke);
      }
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
      lastIncrementalStrokeIdRef.current = null;
      onPageChange({
        ...page,
        strokes: remainingStrokes,
      });
    }
  };

  // B2 & B3: Pointer Move (Batch coalesced events via RAF + Palm Rejection)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen') {
      palmRejectionActiveRef.current = true;
      if (palmRejectionTimeoutRef.current !== null) {
        window.clearTimeout(palmRejectionTimeoutRef.current);
        palmRejectionTimeoutRef.current = null;
      }
    }

    // B3: Reject palm touch events while pen is active or in cooldown
    if (e.pointerType === 'touch' && palmRejectionActiveRef.current) {
      return;
    }

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

    // B2: Collect high-frequency coalesced events (120Hz/240Hz Apple Pencil) and schedule single RAF flush
    const nativeEv = e.nativeEvent as unknown as { getCoalescedEvents?: () => PointerEvent[] };
    const events =
      typeof nativeEv.getCoalescedEvents === 'function'
        ? nativeEv.getCoalescedEvents()
        : [e.nativeEvent as PointerEvent];

    for (const ev of events) {
      pendingPointsRef.current.push(
        getCanvasPointFromEvent(ev.clientX, ev.clientY, ev.pressure, ev.pointerType)
      );
    }

    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(flushLiveStroke);
    }
  };

  // B1, B3, C2: Pointer Up (Commit final path to Layer 2 once, clear Layer 3 immediately, set 500ms palm rejection cooldown)
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // B3: Keep palm rejection active for 500ms after pen lifts so resting palm doesn't trigger accidental touch
    if (e.pointerType === 'pen') {
      if (palmRejectionTimeoutRef.current !== null) {
        window.clearTimeout(palmRejectionTimeoutRef.current);
      }
      palmRejectionTimeoutRef.current = window.setTimeout(() => {
        palmRejectionActiveRef.current = false;
        palmRejectionTimeoutRef.current = null;
      }, 500);
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Drain any remaining pending points
    if (pendingPointsRef.current.length > 0) {
      currentPointsRef.current.push(...pendingPointsRef.current);
      pendingPointsRef.current = [];
    }

    const wasFingerPanning = isFingerPanningRef.current;
    isFingerPanningRef.current = false;
    panStartRef.current = null;

    const draftCanvas = draftCanvasRef.current;
    if (draftCanvas && draftCanvas.hasPointerCapture(e.pointerId)) {
      draftCanvas.releasePointerCapture(e.pointerId);
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
    bakedPointCountRef.current = 0;

    if (points.length < 2) {
      // Clear Layer 3
      if (draftCanvas) {
        const dCtx = draftCanvas.getContext('2d');
        dCtx?.clearRect(0, 0, draftCanvas.width, draftCanvas.height);
      }
      return;
    }

    const isHighlighter = toolState.currentTool === 'highlighter';
    const strokeId = `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // C2: Create memory-compact stroke (Float32Array + flat numeric buffer)
    const newStroke = createCompactStroke(
      strokeId,
      isHighlighter ? 'highlighter' : 'pen',
      isHighlighter ? toolState.highlighter.color : toolState.pen.color,
      isHighlighter ? toolState.highlighter.size : toolState.pen.size,
      isHighlighter ? toolState.highlighter.opacity : 1,
      points
    );

    // B1: Pre-compute & cache outline in WeakMap, draw once directly onto Layer 2 (Committed Strokes Canvas),
    // and immediately clearRect Layer 3 (Live Stroke Canvas) in the exact same frame!
    const finalOutline = getCachedStrokeOutline(newStroke);
    const inkCanvas = inkCanvasRef.current;
    if (inkCanvas && !isHighlighter) {
      const inkCtx = inkCanvas.getContext('2d');
      if (inkCtx) {
        inkCtx.save();
        inkCtx.setTransform(1, 0, 0, 1, 0, 0);
        inkCtx.scale(dpr, dpr);
        drawOutline(inkCtx, finalOutline, newStroke.color, newStroke.opacity, false);
        inkCtx.restore();
        lastIncrementalStrokeIdRef.current = newStroke.id;
      }
    } else {
      lastIncrementalStrokeIdRef.current = null;
    }

    // Clear Layer 3 (Live Stroke Canvas) immediately after Layer 2 commit
    if (draftCanvas) {
      const dCtx = draftCanvas.getContext('2d');
      if (dCtx) {
        dCtx.save();
        dCtx.setTransform(1, 0, 0, 1, 0, 0);
        dCtx.clearRect(0, 0, draftCanvas.width, draftCanvas.height);
        dCtx.restore();
      }
    }

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
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center select-none mx-auto"
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
              isDarkMode && !pdfPageNumber
                ? 'shadow-black/60 ring-1 ring-zinc-800 bg-[#18181B]'
                : 'shadow-slate-400/30 ring-1 ring-slate-200 bg-white'
            }`}
            style={{
              width: `${width}px`,
              height: `${height}px`,
              touchAction: toolState.currentTool === 'pan' ? 'pan-x pan-y' : 'none',
            }}
          >
            {/* Layer 1 (Bottom): PDF & Page Template Canvas — only redraws on page/zoom/template change */}
            <canvas
              ref={setBgCanvasRef}
              width={pixelWidth}
              height={pixelHeight}
              className="absolute inset-0 w-full h-full pointer-events-none rounded-xs"
            />

            {/* Layer 2 (Middle): Committed Strokes Canvas — only redraws when strokes are added/removed */}
            <canvas
              ref={inkCanvasRef}
              width={pixelWidth}
              height={pixelHeight}
              className="absolute inset-0 w-full h-full pointer-events-none rounded-xs"
            />

            {/* If PDF Binary could not be found locally or on Google Drive yet */}
            {pdfLoadError && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-15 select-none rounded-xs">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3 shadow-xs">
                  <FileText className="w-7 h-7 stroke-[1.8]" />
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  Trang PDF {pdfPageNumber}
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mt-1.5 leading-relaxed">
                  Chưa tải được file PDF gốc ({pdfFileName || notebookTitle || 'tài liệu'}) về điện thoại này.
                </p>

                <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
                  <button
                    onClick={async () => {
                      setIsRetryingPdf(true);
                      try {
                        const { GoogleDriveService } = await import('../../services/googleDrive');
                        await GoogleDriveService.getInstance().fetchPdfBinaryByNotebook(
                          notebookId || '',
                          notebookTitle,
                          pdfFileName,
                          drivePdfFileId
                        );
                        await redrawBackground();
                      } finally {
                        setIsRetryingPdf(false);
                      }
                    }}
                    disabled={isRetryingPdf}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm cursor-pointer transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRetryingPdf ? 'animate-spin' : ''}`} />
                    <span>{isRetryingPdf ? 'Đang tìm trên Cloud...' : 'Tải lại từ Google Drive'}</span>
                  </button>

                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Chọn file PDF từ máy</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file && notebookId) {
                          const { savePdfBinary } = await import('../../services/pdfStorage');
                          const buf = await file.arrayBuffer();
                          await savePdfBinary(notebookId, buf, file.name);
                          await redrawBackground();
                        }
                      }}
                    />
                  </label>
                </div>

                <p className="text-[11px] text-slate-400 mt-4 max-w-xs">
                  Mẹo: Nếu bạn đã nạp file trên máy tính, hãy bấm biểu tượng Google Drive trên máy tính để đồng bộ file PDF gốc lên đám mây.
                </p>
              </div>
            )}

            {/* Dynamic Pen Tip Dot Cursor */}
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

            {/* Layer 3 (Top): Live Stroke Canvas — redraws via RAF while drawing, clears immediately on pen lift */}
            <canvas
              ref={draftCanvasRef}
              width={pixelWidth}
              height={pixelHeight}
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

// A3: React.memo with custom comparator comparing pageNum/strokes + scale + relevant tool state
// Prevents re-rendering PageCanvas when unrelated parent state (sidebar open, sync status, active page indicator) changes
export const NoteCanvas = React.memo(NoteCanvasComponent, (prev, next) => {
  return (
    prev.page.id === next.page.id &&
    prev.page.pageNumber === next.page.pageNumber &&
    prev.page.pdfPageNumber === next.page.pdfPageNumber &&
    prev.page.width === next.page.width &&
    prev.page.height === next.page.height &&
    prev.page.template === next.page.template &&
    prev.page.strokes === next.page.strokes &&
    prev.transform.scale === next.transform.scale &&
    prev.transform.offsetX === next.transform.offsetX &&
    prev.transform.offsetY === next.transform.offsetY &&
    prev.isDarkMode === next.isDarkMode &&
    prev.isPencilMode === next.isPencilMode &&
    prev.isLastPage === next.isLastPage &&
    prev.notebookId === next.notebookId &&
    prev.notebookTitle === next.notebookTitle &&
    prev.pdfFileName === next.pdfFileName &&
    prev.drivePdfFileId === next.drivePdfFileId &&
    prev.pdfDataUrl === next.pdfDataUrl &&
    prev.toolState.currentTool === next.toolState.currentTool &&
    prev.toolState.pen.color === next.toolState.pen.color &&
    prev.toolState.pen.size === next.toolState.pen.size &&
    prev.toolState.highlighter.color === next.toolState.highlighter.color &&
    prev.toolState.highlighter.size === next.toolState.highlighter.size &&
    prev.toolState.highlighter.opacity === next.toolState.highlighter.opacity &&
    prev.toolState.eraser.size === next.toolState.eraser.size
  );
});
