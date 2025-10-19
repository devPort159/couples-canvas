// src/canvas/CanvasBoard.tsx
import { useEffect, useRef } from "react";
import { useCanvasRenderer, type Stroke as RenderStroke } from "./useCanvasRenderer";
import { useDrawing } from "./useDrawing";
import type { Id } from "../../convex/_generated/dataModel";
import type { Mode } from "../routes/CanvasPage";

type DBPoint = { x: number; y: number; t: number };
type DBStroke = {
	_id: string;
	canvasId: string;
	userId?: string;
	color: string;
	size: number;
	points: DBPoint[];
	createdAt: number;
	mode?: Mode;
};

type Props = {
	canvasId: Id<"canvases">;
	userId: string;
	strokes: DBStroke[];
	color: string;
	size: number;
	mode: Mode;
	onCursor?: (worldOrNull?: { x: number; y: number }) => void;
	onUndo?: (handler: () => void) => void;
	isPublished?: boolean;
};

type PendingStroke = RenderStroke & {
	tempId: string;
	createdAt: number;
};

export default function CanvasBoard({
	canvasId,
	userId,
	strokes,
	color,
	size,
	mode,
	onCursor,
	onUndo,
	isPublished = false,
}: Props) {
	const { canvasRef, drawAll, drawStroke, screenToWorld } = useCanvasRenderer();
	const liveStrokeRef = useRef<RenderStroke | null>(null);
	const pendingStrokesRef = useRef<PendingStroke[]>([]);
	const optimisticallyDeletedStrokesRef = useRef<Set<string>>(new Set());
	const optimisticallyDeletedPendingRef = useRef<Set<string>>(new Set());

	// Re-render when strokes change
	useEffect(() => {
		// Match incoming strokes against pending strokes
		const newPending = pendingStrokesRef.current.filter((pending) => {
			// Skip if optimistically deleted
			if (optimisticallyDeletedPendingRef.current.has(pending.tempId)) {
				return false;
			}
			// Find if this pending stroke has been confirmed by Convex
			const match = strokes.find((s) => {
				// Match by userId, createdAt (within tolerance), and similar point count
				const timeMatch = Math.abs(s.createdAt - pending.createdAt) < 100; // 100ms tolerance
				const userMatch = s.userId === userId;
				const pointCountMatch = Math.abs(s.points.length - pending.points.length) <= 1;
				return timeMatch && userMatch && pointCountMatch;
			});
			// Keep in pending list only if NOT matched
			return !match;
		});
		pendingStrokesRef.current = newPending;

		// Clean up optimistically deleted strokes that are now actually gone from the server
		const currentStrokeIds = new Set(strokes.map(s => s._id));
		const deletedIds = Array.from(optimisticallyDeletedStrokesRef.current);
		for (const id of deletedIds) {
			if (!currentStrokeIds.has(id)) {
				optimisticallyDeletedStrokesRef.current.delete(id);
			}
		}

		// Render confirmed strokes from Convex (filter out optimistically deleted)
		const baked: RenderStroke[] = strokes
			.filter(s => !optimisticallyDeletedStrokesRef.current.has(s._id))
			.map((s) => ({
				color: s.color,
				size: s.size,
				points: s.points,
				mode: s.mode,
			}));
		drawAll(baked);

		// Render pending optimistic strokes on top
		for (const pending of pendingStrokesRef.current) {
			drawStroke(pending);
		}

		// Also redraw any active local stroke on top
		if (liveStrokeRef.current) drawStroke(liveStrokeRef.current);
	}, [strokes, drawAll, drawStroke, userId]);

	// Drawing hook: stream disabled by default; set to true if you prefer mid-stroke sync
	const { pointerDown, pointerMove, pointerUp } = useDrawing({
		canvasId,
		userId,
		color,
		size,
		mode,
		screenToWorld,
		streamMidStroke: false,
		onLocalSegment: (pts) => {
			// Maintain local live stroke for immediate feedback
			const now = liveStrokeRef.current;
			if (!now) {
				liveStrokeRef.current = { color, size, points: pts.slice(), mode };
			} else {
				now.points.push(...pts);
				now.color = color;
				now.size = size;
				now.mode = mode;
			}
			// paint just the new segment
			if (liveStrokeRef.current) drawStroke(liveStrokeRef.current);
		},
		onStrokeComplete: (stroke) => {
			// Add completed stroke to pending list for optimistic updates
			pendingStrokesRef.current.push({
				tempId: stroke.tempId,
				color: stroke.color,
				size: stroke.size,
				points: stroke.points,
				mode: stroke.mode,
				createdAt: stroke.createdAt,
			});
		},
	});

	// Expose optimistic undo handler
	useEffect(() => {
		if (!onUndo) return;
		
		const handleUndo = () => {
			// First check pending strokes (most recent unconfirmed strokes)
			const myPendingStrokes = pendingStrokesRef.current.filter(
				s => !optimisticallyDeletedPendingRef.current.has(s.tempId)
			);
			
			if (myPendingStrokes.length > 0) {
				// Sort by createdAt descending to find the most recent
				const sortedPending = myPendingStrokes.sort((a, b) => b.createdAt - a.createdAt);
				const lastPending = sortedPending[0];
				
				// Mark as optimistically deleted
				optimisticallyDeletedPendingRef.current.add(lastPending.tempId);
				
				// Force re-render by filtering pending strokes
				pendingStrokesRef.current = pendingStrokesRef.current.filter(
					s => s.tempId !== lastPending.tempId
				);
				
				// Redraw
				const baked: RenderStroke[] = strokes
					.filter(s => !optimisticallyDeletedStrokesRef.current.has(s._id))
					.map((s) => ({
						color: s.color,
						size: s.size,
						points: s.points,
						mode: s.mode,
					}));
				drawAll(baked);
				for (const pending of pendingStrokesRef.current) {
					drawStroke(pending);
				}
				if (liveStrokeRef.current) drawStroke(liveStrokeRef.current);
				
				return;
			}
			
			// Otherwise, check confirmed strokes from the server
			const myStrokes = strokes.filter(
				s => s.userId === userId && !optimisticallyDeletedStrokesRef.current.has(s._id)
			);
			
			if (myStrokes.length === 0) return;
			
			// Sort by createdAt descending to find the most recent
			const sortedStrokes = myStrokes.sort((a, b) => b.createdAt - a.createdAt);
			const lastStroke = sortedStrokes[0];
			
			// Mark as optimistically deleted
			optimisticallyDeletedStrokesRef.current.add(lastStroke._id);
			
			// Redraw immediately
			const baked: RenderStroke[] = strokes
				.filter(s => !optimisticallyDeletedStrokesRef.current.has(s._id))
				.map((s) => ({
					color: s.color,
					size: s.size,
					points: s.points,
					mode: s.mode,
				}));
			drawAll(baked);
			for (const pending of pendingStrokesRef.current) {
				drawStroke(pending);
			}
			if (liveStrokeRef.current) drawStroke(liveStrokeRef.current);
		};
		
		onUndo(handleUndo);
	}, [onUndo, strokes, userId, drawAll, drawStroke]);

	// After pointer up, clear live stroke snapshot (the backend version will arrive via query)
	useEffect(() => {
		const up = (e: PointerEvent) => {
			pointerUp(e);
			liveStrokeRef.current = null;
		};
		window.addEventListener("pointerup", up);
		return () => window.removeEventListener("pointerup", up);
	}, [pointerUp]);

	// Attach pointer events on the canvas node (only if not published)
	useEffect(() => {
		const el = canvasRef.current;
		if (!el) return;

		// Skip drawing events if canvas is published
		if (isPublished) {
			const move = (e: PointerEvent) => {
				if (onCursor) {
					const w = screenToWorld(e.offsetX, e.offsetY);
					onCursor(w);
				}
			};
			const leave = (_e: PointerEvent) => onCursor?.(undefined);

			window.addEventListener("pointermove", move);
			el.addEventListener("pointerleave", leave);

			return () => {
				window.removeEventListener("pointermove", move);
				el.removeEventListener("pointerleave", leave);
			};
		}

		const down = (e: PointerEvent) => pointerDown(e);
		const move = (e: PointerEvent) => {
			pointerMove(e);
			if (onCursor) {
				const w = screenToWorld(e.offsetX, e.offsetY);
				onCursor(w);
			}
		};
		const leave = (_e: PointerEvent) => onCursor?.(undefined);

		el.addEventListener("pointerdown", down);
		window.addEventListener("pointermove", move);
		el.addEventListener("pointerleave", leave);

		return () => {
		el.removeEventListener("pointerdown", down);
		window.removeEventListener("pointermove", move);
		el.removeEventListener("pointerleave", leave);
		};
	}, [canvasRef, pointerDown, pointerMove, screenToWorld, onCursor, isPublished]);

	return (
		<>
			<canvas
				ref={canvasRef}
				className={`w-full h-full touch-none block ${isPublished ? 'cursor-not-allowed' : ''}`}
				aria-label={isPublished ? "Published canvas (read-only)" : "Drawing canvas"}
			/>
			{isPublished && (
				<div className="absolute top-3 right-3 bg-neutral-900/90 text-white px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 pointer-events-none">
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
						<path d="M7 11V7a5 5 0 0 1 10 0v4" />
					</svg>
					Read Only - Unpublish to Edit
				</div>
			)}
		</>
	);
}