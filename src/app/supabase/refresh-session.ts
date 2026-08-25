import { NextResponse, type NextRequest } from "next/server";

import {
  createSupabaseServerClient,
  hasSupabasePublicEnv,
} from "@/infrastructure";

export async function refreshAuthSession(request: NextRequest) {
  if (!hasSupabasePublicEnv()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createSupabaseServerClient({
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet, headers) {
      cookiesToSet.forEach(({ name, value }) => {
        request.cookies.set(name, value);
      });
      supabaseResponse = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) => {
        supabaseResponse.cookies.set(name, value, options);
      });
      Object.entries(headers).forEach(([key, value]) => {
        supabaseResponse.headers.set(key, value);
      });
    },
  });

  await supabase.auth.getClaims();
  return supabaseResponse;
}
