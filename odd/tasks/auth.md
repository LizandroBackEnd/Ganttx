# PR 3 — Authentication (Auth.js + Google OAuth + Middleware)

## Status
Completed

## Tasks
- [x] Install auth dependencies: `next-auth@beta`, `@auth/prisma-adapter`
- [x] Create `src/lib/auth.ts` (Auth.js v5 configuration with Google provider + Prisma adapter + database session strategy)
- [x] Create `src/app/api/auth/[...nextauth]/route.ts` (Auth.js Route Handler)
- [x] Create `src/middleware.ts` (Protect `(dashboard)` routes, redirect unauthenticated to `/login`, add security headers)
- [x] Create `src/features/auth/components/google-sign-in-button.tsx` (Client component leaf node)
- [x] Create `src/features/auth/index.ts` (Public barrel)
- [x] Create `src/app/(auth)/login/page.tsx` (Login page with Google sign-in button, redirects if already authenticated)
- [x] Verify: `npm run lint` and `npm run build`
