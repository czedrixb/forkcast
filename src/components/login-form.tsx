"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="you@example.com" required />
        {state?.errors?.email && <p className="text-xs text-fat">{state.errors.email[0]}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required />
        {state?.errors?.password && <p className="text-xs text-fat">{state.errors.password[0]}</p>}
      </div>

      {state?.message && <p className="text-sm text-fat">{state.message}</p>}

      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {pending ? "Logging in…" : "Log in"}
      </Button>

      <p className="text-center text-sm text-muted">
        New to Forkcast?{" "}
        <Link href="/signup" className="font-medium text-accent-ink">
          Create an account
        </Link>
      </p>

      <p className="text-center text-xs text-muted">
        Demo: <span className="font-mono">demo@forkcast.app</span> / <span className="font-mono">demo1234</span>
      </p>
    </form>
  );
}
