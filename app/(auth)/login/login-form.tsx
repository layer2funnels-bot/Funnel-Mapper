"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { FormMessage, Submit } from "@/components/form-bits";
import { signInWithMagicLink, signInWithPassword } from "../actions";

export function LoginForm({ next, error }: { next: string; error?: string }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [pwState, pwAction] = useActionState(signInWithPassword, error ? { error } : undefined);
  const [mlState, mlAction] = useActionState(signInWithMagicLink, undefined);
  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold">Sign in</h1>
      <p className="mb-5 text-sm text-muted">Layer2Funnels team workspace.</p>
      <div className="tabs" role="tablist" aria-label="Sign-in method">
        <button role="tab" type="button" aria-selected={mode === "password"} onClick={() => setMode("password")}>
          Password
        </button>
        <button role="tab" type="button" aria-selected={mode === "magic"} onClick={() => setMode("magic")}>
          Magic link
        </button>
      </div>
      {mode === "password" ? (
        <form action={pwAction} noValidate>
          <FormMessage state={pwState} />
          <input type="hidden" name="next" value={next} />
          <div className="field">
            <label htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <Submit>Sign in</Submit>
          <p className="mt-3 text-center text-sm">
            <Link className="text-brand underline-offset-2 hover:underline" href="/reset-password">
              Forgot your password?
            </Link>
          </p>
        </form>
      ) : (
        <form action={mlAction} noValidate>
          <FormMessage state={mlState} />
          <input type="hidden" name="next" value={next} />
          <div className="field">
            <label htmlFor="ml-email">Email</label>
            <input className="input" id="ml-email" name="email" type="email" autoComplete="email" required />
            <span className="help">We’ll email you a one-click sign-in link.</span>
          </div>
          <Submit>Email me a link</Submit>
        </form>
      )}
      <p className="mt-5 border-t border-line pt-4 text-center text-sm text-muted">Team members only. Ask an admin for an invite.</p>
    </>
  );
}
