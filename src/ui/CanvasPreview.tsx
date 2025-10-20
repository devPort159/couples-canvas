// src/ui/CanvasPreview.tsx
import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type Point = { x: number; y: number; t: number };
type Stroke = {
	color: string;
	size: number;
	points: Point[];
	mode?: "draw" | "erase";
};

type Props = {
	canvasId: Id<"canvases">;
	className?: string;
	thumbnailUrl?: string | null;
};

export default function CanvasPreview({ canvasId, className = "", thumbnailUrl }: Props) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	// Only query strokes if we don't have a thumbnail (backward compatibility)
	const strokes = useQuery(
		api.strokes.listStrokes,
		thumbnailUrl ? "skip" : { canvasId }
	);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !strokes) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Set canvas size to match display size for crisp rendering
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx.scale(dpr, dpr);

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Set white background
		ctx.fillStyle = "white";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Helper to convert world coordinates to screen coordinates
		const worldToScreen = (x: number, y: number) => ({
			x: x * rect.width,
			y: y * rect.height,
		});

		// Helper to draw a stroke with quadratic smoothing
		const drawStroke = (stroke: Stroke) => {
			if (stroke.points.length === 0) return;

			ctx.save();
			ctx.lineCap = "round";
			ctx.lineJoin = "round";

			// Calculate line width
			const basePx = Math.min(rect.width, rect.height);
			ctx.lineWidth = Math.max(0.5, stroke.size * basePx);

			if (stroke.mode === "erase") {
				ctx.globalCompositeOperation = "destination-out";
				ctx.strokeStyle = "rgba(0,0,0,1)";
			} else {
				ctx.globalCompositeOperation = "source-over";
				ctx.strokeStyle = stroke.color ?? "#111";
			}

			ctx.beginPath();

			// Handle single point
			if (stroke.points.length < 2) {
				const p = stroke.points[0];
				const screen = worldToScreen(p.x, p.y);
				ctx.moveTo(screen.x, screen.y);
				ctx.lineTo(screen.x + 0.1, screen.y + 0.1);
			} else {
				// Quadratic smoothing
				let p0 = stroke.points[0];
				const start = worldToScreen(p0.x, p0.y);
				ctx.moveTo(start.x, start.y);

				for (let i = 1; i < stroke.points.length; i++) {
					const p1 = stroke.points[i];
					const midX = (p0.x + p1.x) / 2;
					const midY = (p0.y + p1.y) / 2;
					const mid = worldToScreen(midX, midY);
					const control = worldToScreen(p0.x, p0.y);
					ctx.quadraticCurveTo(control.x, control.y, mid.x, mid.y);
					p0 = p1;
				}

				// Draw to the last point
				const last = stroke.points[stroke.points.length - 1];
				const lastScreen = worldToScreen(last.x, last.y);
				ctx.lineTo(lastScreen.x, lastScreen.y);
			}

			ctx.stroke();
			ctx.restore();
		};

		// Draw all strokes
		for (const dbStroke of strokes) {
			const renderStroke: Stroke = {
				color: dbStroke.color,
				size: dbStroke.size,
				points: dbStroke.points,
				mode: dbStroke.mode,
			};
			drawStroke(renderStroke);
		}
	}, [strokes]);

	// If we have a thumbnail URL (published canvas), use it directly
	if (thumbnailUrl) {
		return (
			<img
				src={thumbnailUrl}
				alt="Canvas preview"
				className={className}
				style={{ objectFit: "cover" }}
			/>
		);
	}

	// Otherwise show placeholder (unpublished canvas - no need to load strokes)
	return (
		<div className={`${className} bg-white`} aria-label="Canvas preview (unpublished)">
			{/* Empty white placeholder */}
		</div>
	);
}

