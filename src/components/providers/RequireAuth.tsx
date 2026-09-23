"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { pageRoutes } from "@/lib/config/routes";
import { useAuthStore } from "@/lib/stores/userAuthStore";

/**
 * Keeps the dashboard behind a signed-in session.
 *
 * The API routes already reject an anonymous caller, so this is not what
 * protects the *data* — it is what stops the dashboard shell rendering for
 * someone who is not signed in, and what sends them somewhere useful instead
 * of leaving them on a page of failed requests.
 *
 * Waits for `isInitialized` before deciding. The store hydrates from cookies
 * in an effect (see AuthProvider), so on the very first client render
 * `isAuthenticated` is still false for everyone — redirecting on that would
 * bounce signed-in users straight back out.
 */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace(pageRoutes.authRoutes.SIGN_IN);
    }
  }, [isInitialized, isAuthenticated, router]);

  // Render nothing rather than the shell while undecided or on the way out,
  // so a signed-out viewer never sees dashboard chrome.
  if (!isInitialized || !isAuthenticated) return null;

  return <>{children}</>;
}
