import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "../lib/router";

export default function NewCanvasRedirect() {
	const navigate = useNavigate();
	const createCanvas = useMutation(api.canvases.createCanvas);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const { slug } = await createCanvas({});
			if (!cancelled) navigate(`/canvas/${slug}`, { replace: true });
		})();
		return () => { cancelled = true; };
	}, [createCanvas, navigate]);

	return (
		<div className="min-h-dvh grid place-items-center">
			<div className="text-sm text-neutral-500">Creating your canvas…</div>
		</div>
	);
}