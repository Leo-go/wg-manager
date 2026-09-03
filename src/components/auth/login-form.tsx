"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TelegramRefBanner } from "@/components/marketing/telegram-ref-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

export function LoginForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const supabase = createClient();

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setMessage(t.auth.accountCreated);
        setIsSignUp(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : t.auth.authFailed;
      setError(messageText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-lg">
        <TelegramRefBanner />
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            {isSignUp ? t.auth.createAccount : t.auth.signIn}
          </h1>
          <p className="text-sm text-muted-foreground">{t.auth.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t.auth.email}
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t.auth.password}
            </label>
            <Input
              id="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {message && (
            <div className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
              {message}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? t.auth.loading
              : isSignUp
                ? t.auth.signUp
                : t.auth.signIn}
          </Button>
        </form>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {t.auth.legalNotice}{" "}
          <Link href="/terms" className="underline underline-offset-2">
            {t.common.terms}
          </Link>
          {" · "}
          <Link href="/privacy" className="underline underline-offset-2">
            {t.common.privacy}
          </Link>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? t.auth.haveAccount : t.auth.noAccount}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
              setMessage("");
            }}
            className="font-medium text-primary hover:underline"
          >
            {isSignUp ? t.auth.signIn : t.auth.signUp}
          </button>
        </p>

        <p className="text-center text-sm">
          <Link href="/" className="text-muted-foreground hover:underline">
            {t.auth.backHome}
          </Link>
        </p>
      </div>
    </div>
  );
}
