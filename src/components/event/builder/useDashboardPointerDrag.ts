"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveColSpan, type ColSpan } from "./WidgetSizeMenu";
import type { DashboardWidget } from "@/types/event/reporting";

export type DrawerPlacement = "top" | "bottom" | "left" | "right";

export interface FreeDragSession {
  mode: "existing" | "new";
  widgetId?: string;
  widgetType: DashboardWidget["widget_type"];
  width: number;
  height: number;
  initialTransformX: number;
  initialTransformY: number;
}

interface CachedBox {
  id: string;
  index: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

interface UseDashboardPointerDragOptions {
  widgets: DashboardWidget[];
  onMoveWidget: (id: string, targetIndex: number) => void;
  onAddWidget: (type: DashboardWidget["widget_type"], index?: number) => void;
  onSelectWidget: (id: string) => void;
}

export function useDashboardPointerDrag({
  widgets,
  onMoveWidget,
  onAddWidget,
  onSelectWidget,
}: UseDashboardPointerDragOptions) {
  const [drawerPlacement, setDrawerPlacement] =
    useState<DrawerPlacement>("right");
  const [dragSession, setDragSession] = useState<FreeDragSession | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const canvasRef = useRef<HTMLElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const drawerRefs = useRef<Map<string, HTMLElement>>(new Map());
  const floatingCardRef = useRef<HTMLDivElement | null>(null);
  const dropTargetRef = useRef<number | null>(null);

  // Resolve drawer placement based on card size:
  // - Small (colSpan === 1) & Medium (colSpan === 2): open on the side ("right" or "left")
  // - Large (colSpan === 3): open on the top ("top")
  // Then scroll so that the Widget Settings sits right below the sticky header alongside the focused Widget.
  const focusAndPositionDrawer = useCallback(
    (widgetId: string, overrideColSpan?: ColSpan) => {
      const cardEl = cardRefs.current.get(widgetId);
      if (!cardEl) return;

      const targetWidget = widgets.find((w) => w.id === widgetId);
      const colSpan =
        overrideColSpan ?? resolveColSpan(targetWidget?.grid_span);

      const HEADER_OFFSET = 88; // Sticky AppHeader (64px) + 24px margin
      const cardRect = cardEl.getBoundingClientRect();
      const canvasRect = canvasRef.current?.getBoundingClientRect() ?? cardRect;
      const viewportW = globalThis.window.innerWidth;

      const rightSpace =
        Math.min(viewportW - 16, canvasRect.right + 16) - cardRect.right;
      const leftSpace = cardRect.left - Math.max(16, canvasRect.left - 16);

      let nextPlacement: DrawerPlacement;
      if (colSpan === 3) {
        nextPlacement = "top";
      } else {
        nextPlacement = rightSpace >= leftSpace ? "right" : "left";
      }

      setDrawerPlacement(nextPlacement);

      globalThis.requestAnimationFrame(() => {
        const updatedCardEl = cardRefs.current.get(widgetId);
        const drawerEl = drawerRefs.current.get(widgetId);
        if (!updatedCardEl) return;

        const cRect = updatedCardEl.getBoundingClientRect();
        const drawerHeight = drawerEl?.offsetHeight ?? 320;
        const currentScrollY = globalThis.window.scrollY;

        const drawerDocTop =
          nextPlacement === "top"
            ? currentScrollY + cRect.top - drawerHeight - 16
            : currentScrollY + cRect.top;

        globalThis.window.scrollTo({
          top: Math.max(0, drawerDocTop - HEADER_OFFSET),
          behavior: "smooth",
        });
      });
    },
    [widgets],
  );

  // Zero-re-render pointer drag loop:
  // 1. Caches bounding rects once when drag starts (zero layout thrashing)
  // 2. Updates floating card DOM transform directly (zero React re-renders per mousemove)
  // 3. Only calls setDropTargetIndex when the hovered target slot actually changes
  const beginPointerDrag = useCallback(
    (params: {
      mode: "existing" | "new";
      widgetId?: string;
      widgetType: DashboardWidget["widget_type"];
      startX: number;
      startY: number;
      originLeft: number;
      originTop: number;
      width: number;
      height: number;
    }) => {
      const {
        mode,
        widgetId,
        widgetType,
        startX,
        startY,
        originLeft,
        originTop,
        width,
        height,
      } = params;

      let isDraggingActive = false;
      let latestX = originLeft;
      let latestY = originTop;
      let canvasBounds: DOMRect | null = null;
      let cachedBoxes: CachedBox[] = [];

      const snapshotGeometry = () => {
        canvasBounds = canvasRef.current?.getBoundingClientRect() ?? null;
        cachedBoxes = [];
        widgets.forEach((w, index) => {
          const el = cardRefs.current.get(w.id);
          if (!el) return;
          const r = el.getBoundingClientRect();
          cachedBoxes.push({
            id: w.id,
            index,
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
            cx: r.left + r.width / 2,
            cy: r.top + r.height / 2,
          });
        });
      };

      const findTargetIndex = (
        clientX: number,
        clientY: number,
        left: number,
        top: number,
      ): number | null => {
        if (!canvasBounds) return null;
        const centerX = left + width / 2;
        const centerY = top + height / 2;

        const isNearCanvas =
          centerY >= canvasBounds.top - 80 &&
          centerY <= canvasBounds.bottom + 120 &&
          centerX >= canvasBounds.left - 80 &&
          centerX <= canvasBounds.right + 80;

        if (!isNearCanvas) return null;
        if (cachedBoxes.length === 0) return 0;

        let bestOverlapArea = 0;
        let bestOverlapIndex: number | null = null;
        let closestDist = Number.POSITIVE_INFINITY;
        let closestIndex = cachedBoxes.length - 1;

        for (const box of cachedBoxes) {
          if (
            clientX >= box.left &&
            clientX <= box.right &&
            clientY >= box.top &&
            clientY <= box.bottom
          ) {
            if (box.id !== widgetId) {
              return box.index;
            }
          }

          const overlapX = Math.max(
            0,
            Math.min(left + width, box.right) - Math.max(left, box.left),
          );
          const overlapY = Math.max(
            0,
            Math.min(top + height, box.bottom) - Math.max(top, box.top),
          );
          const area = overlapX * overlapY;
          if (box.id !== widgetId && area > bestOverlapArea) {
            bestOverlapArea = area;
            bestOverlapIndex = box.index;
          }

          const dist = Math.hypot(centerX - box.cx, centerY - box.cy);
          if (dist < closestDist) {
            closestDist = dist;
            closestIndex = box.index;
          }
        }

        if (bestOverlapIndex !== null && bestOverlapArea > 0) {
          return bestOverlapIndex;
        }
        return closestIndex;
      };

      const onPointerMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (!isDraggingActive) {
          if (Math.hypot(dx, dy) <= 4) return;
          isDraggingActive = true;
          snapshotGeometry();
          latestX = originLeft + dx;
          latestY = originTop + dy;
          setDragSession({
            mode,
            widgetId,
            widgetType,
            width,
            height,
            initialTransformX: latestX,
            initialTransformY: latestY,
          });
        } else {
          latestX = originLeft + dx;
          latestY = originTop + dy;
          const node = floatingCardRef.current;
          if (node) {
            node.style.transform = `translate3d(${latestX}px, ${latestY}px, 0) scale(1.03) rotate(-1deg)`;
          }
        }

        const nextTarget = findTargetIndex(
          ev.clientX,
          ev.clientY,
          latestX,
          latestY,
        );
        if (nextTarget !== dropTargetRef.current) {
          dropTargetRef.current = nextTarget;
          setDropTargetIndex(nextTarget);
        }
      };

      const onPointerUp = () => {
        globalThis.window.removeEventListener("pointermove", onPointerMove);
        globalThis.window.removeEventListener("pointerup", onPointerUp);
        globalThis.window.removeEventListener("pointercancel", onPointerUp);

        const finalTarget = dropTargetRef.current;
        if (isDraggingActive) {
          if (mode === "existing" && widgetId) {
            if (finalTarget !== null) {
              onMoveWidget(widgetId, finalTarget);
            }
          } else if (mode === "new") {
            if (finalTarget !== null) {
              onAddWidget(widgetType, finalTarget);
            } else {
              onAddWidget(widgetType);
            }
          }
        } else if (mode === "existing" && widgetId) {
          onSelectWidget(widgetId);
        } else if (mode === "new") {
          onAddWidget(widgetType);
        }

        dropTargetRef.current = null;
        setDragSession(null);
        setDropTargetIndex(null);
      };

      globalThis.window.addEventListener("pointermove", onPointerMove, {
        passive: true,
      });
      globalThis.window.addEventListener("pointerup", onPointerUp);
      globalThis.window.addEventListener("pointercancel", onPointerUp);
    },
    [onAddWidget, onMoveWidget, onSelectWidget, widgets],
  );

  useEffect(() => {
    return () => {
      dropTargetRef.current = null;
    };
  }, []);

  return {
    canvasRef,
    cardRefs,
    drawerRefs,
    floatingCardRef,
    drawerPlacement,
    dragSession,
    dropTargetIndex,
    focusAndPositionDrawer,
    beginPointerDrag,
  };
}
