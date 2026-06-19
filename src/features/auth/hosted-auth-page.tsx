"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, LogIn, Server, ShieldCheck, UserPlus } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusCallout } from "@/components/ui/status-callout";
import { ThemeLanguageControls } from "@/components/app/app-shell";
import { useHostedLogin, useHostedRegister } from "@/features/auth/hosted-hooks";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  workspaceName: z.string().trim().max(80).optional()
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function HostedAuthPage() {
  const { t } = useTranslation();
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const login = useHostedLogin();
  const register = useHostedRegister();
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      workspaceName: ""
    }
  });
  const isLogin = mode === "login";
  const activeError = isLogin ? login.error : register.error;

  return (
    <main className="min-h-screen bg-muted/25 text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-primary">{t("appName")}</p>
              <p className="text-xs text-muted-foreground">{t("hosted.auth.subtitle")}</p>
            </div>
          </div>
          <ThemeLanguageControls />
        </header>

        <div className="grid flex-1 gap-6 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <section className="space-y-4">
            <div className="inline-flex rounded-md border border-border bg-background p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded px-3 text-sm font-medium transition-colors",
                  isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                )}
              >
                <LogIn className="h-4 w-4" />
                {t("hosted.auth.login")}
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded px-3 text-sm font-medium transition-colors",
                  !isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                )}
              >
                <UserPlus className="h-4 w-4" />
                {t("hosted.auth.register")}
              </button>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 shadow-soft">
              <div className="mb-5">
                <h1 className="text-2xl font-semibold tracking-normal">
                  {isLogin ? t("hosted.auth.loginTitle") : t("hosted.auth.registerTitle")}
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {isLogin
                    ? t("hosted.auth.loginDescription")
                    : t("hosted.auth.registerDescription")}
                </p>
              </div>

              {activeError ? (
                <StatusCallout title={t("hosted.auth.failed")} tone="danger" className="mb-4">
                  {activeError.message}
                </StatusCallout>
              ) : null}

              {isLogin ? (
                <form
                  className="space-y-4"
                  onSubmit={loginForm.handleSubmit((values) => login.mutate(values))}
                >
                  <div className="space-y-2">
                    <Label htmlFor="hosted-login-email">{t("hosted.auth.email")}</Label>
                    <Input id="hosted-login-email" autoComplete="email" {...loginForm.register("email")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hosted-login-password">{t("hosted.auth.password")}</Label>
                    <Input
                      id="hosted-login-password"
                      type="password"
                      autoComplete="current-password"
                      {...loginForm.register("password")}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={login.isPending}>
                    {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {t("hosted.auth.login")}
                  </Button>
                </form>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={registerForm.handleSubmit((values) => register.mutate(values))}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="hosted-register-name">{t("hosted.auth.name")}</Label>
                      <Input id="hosted-register-name" autoComplete="name" {...registerForm.register("name")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hosted-register-email">{t("hosted.auth.email")}</Label>
                      <Input id="hosted-register-email" autoComplete="email" {...registerForm.register("email")} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hosted-register-password">{t("hosted.auth.password")}</Label>
                    <Input
                      id="hosted-register-password"
                      type="password"
                      autoComplete="new-password"
                      {...registerForm.register("password")}
                    />
                    <p className="text-xs text-muted-foreground">{t("hosted.auth.passwordHint")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hosted-register-workspace">{t("hosted.auth.workspaceName")}</Label>
                    <Input
                      id="hosted-register-workspace"
                      placeholder={t("hosted.auth.workspacePlaceholder")}
                      {...registerForm.register("workspaceName")}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={register.isPending}>
                    {register.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {t("hosted.auth.register")}
                  </Button>
                </form>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <StatusCallout icon={ShieldCheck} title={t("hosted.auth.securityTitle")} tone="success">
              {t("hosted.auth.securityDescription")}
            </StatusCallout>
            <StatusCallout icon={Server} title={t("hosted.auth.proxyTitle")} tone="neutral">
              {t("hosted.auth.proxyDescription")}
            </StatusCallout>
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <p className="text-sm font-medium">{t("hosted.auth.openSourceTitle")}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("hosted.auth.openSourceDescription")}
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
