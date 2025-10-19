// src/ui/OverflowMenu.tsx
import { useEffect, useRef } from "react";

type MenuItem = {
	label: string;
	icon: React.ReactNode;
	onClick: () => void;
	destructive?: boolean;
	disabled?: boolean;
};

type OverflowMenuProps = {
	isOpen: boolean;
	onClose: () => void;
	items: MenuItem[];
	align?: "left" | "right";
	triggerRef?: React.RefObject<HTMLElement>;
};

export default function OverflowMenu({
	isOpen,
	onClose,
	items,
	align = "right",
	triggerRef,
}: OverflowMenuProps) {
	const menuRef = useRef<HTMLDivElement>(null);

	// Close on click outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			const isOutsideMenu = menuRef.current && !menuRef.current.contains(target);
			const isOutsideTrigger = !triggerRef?.current || !triggerRef.current.contains(target);
			
			if (isOutsideMenu && isOutsideTrigger) {
				onClose();
			}
		};

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleEscape);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			ref={menuRef}
			className={`absolute bottom-full mb-2 ${
				align === "right" ? "right-0" : "left-0"
			} bg-white border border-neutral-200 rounded-lg shadow-lg min-w-[190px] z-50 overflow-hidden`}
		>
			{items.map((item, index) => (
				<button
					key={index}
					onClick={() => {
						if (!item.disabled) {
							item.onClick();
							onClose();
						}
					}}
					disabled={item.disabled}
					className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
						item.disabled
							? "opacity-40 cursor-not-allowed"
							: item.destructive
							? "text-red-600 hover:bg-red-50 active:bg-red-100"
							: "text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100"
					} ${index !== items.length - 1 ? "border-b border-neutral-100" : ""}`}
				>
					<span className="text-neutral-500">{item.icon}</span>
					<span className="font-medium text-sm">{item.label}</span>
				</button>
			))}
		</div>
	);
}

