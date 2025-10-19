import { useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "../lib/router";

export default function HomePage() {
	const navigate = useNavigate();
	const { user } = useUser();
	const createCanvas = useMutation(api.canvases.createCanvas);
	const [joinSlug, setJoinSlug] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	const handleCreateCanvas = async () => {
		setIsCreating(true);
		try {
			const { slug } = await createCanvas({
				creatorId: user?.id,
			});
			navigate(`/canvas/${slug}`);
		} catch (error) {
			console.error("Failed to create canvas:", error);
			setIsCreating(false);
		}
	};

	const handleJoinCanvas = () => {
		if (joinSlug.trim()) {
			navigate(`/canvas/${joinSlug.trim()}`);
		}
	};

	return (
		<div className="min-h-dvh bg-gradient-to-b from-neutral-100 to-neutral-200 flex flex-col">
			{/* Header with UserButton */}
			<header className="w-full p-6 flex justify-end">
				<SignedIn>
					<UserButton afterSignOutUrl="/" />
				</SignedIn>
			</header>

			{/* Main Content */}
			<div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
				{/* Hero Section */}
				<div className="text-center mb-12">
					<h1 className="text-5xl md:text-6xl tracking-[-0.03em] font-serif font-bold text-[#09090B] mb-4">
						couple&apos;s canvas.
					</h1>
					<p className="text-lg text-neutral-600 max-w-md mx-auto">
						A shared drawing space for creative collaboration
					</p>
				</div>

				{/* Action Cards */}
				<div className="w-full max-w-md space-y-4">
					{/* Create New Canvas */}
					<button
						onClick={handleCreateCanvas}
						disabled={isCreating}
						className="w-full bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white p-6 rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:hover:scale-100"
					>
						<div className="text-left">
							<div className="text-xl font-semibold mb-1">
								{isCreating ? "Creating..." : "Create New Canvas"}
							</div>
							<div className="text-sm text-neutral-300">
								Start a fresh drawing space
							</div>
						</div>
					</button>

					{/* My Canvases (Signed In Only) */}
					<SignedIn>
						<button
							onClick={() => navigate("/my-canvases")}
							className="w-full bg-white hover:bg-neutral-50 text-neutral-900 p-6 rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] border border-neutral-200"
						>
							<div className="text-left">
								<div className="text-xl font-semibold mb-1">
									My Canvases
								</div>
								<div className="text-sm text-neutral-600">
									View canvases you've created or collaborated on
								</div>
							</div>
						</button>
					</SignedIn>

					{/* Public Gallery */}
					<button
						onClick={() => navigate("/gallery")}
						className="w-full bg-white hover:bg-neutral-50 text-neutral-900 p-6 rounded-xl shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] border border-neutral-200"
					>
						<div className="text-left">
							<div className="text-xl font-semibold mb-1">
								Public Gallery
							</div>
							<div className="text-sm text-neutral-600">
								Explore published canvases from the community
							</div>
						</div>
					</button>

					{/* Join Existing Canvas */}
					<div className="bg-white p-6 rounded-xl shadow-lg border border-neutral-200">
						<div className="text-xl font-semibold mb-3 text-neutral-900">
							Join Canvas
						</div>
					<div className="flex gap-2">
						<input
							type="text"
							value={joinSlug}
							onChange={(e) => setJoinSlug(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleJoinCanvas()}
							placeholder="Enter canvas code"
							className="flex-1 min-w-0 px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
						/>
						<button
							onClick={handleJoinCanvas}
							disabled={!joinSlug.trim()}
							className="flex-shrink-0 px-6 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
						>
							Join
						</button>
					</div>
					</div>

					{/* Sign In CTA for signed out users */}
					<SignedOut>
						<div className="bg-neutral-50 border-2 border-neutral-200 p-6 rounded-xl text-center">
							<div className="text-neutral-700 mb-3">
								Sign in to save your canvases and access more features
							</div>
							<SignInButton mode="modal">
								<button className="px-6 py-2 bg-white border-2 border-neutral-900 text-neutral-900 rounded-lg font-medium hover:bg-neutral-900 hover:text-white transition-colors">
									Sign In
								</button>
							</SignInButton>
						</div>
					</SignedOut>
				</div>
			</div>

			{/* Footer Privacy Notice */}
			<footer className="w-full p-6 text-center">
				<p className="text-xs text-neutral-500 max-w-2xl mx-auto">
					By using Couple's Canvas, your username and profile picture will be visible on canvases you collaborate on and in the public gallery.{" "}
					<span className="text-neutral-600">We only display public profile information.</span>
				</p>
			</footer>
		</div>
	);
}

