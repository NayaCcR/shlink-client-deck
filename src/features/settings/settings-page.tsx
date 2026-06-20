"use client";

import {
  Copy,
  Database,
  ExternalLink,
  Globe2,
  KeyRound,
  Loader2,
  Moon,
  Plus,
  Settings,
  ShieldCheck,
  Ticket,
  Trash2,
  UserPlus,
  Users,
  XCircle
} from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/app/page-header";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusCallout } from "@/components/ui/status-callout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  useChangeHostedPassword,
  useCreateHostedInvite,
  useDisableHostedInvite,
  useHostedInvites,
  useHostedMembers,
  useRemoveHostedMember,
  useUpdateHostedMemberRole
} from "@/features/auth/hosted-hooks";
import {
  ClearConfigButton,
  ExportConfigButton,
  ImportConfigButton
} from "@/features/servers/local-config-actions";
import { isHostedAppMode } from "@/lib/config/app-mode";
import { useSettingsStore, type AppTheme } from "@/features/settings/settings-store";
import { useRuntimeConfig } from "@/lib/config/use-runtime-config";
import {
  roleCanAssignMemberRole,
  roleCanInviteRole,
  roleCanManageInvites,
  roleCanManageMemberRole,
  roleCanManageMembers
} from "@/lib/hosted/permissions";
import type {
  HostedInviteRole,
  HostedRole,
  HostedWorkspaceInvite,
  HostedWorkspaceMember
} from "@/lib/hosted/types";
import { formatDateTime } from "@/lib/utils";

type SettingsPageProps = {
  mode?: "static" | "hosted";
  workspaceId?: string | null;
  workspaceRole?: HostedRole | null;
  currentUserId?: string | null;
};

const INVITE_ROLES: HostedInviteRole[] = ["member", "viewer", "admin"];
const MEMBER_ROLES: HostedRole[] = ["owner", "admin", "member", "viewer"];

function getInviteStatus(invite: HostedWorkspaceInvite) {
  if (invite.disabledAt) {
    return "disabled";
  }

  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) {
    return "expired";
  }

  if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
    return "usedUp";
  }

  return "active";
}

function toDateTimeLocalValue(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function HostedInvitesPanel({
  workspaceId,
  workspaceRole
}: {
  workspaceId?: string | null;
  workspaceRole?: HostedRole | null;
}) {
  const { t, i18n } = useTranslation();
  const canManageInvites = workspaceRole ? roleCanManageInvites(workspaceRole) : false;
  const invitesQuery = useHostedInvites(workspaceId, canManageInvites);
  const createInvite = useCreateHostedInvite(workspaceId);
  const disableInvite = useDisableHostedInvite(workspaceId);
  const [role, setRole] = React.useState<HostedInviteRole>("member");
  const [maxUses, setMaxUses] = React.useState("1");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [createdInvite, setCreatedInvite] = React.useState<{
    code: string;
    link: string;
  } | null>(null);
  const [copied, setCopied] = React.useState<"code" | "link" | null>(null);

  const roleOptions = React.useMemo(
    () => INVITE_ROLES.filter((item) => (workspaceRole ? roleCanInviteRole(workspaceRole, item) : false)),
    [workspaceRole]
  );

  React.useEffect(() => {
    if (roleOptions.length > 0 && !roleOptions.includes(role)) {
      setRole(roleOptions[0]);
    }
  }, [role, roleOptions]);

  if (!canManageInvites) {
    return null;
  }

  const handleCopy = async (value: string, type: "code" | "link") => {
    await navigator.clipboard?.writeText(value).catch(() => undefined);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const handleCreateInvite = async () => {
    if (!workspaceId || roleOptions.length === 0) {
      return;
    }

    const maxUsesValue = maxUses.trim() ? Number(maxUses) : null;
    const result = await createInvite.mutateAsync({
      workspaceId,
      role,
      maxUses:
        maxUsesValue && Number.isSafeInteger(maxUsesValue) && maxUsesValue > 0
          ? maxUsesValue
          : null,
      expiresAt: expiresAt ? toDateTimeLocalValue(expiresAt) : null
    });
    const origin = window.location.origin;
    setCreatedInvite({
      code: result.code,
      link: `${origin}/?invite=${encodeURIComponent(result.code)}`
    });
  };

  return (
    <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Ticket className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="text-base font-semibold">{t("settings.invites.title")}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t("settings.invites.description")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-2">
          <Label>{t("settings.invites.role")}</Label>
          <Select
            value={role}
            disabled={roleOptions.length === 0}
            onValueChange={(value) => setRole(value as HostedInviteRole)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`settings.invites.roles.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invite-max-uses">{t("settings.invites.maxUses")}</Label>
            <Input
              id="invite-max-uses"
              inputMode="numeric"
              min={1}
              type="number"
              value={maxUses}
              onChange={(event) => setMaxUses(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-expires-at">{t("settings.invites.expiresAt")}</Label>
            <Input
              id="invite-expires-at"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            className="w-full lg:w-auto"
            disabled={createInvite.isPending || !workspaceId || roleOptions.length === 0}
            onClick={() => void handleCreateInvite()}
          >
            {createInvite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("settings.invites.create")}
          </Button>
        </div>
      </div>

      {createdInvite ? (
        <StatusCallout
          icon={UserPlus}
          title={t("settings.invites.createdTitle")}
          tone="success"
          className="mt-4"
        >
          <div className="space-y-3">
            <p>{t("settings.invites.createdDescription")}</p>
            <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
              <Input readOnly value={createdInvite.link} />
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleCopy(createdInvite.link, "link")}
              >
                <Copy className="h-4 w-4" />
                {copied === "link" ? t("settings.invites.copied") : t("settings.invites.copyLink")}
              </Button>
            </div>
            <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
              <Input readOnly value={createdInvite.code} />
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleCopy(createdInvite.code, "code")}
              >
                <Copy className="h-4 w-4" />
                {copied === "code" ? t("settings.invites.copied") : t("settings.invites.copyCode")}
              </Button>
            </div>
          </div>
        </StatusCallout>
      ) : null}

      {createInvite.isError || disableInvite.isError ? (
        <StatusCallout title={t("settings.invites.failed")} tone="danger" className="mt-4">
          {(createInvite.error || disableInvite.error)?.message}
        </StatusCallout>
      ) : null}

      <div className="mt-5">
        {invitesQuery.isLoading ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("settings.invites.loading")}
          </div>
        ) : invitesQuery.isError ? (
          <StatusCallout title={t("settings.invites.loadFailed")} tone="danger">
            {invitesQuery.error.message}
          </StatusCallout>
        ) : !invitesQuery.data?.invites.length ? (
          <EmptyState
            icon={Ticket}
            title={t("settings.invites.emptyTitle")}
            description={t("settings.invites.emptyDescription")}
            className="min-h-[180px]"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.invites.table.code")}</TableHead>
                <TableHead>{t("settings.invites.table.role")}</TableHead>
                <TableHead>{t("settings.invites.table.uses")}</TableHead>
                <TableHead>{t("settings.invites.table.expiresAt")}</TableHead>
                <TableHead>{t("settings.invites.table.status")}</TableHead>
                <TableHead className="text-right">{t("settings.invites.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitesQuery.data.invites.map((invite) => {
                const status = getInviteStatus(invite);
                return (
                  <TableRow key={invite.id}>
                    <TableCell className="font-mono text-xs">{invite.codePreview}</TableCell>
                    <TableCell>{t(`settings.invites.roles.${invite.role}`)}</TableCell>
                    <TableCell>
                      {invite.uses} / {invite.maxUses ?? t("settings.invites.unlimited")}
                    </TableCell>
                    <TableCell>
                      {invite.expiresAt
                        ? formatDateTime(invite.expiresAt, i18n.language)
                        : t("settings.invites.never")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status === "active" ? "default" : "secondary"}>
                        {t(`settings.invites.status.${status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={status !== "active" || disableInvite.isPending}
                        onClick={() => void disableInvite.mutateAsync(invite.id)}
                      >
                        <XCircle className="h-4 w-4" />
                        {t("settings.invites.disable")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}

function HostedPasswordPanel() {
  const { t } = useTranslation();
  const changePassword = useChangeHostedPassword();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);

    if (newPassword.length < 8) {
      setLocalError(t("settings.account.passwordTooShort"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError(t("settings.account.passwordMismatch"));
      return;
    }

    setLocalError(null);
    await changePassword.mutateAsync({
      currentPassword,
      newPassword
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSaved(true);
  };

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <KeyRound className="h-5 w-5 text-muted-foreground" />
        <div>
          <h3 className="text-base font-semibold">{t("settings.account.title")}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t("settings.account.description")}
          </p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="current-password">{t("settings.account.currentPassword")}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">{t("settings.account.newPassword")}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t("settings.account.confirmPassword")}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        </div>

        {localError || changePassword.isError ? (
          <StatusCallout title={t("settings.account.failed")} tone="danger">
            {localError || changePassword.error?.message}
          </StatusCallout>
        ) : null}

        {saved ? (
          <StatusCallout title={t("settings.account.saved")} tone="success">
            {t("settings.account.savedDescription")}
          </StatusCallout>
        ) : null}

        <Button
          type="submit"
          disabled={
            changePassword.isPending ||
            !currentPassword ||
            !newPassword ||
            !confirmPassword
          }
        >
          {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t("settings.account.submit")}
        </Button>
      </form>
    </section>
  );
}

function HostedMembersPanel({
  workspaceId,
  workspaceRole,
  currentUserId
}: {
  workspaceId?: string | null;
  workspaceRole?: HostedRole | null;
  currentUserId?: string | null;
}) {
  const { t, i18n } = useTranslation();
  const canManageMembers = workspaceRole ? roleCanManageMembers(workspaceRole) : false;
  const membersQuery = useHostedMembers(workspaceId, canManageMembers);
  const updateRole = useUpdateHostedMemberRole(workspaceId);
  const removeMember = useRemoveHostedMember(workspaceId);
  const [removingMember, setRemovingMember] = React.useState<HostedWorkspaceMember | null>(null);

  if (!canManageMembers) {
    return null;
  }

  const roleOptionsFor = (member: HostedWorkspaceMember) => {
    const assignableRoles = MEMBER_ROLES.filter((role) =>
      workspaceRole ? roleCanAssignMemberRole(workspaceRole, role) : false
    );
    return Array.from(new Set([member.role, ...assignableRoles]));
  };

  const canManageMember = (member: HostedWorkspaceMember) =>
    Boolean(
      workspaceRole &&
        currentUserId !== member.userId &&
        roleCanManageMemberRole(workspaceRole, member.role)
    );

  const handleRoleChange = async (memberId: string, role: HostedRole) => {
    await updateRole.mutateAsync({ memberId, role });
  };

  const handleRemove = async () => {
    if (!removingMember) {
      return;
    }

    await removeMember.mutateAsync(removingMember.id);
    setRemovingMember(null);
  };

  return (
    <section className="mt-5 rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Users className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="text-base font-semibold">{t("settings.members.title")}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t("settings.members.description")}
            </p>
          </div>
        </div>
      </div>

      {updateRole.isError || removeMember.isError ? (
        <StatusCallout title={t("settings.members.failed")} tone="danger" className="mb-4">
          {(updateRole.error || removeMember.error)?.message}
        </StatusCallout>
      ) : null}

      {membersQuery.isLoading ? (
        <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t("settings.members.loading")}
        </div>
      ) : membersQuery.isError ? (
        <StatusCallout title={t("settings.members.loadFailed")} tone="danger">
          {membersQuery.error.message}
        </StatusCallout>
      ) : !membersQuery.data?.members.length ? (
        <EmptyState
          icon={Users}
          title={t("settings.members.emptyTitle")}
          description={t("settings.members.emptyDescription")}
          className="min-h-[180px]"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("settings.members.table.member")}</TableHead>
              <TableHead>{t("settings.members.table.role")}</TableHead>
              <TableHead>{t("settings.members.table.joinedAt")}</TableHead>
              <TableHead className="text-right">{t("settings.members.table.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {membersQuery.data.members.map((member) => {
              const isCurrentUser = currentUserId === member.userId;
              const manageable = canManageMember(member);
              const roleOptions = roleOptionsFor(member);
              return (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{member.name}</span>
                        {isCurrentUser ? (
                          <Badge variant="outline">{t("settings.members.currentUser")}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      disabled={!manageable || updateRole.isPending || roleOptions.length === 0}
                      onValueChange={(value) => void handleRoleChange(member.id, value as HostedRole)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`settings.members.roles.${role}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{formatDateTime(member.createdAt, i18n.language)}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog
                      open={removingMember?.id === member.id}
                      onOpenChange={(open) => setRemovingMember(open ? member : null)}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!manageable || removeMember.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("settings.members.remove")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("settings.members.removeTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("settings.members.removeDescription", {
                              name: member.name
                            })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("settings.members.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void handleRemove()}
                          >
                            {removeMember.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : null}
                            {t("settings.members.confirmRemove")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

export function SettingsPage({
  mode = isHostedAppMode() ? "hosted" : "static",
  workspaceId,
  workspaceRole,
  currentUserId
}: SettingsPageProps) {
  const { t } = useTranslation();
  const { setTheme } = useTheme();
  const storedTheme = useSettingsStore((state) => state.theme);
  const setStoredTheme = useSettingsStore((state) => state.setTheme);
  const locale = useSettingsStore((state) => state.locale);
  const setLocale = useSettingsStore((state) => state.setLocale);
  const { data: config } = useRuntimeConfig();
  const hostedMode = mode === "hosted";
  const hostedModeUrl = !hostedMode && config?.allowHostedMode ? config.hostedModeUrl : null;

  const handleTheme = (value: AppTheme) => {
    setStoredTheme(value);
    setTheme(value);
  };

  return (
    <div>
      <PageHeader
        icon={Settings}
        title={t("settings.title")}
        description={t("settings.description")}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Moon className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold">{t("settings.appearance")}</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("layout.theme")}</Label>
              <Select value={storedTheme} onValueChange={(value) => handleTheme(value as AppTheme)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t("layout.system")}</SelectItem>
                  <SelectItem value="light">{t("layout.light")}</SelectItem>
                  <SelectItem value="dark">{t("layout.dark")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("layout.language")}</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">{t("layout.chinese")}</SelectItem>
                  <SelectItem value="en">{t("layout.english")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {!hostedMode ? (
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-base font-semibold">{t("settings.localData")}</h3>
            </div>
            <p className="mb-4 text-sm leading-6 text-muted-foreground">
              {t("settings.localDataDesc")}
            </p>
            <div className="flex flex-wrap gap-2">
              <ImportConfigButton />
              <ExportConfigButton />
              <ClearConfigButton />
            </div>
          </section>
        ) : (
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Database className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-base font-semibold">{t("settings.hostedData")}</h3>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("settings.hostedDataDesc")}
            </p>
          </section>
        )}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold">Static Mode</h3>
          </div>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>{t("settings.staticModeDesc1")}</p>
            <p>{t("settings.staticModeDesc2")}</p>
            <p>{t("settings.staticModeDesc3")}</p>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Globe2 className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-base font-semibold">{t("settings.hostedMode")}</h3>
          </div>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>
              {t("settings.hostedConfig", {
                value: String(hostedMode || config?.allowHostedMode || false)
              })}
            </p>
            <p>{hostedMode ? t("settings.hostedEnabledDesc1") : t("settings.hostedDesc1")}</p>
            <p>{hostedMode ? t("settings.hostedEnabledDesc2") : t("settings.hostedDesc2")}</p>
          </div>
          {!hostedMode ? (
            hostedModeUrl ? (
              <Button asChild className="mt-4" variant="outline">
                <a href={hostedModeUrl}>
                  <ExternalLink className="h-4 w-4" />
                  {t("settings.openHostedMode")}
                </a>
              </Button>
            ) : (
              <Button className="mt-4" variant="outline" disabled>
                {t("settings.hostedDisabled")}
              </Button>
            )
          ) : null}
        </section>
      </div>

      {hostedMode ? (
        <>
          <div className="mt-5">
            <HostedPasswordPanel />
          </div>
          <HostedMembersPanel
            workspaceId={workspaceId}
            workspaceRole={workspaceRole}
            currentUserId={currentUserId}
          />
          <HostedInvitesPanel workspaceId={workspaceId} workspaceRole={workspaceRole} />
        </>
      ) : null}
    </div>
  );
}
