"use client";

import {
  AlertCircle,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  LockKeyhole,
  Pencil,
  RefreshCw,
  Trash2
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { CreateShortUrlDialog } from "@/features/short-urls/create-short-url-dialog";
import { EditShortUrlDialog } from "@/features/short-urls/edit-short-url-dialog";
import { QrCodeButton } from "@/features/short-urls/qr-code-dialog";
import {
  useDeleteShortUrl,
  useShortUrls
} from "@/features/short-urls/short-url-hooks";
import { useTags } from "@/features/tags/tag-hooks";
import { getShlinkErrorMessage } from "@/lib/shlink/errors";
import type { ShlinkServer, ShlinkShortUrl } from "@/lib/shlink/types";
import { formatDateTime, formatNumber } from "@/lib/utils";

type ShortUrlsPageProps = {
  server: ShlinkServer | null;
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
};

function ShortUrlTableSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="space-y-3">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

function isProtectedShortUrl(shortUrl: ShlinkShortUrl) {
  return Boolean(shortUrl.linkConsole?.protection?.enabled);
}

function DeleteShortUrlButton({
  server,
  shortUrl
}: {
  server: ShlinkServer | null;
  shortUrl: ShlinkShortUrl;
}) {
  const { t } = useTranslation();
  const mutation = useDeleteShortUrl(server);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" title={t("shortUrls.deleteTooltip")}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("shortUrls.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("shortUrls.deleteDescription", { shortUrl: shortUrl.shortUrl })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {mutation.isError ? (
          <p className="text-sm text-destructive">{getShlinkErrorMessage(mutation.error, t)}</p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void mutation.mutateAsync(shortUrl).catch(() => undefined);
            }}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("actions.confirmDelete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ShortUrlsPage({
  server,
  globalSearch,
  onGlobalSearchChange
}: ShortUrlsPageProps) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = React.useState(1);
  const [tag, setTag] = React.useState<string>("all");
  const [copied, setCopied] = React.useState<string | null>(null);
  const params = React.useMemo(
    () => ({
      page,
      itemsPerPage: 15,
      searchTerm: globalSearch || undefined,
      tags: tag === "all" ? undefined : [tag]
    }),
    [globalSearch, page, tag]
  );
  const shortUrlsQuery = useShortUrls(server, params);
  const tagsQuery = useTags(server);
  const data = shortUrlsQuery.data?.shortUrls.data ?? [];
  const pagination = shortUrlsQuery.data?.shortUrls.pagination;

  React.useEffect(() => {
    setPage(1);
  }, [globalSearch, tag, server?.id]);

  return (
    <div>
      <PageHeader
        icon={Link2}
        title={t("shortUrls.title")}
        description={t("shortUrls.description")}
        actions={
          <>
            <Button variant="outline" onClick={() => void shortUrlsQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
              {t("actions.refresh")}
            </Button>
            <CreateShortUrlDialog server={server} />
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <Input
          value={globalSearch}
          onChange={(event) => onGlobalSearchChange(event.target.value)}
          placeholder={t("shortUrls.searchPlaceholder")}
        />
        <Select value={tag} onValueChange={setTag}>
          <SelectTrigger>
            <SelectValue placeholder={t("shortUrls.tagFilterPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("shortUrls.allTags")}</SelectItem>
            {(tagsQuery.data?.tags.data || []).map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!server ? (
        <EmptyState
          icon={Link2}
          title={t("shortUrls.noServerTitle")}
          description={t("shortUrls.noServerDescription")}
        />
      ) : shortUrlsQuery.isLoading ? (
        <ShortUrlTableSkeleton />
      ) : shortUrlsQuery.isError ? (
        <EmptyState
          icon={AlertCircle}
          title={t("shortUrls.loadFailed")}
          description={getShlinkErrorMessage(shortUrlsQuery.error, t)}
        />
      ) : data.length === 0 ? (
        <EmptyState
          icon={Link2}
          title={t("shortUrls.emptyTitle")}
          description={t("shortUrls.emptyDescription")}
          action={<CreateShortUrlDialog server={server} />}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("shortUrls.table.shortUrl")}</TableHead>
                <TableHead className="hidden xl:table-cell">{t("shortUrls.table.longUrl")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("shortUrls.table.tags")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("shortUrls.table.visits")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("shortUrls.table.createdAt")}</TableHead>
                <TableHead className="w-[176px] text-right">{t("shortUrls.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => {
                const protectedLink = isProtectedShortUrl(item);
                return (
                <TableRow key={`${item.domain || "default"}-${item.shortCode}`}>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{item.title || item.shortCode}</p>
                        {protectedLink ? (
                          <Badge variant="outline" className="gap-1">
                            <LockKeyhole className="h-3 w-3" />
                            {t("shortUrls.protectedBadge")}
                          </Badge>
                        ) : null}
                      </div>
                      <a
                        href={item.shortUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate text-sm text-primary"
                      >
                        {item.shortUrl}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-[320px] xl:table-cell">
                    {protectedLink ? (
                      <span className="block truncate text-sm text-muted-foreground">
                        {t("shortUrls.protectedTargetHidden")}
                      </span>
                    ) : (
                      <a
                        href={item.longUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm text-muted-foreground hover:text-foreground"
                      >
                        {item.longUrl}
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex max-w-[260px] flex-wrap gap-1">
                      {(item.tags || []).length > 0 ? (
                        item.tags?.slice(0, 3).map((label) => (
                          <Badge key={label} variant="secondary">
                            {label}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">{t("shortUrls.noTags")}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatNumber(item.visitsSummary?.total, i18n.language)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(item.dateCreated, i18n.language, t("common.unknown"))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("shortUrls.copyTooltip")}
                        onClick={async () => {
                          await navigator.clipboard?.writeText(item.shortUrl).catch(() => undefined);
                          setCopied(item.shortCode);
                          window.setTimeout(() => setCopied(null), 1400);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={
                          protectedLink
                            ? t("shortUrls.openProtectedUrlTooltip")
                            : t("shortUrls.openLongUrlTooltip")
                        }
                        asChild
                      >
                        <a href={protectedLink ? item.shortUrl : item.longUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <QrCodeButton shortUrl={item} />
                      {protectedLink ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("shortUrls.protectedEditDisabled")}
                          disabled
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : (
                        <EditShortUrlDialog
                          server={server}
                          shortUrl={item}
                          trigger={
                            <Button variant="ghost" size="icon" title={t("shortUrls.editTooltip")}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          }
                        />
                      )}
                      <DeleteShortUrlButton server={server} shortUrl={item} />
                    </div>
                    {copied === item.shortCode ? (
                      <p className="mt-1 text-right text-xs text-primary">{t("shortUrls.copied")}</p>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {t("shortUrls.pagination", {
                current: pagination?.currentPage ?? page,
                pages: pagination?.pagesCount ?? 1,
                total: formatNumber(pagination?.totalItems, i18n.language)
              })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {t("actions.previousPage")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (pagination?.pagesCount ?? 1)}
                onClick={() => setPage((value) => value + 1)}
              >
                {t("actions.nextPage")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
