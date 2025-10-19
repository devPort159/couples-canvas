import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

/**
 * Get user by Clerk ID
 */
export const getUserByClerkId = query({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.unique();
		return user;
	},
});

/**
 * Get multiple users by their Clerk IDs
 */
export const getUsersByClerkIds = query({
	args: { clerkIds: v.array(v.string()) },
	handler: async (ctx, args) => {
		const users = await Promise.all(
			args.clerkIds.map((clerkId) =>
				ctx.db
					.query("users")
					.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
					.unique()
			)
		);
		// Return a map for easy lookup
		const userMap: Record<string, any> = {};
		users.forEach((user) => {
			if (user) {
				userMap[user.clerkId] = {
					username: user.username,
					firstName: user.firstName,
					lastName: user.lastName,
					imageUrl: user.imageUrl,
				};
			}
		});
		return userMap;
	},
});

/**
 * Upsert user from Clerk webhook (internal mutation called by HTTP endpoint)
 */
export const upsertFromClerk = internalMutation({
	args: {
		clerkId: v.string(),
		username: v.optional(v.string()),
		firstName: v.optional(v.string()),
		lastName: v.optional(v.string()),
		imageUrl: v.optional(v.string()),
		email: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.unique();

		const now = Date.now();

		if (existing) {
			// Update existing user
			await ctx.db.patch(existing._id, {
				username: args.username,
				firstName: args.firstName,
				lastName: args.lastName,
				imageUrl: args.imageUrl,
				email: args.email,
				updatedAt: now,
			});
			return existing._id;
		} else {
			// Create new user
			return await ctx.db.insert("users", {
				clerkId: args.clerkId,
				username: args.username,
				firstName: args.firstName,
				lastName: args.lastName,
				imageUrl: args.imageUrl,
				email: args.email,
				createdAt: now,
				updatedAt: now,
			});
		}
	},
});

/**
 * Delete user from Clerk webhook (internal mutation)
 */
export const deleteFromClerk = internalMutation({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.unique();

		if (existing) {
			await ctx.db.delete(existing._id);
		}
	},
});

