"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, LockKeyhole, Plus } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusCallout } from "@/components/ui/status-callout";
import { Switch } from "@/components/ui/switch";
import { useCreateShortUrl } from "@/features/short-urls/short-url-hooks";
import {
  createShortUrlFormSchema,
  parseTagsText,
  type ShortUrlFormValues
} from "@/features/short-urls/short-url-schema";
import { getShlinkErrorMessage } from "@/lib/shlink/errors";
import type { ShlinkServer } from "@/lib/shlink/types";

type CreateShortUrlDialogProps = {
  server: ShlinkServer | null;
  trigger?: React.ReactNode;
};

export function CreateShortUrlDialog({ server, trigger }: CreateShortUrlDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [createdUrl, setCreatedUrl] = React.useState<string | null>(null);
  const mutation = useCreateShortUrl(server);
  const formSchema = React.useMemo(() => createShortUrlFormSchema(t), [t]);
  const canCreateProtectedLink = server?.mode === "hosted";
  const form = useForm<ShortUrlFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      longUrl: "",
      customSlug: "",
      title: "",
      tagsText: "",
      validSince: "",
      validUntil: "",
      domain: "",
      protectedEnabled: false,
      protectedPassword: ""
    }
  });
  const protectedEnabled = form.watch("protectedEnabled");

  const onSubmit = form.handleSubmit(async (values) => {
    const parsed = formSchema.parse(values);
    const result = await mutation
      .mutateAsync({
        longUrl: parsed.longUrl,
        customSlug: parsed.customSlug || undefined,
        title: parsed.title || undefined,
        tags: parseTagsText(parsed.tagsText),
        validSince: parsed.validSince || undefined,
        validUntil: parsed.validUntil || undefined,
        domain: parsed.domain || undefined,
        linkConsole:
          canCreateProtectedLink && parsed.protectedEnabled
            ? {
                protection: {
                  password: parsed.protectedPassword?.trim() || ""
                }
              }
            : undefined
      })
      .catch(() => null);

    if (!result) {
      return;
    }

    setCreatedUrl(result.shortUrl);
    await navigator.clipboard?.writeText(result.shortUrl).catch(() => undefined);
    form.reset();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4" />
            {t("actions.createShortUrl")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createShortUrl.title")}</DialogTitle>
          <DialogDescription>
            {server?.mode === "hosted"
              ? t("createShortUrl.hostedDescription")
              : t("createShortUrl.description")}
          </DialogDescription>
        </DialogHeader>
        {!server ? (
          <StatusCallout title={t("createShortUrl.noServerTitle")} tone="warning">
            {t("createShortUrl.noServerDescription")}
          </StatusCallout>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="long-url">{t("fields.longUrl")}</Label>
              <Input
                id="long-url"
                placeholder="https://example.com/very/long/path"
                {...form.register("longUrl")}
              />
              {form.formState.errors.longUrl ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.longUrl.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="custom-slug">{t("fields.customSlug")}</Label>
                <Input id="custom-slug" placeholder={t("fields.optional")} {...form.register("customSlug")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">{t("fields.domain")}</Label>
                <Input id="domain" placeholder={t("fields.domainOptional")} {...form.register("domain")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">{t("fields.title")}</Label>
              <Input id="title" placeholder={t("fields.optional")} {...form.register("title")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">{t("fields.tags")}</Label>
              <Input id="tags" placeholder={t("fields.tagsPlaceholder")} {...form.register("tagsText")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valid-since">{t("fields.validSince")}</Label>
                <Input id="valid-since" type="datetime-local" {...form.register("validSince")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid-until">{t("fields.validUntil")}</Label>
                <Input id="valid-until" type="datetime-local" {...form.register("validUntil")} />
              </div>
            </div>
            {canCreateProtectedLink ? (
              <div className="rounded-lg border border-border bg-secondary/35 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <LockKeyhole className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="protected-enabled">
                        {t("createShortUrl.protectedLink")}
                      </Label>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {t("createShortUrl.protectedDescription")}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="protected-enabled"
                    checked={Boolean(protectedEnabled)}
                    onCheckedChange={(checked) => {
                      form.setValue("protectedEnabled", checked, {
                        shouldDirty: true,
                        shouldValidate: true
                      });
                      if (!checked) {
                        form.setValue("protectedPassword", "", {
                          shouldDirty: true,
                          shouldValidate: true
                        });
                      }
                    }}
                  />
                </div>
                {protectedEnabled ? (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="protected-password">
                      {t("createShortUrl.protectedPassword")}
                    </Label>
                    <Input
                      id="protected-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder={t("createShortUrl.protectedPasswordPlaceholder")}
                      {...form.register("protectedPassword")}
                    />
                    {form.formState.errors.protectedPassword ? (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.protectedPassword.message}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {mutation.isError ? (
              <StatusCallout title={t("createShortUrl.failed")} tone="danger">
                {getShlinkErrorMessage(mutation.error, t)}
              </StatusCallout>
            ) : null}
            {createdUrl ? (
              <StatusCallout icon={Check} title={t("createShortUrl.success")} tone="success">
                {t("createShortUrl.successDescription", { url: createdUrl })}
              </StatusCallout>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("actions.close")}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t("actions.createAndCopy")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
