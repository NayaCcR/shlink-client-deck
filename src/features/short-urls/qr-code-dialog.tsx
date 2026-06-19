"use client";

import { Download, Loader2, QrCode } from "lucide-react";
import * as React from "react";
import QRCode from "qrcode";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import type { ShlinkShortUrl } from "@/lib/shlink/types";

type QrCodeDialogProps = {
  shortUrl: ShlinkShortUrl;
  trigger: React.ReactNode;
};

export function QrCodeDialog({ shortUrl, trigger }: QrCodeDialogProps) {
  const { t } = useTranslation();
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    QRCode.toDataURL(shortUrl.shortUrl, {
      margin: 2,
      width: 320,
      color: {
        dark: "#16211f",
        light: "#ffffff"
      }
    })
      .then((value) => {
        if (alive) {
          setDataUrl(value);
        }
      })
      .catch(() => {
        if (alive) {
          setDataUrl(null);
        }
      });

    return () => {
      alive = false;
    };
  }, [shortUrl.shortUrl]);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("qrCode.title")}</DialogTitle>
          <DialogDescription>{shortUrl.shortUrl}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt={t("qrCode.alt", { code: shortUrl.shortCode })}
              className="h-64 w-64 rounded-lg border border-border bg-white p-2"
            />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center rounded-lg border border-border">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          <Button
            className="w-full"
            disabled={!dataUrl}
            onClick={() => {
              if (!dataUrl) {
                return;
              }

              const link = document.createElement("a");
              link.href = dataUrl;
              link.download = `${shortUrl.shortCode}-qr.png`;
              link.click();
            }}
          >
            <Download className="h-4 w-4" />
            {t("actions.downloadQr")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function QrCodeButton({ shortUrl }: { shortUrl: ShlinkShortUrl }) {
  const { t } = useTranslation();

  return (
    <QrCodeDialog
      shortUrl={shortUrl}
      trigger={
        <Button variant="ghost" size="icon" title={t("qrCode.view")}>
          <QrCode className="h-4 w-4" />
        </Button>
      }
    />
  );
}
