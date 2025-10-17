// src/App.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { RouterProvider, matchRoute, useRouter } from "./lib/router";
import NewCanvasRedirect from "./routes/NewCanvasRedirect";
import CanvasPage from "./routes/CanvasPage";

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
	if (matchRoute("/", path)) return <NewCanvasRedirect />;

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