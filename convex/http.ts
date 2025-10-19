import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * Clerk webhook endpoint for user sync
 * 
 * This endpoint receives webhooks from Clerk when users are created, updated, or deleted.
 * It syncs user data to the Convex users table.
 * 
 * Setup instructions:
 * 1. Deploy your Convex functions
 * 2. Get your webhook URL: https://YOUR_CONVEX_SITE.convex.site/clerk-users-webhook
 * 3. In Clerk Dashboard -> Webhooks, create a new endpoint
 * 4. Subscribe to: user.created, user.updated, user.deleted
 * 5. Optional: Get signing secret and verify webhook signatures (add CLERK_WEBHOOK_SECRET to env)
 */
http.route({
	path: "/clerk-users-webhook",
	method: "POST",
	handler: httpAction(async (ctx, request) => {
		const payload = await request.json();
		const eventType = payload.type;

		// For development: log the event
		console.log("Clerk webhook received:", eventType);

		switch (eventType) {
			case "user.created":
			case "user.updated": {
				const { id, username, first_name, last_name, image_url, email_addresses } = payload.data;
				
				// Get primary email
				const primaryEmail = email_addresses?.find((e: any) => e.id === payload.data.primary_email_address_id);

				await ctx.runMutation(internal.users.upsertFromClerk, {
					clerkId: id,
					username: username || first_name || undefined,
					firstName: first_name || undefined,
					lastName: last_name || undefined,
					imageUrl: image_url || undefined,
					email: primaryEmail?.email_address || undefined,
				});

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}

			case "user.deleted": {
				const { id } = payload.data;
				
				await ctx.runMutation(internal.users.deleteFromClerk, {
					clerkId: id,
				});

				return new Response(JSON.stringify({ success: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}

			default:
				return new Response(JSON.stringify({ error: "Unhandled event type" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
		}
	}),
});

export default http;

