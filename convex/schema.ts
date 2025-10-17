import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	canvases: defineTable({
		slug: v.string(),
		createdAt: v.number(),
	}).index("by_slug", ["slug"]),

	strokes: defineTable({
		canvasId: v.id("canvases"),
		userId: v.optional(v.string()),
		color: v.string(),
		size: v.number(),
		points: v.array(
			v.object({
				x: v.number(),
				y: v.number(),
				t: v.number(),
			})
		),
        mode: v.union(v.literal("draw"), v.literal("erase")),
		createdAt: v.number(),
	}).index("by_canvas", ["canvasId"]),

	presence: defineTable({
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
		updatedAt: v.number(),
	})
		.index("by_canvas", ["canvasId"])
		.index("by_canvas_user", ["canvasId", "userId"]),
});