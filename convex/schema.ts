import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	// User profiles synced from Clerk
	users: defineTable({
		clerkId: v.string(), // Clerk user ID
		username: v.optional(v.string()), // Clerk username or firstName
		firstName: v.optional(v.string()),
		lastName: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
		email: v.optional(v.string()), // Store for internal use only, never expose publicly
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_clerk_id", ["clerkId"]),

	// Read: Once per session
	// Write: Max once per session
	canvases: defineTable({
		slug: v.string(),
		createdAt: v.number(),
		creatorId: v.optional(v.string()),
		contributors: v.optional(v.array(v.string())),
		publishedAt: v.optional(v.number()),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
	})
		.index("by_slug", ["slug"])
		.index("by_creator", ["creatorId"])
		.index("by_published", ["publishedAt"]),

	// Read: Whenever there's an update in convex, 200 per session
	// Write: 100 per session
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

	// Read: 750 per session - sampling and filter out self
	// Write: 750 per session - sampling 
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