import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { Presence } from "@convex-dev/presence";

export const presence = new Presence(components.presence);

export const heartbeat = mutation({
  args: { roomId: v.string(), userId: v.string(), sessionId: v.string(), interval: v.number() },
  handler: async (ctx, { roomId, userId, sessionId, interval }) => {
    // TODO: Add your auth checks here.
    return await presence.heartbeat(ctx, roomId, userId, sessionId, interval);
  },
});

export const list = query({
  args: { roomToken: v.string() },
  handler: async (ctx, { roomToken }) => {
    // Avoid adding per-user reads so all subscriptions can share same cache.
    return await presence.list(ctx, roomToken);
  },
});

export const disconnect = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    // Can't check auth here because it's called over http from sendBeacon.
    return await presence.disconnect(ctx, sessionToken);
  },
});

export const updateUserData = mutation({
  args: { roomId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, { roomId, userId, data }) => {
    return await presence.updateRoomUser(ctx, roomId, userId, data);
  },
});

// import { v } from "convex/values";
// import { mutation, query } from "./_generated/server";

// const FRESH_MS = 4000; // consider “online” if updated within last 4s

// export const getPresence = query({
// 	args: { canvasId: v.id("canvases") },
// 	handler: async (ctx, { canvasId }) => {
// 		const now = Date.now();
// 		const rows = await ctx.db
// 			.query("presence")
// 			.withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
// 			.collect();
// 		// Return only fresh presence
// 		return rows.filter((p) => now - p.updatedAt <= FRESH_MS);
// 	},
// });

// /**
//  * Upsert the viewer’s presence (cursor is optional)
//  */
// export const updatePresence = mutation({
//   	args: {
// 		canvasId: v.id("canvases"),
// 		userId: v.string(),
// 		name: v.optional(v.string()),
// 		color: v.optional(v.string()),
// 		cursor: v.optional(
// 			v.object({
// 				x: v.number(),
// 				y: v.number(),
// 			})
//     	),
//   	},
//   	handler: async (ctx, { canvasId, userId, name, color, cursor }) => {
// 		const existing = await ctx.db
// 			.query("presence")
// 			.withIndex("by_canvas_user", (q) => q.eq("canvasId", canvasId).eq("userId", userId))
// 			.unique();

//     	const updatedAt = Date.now();

// 		if (existing) {
// 			await ctx.db.patch(existing._id, {
// 				...(name !== undefined ? { name } : {}),
// 				...(color !== undefined ? { color } : {}),
// 				...(cursor !== undefined ? { cursor } : {}),
// 				updatedAt,
// 			});
// 			return existing._id;
// 		} else {
// 			return await ctx.db.insert("presence", {
// 				canvasId,
// 				userId,
// 				name,
// 				color,
// 				cursor,
// 				updatedAt,
// 			});
// 		}
//   	},
// });

// /**
//  * (Optional) Clean up stale presence docs to keep the table tidy
//  */
// export const vacuumPresence = mutation({
// 	args: { canvasId: v.id("canvases") },
// 	handler: async (ctx, { canvasId }) => {
// 		const now = Date.now();
// 		const rows = await ctx.db
// 			.query("presence")
// 			.withIndex("by_canvas", (q) => q.eq("canvasId", canvasId))
// 			.collect();
// 		const stale = rows.filter((p) => now - p.updatedAt > FRESH_MS * 4);
// 		await Promise.all(stale.map((p) => ctx.db.delete(p._id)));
// 		return { deleted: stale.length };
// 	},
// });