import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Allowlist of valid internal redirect paths
const ALLOWED_REDIRECTS = ["/", "/dashboard"];

function isValidRedirect(path: string): boolean {
  // Only allow relative paths that start with /
  if (!path.startsWith("/")) return false;
  // Prevent protocol-relative URLs
  if (path.startsWith("//")) return false;
  // Check against allowlist or ensure it's a simple path
  if (ALLOWED_REDIRECTS.includes(path)) return true;
  // Allow simple relative paths without query strings or hashes for security
  const cleanPath = path.split("?")[0].split("#")[0];
  return ALLOWED_REDIRECTS.includes(cleanPath) || /^\/[a-z0-9/_-]*$/i.test(cleanPath);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Validate and sanitize redirect
      const safeRedirect = isValidRedirect(next) ? next : "/dashboard";
      return NextResponse.redirect(`${origin}${safeRedirect}`);
    }
  }

  // Redirect to login with error on failure
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
