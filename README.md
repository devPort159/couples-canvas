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

- Visit / to create a canvas; you’ll be redirected to /canvas/:slug.
- Use Share Canvas to copy the URL; open in another tab or device to test realtime.

Tech stack
- React + TypeScript + Tailwind
- Convex (DB, functions, live queries)
