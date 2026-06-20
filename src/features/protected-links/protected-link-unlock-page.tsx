"use client";

import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusCallout } from "@/components/ui/status-callout";

type UnlockResponse = {
  targetUrl?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

export function ProtectedLinkUnlockPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [redirecting, setRedirecting] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || pending) {
      return;
    }

    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/hosted/protected-links/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        cache: "no-store",
        body: JSON.stringify({ token, password })
      });
      const payload = (await response.json().catch(() => ({}))) as UnlockResponse;

      if (!response.ok || !payload.targetUrl) {
        setError(
          payload.error?.code === "UNAUTHORIZED"
            ? t("protectedLink.incorrectPassword")
            : payload.error?.message || t("protectedLink.failed")
        );
        return;
      }

      setRedirecting(true);
      window.location.assign(payload.targetUrl);
    } catch {
      setError(t("protectedLink.failed"));
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{t("protectedLink.title")}</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t("protectedLink.description")}
            </p>
          </div>
        </div>

        {!token ? (
          <StatusCallout title={t("protectedLink.invalidTitle")} tone="danger">
            {t("protectedLink.invalidDescription")}
          </StatusCallout>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="protected-link-password">{t("protectedLink.password")}</Label>
              <Input
                id="protected-link-password"
                type="password"
                autoComplete="current-password"
                value={password}
                placeholder={t("protectedLink.passwordPlaceholder")}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error ? (
              <StatusCallout title={t("protectedLink.failedTitle")} tone="danger">
                {error}
              </StatusCallout>
            ) : null}

            {redirecting ? (
              <StatusCallout title={t("protectedLink.redirectingTitle")} tone="success">
                {t("protectedLink.redirectingDescription")}
              </StatusCallout>
            ) : null}

            <Button type="submit" className="w-full" disabled={!password || pending || redirecting}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {t("protectedLink.unlock")}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
