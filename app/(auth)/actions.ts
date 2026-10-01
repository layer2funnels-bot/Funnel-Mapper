"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | undefined;

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}
const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
};

const creds = z.object({ email: z.email("Enter a valid email"), password: z.string().min(8, "Password must be at least 8 characters") });

export async function signInWithPassword(_: AuthState, fd: FormData): Promise<AuthState> {
  const p = creds.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!p.success) return { error: p.error.issues[0].message };
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword(p.data);
  if (error) return { error: error.message === "Invalid login credentials" ? "Wrong email or password." : error.message };
  redirect(safeNext(fd.get("next")));
}

export async function signInWithMagicLink(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = z.email().safeParse(fd.get("email"));
  if (!email.success) return { error: "Enter a valid email" };
  const sb = await supabaseServer();
  const next = safeNext(fd.get("next"));
  const { error } = await sb.auth.signInWithOtp({ email: email.data, options: { emailRedirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true } });
  if (error) return { error: error.message };
  return { message: "Check your email for a sign-in link." };
}

export async function signUp(_: AuthState, fd: FormData): Promise<AuthState> {
  const p = creds.extend({ full_name: z.string().trim().min(1, "Enter your name"), agency_name: z.string().trim().default("") }).safeParse({
    email: fd.get("email"),
    password: fd.get("password"),
    full_name: fd.get("full_name"),
    agency_name: fd.get("agency_name") ?? "",
  });
  if (!p.success) return { error: p.error.issues[0].message };
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.signUp({
    email: p.data.email,
    password: p.data.password,
    options: { data: { full_name: p.data.full_name }, emailRedirectTo: `${await siteUrl()}/auth/callback?next=/` },
  });
  if (error) return { error: error.message };
  if (data.session) {
    if (p.data.agency_name) await sb.from("profiles").update({ agency_name: p.data.agency_name }).eq("id", data.session.user.id);
    redirect("/");
  }
  return { message: "Account created. Check your email to confirm, then sign in." };
}

export async function requestPasswordReset(_: AuthState, fd: FormData): Promise<AuthState> {
  const email = z.email().safeParse(fd.get("email"));
  if (!email.success) return { error: "Enter a valid email" };
  const sb = await supabaseServer();
  const { error } = await sb.auth.resetPasswordForEmail(email.data, { redirectTo: `${await siteUrl()}/auth/callback?next=/update-password` });
  if (error) return { error: error.message };
  return { message: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_: AuthState, fd: FormData): Promise<AuthState> {
  const pw = z.string().min(8, "Password must be at least 8 characters").safeParse(fd.get("password"));
  if (!pw.success) return { error: pw.error.issues[0].message };
  if (fd.get("password") !== fd.get("confirm")) return { error: "Passwords don’t match" };
  const sb = await supabaseServer();
  const { error } = await sb.auth.updateUser({ password: pw.data });
  if (error) return { error: error.message };
  redirect("/");
}
