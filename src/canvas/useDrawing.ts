// src/canvas/useDrawing.ts
import { useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Point } from "./useCanvasRenderer";
import type { Mode } from "../routes/CanvasPage";

type Config = {
	canvasId: Id<"canvases">;
	userId: string;
	color: string;
	size: number;       // world-relative
	mode: Mode;
	screenToWorld: (x: number, y: number) => { x: number; y: number };
	onLocalSegment?: (pts: Point[]) => void; // let the board draw local preview incrementally
	streamMidStroke?: boolean;               // if true, uses start/appendPoints
	onStrokeComplete?: (stroke: { tempId: string; color: string; size: number; points: Point[]; mode: Mode; createdAt: number }) => void;
};

export function useDrawing(cfg: Config) {
	const startStroke = useMutation(api.strokes.startStroke);
	const appendPoints = useMutation(api.strokes.appendPoints);
	const appendStroke = useMutation(api.strokes.appendStroke);

	const activeIdRef = useRef<null | string>(null);
	const pointsRef = useRef<Point[]>([]);
	const isDrawingRef = useRef(false);
	const lastSentRef = useRef<number>(0);
	const tempIdRef = useRef<string>("");
	const createdAtRef = useRef<number>(0);

	const pointerDown = useCallback(
		(ev: PointerEvent) => {
			if (ev.button !== 0) return;
			(ev.target as Element).setPointerCapture?.(ev.pointerId);
			isDrawingRef.current = true;
			pointsRef.current = [];

			// Generate unique ID for optimistic updates
			tempIdRef.current = crypto.randomUUID();
			createdAtRef.current = Date.now();

			const now = performance.now();
			const p = cfg.screenToWorld(ev.offsetX, ev.offsetY);
			const pt: Point = { x: p.x, y: p.y, t: now };
			pointsRef.current.push(pt);
			cfg.onLocalSegment?.([pt]);

			if (cfg.streamMidStroke) {
				// Fire and forget - don't block UI waiting for response
				startStroke({
					canvasId: cfg.canvasId,
					userId: cfg.userId,
					color: cfg.color,
					size: cfg.size,
					points: [pt],
					mode: cfg.mode,
					createdAt: createdAtRef.current,
				}).then((id) => {
					activeIdRef.current = id as any;
				});
				lastSentRef.current = now;
			}
		},
		[cfg, startStroke]
	);

	const pointerMove = useCallback(
		(ev: PointerEvent) => {
			if (!isDrawingRef.current) return;
			const now = performance.now();
			const p = cfg.screenToWorld(ev.offsetX, ev.offsetY);
			const pt: Point = { x: p.x, y: p.y, t: now };
			const pending = pointsRef.current;
			const last = pending[pending.length - 1];
			// simple thinning
			if (!last || Math.hypot(pt.x - last.x, pt.y - last.y) > 0.002) {
				pending.push(pt);
				cfg.onLocalSegment?.([pt]);
			}

			// mid-stroke streaming every ~80ms if enabled
			if (cfg.streamMidStroke && activeIdRef.current && now - lastSentRef.current > 80) {
				const toSend = pending.splice(1); // keep last point to avoid gaps
				if (toSend.length) {
					// Fire and forget - don't block UI
					appendPoints({ strokeId: activeIdRef.current as any, points: toSend, mode: cfg.mode });
					lastSentRef.current = now;
				}
			}
		},
		[cfg, appendPoints]
	);

	const pointerUp = useCallback(
		(_ev: PointerEvent) => {
			if (!isDrawingRef.current) return;
			isDrawingRef.current = false;

			const pts = pointsRef.current.slice();
			pointsRef.current.length = 0;

			if (!pts.length) return;

			// Notify parent for optimistic updates
			if (cfg.onStrokeComplete) {
				cfg.onStrokeComplete({
					tempId: tempIdRef.current,
					color: cfg.color,
					size: cfg.size,
					points: pts,
					mode: cfg.mode,
					createdAt: createdAtRef.current,
				});
			}

			if (cfg.streamMidStroke && activeIdRef.current) {
				const rest = pts.splice(1);
				// Fire and forget - don't block UI
				if (rest.length) appendPoints({ strokeId: activeIdRef.current as any, points: rest, mode: cfg.mode });
				activeIdRef.current = null;
			} else {
				// Fire and forget - don't block UI
				appendStroke({
					canvasId: cfg.canvasId,
					userId: cfg.userId,
					color: cfg.color,
					size: cfg.size,
					points: pts,
					mode: cfg.mode,
					createdAt: createdAtRef.current,
				});
			}
		},
		[cfg, appendStroke, appendPoints]
	);

	return { pointerDown, pointerMove, pointerUp };
}