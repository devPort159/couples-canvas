import { useEffect, useRef } from "react";

type Contributor = {
	clerkId: string;
	username?: string;
	firstName?: string;
	lastName?: string;
	imageUrl?: string;
};

type ContributorsModalProps = {
	isOpen: boolean;
	onClose: () => void;
	contributors: Contributor[];
	creatorId?: string;
};

export default function ContributorsModal({
	isOpen,
	onClose,
	contributors,
	creatorId,
}: ContributorsModalProps) {
	const modalRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};

		const handleClickOutside = (e: MouseEvent) => {
			if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			document.addEventListener("mousedown", handleClickOutside);
			document.body.style.overflow = "hidden";
		}

		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.removeEventListener("mousedown", handleClickOutside);
			document.body.style.overflow = "unset";
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const getDisplayName = (contributor: Contributor) => {
		return contributor.username || contributor.firstName || "Anonymous";
	};

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div
				ref={modalRef}
				className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
			>
				{/* Header */}
				<div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
					<h2 className="text-xl font-serif font-bold text-neutral-900">
						Contributors ({contributors.length})
					</h2>
					<button
						onClick={onClose}
						className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
						aria-label="Close"
					>
						<svg
							width="20"
							height="20"
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
				</div>

				{/* Contributors List */}
				<div className="flex-1 overflow-y-auto p-6">
					{contributors.length === 0 ? (
						<div className="text-center py-8 text-neutral-500">
							No contributors yet
						</div>
					) : (
						<div className="space-y-3">
							{contributors.map((contributor) => {
								const isCreator = contributor.clerkId === creatorId;
								return (
									<div
										key={contributor.clerkId}
										className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200 hover:bg-neutral-100 transition-colors"
									>
										{contributor.imageUrl ? (
											<img
												src={contributor.imageUrl}
												alt={getDisplayName(contributor)}
												className="w-10 h-10 rounded-full object-cover flex-shrink-0"
											/>
										) : (
											<div className="w-10 h-10 rounded-full bg-neutral-300 flex items-center justify-center flex-shrink-0">
												<span className="text-sm font-semibold text-neutral-600">
													{getDisplayName(contributor).charAt(0).toUpperCase()}
												</span>
											</div>
										)}
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="text-base font-medium text-neutral-900 truncate">
													{getDisplayName(contributor)}
												</span>
												{isCreator && (
													<span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-200 flex-shrink-0">
														Creator
													</span>
												)}
											</div>
											{contributor.lastName && (
												<span className="text-sm text-neutral-500">
													{contributor.firstName} {contributor.lastName}
												</span>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50">
					<button
						onClick={onClose}
						className="w-full px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

