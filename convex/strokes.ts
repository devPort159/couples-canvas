import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const point = v.object({ x: v.number(), y: v.number(), t: v.number() });

export const listStrokes = query({
	args: { canvasId: v.id("canvases") },
	handler: async (ctx, { canvasId }) => {
		// Fetch, then sort by createdAt asc so all clients render deterministically.
		const rows = await ctx.db
			.query("strokes")
			.withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
			.collect();
		rows.sort((a, b) => a.createdAt - b.createdAt);
		return rows;
	},
});

/**
 * Start a stroke (use when you want an ID immediately, e.g., for mid-stroke streaming)
 */
export const startStroke = mutation({
	args: {
		canvasId: v.id("canvases"),
		userId: v.optional(v.string()),
		color: v.string(),
		size: v.number(),
		points: v.array(point),
		mode: v.union(v.literal("draw"), v.literal("erase")),
		createdAt: v.number(),
	},
	handler: async (ctx, args) => {
		const _id = await ctx.db.insert("strokes", {
			canvasId: args.canvasId,
			userId: args.userId,
			color: args.color,
			size: args.size,
			points: args.points,
			mode: args.mode,
			createdAt: args.createdAt,
		});
		return _id as Id<"strokes">;
	},
});

/**
 * Append points to an existing stroke (for mid-stroke realtime updates)
 */
export const appendPoints = mutation({
	args: {
		strokeId: v.id("strokes"),
		points: v.array(point),
		mode: v.union(v.literal("draw"), v.literal("erase")),
	},
	handler: async (ctx, { strokeId, points, mode }) => {
		if (points.length === 0) return;
		const existing = await ctx.db.get(strokeId);
		if (!existing) return;
		// Simple concat; for very large strokes, consider chunking or snapshotting.
		await ctx.db.patch(strokeId, { points: existing.points.concat(points), mode: mode });
	},
});

/**
 * Create a whole stroke in one go (use if you only send at pointerup)
 */
export const appendStroke = mutation({
	args: {
		canvasId: v.id("canvases"),
		userId: v.optional(v.string()),
		color: v.string(),
		size: v.number(),
		points: v.array(point),
		mode: v.union(v.literal("draw"), v.literal("erase")),
		createdAt: v.number(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("strokes", {
			canvasId: args.canvasId,
			userId: args.userId,
			color: args.color,
			size: args.size,
			points: args.points,
			mode: args.mode,
			createdAt: args.createdAt,
		});
	},
});

/**
 * Clear all strokes on a canvas
 */
export const clearCanvas = mutation({
	args: { canvasId: v.id("canvases") },
	handler: async (ctx, { canvasId }) => {
		const rows = await ctx.db
			.query("strokes")
			.withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
			.collect();
		await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
		return { deleted: rows.length };
	},
});

/**
 * Undo: delete the most recent stroke by this user on this canvas
 */
export const undoLastByUser = mutation({
	args: { canvasId: v.id("canvases"), userId: v.string() },
	handler: async (ctx, { canvasId, userId }) => {
		const rows = await ctx.db
			.query("strokes")
			.withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
			.collect();
		const mine = rows.filter((r) => r.userId === userId);
		if (mine.length === 0) return { deleted: 0 };
		const last = mine.sort((a, b) => b.createdAt - a.createdAt)[0];
		await ctx.db.delete(last._id);
		return { deleted: 1, strokeId: last._id as Id<"strokes"> };
	},
});