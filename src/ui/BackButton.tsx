import { useNavigate } from "../lib/router";

export default function BackButton() {
	const navigate = useNavigate();

	const handleBack = () => {
		// Go back in history, or to home if no history
		if (window.history.length > 1) {
			window.history.back();
		} else {
			navigate("/");
		}
	};

	return (
		<button
			onClick={handleBack}
			className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur border border-neutral-200 rounded-lg shadow-lg hover:bg-white transition-colors"
			aria-label="Go back"
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
				<path d="m15 18-6-6 6-6" />
			</svg>
			<span className="text-sm font-medium text-neutral-900">Back</span>
		</button>
	);
}

