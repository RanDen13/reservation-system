"use client";

import { usePopup } from "@/app/components/Popup/PopupProvider";
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
import {
  Bell,
  CalendarDays,
  CheckCircle,
  Clock,
  History,
  MessageSquare,
  RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createVenueBlock, getSapfWorkspace } from "./SapfActions";

const activeStatuses = new Set([
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "RETURNED_FOR_REVISION",
]);

const historyStatuses = new Set(["APPROVED", "REJECTED", "CANCELLED"]);

function SuperAdminPanel({
  workspace,
  onRefresh,
}: {
  workspace: any;
  onRefresh: () => Promise<void>;
}) {
  const popup = usePopup();

  const run = async (
    fn: (formData: FormData) => Promise<{ success: boolean; message?: string }>,
    formData: FormData,
  ) => {
    const result = await fn(formData);
    if (!result.success) {
      popup.showError(result.message || "Action failed.");
      return;
    }
    popup.showSuccess(result.message || "Saved.");
    await onRefresh();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Venue Blocks
          </CardTitle>
          <CardDescription>
            Block university events or unavailable slots.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={(formData) => run(createVenueBlock, formData)}
            className="space-y-3"
          >
            <div>
              <Label>Venue</Label>
              <Select name="eventSpaceId" defaultValue="ALL">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All venues</SelectItem>
                  {workspace.venues.map((venue: any) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input name="title" required />
            </div>
            <div>
              <Label>Date</Label>
              <Input name="date" type="date" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start</Label>
                <Input name="startTime" type="time" required />
              </div>
              <div>
                <Label>End</Label>
                <Input name="endTime" type="time" required />
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Input name="reason" />
            </div>
            <Button className="w-full">Create Block</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SapfDashboard() {
  const popup = usePopup();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const result = await getSapfWorkspace();
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

  const stats = useMemo(() => {
    const requests = workspace?.requests || [];
    return {
      current: requests.filter((request: any) =>
        activeStatuses.has(request.status),
      ).length,
      history: requests.filter((request: any) =>
        historyStatuses.has(request.status),
      ).length,
      approved: requests.filter((request: any) => request.status === "APPROVED")
        .length,
      conversations: requests.reduce(
        (sum: number, request: any) =>
          sum +
          request.approvalSteps.filter((step: any) => step.concernThread)
            .length,
        0,
      ),
    };
  }, [workspace]);

  if (loading && !workspace) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Loading SAPF workspace...</p>
      </div>
    );
  }

  if (!workspace) return null;

  const reviewerCurrent = workspace.requests.filter((request: any) =>
    request.approvalSteps.some(
      (step: any) =>
        step.status === "ACTIVE" &&
        (step.reviewerId === workspace.me.id ||
          workspace.me.role === "SUPER_ADMIN"),
    ),
  );
  const waitingApprovalCount = reviewerCurrent.length;

  return (
    <div className="space-y-8 p-4 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">
            SAPF Reservation Workspace
          </h1>
          <p className="text-gray-600">
            Signed in as {workspace.me.name} -{" "}
            {workspace.me.role.replaceAll("_", " ")}
          </p>
        </div>
        <Button onClick={refresh} variant="outline" disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <Clock className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{stats.current}</p>
              <p className="text-sm text-gray-600">Current</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <History className="h-8 w-8 text-gray-600" />
            <div>
              <p className="text-2xl font-bold">{stats.history}</p>
              <p className="text-sm text-gray-600">History</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-sm text-gray-600">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <MessageSquare className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">{stats.conversations}</p>
              <p className="text-sm text-gray-600">Private threads</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {workspace.me.role !== "OFFICER" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Pending approvals
              </CardTitle>
              <CardDescription>
                Requests waiting for your review.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-3xl font-bold">{waitingApprovalCount}</p>
              <Button asChild variant="outline">
                <Link href="/user/approvals">Open approvals</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Booking history
            </CardTitle>
            <CardDescription>
              Approved, rejected, and cancelled requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-bold">{stats.history}</p>
            <Button asChild variant="outline">
              <Link href="/user/bookings">View history</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {workspace.notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {workspace.notifications.map((notification: any) => (
              <div key={notification.id} className="rounded-lg border p-3">
                <p className="text-sm font-semibold">{notification.title}</p>
                <p className="text-sm text-gray-600">{notification.body}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                </p>
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={
                        notification.requestId
                          ? `/user/approvals/${notification.requestId}`
                          : "/user/bookings"
                      }
                    >
                      View booking
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {workspace.me.role === "SUPER_ADMIN" && (
        <SuperAdminPanel workspace={workspace} onRefresh={refresh} />
      )}
    </div>
  );
}
