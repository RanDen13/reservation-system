"use client";

import ModalBase from "@/app/components/Popup/ModalBase";
import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { format } from "date-fns";
import { Plus, RefreshCcw, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createManagedAccount,
  deactivateAccount,
  getAccountsWorkspace,
  reactivateAccount,
  sendMagicEmail,
  updateApproverPosition,
  updateManagedRole,
} from "./SapfActions";

const roleOptions = ["OFFICER", "APPROVER", "ADMIN", "SUPER_ADMIN"] as const;
const approverRoleOptions = ["APPROVER", "ADMIN", "SUPER_ADMIN"] as const;
const positionOptions = [
  "NONE",
  "ADVISER",
  "DEAN",
  "SDS",
  "SAS",
  "ADDITIONAL_SIGNATORY",
  "VPAA",
  "UNIVERSITY_PRESIDENT",
] as const;

type AccountUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  status: "PENDING" | "ACTIVE" | "INACTIVE";
  createdAt: string | Date;
  approverPositions?: { position: string }[];
};

function StatusBadge({ status }: { status: AccountUser["status"] }) {
  const label = status.replaceAll("_", " ");
  const tone =
    status === "ACTIVE"
      ? "border-green-200 bg-green-50 text-green-700"
      : status === "INACTIVE"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-amber-200 bg-amber-50 text-amber-700";
  return (
    <Badge variant="outline" className={tone}>
      {label}
    </Badge>
  );
}

function AccountRow({
  user,
  onUpdated,
  isSelf,
}: {
  user: AccountUser;
  onUpdated: () => Promise<void>;
  isSelf: boolean;
}) {
  const popup = usePopup();
  const [role, setRole] = useState(user.role || "OFFICER");
  const [position, setPosition] = useState(
    user.approverPositions?.[0]?.position || "NONE",
  );
  const [savingRole, setSavingRole] = useState(false);
  const [savingPosition, setSavingPosition] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const [actionValue, setActionValue] = useState("");
  const canEditPosition =
    approverRoleOptions.includes(
      role as (typeof approverRoleOptions)[number],
    ) && role !== "SUPER_ADMIN";

  const handleRoleChange = async (nextRole: string) => {
    if (nextRole === role) return;
    const confirmed = await popup.showWarning(
      `Change ${user.name}'s role to ${nextRole.replaceAll("_", " ")}?`,
    );
    if (!confirmed) return;

    setSavingRole(true);
    const formData = new FormData();
    formData.set("userId", user.id);
    formData.set("role", nextRole);
    const result = await updateManagedRole(formData);
    setSavingRole(false);

    if (!result.success) {
      popup.showError(result.message);
      return;
    }

    popup.showSuccess(result.message || "Role updated.");
    setRole(nextRole);
    await onUpdated();
  };

  const handlePositionChange = async (nextPosition: string) => {
    if (nextPosition === position) return;
    const label =
      nextPosition === "NONE" ? "NONE" : nextPosition.replaceAll("_", " ");
    const confirmed = await popup.showWarning(
      `Change ${user.name}'s position to ${label}?`,
    );
    if (!confirmed) return;

    setSavingPosition(true);
    const formData = new FormData();
    formData.set("userId", user.id);
    formData.set("position", nextPosition);
    const result = await updateApproverPosition(formData);
    setSavingPosition(false);

    if (!result.success) {
      popup.showError(result.message);
      return;
    }

    popup.showSuccess(result.message || "Position updated.");
    setPosition(nextPosition);
    await onUpdated();
  };

  const handleActionChange = async (nextAction: string) => {
    if (!nextAction) return;
    setActionValue(nextAction);

    const actionLabel = nextAction.replaceAll("_", " ").toLowerCase();
    const confirmed = await popup.showWarning(
      `Run ${actionLabel} for ${user.name}?`,
    );
    if (!confirmed) {
      setActionValue("");
      return;
    }

    setSavingAction(true);
    let result;

    if (nextAction === "RESEND_MAGIC") {
      result = await sendMagicEmail(user.email);
    } else if (nextAction === "DEACTIVATE") {
      result = await deactivateAccount([user.id]);
    } else if (nextAction === "ACTIVATE") {
      result = await reactivateAccount([user.id]);
    }

    setSavingAction(false);
    setActionValue("");

    if (!result?.success) {
      popup.showError(result?.message || "Action failed.");
      return;
    }

    popup.showSuccess(result.message || "Action complete.");
    await onUpdated();
  };

  return (
    <tr className="border-t">
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </td>
      <td className="px-4 py-3">
        <Select
          value={role}
          onValueChange={handleRoleChange}
          disabled={savingRole || isSelf}
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <Select
          value={position}
          onValueChange={handlePositionChange}
          disabled={savingPosition || !canEditPosition}
        >
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {positionOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option === "NONE"
                  ? "No position"
                  : option.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={user.status} />
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {format(new Date(user.createdAt), "MMM d, yyyy")}
      </td>
      <td className="px-4 py-3">
        <Select
          value={actionValue}
          onValueChange={handleActionChange}
          disabled={savingAction || isSelf}
        >
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue placeholder="Select action" />
          </SelectTrigger>
          <SelectContent>
            {user.status === "PENDING" && (
              <SelectItem value="RESEND_MAGIC">Resend magic code</SelectItem>
            )}
            {!isSelf && user.status !== "INACTIVE" && (
              <SelectItem value="DEACTIVATE">Deactivate account</SelectItem>
            )}
            {!isSelf && user.status === "INACTIVE" && (
              <SelectItem value="ACTIVATE">Activate account</SelectItem>
            )}
          </SelectContent>
        </Select>
      </td>
    </tr>
  );
}

export default function SapfAccountsPage() {
  const popup = usePopup();
  const [workspace, setWorkspace] = useState<{
    users: AccountUser[];
    currentUserId: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const result = await getAccountsWorkspace();
    if (!result.success) {
      popup.showError(result.message);
      setLoading(false);
      return;
    }
    setWorkspace(result.data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (formData: FormData) => {
    setCreating(true);
    const result = await createManagedAccount(formData);
    setCreating(false);

    if (!result.success) {
      popup.showError(result.message);
      return;
    }

    popup.showSuccess(result.message || "Account created.");
    setShowCreate(false);
    await refresh();
  };

  if (loading && !workspace) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading accounts...</p>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="space-y-8 p-4 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Accounts</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and approver positions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create account
          </Button>
          <Button onClick={refresh} variant="outline" disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Accounts table
          </CardTitle>
          <CardDescription>
            {workspace.users.length} account
            {workspace.users.length === 1 ? "" : "s"} in the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Position</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {workspace.users.map((user) => (
                <AccountRow
                  key={user.id}
                  user={user}
                  onUpdated={refresh}
                  isSelf={user.id === workspace.currentUserId}
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {showCreate && (
        <ModalBase onClose={() => setShowCreate(false)}>
          <Card className="w-full max-w-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Create account
              </CardTitle>
              <CardDescription>
                New users receive a magic code and set their password on first
                login.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={handleCreate} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="create-name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="create-name"
                    name="name"
                    placeholder="e.g., Juan Dela Cruz"
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="create-email"
                    name="email"
                    type="email"
                    placeholder="e.g., juan@lcu.edu.ph"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-role">
                    Role <span className="text-destructive">*</span>
                  </Label>
                  <Select name="role" defaultValue="OFFICER">
                    <SelectTrigger id="create-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option.replaceAll("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Roles control access to approvals, settings, and system
                    actions.
                  </p>
                </div>
                <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreate(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? "Creating..." : "Create account"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </ModalBase>
      )}
    </div>
  );
}
