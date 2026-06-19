"use client";

import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Pencil,
  Tags,
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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { PageHeader } from "@/components/app/page-header";
import { TagComparisonChart } from "@/features/visits/chart-components";
import { useAllShortUrls } from "@/features/short-urls/short-url-hooks";
import { useDeleteTag, useRenameTag, useTags } from "@/features/tags/tag-hooks";
import { useManyTagVisits } from "@/features/visits/visit-hooks";
import { getDateRange } from "@/lib/analytics/date-range";
import { buildTagComparison } from "@/lib/analytics/visits";
import { getShlinkErrorMessage } from "@/lib/shlink/errors";
import type { ShlinkServer } from "@/lib/shlink/types";
import { formatNumber } from "@/lib/utils";

type TagsPageProps = {
  server: ShlinkServer | null;
  onFilterTag: (tag: string) => void;
};

function RenameTagDialog({
  server,
  tag
}: {
  server: ShlinkServer | null;
  tag: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [newName, setNewName] = React.useState(tag);
  const mutation = useRenameTag(server);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title={t("tags.renameTooltip")}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tags.renameTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="tag-name">{t("fields.tags")}</Label>
          <Input id="tag-name" value={newName} onChange={(event) => setNewName(event.target.value)} />
        </div>
        {mutation.isError ? (
          <p className="text-sm text-destructive">{getShlinkErrorMessage(mutation.error, t)}</p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("actions.cancel")}
          </Button>
          <Button
            disabled={!newName.trim() || mutation.isPending}
            onClick={async () => {
              const result = await mutation
                .mutateAsync({
                  oldName: tag,
                  newName: newName.trim()
                })
                .then(() => true)
                .catch(() => false);

              if (!result) {
                return;
              }

              setOpen(false);
            }}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTagButton({ server, tag }: { server: ShlinkServer | null; tag: string }) {
  const { t } = useTranslation();
  const mutation = useDeleteTag(server);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" title={t("tags.deleteTooltip")}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("tags.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("tags.deleteDescription", { tag })}
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
              void mutation.mutateAsync(tag).catch(() => undefined);
            }}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("actions.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TagsPage({ server, onFilterTag }: TagsPageProps) {
  const { t, i18n } = useTranslation();
  const tagsQuery = useTags(server);
  const shortUrlsQuery = useAllShortUrls(server);
  const tags = tagsQuery.data?.tags.data ?? [];
  const dateRange = React.useMemo(() => getDateRange(30), []);
  const tagVisitsQueries = useManyTagVisits(server, tags, {
    itemsPerPage: 1000,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  });
  const tagVisitTotals = Object.fromEntries(
    tags.map((tag, index) => [
      tag,
      tagVisitsQueries[index]?.data?.visits.pagination.totalItems ?? 0
    ])
  );
  const comparison = buildTagComparison(shortUrlsQuery.data ?? [], tagVisitTotals);
  const loading =
    tagsQuery.isLoading ||
    shortUrlsQuery.isLoading ||
    tagVisitsQueries.some((query) => query.isLoading);
  const error =
    tagsQuery.error ||
    shortUrlsQuery.error ||
    tagVisitsQueries.find((query) => query.error)?.error;

  if (!server) {
    return (
      <EmptyState
        icon={Tags}
        title={t("tags.noServerTitle")}
        description={t("tags.noServerDescription")}
      />
    );
  }

  return (
    <div>
      <PageHeader
        icon={Tags}
        title={t("tags.title")}
        description={t("tags.description")}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <TagComparisonChart
          title={t("tags.shortUrlsCountTitle")}
          description={t("tags.shortUrlsCountDesc")}
          data={comparison}
          valueKey="shortUrls"
          loading={loading}
          error={error}
        />
        <TagComparisonChart
          title={t("tags.visitsComparisonTitle")}
          description={t("tags.visitsComparisonDesc")}
          data={comparison}
          valueKey="visits"
          loading={loading}
          error={error}
        />
      </div>

      <section className="mt-5 rounded-lg border border-border bg-card shadow-sm">
        {tagsQuery.isLoading ? (
          <div className="p-5 text-sm text-muted-foreground">{t("tags.loading")}</div>
        ) : tagsQuery.isError ? (
          <EmptyState
            icon={AlertCircle}
            title={t("tags.loadFailed")}
            description={getShlinkErrorMessage(tagsQuery.error, t)}
            className="m-5"
          />
        ) : tags.length === 0 ? (
          <EmptyState
            icon={Tags}
            title={t("tags.emptyTitle")}
            description={t("tags.emptyDescription")}
            className="m-5"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("tags.table.tag")}</TableHead>
                <TableHead>{t("tags.table.shortUrls")}</TableHead>
                <TableHead>{t("tags.table.last30Visits")}</TableHead>
                <TableHead className="w-[180px] text-right">{t("tags.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.map((item) => (
                <TableRow key={item.tag}>
                  <TableCell className="font-medium">{item.tag}</TableCell>
                  <TableCell>{formatNumber(item.shortUrls, i18n.language)}</TableCell>
                  <TableCell>{formatNumber(item.visits, i18n.language)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t("tags.filterTooltip")}
                        onClick={() => onFilterTag(item.tag)}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <RenameTagDialog server={server} tag={item.tag} />
                      <DeleteTagButton server={server} tag={item.tag} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
