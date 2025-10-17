// src/canvas/useCanvasRenderer.ts
import { useCallback, useEffect, useRef } from "react";
import type { Mode } from "../routes/CanvasPage";

export type Point = { x: number; y: number; t: number }; // world coords in [0,1]
export type Stroke = {
	_id?: string;
	color: string;
	size: number; // world-relative thickness (we'll scale)
	points: Point[];
	mode?: Mode; // 'draw' | 'erase'
};

export function useCanvasRenderer() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const dprRef = useRef<number>(1);
	const rectRef = useRef<DOMRect | null>(null);
	const strokesRef = useRef<Stroke[]>([]);

	const screenToWorld = useCallback((offsetX: number, offsetY: number) => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };
		const x = offsetX / canvas.clientWidth;
		const y = offsetY / canvas.clientHeight;
		return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
	}, []);

	const worldToScreen = useCallback((x: number, y: number) => {
		const rect = rectRef.current;
		const dpr = dprRef.current;
		if (!rect) return { x: 0, y: 0 };
		return { x: x * rect.width * dpr, y: y * rect.height * dpr };
	}, []);

	const clear = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d")!;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}, []);

	// Quadratic smoothing: draw via midpoints
	function pathStroke(ctx: CanvasRenderingContext2D, pts: Point[]) {
		if (pts.length < 2) {
			const p = pts[0];
			if (!p) return;
			const a = worldToScreen(p.x, p.y);
			ctx.beginPath();
			ctx.moveTo(a.x, a.y);
			ctx.lineTo(a.x + 0.1, a.y + 0.1);
			ctx.stroke();
			return;
		}
		let p0 = pts[0];
		for (let i = 1; i < pts.length; i++) {
			const p1 = pts[i];
			const midX = (p0.x + p1.x) / 2;
			const midY = (p0.y + p1.y) / 2;
			// const m0 = worldToScreen((p0.x + midX) / 2, (p0.y + midY) / 2); // slightly smoother
			const m1 = worldToScreen(midX, midY);
			const a0 = worldToScreen(p0.x, p0.y);
			ctx.quadraticCurveTo(a0.x, a0.y, m1.x, m1.y);
			p0 = p1;
		}
		// finalize to last point
		const last = pts[pts.length - 1];
		const aLast = worldToScreen(last.x, last.y);
		ctx.lineTo(aLast.x, aLast.y);
	}

	const drawStroke = useCallback((s: Stroke) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d")!;
		ctx.save();
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		const dpr = dprRef.current;

		// line width: scale size (world) by canvas min dimension
		const rect = rectRef.current!;
		const basePx = Math.min(rect.width, rect.height) * dpr;
		ctx.lineWidth = Math.max(1, s.size * basePx);

		if (s.mode === "erase") {
			ctx.globalCompositeOperation = "destination-out";
			ctx.strokeStyle = "rgba(0,0,0,1)";
		} else {
			ctx.globalCompositeOperation = "source-over";
			ctx.strokeStyle = s.color ?? "#111";
		}

		ctx.beginPath();
		pathStroke(ctx, s.points);
		ctx.stroke();
		ctx.restore();
	}, [worldToScreen]);

	const drawAll = useCallback((strokes: Stroke[]) => {
		strokesRef.current = strokes; // Store strokes for automatic redraw on resize
		clear();
		for (const s of strokes) drawStroke(s);
	}, [clear, drawStroke]);

	const resize = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const dpr = window.devicePixelRatio || 1;
		dprRef.current = dpr;
		const rect = canvas.getBoundingClientRect();
		rectRef.current = rect;
		canvas.width = Math.max(1, Math.floor(rect.width * dpr));
		canvas.height = Math.max(1, Math.floor(rect.height * dpr));
		// CSS size stays responsive via container
		const ctx = canvas.getContext("2d")!;
		ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		// Automatically redraw stored strokes after resize
		for (const s of strokesRef.current) drawStroke(s);
	}, [drawStroke]);

	useEffect(() => {
		resize();
		const ro = new ResizeObserver(() => resize());
		if (canvasRef.current) ro.observe(canvasRef.current);
		return () => ro.disconnect();
	}, [resize]);

	return {
		canvasRef,
		resize,
		clear,
		drawAll,
		drawStroke,
		screenToWorld,
		worldToScreen,
	};
}
