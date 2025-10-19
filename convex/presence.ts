import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const FRESH_MS = 4000; // consider “online” if updated within last 4s

export const getPresence = query({
	args: { canvasId: v.id("canvases") },
	handler: async (ctx, { canvasId }) => {
		const now = Date.now();
		const rows = await ctx.db
			.query("presence")
			.withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
			.collect();
		// Return only fresh presence
		return rows.filter((p) => now - p.updatedAt <= FRESH_MS);
	},
});

/**
 * Upsert the viewer’s presence (cursor is optional)
 */
export const updatePresence = mutation({
  	args: {
		canvasId: v.id("canvases"),
		userId: v.string(),
		name: v.optional(v.string()),
		color: v.optional(v.string()),
		cursor: v.optional(
			v.object({
				x: v.number(),
				y: v.number(),
			})
    	),
  	},
  	handler: async (ctx, { canvasId, userId, name, color, cursor }) => {
		const existing = await ctx.db
			.query("presence")
			.withIndex("by_canvas_user", (q) => q.eq("canvasId", canvasId).eq("userId", userId))
			.unique();

    	const updatedAt = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				...(name !== undefined ? { name } : {}),
				...(color !== undefined ? { color } : {}),
				...(cursor !== undefined ? { cursor } : {}),
				updatedAt,
			});
			return existing._id;
		} else {
			return await ctx.db.insert("presence", {
				canvasId,
				userId,
				name,
				color,
				cursor,
				updatedAt,
			});
		}
  	},
});

/**
 * (Optional) Clean up stale presence docs to keep the table tidy
 */
export const vacuumPresence = mutation({
	args: { canvasId: v.id("canvases") },
	handler: async (ctx, { canvasId }) => {
		const now = Date.now();
		const rows = await ctx.db
			.query("presence")
			.withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
			.collect();
		const stale = rows.filter((p) => now - p.updatedAt > FRESH_MS * 4);
		await Promise.all(stale.map((p) => ctx.db.delete(p._id)));
		return { deleted: stale.length };
	},
});