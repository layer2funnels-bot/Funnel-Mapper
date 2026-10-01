"use client";
import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, Submit } from "@/components/form-bits";
import { signUp } from "../actions";

export default function SignupPage() {
  const [state, action] = useActionState(signUp, undefined);
  return (
    <>
      <h1 className="mb-1 font-display text-2xl font-bold">Create your account</h1>
      <p className="mb-5 text-sm text-muted">Map funnels, model the numbers, share them with clients.</p>
      <form action={action} noValidate>
        <FormMessage state={state} />
        <div className="field">
          <label htmlFor="full_name">Your name</label>
          <input className="input" id="full_name" name="full_name" autoComplete="name" required />
        </div>
        <div className="field">
          <label htmlFor="agency_name">Agency name</label>
          <input className="input" id="agency_name" name="agency_name" placeholder="Layer2Funnels" autoComplete="organization" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          <span className="help">At least 8 characters.</span>
        </div>
        <Submit>Create account</Submit>
      </form>
      <p className="mt-5 border-t border-line pt-4 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link className="font-bold text-brand underline-offset-2 hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </>
  );
}
