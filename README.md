Here’s a concise, copy-pasteable README you can drop into the repo.

⸻

The Couple’s Canvas

A lightweight collaborative drawing app inspired by Candle’s “couples canvas.” Two goals drive the design: real-time sync and resolution-independent scaling—with a minimal dependency footprint.

What’s going on (high level)

World-space strokes, scaled UI
	•	All drawing points are stored in a normalized world space [0–1] × [0–1].
	•	The <canvas> scales to the viewport and adjusts for devicePixelRatio so lines stay crisp on any screen.
	•	Line thickness is computed from the canvas’ min(width, height), so drawings stay proportional as the window resizes.

Realtime via Convex (the backend)
	•	Convex is the database, functions, and realtime layer—no extra server needed.
	•	Core records:
	•	canvases: { slug, createdAt }
	•	strokes: { canvasId, userId?, color, size, points[], createdAt, mode } where mode = 'draw' | 'erase'
	•	presence: { canvasId, userId, name?, color?, cursor?, updatedAt }
	•	Clients subscribe with live queries (e.g., listStrokes(canvasId)), so updates appear instantly for everyone at the same /canvas/:slug.

Eraser without bitmaps
	•	The eraser is just a stroke with mode: 'erase' and rendered with globalCompositeOperation: 'destination-out'.
	•	No RGBA grid or per-pixel buffer required; everything remains vector-ish and resolution-agnostic.

Optimistic UI + optional mid-stroke streaming
	•	While drawing, points are rendered locally immediately (optimistic).
	•	You can commit at pointerup (one shot) or enable mid-stroke streaming (small batches) using startStroke + appendPoints.

Presence (nice-to-have)
	•	Each client periodically upserts { cursor, color, updatedAt } to presence.
	•	The UI shows small dots for collaborators whose updatedAt is recent.

Minimal routing (keep deps light)
	•	Instead of react-router-dom, the app uses a tiny custom router built on the History API:
	•	Supports / and /canvas/:slug
	•	Handles pushState, popstate, and route params
	•	Gives a useNavigate() helper and <Link/> component
	•	This keeps the dependency footprint lean while preserving clean URLs and back/forward behavior.

⸻

Folder layout

src/
  App.tsx
  lib/
    router.tsx              # tiny custom router (History API)
  canvas/
    CanvasBoard.tsx         # <canvas> element + event wiring + local preview
    useCanvasRenderer.ts    # DPR scaling, transforms, stroke rendering
    useDrawing.ts           # pointer handling, buffering, commit logic
    Toolbar.tsx             # colors, size, draw/erase, undo, clear, share
    PresenceLayer.tsx       # collaborator cursors (optional)
  routes/
    NewCanvasRedirect.tsx   # creates a new slug, redirects to /canvas/:slug
    CanvasPage.tsx          # loads canvas by slug, subscribes to strokes/presence

convex/
  schema.ts                 # tables + indexes (you already added)
  canvases.ts               # createCanvas, getCanvasBySlug
  strokes.ts                # listStrokes, startStroke, appendPoints, appendStroke, clear, undo
  presence.ts               # getPresence, updatePresence, vacuumPresence


⸻

How rendering works
	1.	Pointer events (pointerdown/move/up) are captured by CanvasBoard.
	2.	Coordinates are converted to world space in useCanvasRenderer.
	3.	Local preview paints immediately (Bézier smoothing) to keep drawing snappy.
	4.	On commit, the stroke is written to Convex; everyone else receives it via the live query and replays deterministically in time order.
	5.	On resize or joining late, the board clears and replays all strokes in world space → identical result at any size/DPI.

⸻

Getting started
	1.	Install

npm i


	2.	Convex dev

npx convex dev

	•	This sets up the Convex project and gives you a deployment URL.

	3.	Frontend env
	•	In .env.local (Vite):

VITE_CONVEX_URL=<your_convex_deployment_url>


	4.	Run

npm run dev


	5.	Open
	•	Visit / to create a canvas; you’ll be redirected to /canvas/:slug.
	•	Use Share Canvas to copy the URL; open in another tab or device to test realtime.

⸻

Key UX details
	•	Share: copies the current URL (uses Web Share API when available).
	•	Undo: removes the most recent stroke by the current user (simple, deterministic).
	•	Clear: removes all strokes for the canvas (with confirmation).
	•	Presence dots: show where collaborators’ cursors are (optional; TTL ~4s).
	•	Loading states: minimal text indicators while queries hydrate.

⸻

Design choices & tradeoffs
	•	Vector-style strokes over bitmap
Pros: crisp scaling, compact storage, deterministic replay.
Cons: no complex per-pixel effects (smudge, filters) without extra work.
	•	Custom router vs react-router
Pros: fewer deps, full control, small surface area for 2 routes.
Cons: no nested routing or advanced router features (which we don’t need here).
	•	One-shot vs mid-stroke streaming
	•	Default is one-shot (commit at pointerup) for simplicity and fewer writes.
	•	Enable streaming if you want remote users to see the line “growing” live.

⸻

Performance notes
	•	DPR-aware canvas and smoothing via quadratic curves to keep strokes pretty.
	•	Incremental redraw for local preview; full replay on data changes/resize.
	•	If canvases grow large:
	•	Snapshot to an offscreen buffer occasionally and replay only deltas.
	•	Add an index ["canvasId", "createdAt"] to query already-sorted strokes.

⸻

Security & auth
	•	The demo uses a temporary userId (random UUID).
To add real auth, wire up Convex Auth (or your provider) and pass userId from the session.

⸻

Roadmap (nice-to-haves)
	•	Color/brush presets per user profile.
	•	Per-stroke metadata (pressure, tool type).
	•	Object eraser (hit-test and delete/split strokes).
	•	Export to PNG/SVG (fill a background color before export if you want non-transparent PNG).
	•	Snapshot tiling for very large or long-lived canvases.

⸻

Scripts

npm run dev      # start Vite
npm run build    # production build
npm run preview  # preview build
npx convex dev   # Convex local dev (watch & generate)


⸻

Tech stack
	•	React + TypeScript
	•	Convex (DB, functions, live queries)
	•	Custom History-API router (no react-router-dom)
	•	Optional: Tailwind for quick, clean styling

⸻

That should be enough context for anyone opening the repo to understand the why/how and get running fast.