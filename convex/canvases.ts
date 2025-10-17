import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

function randomSlug(len = 6) {
	// URL-safe base36-ish short id
	return Math.random().toString(36).slice(2, 2 + len);
}

export const createCanvas = mutation({
	args: { slug: v.optional(v.string()) },
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
		const _id = await ctx.db.insert("canvases", { slug, createdAt });
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
		return { _id: canvas._id as Id<"canvases">, slug: canvas.slug };
	},
});