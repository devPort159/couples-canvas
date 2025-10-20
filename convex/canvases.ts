import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

function randomSlug(len = 6) {
	// URL-safe base36-ish short id
	return Math.random().toString(36).slice(2, 2 + len);
}

/**
 * Generate SVG thumbnail from canvas strokes
 * Returns SVG string ready to be stored
 */
function generateThumbnailSVG(strokes: any[]): string {
	const viewBoxSize = 1000; // Scale 0-1 world coords to 1000x1000
	let paths = "";

	for (const stroke of strokes) {
		if (stroke.points.length === 0) continue;

		// Convert world coordinates (0-1) to SVG coordinates
		const points = stroke.points.map((p: any) => ({
			x: p.x * viewBoxSize,
			y: p.y * viewBoxSize,
		}));

		// Build SVG path using quadratic curves (matching renderer)
		let pathData = `M ${points[0].x},${points[0].y}`;

		if (points.length === 1) {
			// Single point: draw tiny line
			pathData += ` L ${points[0].x + 0.1},${points[0].y + 0.1}`;
		} else {
			// Quadratic smoothing
			for (let i = 1; i < points.length; i++) {
				const p0 = points[i - 1];
				const p1 = points[i];
				const midX = (p0.x + p1.x) / 2;
				const midY = (p0.y + p1.y) / 2;
				pathData += ` Q ${p0.x},${p0.y} ${midX},${midY}`;
			}
			// Line to last point
			const last = points[points.length - 1];
			pathData += ` L ${last.x},${last.y}`;
		}

		// Calculate stroke width (scale size by viewBoxSize)
		const strokeWidth = Math.max(1, stroke.size * viewBoxSize);

		// Handle erase mode with clip-path or skip for simplicity
		// For thumbnails, we'll render eraser strokes as white
		const strokeColor = stroke.mode === "erase" ? "#ffffff" : stroke.color;

		paths += `<path d="${pathData}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}">
<rect width="${viewBoxSize}" height="${viewBoxSize}" fill="white"/>
${paths}</svg>`;
}

export const createCanvas = mutation({
	args: {
		slug: v.optional(v.string()),
		creatorId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Ensure unique slug (retry a few times)
		let slug = args.slug ?? randomSlug();
		for (let i = 0; i < 5; i++) {
			const existing = await ctx.db
				.query("canvases")
				.withIndex("by_slug", (q) => q.eq("slug", slug))
				.unique();
			if (!existing) break;
			slug = randomSlug();
		}
		const createdAt = Date.now();
		const _id = await ctx.db.insert("canvases", {
			slug,
			createdAt,
			creatorId: args.creatorId,
			contributors: args.creatorId ? [args.creatorId] : [],
		});
		return { _id, slug, createdAt };
	},
});

export const getCanvasBySlug = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		const canvas = await ctx.db
			.query("canvases")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.unique();
		if (!canvas) return null;

		// Fetch creator info if available
		let creator = null;
		if (canvas.creatorId) {
			creator = await ctx.db
				.query("users")
				.withIndex("by_clerk_id", (q) => q.eq("clerkId", canvas.creatorId!))
				.unique();
		}

		// Fetch contributors info
		const contributorIds = canvas.contributors ?? [];
		const contributors = await Promise.all(
			contributorIds.map((clerkId) =>
				ctx.db
					.query("users")
					.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
					.unique()
			)
		);

		return {
			_id: canvas._id as Id<"canvases">,
			slug: canvas.slug,
			creatorId: canvas.creatorId,
			creator: creator
				? {
						username: creator.username,
						firstName: creator.firstName,
						lastName: creator.lastName,
						imageUrl: creator.imageUrl,
				  }
				: null,
			publishedAt: canvas.publishedAt,
			title: canvas.title,
			description: canvas.description,
			contributors: canvas.contributors ?? [],
			contributorsData: contributors
				.filter((c) => c !== null)
				.map((c) => ({
					clerkId: c!.clerkId,
					username: c!.username,
					firstName: c!.firstName,
					lastName: c!.lastName,
					imageUrl: c!.imageUrl,
				})),
		};
	},
});

export const updateCanvasMetadata = mutation({
	args: {
		canvasId: v.id("canvases"),
		userId: v.string(),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const canvas = await ctx.db.get(args.canvasId);
		if (!canvas) throw new Error("Canvas not found");
		if (canvas.creatorId !== args.userId) {
			throw new Error("Only the creator can update canvas metadata");
		}

		const updates: { title?: string; description?: string } = {};
		if (args.title !== undefined) updates.title = args.title;
		if (args.description !== undefined) updates.description = args.description;

		await ctx.db.patch(args.canvasId, updates);
		return { success: true };
	},
});

// Helper query to get canvas by ID (for use in actions)
export const getCanvasById = query({
	args: { id: v.id("canvases") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

// Helper mutation to update publish status
export const updatePublishStatus = mutation({
	args: {
		canvasId: v.id("canvases"),
		publishedAt: v.union(v.number(), v.null()),
		thumbnailStorageId: v.union(v.id("_storage"), v.null()),
	},
	handler: async (ctx, args) => {
		const updates: any = {};
		// Convert null to undefined for clearing optional fields
		updates.publishedAt = args.publishedAt === null ? undefined : args.publishedAt;
		updates.thumbnailStorageId = args.thumbnailStorageId === null ? undefined : args.thumbnailStorageId;
		await ctx.db.patch(args.canvasId, updates);
	},
});

export const togglePublish = action({
	args: {
		canvasId: v.id("canvases"),
		userId: v.string(),
		publish: v.boolean(),
	},
	handler: async (ctx, args) => {
		// @ts-ignore - Types will be generated after first successful deploy
		// Fetch canvas
		const canvas = await ctx.runQuery(api.canvases.getCanvasById, {
			id: args.canvasId,
		});
		
		if (!canvas) throw new Error("Canvas not found");
		if (canvas.creatorId !== args.userId) {
			throw new Error("Only the creator can publish/unpublish");
		}

		if (args.publish) {
			// Publishing: require title
			if (!canvas.title || canvas.title.trim() === "") {
				throw new Error("Title is required to publish a canvas");
			}

			// @ts-ignore - Types will be generated after first successful deploy
			// Fetch all strokes for this canvas
			const strokes = await ctx.runQuery(api.strokes.listStrokes, {
				canvasId: args.canvasId,
			});

			// Generate SVG thumbnail
			const svgString = generateThumbnailSVG(strokes);
			
			// Convert string to Blob for storage
			const encoder = new TextEncoder();
			const svgBytes = encoder.encode(svgString);
			const thumbnailStorageId = await ctx.storage.store(
				new Blob([svgBytes], { type: "image/svg+xml" })
			);

			// @ts-ignore - Types will be generated after first successful deploy
			// Update canvas with publishedAt and thumbnailStorageId
			await ctx.runMutation(api.canvases.updatePublishStatus, {
				canvasId: args.canvasId,
				publishedAt: Date.now(),
				thumbnailStorageId,
			});
		} else {
			// Unpublishing: delete thumbnail if it exists
			if (canvas.thumbnailStorageId) {
				await ctx.storage.delete(canvas.thumbnailStorageId);
			}
			// @ts-ignore - Types will be generated after first successful deploy
			await ctx.runMutation(api.canvases.updatePublishStatus, {
				canvasId: args.canvasId,
				publishedAt: null,
				thumbnailStorageId: null,
			});
		}

		return { success: true };
	},
});

export const addContributor = mutation({
	args: {
		canvasId: v.id("canvases"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const canvas = await ctx.db.get(args.canvasId);
		if (!canvas) return;
		const contributors = canvas.contributors ?? [];
		if (!contributors.includes(args.userId)) {
			await ctx.db.patch(args.canvasId, {
				contributors: [...contributors, args.userId],
			});
		}
	},
});

export const listPublishedCanvases = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = args.limit ?? 50;
		const canvases = await ctx.db
			.query("canvases")
			.withIndex("by_published")
			.order("desc")
			.filter((q) => q.neq(q.field("publishedAt"), undefined))
			.take(limit);

		// Fetch creator data and thumbnail URLs for all canvases
		const results = await Promise.all(
			canvases.map(async (c) => {
				let creator = null;
				if (c.creatorId) {
					creator = await ctx.db
						.query("users")
						.withIndex("by_clerk_id", (q) => q.eq("clerkId", c.creatorId!))
						.unique();
				}

				// Get thumbnail URL if it exists
				const thumbnailUrl = c.thumbnailStorageId
					? await ctx.storage.getUrl(c.thumbnailStorageId)
					: null;

				return {
					_id: c._id as Id<"canvases">,
					slug: c.slug,
					title: c.title,
					description: c.description,
					publishedAt: c.publishedAt,
					creatorId: c.creatorId,
					creatorName: creator?.username || creator?.firstName || "Anonymous",
					creatorImageUrl: creator?.imageUrl,
					contributorCount: c.contributors?.length ?? 0,
					thumbnailUrl,
				};
			})
		);

		return results;
	},
});

export const listMyOwnedCanvases = query({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const canvases = await ctx.db
			.query("canvases")
			.withIndex("by_creator", (q) => q.eq("creatorId", args.userId))
			.collect();

		// Add thumbnail URLs
		const results = await Promise.all(
			canvases.map(async (c) => {
				const thumbnailUrl = c.thumbnailStorageId
					? await ctx.storage.getUrl(c.thumbnailStorageId)
					: null;

				return {
					_id: c._id as Id<"canvases">,
					slug: c.slug,
					title: c.title,
					description: c.description,
					publishedAt: c.publishedAt,
					createdAt: c.createdAt,
					contributorCount: c.contributors?.length ?? 0,
					thumbnailUrl,
				};
			})
		);

		return results;
	},
});

export const listMyCollaborations = query({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Get all canvases where user is a contributor but not the creator
		const allCanvases = await ctx.db.query("canvases").collect();
		const collaborations = allCanvases.filter(
			(c) =>
				c.contributors?.includes(args.userId) && c.creatorId !== args.userId
		);

		// Fetch creator data and thumbnail URLs for collaborations
		const results = await Promise.all(
			collaborations.map(async (c) => {
				let creator = null;
				if (c.creatorId) {
					creator = await ctx.db
						.query("users")
						.withIndex("by_clerk_id", (q) => q.eq("clerkId", c.creatorId!))
						.unique();
				}

				const thumbnailUrl = c.thumbnailStorageId
					? await ctx.storage.getUrl(c.thumbnailStorageId)
					: null;

				return {
					_id: c._id as Id<"canvases">,
					slug: c.slug,
					title: c.title,
					description: c.description,
					publishedAt: c.publishedAt,
					createdAt: c.createdAt,
					creatorId: c.creatorId,
					creatorName: creator?.username || creator?.firstName || "Anonymous",
					creatorImageUrl: creator?.imageUrl,
					contributorCount: c.contributors?.length ?? 0,
					thumbnailUrl,
				};
			})
		);

		return results;
	},
});

export const deleteCanvas = mutation({
	args: {
		canvasId: v.id("canvases"),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const canvas = await ctx.db.get(args.canvasId);
		if (!canvas) throw new Error("Canvas not found");
		if (canvas.creatorId !== args.userId) {
			throw new Error("Only the creator can delete this canvas");
		}

		// Delete thumbnail if it exists
		if (canvas.thumbnailStorageId) {
			await ctx.storage.delete(canvas.thumbnailStorageId);
		}

		// Delete all strokes associated with this canvas
		const strokes = await ctx.db
			.query("strokes")
			.withIndex("by_canvas", (q) => q.eq("canvasId", args.canvasId))
			.collect();
		
		for (const stroke of strokes) {
			await ctx.db.delete(stroke._id);
		}

		// Delete the canvas
		await ctx.db.delete(args.canvasId);
		return { success: true };
	},
});