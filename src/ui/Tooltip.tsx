// src/ui/Tooltip.tsx
import { useState, useRef, useEffect, type ReactNode } from "react";

type TooltipProps = {
	content: string;
	children: ReactNode;
	side?: "top" | "right" | "bottom" | "left";
	delay?: number;
};

export default function Tooltip({
	content,
	children,
	side = "left",
	delay = 500,
}: TooltipProps) {
	const [isVisible, setIsVisible] = useState(false);
	const timeoutRef = useRef<number | undefined>(undefined);

	const handleMouseEnter = () => {
		timeoutRef.current = window.setTimeout(() => {
			setIsVisible(true);
		}, delay);
	};

	const handleMouseLeave = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		setIsVisible(false);
	};

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	const getPositionClasses = () => {
		switch (side) {
			case "top":
				return "bottom-full left-1/2 -translate-x-1/2 mb-2";
			case "right":
				return "left-full top-1/2 -translate-y-1/2 ml-2";
			case "bottom":
				return "top-full left-1/2 -translate-x-1/2 mt-2";
			case "left":
				return "right-full top-1/2 -translate-y-1/2 mr-2";
			default:
				return "left-full top-1/2 -translate-y-1/2 ml-2";
		}
	};

	return (
		<div
			className="relative inline-flex"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{children}
			{isVisible && (
				<div
					className={`absolute ${getPositionClasses()} px-2 py-1 bg-neutral-900 text-white text-xs rounded whitespace-nowrap pointer-events-none z-50`}
				>
					{content}
				</div>
			)}
		</div>
	);
}

