"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { useEditShortUrl } from "@/features/short-urls/short-url-hooks";
import {
  createShortUrlFormSchema,
  parseTagsText,
  type ShortUrlFormValues
} from "@/features/short-urls/short-url-schema";
import { getShlinkErrorMessage } from "@/lib/shlink/errors";
import type { ShlinkServer, ShlinkShortUrl } from "@/lib/shlink/types";

type EditShortUrlDialogProps = {
  server: ShlinkServer | null;
  shortUrl: ShlinkShortUrl;
  trigger: React.ReactNode;
};

export function EditShortUrlDialog({ server, shortUrl, trigger }: EditShortUrlDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const mutation = useEditShortUrl(server);
  const formSchema = React.useMemo(() => createShortUrlFormSchema(t), [t]);
  const form = useForm<ShortUrlFormValues>({
    resolver: zodResolver(formSchema),
    values: {
      longUrl: shortUrl.longUrl,
      customSlug: shortUrl.shortCode,
      title: shortUrl.title || "",
      tagsText: (shortUrl.tags || []).join(", "),
      validSince: shortUrl.meta?.validSince?.slice(0, 16) || "",
      validUntil: shortUrl.meta?.validUntil?.slice(0, 16) || "",
      domain: shortUrl.domain || ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const parsed = formSchema.parse(values);
    const result = await mutation
      .mutateAsync({
        shortUrl,
        input: {
          longUrl: parsed.longUrl,
          title: parsed.title || undefined,
          tags: parseTagsText(parsed.tagsText),
          validSince: parsed.validSince || undefined,
          validUntil: parsed.validUntil || undefined
        }
      })
      .catch(() => null);

    if (!result) {
      return;
    }

    setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editShortUrl.title")}</DialogTitle>
          <DialogDescription>
            {t("editShortUrl.description")}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="edit-long-url">{t("fields.longUrl")}</Label>
            <Input id="edit-long-url" {...form.register("longUrl")} />
            {form.formState.errors.longUrl ? (
              <p className="text-xs text-destructive">{form.formState.errors.longUrl.message}</p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-slug">{t("fields.shortCode")}</Label>
              <Input id="edit-slug" disabled {...form.register("customSlug")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-domain">{t("fields.domain")}</Label>
              <Input id="edit-domain" disabled {...form.register("domain")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-title">{t("fields.title")}</Label>
            <Input id="edit-title" {...form.register("title")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-tags">{t("fields.tags")}</Label>
            <Input id="edit-tags" {...form.register("tagsText")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-valid-since">{t("fields.validSince")}</Label>
              <Input id="edit-valid-since" type="datetime-local" {...form.register("validSince")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-valid-until">{t("fields.validUntil")}</Label>
              <Input id="edit-valid-until" type="datetime-local" {...form.register("validUntil")} />
            </div>
          </div>
          {mutation.isError ? (
            <StatusCallout title={t("editShortUrl.failed")} tone="danger">
              {getShlinkErrorMessage(mutation.error, t)}
            </StatusCallout>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("actions.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
