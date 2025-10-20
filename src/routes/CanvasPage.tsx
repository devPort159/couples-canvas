import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import CanvasBoard from "../canvas/CanvasBoard";
import Toolbar from "../canvas/Toolbar";
import PresenceLayer from "../canvas/PresenceLayer";
import EditableText from "../ui/EditableText";
import BackButton from "../ui/BackButton";
import ContributorsModal from "../ui/ContributorsModal";
import usePresence from "@convex-dev/presence/react";
export type Mode = "draw" | "erase";

export default function CanvasPage({ slug }: { slug: string }) {
	const { user } = useUser();
	// Use Clerk userId if signed in, otherwise use persisted anonymous ID
	const userId = useMemo(() => {
		if (user?.id) return user.id;
		
		// For anonymous users, persist the ID in localStorage to avoid creating new presence entries on each reload
		const stored = localStorage.getItem('anonymousUserId');
		if (stored) return stored;
		
		const newId = crypto.randomUUID();
		localStorage.setItem('anonymousUserId', newId);
		return newId;
	}, [user?.id]);
	const canvas = useQuery(api.canvases.getCanvasBySlug, { slug });
	const canvasId = canvas?._id as Id<"canvases"> | undefined;

	const strokes = useQuery(
		api.strokes.listStrokes,
		canvasId ? { canvasId } : "skip"
	);

	// New Convex Presence Component
	const userName = user?.firstName || user?.username || `Anonymous ${userId.slice(0, 4)}`;
	const presenceState = usePresence(
		api.presence,
		canvasId ?? "skip", // Use a unique fallback to avoid polluting a shared room
		userId // Pass userId, not userName (userName goes in the data field via backend)
	);
	// Filter for ONLY online users, and exclude current user
	const otherUsers = presenceState?.filter(p => p.online && p.userId !== userId) ?? [];
	
	// DEBUG: Log presence data to understand what's happening
	useEffect(() => {
		if (presenceState) {
			console.log('🔍 Full presence state:', presenceState);
			console.log('👤 Current userId:', userId);
			console.log('✅ Online users:', presenceState.filter(p => p.online));
			console.log('❌ Offline users:', presenceState.filter(p => !p.online));
			console.log('📊 Other users (online, excluding self):', otherUsers);
		}
	}, [presenceState, userId, otherUsers]);

	// Update user display name when it changes
	const updateUserData = useMutation(api.presence.updateUserData);
	useEffect(() => {
		if (canvasId && userId) {
			updateUserData({ roomId: canvasId, userId, data: userName });
		}
	}, [canvasId, userId, userName, updateUserData]);

	// OLD PRESENCE SYSTEM (commented out)
	// const updatePresence = useMutation(api.presence.updatePresence);
	// const getPresence = useQuery(
	// 	api.presence.getPresence,
	// 	canvasId && userId ? { canvasId } : "skip"
	// );

	const [color, setColor] = useState("#111111");
	const [size, setSize] = useState(0.006);
	const [mode, setMode] = useState<Mode>("draw");
	const [showCopiedToast, setShowCopiedToast] = useState(false);
	const [showContributorsModal, setShowContributorsModal] = useState(false);

	
	const undoHandlerRef = useRef<(() => void) | null>(null);
	const undo = useMutation(api.strokes.undoLastByUser);
	const updateMetadata = useMutation(api.canvases.updateCanvasMetadata);
	const togglePublish = useAction(api.canvases.togglePublish);

	// OLD PRESENCE SYSTEM (commented out)
	// // Throttle presence updates to avoid flooding the database
	// const lastPresenceUpdateRef = useRef<number>(0);
	// const pendingPresenceRef = useRef<{ x: number; y: number } | undefined>(undefined);
	// const presenceTimeoutRef = useRef<number | undefined>(undefined);

	// const throttledUpdatePresence = useCallback(
	// 	(cursorWorld?: { x: number; y: number }) => {
	// 		if (!canvasId) return;

	// 		const now = Date.now();
	// 		const timeSinceLastUpdate = now - lastPresenceUpdateRef.current;
	// 		const THROTTLE_MS = 100; // Update at most every 100ms

	// 		// Clear any pending timeout
	// 		if (presenceTimeoutRef.current) {
	// 			clearTimeout(presenceTimeoutRef.current);
	// 			presenceTimeoutRef.current = undefined;
	// 		}

	// 		if (timeSinceLastUpdate >= THROTTLE_MS) {
	// 			// Enough time has passed, update immediately
	// 			lastPresenceUpdateRef.current = now;
	// 			updatePresence({
	// 				canvasId,
	// 				userId,
	// 				cursor: cursorWorld ? { x: cursorWorld.x, y: cursorWorld.y } : undefined,
	// 			});
	// 		} else {
	// 			// Too soon, schedule an update for later
	// 			pendingPresenceRef.current = cursorWorld;
	// 			presenceTimeoutRef.current = window.setTimeout(() => {
	// 				lastPresenceUpdateRef.current = Date.now();
	// 				updatePresence({
	// 					canvasId,
	// 					userId,
	// 					cursor: pendingPresenceRef.current
	// 						? { x: pendingPresenceRef.current.x, y: pendingPresenceRef.current.y }
	// 						: undefined,
	// 				});
	// 				pendingPresenceRef.current = undefined;
	// 				presenceTimeoutRef.current = undefined;
	// 			}, THROTTLE_MS - timeSinceLastUpdate);
	// 		}
	// 	},
	// 	[canvasId, userId, updatePresence]
	// );

	const handleSaveTitle = useCallback(
		async (title: string) => {
			if (!canvasId || !userId) return;
			try {
				await updateMetadata({ canvasId, userId, title });
			} catch (error) {
				console.error("Failed to update title:", error);
			}
		},
		[canvasId, userId, updateMetadata]
	);

	const handleSaveDescription = useCallback(
		async (description: string) => {
			if (!canvasId || !userId) return;
			try {
				await updateMetadata({ canvasId, userId, description });
			} catch (error) {
				console.error("Failed to update description:", error);
			}
		},
		[canvasId, userId, updateMetadata]
	);

	const handleTogglePublish = useCallback(async () => {
		if (!canvasId || !userId) return;
		
		const isPublished = !!canvas?.publishedAt;
		
		if (!isPublished) {
			// Publishing: check if title exists
			if (!canvas?.title?.trim()) {
				alert("Please add a title before publishing your canvas.");
				return;
			}
			if (confirm("Publish this canvas to the public gallery? Once published, it will be immutable (no one can edit it).")) {
				try {
					await togglePublish({ canvasId, userId, publish: true });
				} catch (error) {
					console.error("Failed to publish:", error);
					alert("Failed to publish canvas. " + (error as Error).message);
				}
			}
		} else {
			// Unpublishing
			if (confirm("Unpublish this canvas? It will become editable and private again.")) {
				try {
					await togglePublish({ canvasId, userId, publish: false });
				} catch (error) {
					console.error("Failed to unpublish:", error);
					alert("Failed to unpublish canvas. " + (error as Error).message);
				}
			}
		}
	}, [canvasId, userId, canvas?.publishedAt, canvas?.title, togglePublish]);

	const isCreator = canvas?.creatorId === userId;
	const isPublished = !!canvas?.publishedAt;

	if (!canvasId) {
		return (
			<div className="min-h-dvh grid place-items-center">
				<div className="text-sm text-neutral-500">Loading canvas…</div>
			</div>
		);
	}

	return (
		<div className="w-full h-dvh flex flex-col lg:flex-row">
			<BackButton />
			<div className="relative flex-1 bg-gradient-to-b from-neutral-100 to-neutral-200 flex items-center justify-center p-4 overflow-hidden flex-col gap-6">
				{/* Presence indicator - top right of canvas area on desktop */}
				<div className="hidden lg:block absolute top-4 right-4 z-10">
					<PresenceLayer presence={otherUsers} />
				</div>
				<div className="flex flex-col gap-2">
					<EditableText
						value={canvas?.title}
						placeholder="Add a title..."
						onSave={handleSaveTitle}
						isEditable={isCreator}
						as="h1"
						className="text-2xl tracking-[-0.03em] font-serif font-bold text-[#09090B] text-center max-w-md"
						inputClassName="text-2xl tracking-[-0.03em] font-serif font-bold text-[#09090B] text-center"
					/>
					<EditableText
						value={canvas?.description}
						placeholder="Add a description..."
						onSave={handleSaveDescription}
						isEditable={isCreator}
						as="h2"
						multiline={true}
						className="tracking-[-0.03em] font-serif font-medium text-[#09090B] text-center max-w-md"
						inputClassName="tracking-[-0.03em] font-serif font-medium text-[#09090B] text-center resize-none"
					/>
				</div>
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
						onUndo={(handler) => {
							undoHandlerRef.current = handler;
						}}
						isPublished={isPublished}
					/>
				</div>
				{/* Presence indicator - below canvas on mobile only */}
				<div className="lg:hidden">
					<PresenceLayer presence={otherUsers} />
				</div>
			</div>
			<Toolbar
				color={color}
				onColor={setColor}
				size={size}
				onSize={setSize}
				mode={mode}
				onMode={setMode}
				isPublished={isPublished}
				isCreator={isCreator}
				onTogglePublish={handleTogglePublish}
				onViewContributors={() => setShowContributorsModal(true)}
				hasContributors={(canvas?.contributorsData?.length ?? 0) > 0}
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

			{/* Contributors Modal */}
			<ContributorsModal
				isOpen={showContributorsModal}
				onClose={() => setShowContributorsModal(false)}
				contributors={canvas?.contributorsData ?? []}
				creatorId={canvas?.creatorId}
			/>
		</div>
	);
}