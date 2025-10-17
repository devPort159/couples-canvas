import { useMemo, useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import CanvasBoard from "../canvas/CanvasBoard";
import Toolbar from "../canvas/Toolbar";
import PresenceLayer from "../canvas/PresenceLayer";
export type Mode = "draw" | "erase";

export default function CanvasPage({ slug }: { slug: string }) {
	const canvas = useQuery(api.canvases.getCanvasBySlug, { slug });
	const canvasId = canvas?._id as Id<"canvases"> | undefined;

	const strokes = useQuery(
		api.strokes.listStrokes,
		canvasId ? { canvasId } : "skip"
	);

	const updatePresence = useMutation(api.presence.updatePresence);
	const getPresence = useQuery(
		api.presence.getPresence,
		canvasId ? { canvasId } : "skip"
	);

	const [color, setColor] = useState("#111111");
	const [size, setSize] = useState(0.006);
	const [mode, setMode] = useState<Mode>("draw");
	const [showCopiedToast, setShowCopiedToast] = useState(false);

	const userId = useMemo(() => crypto.randomUUID(), []);
	const undoHandlerRef = useRef<(() => void) | null>(null);
	const undo = useMutation(api.strokes.undoLastByUser);

	// Throttle presence updates to avoid flooding the database
	const lastPresenceUpdateRef = useRef<number>(0);
	const pendingPresenceRef = useRef<{ x: number; y: number } | undefined>(undefined);
	const presenceTimeoutRef = useRef<number | undefined>(undefined);

	const throttledUpdatePresence = useCallback(
		(cursorWorld?: { x: number; y: number }) => {
			if (!canvasId) return;

			const now = Date.now();
			const timeSinceLastUpdate = now - lastPresenceUpdateRef.current;
			const THROTTLE_MS = 100; // Update at most every 100ms

			// Clear any pending timeout
			if (presenceTimeoutRef.current) {
				clearTimeout(presenceTimeoutRef.current);
				presenceTimeoutRef.current = undefined;
			}

			if (timeSinceLastUpdate >= THROTTLE_MS) {
				// Enough time has passed, update immediately
				lastPresenceUpdateRef.current = now;
				updatePresence({
					canvasId,
					userId,
					cursor: cursorWorld ? { x: cursorWorld.x, y: cursorWorld.y } : undefined,
				});
			} else {
				// Too soon, schedule an update for later
				pendingPresenceRef.current = cursorWorld;
				presenceTimeoutRef.current = window.setTimeout(() => {
					lastPresenceUpdateRef.current = Date.now();
					updatePresence({
						canvasId,
						userId,
						cursor: pendingPresenceRef.current
							? { x: pendingPresenceRef.current.x, y: pendingPresenceRef.current.y }
							: undefined,
					});
					pendingPresenceRef.current = undefined;
					presenceTimeoutRef.current = undefined;
				}, THROTTLE_MS - timeSinceLastUpdate);
			}
		},
		[canvasId, userId, updatePresence]
	);

	if (!canvasId) {
		return (
			<div className="min-h-dvh grid place-items-center">
				<div className="text-sm text-neutral-500">Loading canvas…</div>
			</div>
		);
	}

	return (
		<div className="w-full h-dvh flex flex-col lg:flex-row">
			<div className="relative flex-1 bg-gradient-to-b from-neutral-100 to-neutral-200 flex items-center justify-center p-4 overflow-hidden flex-col gap-8">
				<h1 className="text-2xl tracking-[-0.03em] font-serif font-bold text-[#09090B]">couple&apos;s canvas.</h1>
				<div 
					className="relative aspect-square shadow-2xl overflow-hidden max-w-full max-h-full bg-neutral-50"
					style={{ 
						width: 'min(100%, 100vh - 10rem)', 
						height: 'min(100vw - 2rem, 100vh - 10rem)'
					}}
				>
					<CanvasBoard
						canvasId={canvasId}
						userId={userId}
						mode={mode}
						color={color}
						size={size}
						strokes={strokes ?? []}
						onCursor={throttledUpdatePresence}
						onUndo={(handler) => {
							undoHandlerRef.current = handler;
						}}
					/>
					<PresenceLayer presence={(getPresence ?? []).filter(p => p.userId !== userId)} />
				</div>
			</div>
			<Toolbar
				color={color}
				onColor={setColor}
				size={size}
				onSize={setSize}
				mode={mode}
				onMode={setMode}
				onShare={async () => {
					const url = window.location.href;
					
					// Check if mobile device
					const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
					
					if (isMobile && (navigator as any).share) {
						// On mobile: use native share dialog
						try {
							await (navigator as any).share({ url });
						} catch (err) {
							// User cancelled or error - that's okay
						}
					} else {
						// On desktop: copy to clipboard and show toast
						try {
							await navigator.clipboard.writeText(url);
							setShowCopiedToast(true);
							setTimeout(() => setShowCopiedToast(false), 2500);
						} catch (err) {
							console.error('Failed to copy:', err);
						}
					}
				}}
				onUndo={() => {
					// Call optimistic handler first
					if (undoHandlerRef.current) {
						undoHandlerRef.current();
					}
					// Then fire the actual mutation (fire and forget)
					undo({ canvasId, userId });
				}}
				canvasId={canvasId}
			/>

			{/* Copied Toast Notification */}
			{showCopiedToast && (
				<div className="fixed left-1/2 -translate-x-1/2 z-50 animate-slide-up" style={{ bottom: '1rem' }}>
					<div className="bg-neutral-900 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2.5 border border-neutral-800">
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="text-green-400"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
						<span className="text-sm font-medium">Link copied to clipboard</span>
					</div>
				</div>
			)}
		</div>
	);
}