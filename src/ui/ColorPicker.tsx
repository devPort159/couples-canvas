// src/ui/ColorPicker.tsx
import { useEffect } from "react";

type ColorPickerProps = {
	isOpen: boolean;
	onClose: () => void;
	currentColor: string;
	onColorSelect: (color: string) => void;
	colors: Map<string, string>;
};

export default function ColorPicker({
	isOpen,
	onClose,
	currentColor,
	onColorSelect,
	colors,
}: ColorPickerProps) {
	// Close on escape key
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		if (isOpen) {
			document.addEventListener("keydown", handleEscape);
			// Prevent body scroll when modal is open
			document.body.style.overflow = "hidden";
		}
		return () => {
			document.removeEventListener("keydown", handleEscape);
			document.body.style.overflow = "";
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	// Check if current color is a custom color (not in presets)
	const isCustomColor = !Array.from(colors.keys()).includes(currentColor);

	return (
		<>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/30 z-40 transition-opacity"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Bottom Sheet */}
			<div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
				{/* Handle */}
				<div className="flex justify-center pt-3 pb-2">
					<div className="w-12 h-1 bg-neutral-300 rounded-full" />
				</div>

				{/* Content */}
				<div className="p-6 pb-8">
					<h2 className="text-lg font-semibold mb-4">Choose Color</h2>

					{/* Color Grid */}
					<div className="grid grid-cols-5 gap-3 mb-6">
						{Array.from(colors.entries()).map(([color, name]) => (
							<button
								key={color}
								onClick={() => onColorSelect(color)}
								className={`aspect-square rounded-xl border-2 transition-all ${
									currentColor === color
										? "border-neutral-900 ring-4 ring-neutral-900/20 scale-95"
										: "border-neutral-200 hover:scale-105 active:scale-95"
								}`}
								style={{ background: color }}
								aria-label={`Color ${name}`}
							>
								{currentColor === color && (
									<svg
										className="w-full h-full p-2 text-white drop-shadow-md"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="3"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<polyline points="20 6 9 17 4 12" />
									</svg>
								)}
							</button>
						))}
						
						{/* Custom Color as 10th option */}
						<label
							className={`aspect-square rounded-xl border-2 cursor-pointer flex items-center justify-center relative hover:scale-105 active:scale-95 transition-all ${
								isCustomColor
									? "border-neutral-900 ring-4 ring-neutral-900/20 scale-95"
									: "border-neutral-300"
							}`}
							style={{
								background:
									"conic-gradient(from 0deg, #ef4444, #f59e0b, #fbbf24, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
							}}
						>
							<input
								type="color"
								value={currentColor}
								onChange={(e) => onColorSelect(e.target.value)}
								className="absolute inset-0 opacity-0 cursor-pointer"
								aria-label="Custom color picker"
							/>
							{isCustomColor ? (
								<svg
									className="w-full h-full p-2 text-white drop-shadow-md"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="3"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<polyline points="20 6 9 17 4 12" />
								</svg>
							) : (
								<span className="text-white text-2xl font-bold drop-shadow-lg pointer-events-none">
									+
								</span>
							)}
						</label>
					</div>

					{/* Close Button */}
					<button
						onClick={onClose}
						className="w-full mt-2 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 active:bg-neutral-950 transition-colors"
					>
						Done
					</button>
				</div>
			</div>

			{/* Animation styles */}
			<style>{`
				@keyframes slide-up {
					from {
						transform: translateY(100%);
					}
					to {
						transform: translateY(0);
					}
				}
				.animate-slide-up {
					animation: slide-up 0.3s ease-out;
				}
			`}</style>
		</>
	);
}

