// src/App.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { RouterProvider, matchRoute, useRouter } from "./lib/router";
import HomePage from "./routes/HomePage";
import CanvasPage from "./routes/CanvasPage";
import MyCanvasesPage from "./routes/MyCanvasesPage";
import PublicGalleryPage from "./routes/PublicGalleryPage";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL!);

export default function App() {
	return (
		<ConvexProvider client={convex}>
			<RouterProvider>
				<Routes />
			</RouterProvider>
		</ConvexProvider>
	);
}

function Routes() {
	const { path } = useRouter();

	// /
	if (matchRoute("/", path)) return <HomePage />;

	// /my-canvases
	if (matchRoute("/my-canvases", path)) return <MyCanvasesPage />;

	// /gallery
	if (matchRoute("/gallery", path)) return <PublicGalleryPage />;

	// /canvas/:slug
	const m = matchRoute("/canvas/:slug", path);
	if (m) return <CanvasPage slug={m.slug} />;

	// 404
	return (
		<div className="min-h-dvh grid place-items-center text-neutral-500">
			Not found
		</div>
	);
}