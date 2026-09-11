import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const origin = request.nextUrl.origin;

  if (!code) return NextResponse.redirect(`${origin}/signin?error=missing_code`);

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/signin?error=exchange_failed`);

  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/today";
  return NextResponse.redirect(`${origin}${target}`);
}
