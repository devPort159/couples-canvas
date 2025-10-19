import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

function randomSlug(len = 6) {
	// URL-safe base36-ish short id
	return Math.random().toString(36).slice(2, 2 + len);
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

export const togglePublish = mutation({
	args: {
		canvasId: v.id("canvases"),
		userId: v.string(),
		publish: v.boolean(),
	},
	handler: async (ctx, args) => {
		const canvas = await ctx.db.get(args.canvasId);
		if (!canvas) throw new Error("Canvas not found");
		if (canvas.creatorId !== args.userId) {
			throw new Error("Only the creator can publish/unpublish");
		}

		if (args.publish) {
			// Publishing: require title
			if (!canvas.title || canvas.title.trim() === "") {
				throw new Error("Title is required to publish a canvas");
			}
			await ctx.db.patch(args.canvasId, { publishedAt: Date.now() });
		} else {
			// Unpublishing
			await ctx.db.patch(args.canvasId, { publishedAt: undefined });
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

		// Fetch creator data for all canvases
		const results = await Promise.all(
			canvases.map(async (c) => {
				let creator = null;
				if (c.creatorId) {
					creator = await ctx.db
						.query("users")
						.withIndex("by_clerk_id", (q) => q.eq("clerkId", c.creatorId!))
						.unique();
				}

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

		return canvases.map((c) => ({
			_id: c._id as Id<"canvases">,
			slug: c.slug,
			title: c.title,
			description: c.description,
			publishedAt: c.publishedAt,
			createdAt: c.createdAt,
			contributorCount: c.contributors?.length ?? 0,
		}));
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

		// Fetch creator data for collaborations
		const results = await Promise.all(
			collaborations.map(async (c) => {
				let creator = null;
				if (c.creatorId) {
					creator = await ctx.db
						.query("users")
						.withIndex("by_clerk_id", (q) => q.eq("clerkId", c.creatorId!))
						.unique();
				}

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