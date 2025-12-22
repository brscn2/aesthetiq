import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
])

const requiresAuth = createRouteMatcher([
  "/dashboard(.*)",
  "/virtual-wardrobe(.*)",
  "/settings(.*)",
  "/admin(.*)",
])

export default clerkMiddleware(async (auth, request) => {
  if (requiresAuth(request) || !isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
}

