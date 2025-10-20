import { Link } from "../lib/router";
import type { Id } from "../../convex/_generated/dataModel";
import CanvasPreview from "./CanvasPreview";

type CanvasCardProps = {
	id: Id<"canvases">;
	slug: string;
	title?: string;
	description?: string;
	publishedAt?: number;
	createdAt: number;
	contributorCount: number;
	isPublished?: boolean;
	creatorName?: string;
	creatorImageUrl?: string;
	showDelete?: boolean;
	onDelete?: () => void;
	hideContributorCountOnMobile?: boolean;
	showPublishedBadge?: boolean;
	thumbnailUrl?: string | null;
};

export default function CanvasCard({
	id,
	slug,
	title,
	description,
	publishedAt,
	createdAt,
	contributorCount,
	isPublished,
	creatorName,
	creatorImageUrl,
	showDelete = false,
	onDelete,
	hideContributorCountOnMobile = false,
	showPublishedBadge = true,
	thumbnailUrl,
}: CanvasCardProps) {
	const displayTitle = title || "Untitled Canvas";
	const displayDescription = description || "No description";
	
	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const handleDeleteClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onDelete?.();
	};

	return (
		<Link
			to={`/canvas/${slug}`}
			className="group block bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow"
		>
		{/* Canvas Preview */}
		<div className="aspect-square bg-white flex items-center justify-center relative overflow-hidden">
			<CanvasPreview canvasId={id} className="w-full h-full" thumbnailUrl={thumbnailUrl} />

			{/* Published badge */}
			{isPublished && showPublishedBadge && (
				<div className="absolute top-2 right-2 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full border border-amber-200">
					Published
				</div>
			)}

			{/* Delete button */}
			{showDelete && onDelete && (
				<button
					onClick={handleDeleteClick}
					className="absolute top-2 left-2 p-1.5 bg-white/90 hover:bg-red-600 text-neutral-700 hover:text-white rounded-lg transition-all shadow-sm hover:shadow-md group/delete"
					aria-label="Delete canvas"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			)}
		</div>

			{/* Canvas Info */}
			<div className="p-4">
				<h3 className="font-serif font-bold text-lg text-neutral-900 mb-1 line-clamp-1">
					{displayTitle}
				</h3>
				<p className="hidden sm:block text-sm text-neutral-600 mb-3 line-clamp-2">
					{displayDescription}
				</p>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-neutral-500 mb-2 gap-1">
					<span>{formatDate(publishedAt || createdAt)}</span>
					<span className={hideContributorCountOnMobile ? "hidden sm:inline" : ""}>{contributorCount} {contributorCount === 1 ? "contributor" : "contributors"}</span>
				</div>
				{creatorName && (
					<div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
						{creatorImageUrl && (
							<img
								src={creatorImageUrl}
								alt={creatorName}
								className="w-5 h-5 rounded-full object-cover"
							/>
						)}
						<span className="text-xs text-neutral-600">
							by <span className="font-medium text-neutral-900">{creatorName}</span>
						</span>
					</div>
				)}
			</div>
		</Link>
	);
}

