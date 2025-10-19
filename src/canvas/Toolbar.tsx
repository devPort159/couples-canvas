// src/canvas/Toolbar.tsx
import { useState, useRef } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Mode } from "../routes/CanvasPage";
import Tooltip from "../ui/Tooltip";
import ColorPicker from "../ui/ColorPicker";
import OverflowMenu from "../ui/OverflowMenu";

type Props = {
	color: string;
	onColor: (c: string) => void;
	size: number;
	onSize: (n: number) => void;
	mode: Mode;
	onMode: (m: Mode) => void;
	onShare: () => void;
	onUndo: () => void;
	canvasId: Id<"canvases">;
	isPublished: boolean;
	isCreator: boolean;
	onTogglePublish: () => void;
	onViewContributors: () => void;
	hasContributors: boolean;
};

const COLORS = new Map([
	["#111111", "Black"],
	["#ffffff", "White"],
	["#ef4444", "Red"],
	["#f59e0b", "Orange"], 
	["#fbbf24", "Yellow"],
	["#10b981", "Green"],
	["#3b82f6", "Blue"],
	["#8b5cf6", "Purple"],
	["#ec4899", "Pink"]
]);

// Icon components
const PencilIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
	</svg>
);

const EraserIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21"/>
		<path d="m5.082 11.09 8.828 8.828"/>
	</svg>
);

const UndoIcon = () => (
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
		<path d="M3 7v6h6" />
		<path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
	</svg>
);

const TrashIcon = () => (
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
		<path d="M3 6h18" />
		<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
		<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
	</svg>
);

const ShareIcon = () => (
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
		<circle cx="18" cy="5" r="3" />
		<circle cx="6" cy="12" r="3" />
		<circle cx="18" cy="19" r="3" />
		<line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
		<line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
	</svg>
);

const MoreIcon = () => (
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
		<circle cx="12" cy="12" r="1" />
		<circle cx="19" cy="12" r="1" />
		<circle cx="5" cy="12" r="1" />
	</svg>
);

const PublishIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" 
		width="20" 
		height="20" 
		viewBox="0 0 24 24" 
		fill="none" 
		stroke="currentColor" 
		strokeWidth="2" 
		strokeLinecap="round" 
		strokeLinejoin="round"
	>
		<path d="M12 3v12"/>
		<path d="m17 8-5-5-5 5"/>
		<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
	</svg>
);

const UnpublishIcon = () => (
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
		<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
		<line x1="12" y1="9" x2="12" y2="13" />
		<line x1="12" y1="17" x2="12.01" y2="17" />
	</svg>
);

const UsersIcon = () => (
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
		<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
		<path d="M16 3.13a4 4 0 0 1 0 7.75" />
	</svg>
);

export default function Toolbar({
	color,
	onColor,
	size,
	onSize,
	mode,
	onMode,
	onShare,
	onUndo,
	canvasId,
	isPublished,
	isCreator,
	onTogglePublish,
	onViewContributors,
	hasContributors,
}: Props) {
	const clearCanvas = useMutation(api.strokes.clearCanvas);

	const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
	const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
	const [isDesktopOverflowMenuOpen, setIsDesktopOverflowMenuOpen] = useState(false);
	const overflowButtonRef = useRef<HTMLButtonElement>(null);
	const desktopOverflowButtonRef = useRef<HTMLButtonElement>(null);

	return (
		<>
			{/* Desktop Layout (Vertical Sidebar) */}
			<div className="hidden lg:flex h-full border-l border-neutral-200 bg-white/80 backdrop-blur flex-col gap-6 p-4 min-w-[80px] items-center">
				{/* Mode buttons */}
				<div className="flex flex-col gap-2 items-center">
					<Tooltip content="Draw" side="left">
						<button
							onClick={() => onMode("draw")}
							className={`p-3 rounded border border-neutral-200 shadow-xs ${mode === "draw" ? "bg-neutral-900 text-white" : "bg-white hover:bg-neutral-50"}`}
							aria-label="Draw mode"
						>
							<PencilIcon />
						</button>
					</Tooltip>
					<Tooltip content="Erase" side="left">
						<button
							onClick={() => onMode("erase")}
							className={`p-3 rounded border border-neutral-200 shadow-xs ${mode === "erase" ? "bg-neutral-900 text-white" : "bg-white hover:bg-neutral-50"}`}
							aria-label="Erase mode"
						>
							<EraserIcon />
						</button>
					</Tooltip>
				</div>

				{/* Divider */}
				<div className="h-px w-full bg-neutral-200" />

				{/* Color picker */}
				<div className="flex flex-col gap-2">
					{Array.from(COLORS.entries()).map(([c, name]) => (
						<Tooltip key={c} content={name} side="left">
							<button
								onClick={() => onColor(c)}
								className={`h-8 w-8 rounded-full border-2 border-neutral-200 ${color === c ? "ring-2 ring-black/20 shadow-md" : ""}`}
								style={{ background: c }}
								aria-label={`Color ${name}`}
							/>
						</Tooltip>
					))}
					<Tooltip content="Custom color" side="left">
						<label
							className="h-8 w-8 rounded-full border border-neutral-300 cursor-pointer flex items-center justify-center relative hover:ring-2 hover:ring-neutral-400"
							style={{
								background:
									"conic-gradient(from 0deg, #ef4444, #f59e0b, #fbbf24, #10b981, #3b82f6, #8b5cf6, #ec4899, #ef4444)",
							}}
						>
							<input
								type="color"
								value={color}
								onChange={(e) => onColor(e.target.value)}
								className="absolute inset-0 opacity-0 cursor-pointer"
							/>
							<span className="text-white text-[10px] font-bold drop-shadow pointer-events-none">
								+
							</span>
						</label>
					</Tooltip>
				</div>

				{/* Divider */}
				<div className="h-px w-full bg-neutral-200" />

				{/* Size slider */}
				<div className="flex flex-col gap-2">
					<Tooltip content={`Brush size: ${Math.round(size * 1000)}`} side="left">
						<div className="flex items-center justify-center">
							<input
								type="range"
								min={0.002}
								max={0.03}
								step={0.001}
								value={size}
								onChange={(e) => onSize(parseFloat(e.target.value))}
								className="w-full [writing-mode:vertical-lr] h-24"
								style={{ direction: "rtl" }}
								aria-label="Brush size"
							/>
						</div>
					</Tooltip>
				</div>

				{/* Spacer */}
				<div className="flex-1" />

				{/* Action buttons */}
				<div className="flex flex-col gap-2">
					<Tooltip content={isPublished ? "Cannot undo on published canvas" : "Undo"} side="left">
						<button
							className="p-3 rounded border border-neutral-200 shadow-xs bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
							onClick={onUndo}
							aria-label="Undo"
							disabled={isPublished}
						>
							<UndoIcon />
						</button>
					</Tooltip>

					{/* Overflow menu for Share/Clear/Publish */}
					<div className="relative">
						<Tooltip content="More actions" side="left">
							<button
								ref={desktopOverflowButtonRef}
								className={`p-3 rounded border border-neutral-200 shadow-xs ${
									isPublished 
										? "bg-amber-50 hover:bg-amber-100 text-amber-700" 
										: "bg-white hover:bg-neutral-50"
								}`}
								onClick={() => setIsDesktopOverflowMenuOpen(!isDesktopOverflowMenuOpen)}
								aria-label="More options"
							>
								<MoreIcon />
							</button>
						</Tooltip>
						<OverflowMenu
							isOpen={isDesktopOverflowMenuOpen}
							onClose={() => setIsDesktopOverflowMenuOpen(false)}
							triggerRef={desktopOverflowButtonRef as React.RefObject<HTMLElement>}
							items={[
								{
									label: "Share",
									icon: <ShareIcon />,
									onClick: onShare,
								},
								...(hasContributors ? [
									{
										label: "View Contributors",
										icon: <UsersIcon />,
										onClick: onViewContributors,
									},
								] : []),
								...(isCreator ? [
									{
										label: "Clear Canvas",
										icon: <TrashIcon />,
										onClick: () => {
											if (confirm("Clear the entire canvas for everyone?")) {
												clearCanvas({ canvasId });
											}
										},
										destructive: true,
										disabled: isPublished,
									},
									{
										label: isPublished ? "Unpublish" : "Publish Canvas",
										icon: isPublished ? <UnpublishIcon /> : <PublishIcon />,
										onClick: onTogglePublish,
									},
								] : []),
							]}
						/>
					</div>
				</div>
			</div>

			{/* Mobile Layout (Compact Bottom Toolbar) */}
			<div className="flex lg:hidden w-full border-t border-neutral-200 bg-white/80 backdrop-blur flex-row gap-3 p-3 items-center justify-between relative">
				{/* Mode buttons */}
				<div className="flex gap-2">
					<button
						onClick={() => onMode("draw")}
						className={`p-2.5 rounded border border-neutral-200 shadow-xs ${mode === "draw" ? "bg-neutral-900 text-white" : "bg-white"}`}
						aria-label="Draw mode"
					>
						<PencilIcon />
					</button>
					<button
						onClick={() => onMode("erase")}
						className={`p-2.5 rounded border border-neutral-200 shadow-xs ${mode === "erase" ? "bg-neutral-900 text-white" : "bg-white"}`}
						aria-label="Erase mode"
					>
						<EraserIcon />
					</button>
				</div>

				{/* Color button (opens modal) */}
				<button
					onClick={() => setIsColorPickerOpen(true)}
					className="h-10 w-10 rounded-full border-2 border-neutral-300 shadow-sm relative"
					style={{ background: color }}
					aria-label="Choose color"
				>
					<div className="absolute inset-0 flex items-center justify-center">
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="white"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="drop-shadow"
						>
							<path d="M12 5v14M5 12h14" />
						</svg>
					</div>
				</button>

				{/* Size slider */}
				<div className="flex-1 flex items-center gap-2 px-2 min-w-[80px] max-w-[140px]">
					<input
						type="range"
						min={0.002}
						max={0.03}
						step={0.001}
						value={size}
						onChange={(e) => onSize(parseFloat(e.target.value))}
						className="w-full h-1"
						aria-label="Brush size"
					/>
				</div>

			{/* Undo button */}
			<button
				className="p-2.5 rounded border border-neutral-200 shadow-xs bg-white disabled:opacity-40 disabled:cursor-not-allowed"
				onClick={onUndo}
				aria-label="Undo"
				disabled={isPublished}
			>
				<UndoIcon />
			</button>

				{/* Overflow menu */}
				<div className="relative">
					<button
						ref={overflowButtonRef}
						className="p-2.5 rounded border border-neutral-200 shadow-xs bg-white"
						onClick={() => setIsOverflowMenuOpen(!isOverflowMenuOpen)}
						aria-label="More options"
					>
						<MoreIcon />
					</button>
					<OverflowMenu
						isOpen={isOverflowMenuOpen}
						onClose={() => setIsOverflowMenuOpen(false)}
						triggerRef={overflowButtonRef as React.RefObject<HTMLElement>}
						items={[
							{
								label: "Share",
								icon: <ShareIcon />,
								onClick: onShare,
							},
							...(hasContributors ? [
								{
									label: "View Contributors",
									icon: <UsersIcon />,
									onClick: onViewContributors,
								},
							] : []),
							...(isCreator ? [
								{
									label: "Clear Canvas",
									icon: <TrashIcon />,
									onClick: () => {
										if (confirm("Clear the entire canvas for everyone?")) {
											clearCanvas({ canvasId });
										}
									},
									destructive: true,
									disabled: isPublished,
								},
								{
									label: isPublished ? "Unpublish" : "Publish Canvas",
									icon: isPublished ? <UnpublishIcon /> : <PublishIcon />,
									onClick: onTogglePublish,
								},
							] : []),
						]}
					/>
				</div>
			</div>

			{/* Color Picker Modal (Mobile Only) */}
			<div className="lg:hidden">
				<ColorPicker
					isOpen={isColorPickerOpen}
					onClose={() => setIsColorPickerOpen(false)}
					currentColor={color}
					onColorSelect={onColor}
					colors={COLORS}
				/>
			</div>
		</>
	);
}