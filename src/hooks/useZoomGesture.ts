import { useEffect, useRef } from 'react';
import type { CanvasTransform } from '../types/document';

interface UseZoomGestureOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  viewMode: string;
  transform: CanvasTransform;
  setTransform: React.Dispatch<React.SetStateAction<CanvasTransform>>;
  onZoomToast?: (scale: number) => void;
  minScale?: number;
  maxScale?: number;
}

export function useZoomGesture({
  containerRef,
  viewMode,
  transform,
  setTransform,
  onZoomToast,
  minScale = 0.35,
  maxScale = 3.0,
}: UseZoomGestureOptions) {
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // 1. Keyboard shortcuts: Ctrl + (+), Ctrl + (-), Ctrl + 0
  useEffect(() => {
    if (viewMode !== 'editor') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          const next = Math.min(maxScale, Number((transformRef.current.scale + 0.1).toFixed(2)));
          setTransform((prev) => ({ ...prev, scale: next }));
          onZoomToast?.(next);
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          const next = Math.max(minScale, Number((transformRef.current.scale - 0.1).toFixed(2)));
          setTransform((prev) => ({ ...prev, scale: next }));
          onZoomToast?.(next);
        } else if (e.key === '0') {
          e.preventDefault();
          setTransform((prev) => ({ ...prev, scale: 1.0 }));
          onZoomToast?.(1.0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [viewMode, minScale, maxScale, setTransform, onZoomToast]);

  // 2. Ctrl + MouseWheel / Trackpad Pinch (WheelEvent with ctrlKey)
  useEffect(() => {
    if (viewMode !== 'editor') return;
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const currentScale = transformRef.current.scale;
      // Smooth exponential scaling
      const zoomSpeed = 0.0025;
      const delta = -e.deltaY;
      const factor = Math.exp(delta * zoomSpeed);
      const nextScale = Math.min(maxScale, Math.max(minScale, Number((currentScale * factor).toFixed(3))));

      if (nextScale === currentScale) return;

      // Keep content point under mouse anchored
      const contentX = container.scrollLeft + mouseX;
      const contentY = container.scrollTop + mouseY;
      const ratio = nextScale / currentScale;

      setTransform((prev) => ({ ...prev, scale: nextScale }));
      onZoomToast?.(nextScale);

      container.scrollLeft = contentX * ratio - mouseX;
      container.scrollTop = contentY * ratio - mouseY;
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [viewMode, containerRef, minScale, maxScale, setTransform, onZoomToast]);

  // 3. Two-Finger Touch Pinch Zoom (Touchscreens / iPad / Mobile)
  useEffect(() => {
    if (viewMode !== 'editor') return;
    const container = containerRef.current;
    if (!container) return;

    let isPinching = false;
    let initialDist = 0;
    let initialScale = 1.0;
    let initialMidpoint = { x: 0, y: 0 };
    let initialScroll = { left: 0, top: 0 };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isPinching = true;
        window.dispatchEvent(new CustomEvent('mednotes:pinchstart'));

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        initialScale = transformRef.current.scale;

        const rect = container.getBoundingClientRect();
        initialMidpoint = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top,
        };
        initialScroll = {
          left: container.scrollLeft,
          top: container.scrollTop,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPinching || e.touches.length !== 2) return;
      e.preventDefault();

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      if (initialDist < 10) return;

      const scaleMultiplier = currentDist / initialDist;
      const targetScale = Math.min(
        maxScale,
        Math.max(minScale, Number((initialScale * scaleMultiplier).toFixed(3)))
      );

      const ratio = targetScale / initialScale;
      const contentX = initialScroll.left + initialMidpoint.x;
      const contentY = initialScroll.top + initialMidpoint.y;

      setTransform((prev) => ({ ...prev, scale: targetScale }));
      onZoomToast?.(targetScale);

      container.scrollLeft = contentX * ratio - initialMidpoint.x;
      container.scrollTop = contentY * ratio - initialMidpoint.y;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isPinching && e.touches.length < 2) {
        isPinching = false;
        window.dispatchEvent(new CustomEvent('mednotes:pinchend'));
      }
    };

    // Safari iOS Gesture Event support
    const handleGestureStart = (e: any) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('mednotes:pinchstart'));
      initialScale = transformRef.current.scale;
    };

    const handleGestureChange = (e: any) => {
      e.preventDefault();
      const targetScale = Math.min(
        maxScale,
        Math.max(minScale, Number((initialScale * e.scale).toFixed(3)))
      );
      setTransform((prev) => ({ ...prev, scale: targetScale }));
      onZoomToast?.(targetScale);
    };

    const handleGestureEnd = (e: any) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('mednotes:pinchend'));
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    // Safari native gesture events
    container.addEventListener('gesturestart' as any, handleGestureStart, { passive: false });
    container.addEventListener('gesturechange' as any, handleGestureChange, { passive: false });
    container.addEventListener('gestureend' as any, handleGestureEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);

      container.removeEventListener('gesturestart' as any, handleGestureStart);
      container.removeEventListener('gesturechange' as any, handleGestureChange);
      container.removeEventListener('gestureend' as any, handleGestureEnd);
    };
  }, [viewMode, containerRef, minScale, maxScale, setTransform, onZoomToast]);
}
