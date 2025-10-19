# The Couple’s Canvas

### A lightweight collaborative drawing app inspired by Candle’s “couples canvas.” You can draw with your partner(s) at the same time!

Getting started

```
# Install
npm i

# Convex dev (this sets up the Convex project and gives you a deployment URL.)
npx convex dev

# Frontend env (in .env.local (Vite)):
CONVEX_DEPLOYMENT=<your_convex_deployment_name>
VITE_CONVEX_URL=<your_convex_deployment_url>

# Run
npm run dev
```

For setting up the auth integration with Clerk:
1. Get your Convex deployment URL (e.g., `happy-animal-123.convex.site`)
2. Go to Clerk Dashboard → Webhooks
3. Add endpoint: `https://YOUR_CONVEX_SITE.convex.site/clerk-users-webhook`
4. Subscribe to: `user.created`, `user.updated`, `user.deleted`
5. Save and test

Tech stack
- React + TypeScript + Tailwind
- Convex (DB, functions, live queries)
- Clerk for auth
