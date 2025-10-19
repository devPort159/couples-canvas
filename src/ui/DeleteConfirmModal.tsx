import { useEffect, useRef } from "react";

type DeleteConfirmModalProps = {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	canvasTitle?: string;
	isDeleting?: boolean;
};

export default function DeleteConfirmModal({
	isOpen,
	onClose,
	onConfirm,
	canvasTitle,
	isDeleting = false,
}: DeleteConfirmModalProps) {
	const modalRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isDeleting) onClose();
		};

		const handleClickOutside = (e: MouseEvent) => {
			if (modalRef.current && !modalRef.current.contains(e.target as Node) && !isDeleting) {
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
	}, [isOpen, onClose, isDeleting]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div
				ref={modalRef}
				className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
			>
				{/* Header */}
				<div className="px-6 py-4 border-b border-neutral-200">
					<h2 className="text-xl font-serif font-bold text-neutral-900">
						Delete Canvas?
					</h2>
				</div>

				{/* Content */}
				<div className="p-6">
					<p className="text-neutral-700 mb-2">
						Are you sure you want to delete{" "}
						<span className="font-semibold">
							{canvasTitle ? `"${canvasTitle}"` : "this canvas"}
						</span>
						?
					</p>
					<p className="text-sm text-neutral-600">
						This action cannot be undone. All drawings and data associated with this canvas will be permanently deleted.
					</p>
				</div>

				{/* Footer */}
				<div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex gap-3">
					<button
						onClick={onClose}
						disabled={isDeleting}
						className="flex-1 px-4 py-2 bg-white hover:bg-neutral-100 text-neutral-900 rounded-lg font-medium transition-colors border border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						disabled={isDeleting}
						className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isDeleting ? "Deleting..." : "Delete"}
					</button>
				</div>
			</div>
		</div>
	);
}

