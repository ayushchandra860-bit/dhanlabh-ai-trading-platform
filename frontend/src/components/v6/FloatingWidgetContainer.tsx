import React, { useRef, useState, useEffect } from 'react';
import { useWorkspaceV6, WidgetGeometry } from '../../context/WorkspaceV6Context';
import { WidgetHeader } from './WidgetHeader';
import { WIDGET_REGISTRY } from '../../registry/WidgetRegistry';

interface FloatingWidgetContainerProps {
  widget: WidgetGeometry;
  title: string;
  children: React.ReactNode;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se' | null;

const SNAP_THRESHOLD = 12; // Snap within 12px

export const FloatingWidgetContainer: React.FC<FloatingWidgetContainerProps> = ({
  widget,
  title,
  children,
}) => {
  const { updateWidget, bringToFront, openContextMenu, widgets, activeChartRegion } = useWorkspaceV6();
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [resizingDir, setResizingDir] = useState<ResizeDirection>(null);

  // Drag tracking refs
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  // Resize tracking refs
  const resizeStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number; initW: number; initH: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    initW: 0,
    initH: 0,
  });

  const minSize = WIDGET_REGISTRY[widget.id]?.minSize || { w: 200, h: 150 };

  // --- ACTIVE CANDLE AVOIDANCE CHECK ---
  useEffect(() => {
    if (!activeChartRegion || isDragging || resizingDir || widget.isLocked) return;

    // Check if widget overlaps with the right-most 25% of chart (active candle zone)
    const candleZoneX = activeChartRegion.x + activeChartRegion.w * 0.75;
    const candleZoneY = activeChartRegion.y;
    const candleZoneW = activeChartRegion.w * 0.25;
    const candleZoneH = activeChartRegion.h;

    const widgetRight = widget.x + widget.w;
    const widgetBottom = widget.y + widget.h;

    const isOverlapping =
      widget.x < candleZoneX + candleZoneW &&
      widgetRight > candleZoneX &&
      widget.y < candleZoneY + candleZoneH &&
      widgetBottom > candleZoneY;

    if (isOverlapping) {
      // Shift widget to the left of the active candle zone safely
      const safeX = Math.max(10, candleZoneX - widget.w - 15);
      updateWidget(widget.id, { x: safeX });
    }
  }, [activeChartRegion, widget.x, widget.y, widget.w, widget.h, isDragging, resizingDir, widget.isLocked, widget.id, updateWidget]);

  // --- DRAG HANDLERS ---
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if (widget.isLocked) return;
    e.preventDefault();
    bringToFront(widget.id);

    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: widget.x,
      initY: widget.y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;

      let rawX = dragStartRef.current.initX + deltaX;
      let rawY = dragStartRef.current.initY + deltaY;

      // Screen Edge Snapping
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      if (Math.abs(rawX) < SNAP_THRESHOLD) rawX = 0;
      if (Math.abs(rawY) < SNAP_THRESHOLD) rawY = 0;
      if (Math.abs(screenW - (rawX + widget.w)) < SNAP_THRESHOLD) rawX = screenW - widget.w;
      if (Math.abs(screenH - (rawY + widget.h)) < SNAP_THRESHOLD) rawY = screenH - widget.h;

      // Sibling Widget Snapping
      Object.values(widgets).forEach((other) => {
        if (other.id === widget.id || other.isHidden) return;
        // Snap left to other right
        if (Math.abs(rawX - (other.x + other.w)) < SNAP_THRESHOLD) rawX = other.x + other.w + 8;
        // Snap right to other left
        if (Math.abs(rawX + widget.w - other.x) < SNAP_THRESHOLD) rawX = other.x - widget.w - 8;
        // Snap top to other bottom
        if (Math.abs(rawY - (other.y + other.h)) < SNAP_THRESHOLD) rawY = other.y + other.h + 8;
        // Snap bottom to other top
        if (Math.abs(rawY + widget.h - other.y) < SNAP_THRESHOLD) rawY = other.y - widget.h - 8;
      });

      requestAnimationFrame(() => {
        updateWidget(widget.id, { x: Math.max(0, rawX), y: Math.max(0, rawY) });
      });
    } else if (resizingDir) {
      const deltaX = e.clientX - resizeStartRef.current.startX;
      const deltaY = e.clientY - resizeStartRef.current.startY;

      let newX = resizeStartRef.current.initX;
      let newY = resizeStartRef.current.initY;
      let newW = resizeStartRef.current.initW;
      let newH = resizeStartRef.current.initH;

      if (resizingDir.includes('e')) newW = Math.max(minSize.w, resizeStartRef.current.initW + deltaX);
      if (resizingDir.includes('s')) newH = Math.max(minSize.h, resizeStartRef.current.initH + deltaY);
      if (resizingDir.includes('w')) {
        const possibleW = resizeStartRef.current.initW - deltaX;
        if (possibleW >= minSize.w) {
          newW = possibleW;
          newX = resizeStartRef.current.initX + deltaX;
        }
      }
      if (resizingDir.includes('n')) {
        const possibleH = resizeStartRef.current.initH - deltaY;
        if (possibleH >= minSize.h) {
          newH = possibleH;
          newY = resizeStartRef.current.initY + deltaY;
        }
      }

      requestAnimationFrame(() => {
        updateWidget(widget.id, { x: newX, y: newY, w: newW, h: newH });
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    if (resizingDir) {
      setResizingDir(null);
      try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
  };

  // --- RESIZE HANDLE POINTER DOWN ---
  const handleResizePointerDown = (dir: ResizeDirection, e: React.PointerEvent) => {
    if (widget.isLocked || widget.isCollapsed) return;
    e.preventDefault();
    e.stopPropagation();
    bringToFront(widget.id);

    setResizingDir(dir);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: widget.x,
      initY: widget.y,
      initW: widget.w,
      initH: widget.h,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, widget.id);
  };

  if (widget.isHidden) return null;

  return (
    <div
      ref={containerRef}
      className={`v6-widget-container ${isDragging ? 'is-dragging' : ''} ${widget.isLocked ? 'is-locked' : ''} ${widget.isCollapsed ? 'is-collapsed' : ''}`}
      style={{
        transform: `translate3d(${widget.x}px, ${widget.y}px, 0)`,
        width: widget.w,
        height: widget.isCollapsed ? 'auto' : widget.h,
        opacity: widget.opacity,
        zIndex: widget.zIndex,
      }}
      onPointerDown={() => bringToFront(widget.id)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      <WidgetHeader
        id={widget.id}
        title={title}
        isLocked={widget.isLocked}
        isCollapsed={widget.isCollapsed}
        onPointerDown={handleHeaderPointerDown}
      />

      {!widget.isCollapsed && <div className="v6-widget-body">{children}</div>}

      {/* 8-Axis Resize Handles */}
      {!widget.isLocked && !widget.isCollapsed && (
        <>
          <div className="resize-handle handle-n" onPointerDown={(e) => handleResizePointerDown('n', e)}></div>
          <div className="resize-handle handle-s" onPointerDown={(e) => handleResizePointerDown('s', e)}></div>
          <div className="resize-handle handle-e" onPointerDown={(e) => handleResizePointerDown('e', e)}></div>
          <div className="resize-handle handle-w" onPointerDown={(e) => handleResizePointerDown('w', e)}></div>
          <div className="resize-handle handle-nw" onPointerDown={(e) => handleResizePointerDown('nw', e)}></div>
          <div className="resize-handle handle-ne" onPointerDown={(e) => handleResizePointerDown('ne', e)}></div>
          <div className="resize-handle handle-sw" onPointerDown={(e) => handleResizePointerDown('sw', e)}></div>
          <div className="resize-handle handle-se" onPointerDown={(e) => handleResizePointerDown('se', e)}></div>
        </>
      )}
    </div>
  );
};
