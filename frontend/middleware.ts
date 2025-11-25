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
])

export default clerkMiddleware((auth, request) => {
  if (requiresAuth(request) || !isPublicRoute(request)) {
    auth().protect()
  }
})

export const config = {
  matcher: ["/((?!_next|.*\\..*|api).*)"],
}

