import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import CanvasCard from "../ui/CanvasCard";
import BackButton from "../ui/BackButton";

export default function PublicGalleryPage() {
	const [limit, setLimit] = useState(50);
	const observerRef = useRef<IntersectionObserver | null>(null);
	const loadMoreRef = useRef<HTMLDivElement>(null);

	const publishedCanvases = useQuery(api.canvases.listPublishedCanvases, {
		limit,
	});

	// Infinite scroll: load more when scrolling to bottom
	useEffect(() => {
		observerRef.current = new IntersectionObserver(
			(entries) => {
				const first = entries[0];
				if (first.isIntersecting && publishedCanvases && publishedCanvases.length >= limit) {
					// Load 50 more
					setLimit((prev) => prev + 50);
				}
			},
			{ threshold: 0.1 }
		);

		if (loadMoreRef.current) {
			observerRef.current.observe(loadMoreRef.current);
		}

		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, [publishedCanvases, limit]);

	return (
		<div className="min-h-dvh bg-gradient-to-b from-neutral-100 to-neutral-200">
			<BackButton />
			<div className="max-w-7xl mx-auto px-6 pb-12 pt-16 sm:py-12">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-4xl font-serif font-bold text-neutral-900 mb-2">
						Public Gallery
					</h1>
					<p className="text-neutral-600">
						Explore published canvases from the community
					</p>
				</div>

				{/* Canvas Grid */}
				{!publishedCanvases ? (
					<div className="text-center py-16">
						<div className="text-sm text-neutral-500">Loading...</div>
					</div>
				) : publishedCanvases.length === 0 ? (
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
							No published canvases yet
						</h3>
						<p className="text-neutral-600">
							Be the first to publish a canvas to the gallery!
						</p>
					</div>
				) : (
					<>
						<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
							{publishedCanvases.map((canvas) => (
								<CanvasCard
									key={canvas._id}
									id={canvas._id}
									slug={canvas.slug}
									title={canvas.title}
									description={canvas.description}
									publishedAt={canvas.publishedAt}
									createdAt={canvas.publishedAt || 0}
									contributorCount={canvas.contributorCount}
									isPublished={true}
									creatorName={canvas.creatorName}
									creatorImageUrl={canvas.creatorImageUrl}
									hideContributorCountOnMobile={true}
									showPublishedBadge={false}
									thumbnailUrl={canvas.thumbnailUrl}
								/>
							))}
						</div>

						{/* Infinite scroll trigger */}
						{publishedCanvases.length >= limit && (
							<div ref={loadMoreRef} className="h-4 mt-8 flex justify-center">
								<div className="text-sm text-neutral-500">Loading more...</div>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}

