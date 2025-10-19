import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser, SignedIn, SignedOut } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import CanvasCard from "../ui/CanvasCard";
import BackButton from "../ui/BackButton";
import DeleteConfirmModal from "../ui/DeleteConfirmModal";
import { useNavigate } from "../lib/router";

type TabType = "all" | "created" | "collaborated";

export default function MyCanvasesPage() {
	const { user } = useUser();
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<TabType>("all");
	const observerRef = useRef<IntersectionObserver | null>(null);
	const loadMoreRef = useRef<HTMLDivElement>(null);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [canvasToDelete, setCanvasToDelete] = useState<{
		id: Id<"canvases">;
		title?: string;
	} | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const deleteCanvas = useMutation(api.canvases.deleteCanvas);

	const ownedCanvases = useQuery(
		api.canvases.listMyOwnedCanvases,
		user?.id ? { userId: user.id } : "skip"
	);

	const collaboratedCanvases = useQuery(
		api.canvases.listMyCollaborations,
		user?.id ? { userId: user.id } : "skip"
	);

	// Combine and filter based on active tab
	const allCanvases = [
		...(ownedCanvases || []),
		...(collaboratedCanvases || []),
	].sort((a, b) => b.createdAt - a.createdAt);

	const displayedCanvases =
		activeTab === "created"
			? ownedCanvases || []
			: activeTab === "collaborated"
			? collaboratedCanvases || []
			: allCanvases;

	// For infinite scroll (future: implement pagination in backend)
	useEffect(() => {
		if (loadMoreRef.current && observerRef.current) {
			observerRef.current.observe(loadMoreRef.current);
		}
		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, []);

	const handleDeleteClick = (id: Id<"canvases">, title?: string) => {
		setCanvasToDelete({ id, title });
		setDeleteModalOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!canvasToDelete || !user?.id) return;

		setIsDeleting(true);
		try {
			await deleteCanvas({
				canvasId: canvasToDelete.id,
				userId: user.id,
			});
			setDeleteModalOpen(false);
			setCanvasToDelete(null);
		} catch (error) {
			console.error("Failed to delete canvas:", error);
			alert("Failed to delete canvas. Please try again.");
		} finally {
			setIsDeleting(false);
		}
	};

	const handleCloseModal = () => {
		if (!isDeleting) {
			setDeleteModalOpen(false);
			setCanvasToDelete(null);
		}
	};

	return (
		<div className="min-h-dvh bg-gradient-to-b from-neutral-100 to-neutral-200">
			<SignedOut>
				<div className="min-h-dvh flex items-center justify-center p-6">
					<div className="text-center max-w-md">
						<h2 className="text-2xl font-serif font-bold text-neutral-900 mb-4">
							Sign in to view your canvases
						</h2>
						<p className="text-neutral-600 mb-6">
							Create an account or sign in to access your personal canvas gallery.
						</p>
						<button
							onClick={() => navigate("/")}
							className="px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors"
						>
							Go to Home
						</button>
					</div>
				</div>
			</SignedOut>

			<SignedIn>
				<BackButton />
				<div className="max-w-7xl mx-auto px-6 py-12">
					{/* Header */}
					<div className="mb-8">
						<h1 className="text-4xl font-serif font-bold text-neutral-900 mb-2">
							My Canvases
						</h1>
						<p className="text-neutral-600">
							View and manage your canvases
						</p>
					</div>

					{/* Tabs */}
					<div className="flex gap-2 mb-8 border-b border-neutral-200">
						<button
							onClick={() => setActiveTab("all")}
							className={`px-4 py-2 font-medium transition-colors border-b-2 text-nowrap ${
								activeTab === "all"
									? "border-neutral-900 text-neutral-900"
									: "border-transparent text-neutral-500 hover:text-neutral-700"
							}`}
						>
							All ({allCanvases.length})
						</button>
						<button
							onClick={() => setActiveTab("created")}
							className={`px-4 py-2 font-medium transition-colors border-b-2 text-nowrap ${
								activeTab === "created"
									? "border-neutral-900 text-neutral-900"
									: "border-transparent text-neutral-500 hover:text-neutral-700"
							}`}
						>
							Created ({ownedCanvases?.length || 0})
						</button>
						<button
							onClick={() => setActiveTab("collaborated")}
							className={`px-4 py-2 font-medium transition-colors border-b-2 text-nowrap ${
								activeTab === "collaborated"
									? "border-neutral-900 text-neutral-900"
									: "border-transparent text-neutral-500 hover:text-neutral-700"
							}`}
						>
							Collabs ({collaboratedCanvases?.length || 0})
						</button>
					</div>

					{/* Canvas Grid */}
					{displayedCanvases.length === 0 ? (
						<div className="text-center py-16">
							<div className="text-neutral-400 mb-4">
								<svg
									width="64"
									height="64"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="mx-auto"
								>
									<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
								</svg>
							</div>
							<h3 className="text-xl font-serif font-bold text-neutral-900 mb-2">
								No canvases yet
							</h3>
							<p className="text-neutral-600 mb-6">
								{activeTab === "all"
									? "Create your first canvas to get started!"
									: activeTab === "created"
									? "You haven't created any canvases yet."
									: "You haven't collaborated on any canvases yet."}
							</p>
							{activeTab === "all" && (
								<button
									onClick={() => navigate("/")}
									className="px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors"
								>
									Create Canvas
								</button>
							)}
						</div>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							{displayedCanvases.map((canvas) => {
								const hasCreatorInfo = "creatorName" in canvas;
								const creatorName = hasCreatorInfo ? (canvas as any).creatorName as string | undefined : undefined;
								const creatorImageUrl = hasCreatorInfo ? (canvas as any).creatorImageUrl as string | undefined : undefined;
								
								// Check if this canvas is owned by the current user
								const isOwned = ownedCanvases?.some(c => c._id === canvas._id);
								
								return (
									<CanvasCard
										key={canvas._id}
										id={canvas._id}
										slug={canvas.slug}
										title={canvas.title}
										description={canvas.description}
										publishedAt={canvas.publishedAt}
										createdAt={canvas.createdAt}
										contributorCount={canvas.contributorCount}
										isPublished={!!canvas.publishedAt}
										creatorName={creatorName}
										creatorImageUrl={creatorImageUrl}
										showDelete={isOwned}
										onDelete={() => handleDeleteClick(canvas._id, canvas.title)}
									/>
								);
							})}
						</div>
					)}

					{/* Infinite scroll trigger */}
					<div ref={loadMoreRef} className="h-4" />
				</div>

				{/* Delete Confirmation Modal */}
				<DeleteConfirmModal
					isOpen={deleteModalOpen}
					onClose={handleCloseModal}
					onConfirm={handleConfirmDelete}
					canvasTitle={canvasToDelete?.title}
					isDeleting={isDeleting}
				/>
			</SignedIn>
		</div>
	);
}

