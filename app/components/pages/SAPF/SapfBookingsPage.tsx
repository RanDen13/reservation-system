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
import {
  MotionItem,
  MotionList,
  MotionPage,
  MotionSection,
} from "@/app/components/ui/motion";
import { CheckCircle, Clock, History, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSapfWorkspace } from "./SapfActions";
import SapfPageLoading from "./SapfPageLoading";
import { RequestSummary } from "./SapfRequestDetail";

const activeStatuses = new Set([
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "RETURNED_FOR_REVISION",
]);
const historyStatuses = new Set(["APPROVED", "REJECTED", "CANCELLED"]);
const followStatuses = new Set([
  "SUBMITTED",
  "IN_REVIEW",
  "RETURNED_FOR_REVISION",
]);

function RequestList({
  requests,
  hrefFor,
  empty,
  summaryProps,
}: {
  requests: any[];
  hrefFor: (request: any) => string;
  empty: string;
  summaryProps?: {
    showBadges?: boolean;
    showConflict?: boolean;
    showPdf?: boolean;
  };
}) {
  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <MotionList className="space-y-4">
      {requests.map((request: any) => (
        <MotionItem key={request.id} className="space-y-3">
          <RequestSummary request={request} {...summaryProps} />
          <div className="flex justify-end">
            <Button asChild variant="outline">
              <Link href={hrefFor(request)}>View</Link>
            </Button>
          </div>
        </MotionItem>
      ))}
    </MotionList>
  );
}

export default function SapfBookingsPage() {
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

  const historyRequests = useMemo(() => {
    if (!workspace) return [];
    return workspace.requests.filter((request: any) =>
      historyStatuses.has(request.status),
    );
  }, [workspace]);
  const pendingRequests = useMemo(() => {
    if (!workspace) return [];

    if (workspace.me.role === "OFFICER") {
      return workspace.requests.filter((request: any) =>
        activeStatuses.has(request.status),
      );
    }

    return workspace.requests.filter((request: any) =>
      request.approvalSteps.some(
        (step: any) =>
          step.status === "ACTIVE" &&
          (step.reviewerId === workspace.me.id ||
            workspace.me.role === "SUPER_ADMIN"),
      ),
    );
  }, [workspace]);
  const followingRequests = useMemo(() => {
    if (!workspace || workspace.me.role === "OFFICER") return [];

    const pendingIds = new Set(
      pendingRequests.map((request: any) => request.id),
    );

    return workspace.requests.filter((request: any) => {
      const isInApprovalChain =
        workspace.me.role === "SUPER_ADMIN" ||
        request.approvalSteps.some(
          (step: any) => step.reviewerId === workspace.me.id,
        );

      return (
        isInApprovalChain &&
        !pendingIds.has(request.id) &&
        followStatuses.has(request.status)
      );
    });
  }, [pendingRequests, workspace]);

  if (loading && !workspace) {
    return <SapfPageLoading variant="bookings" />;
  }

  if (!workspace) {
    return (
      <div className="p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Bookings unavailable</CardTitle>
            <CardDescription>
              We could not load your booking data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refresh} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MotionPage className="space-y-8 p-4 lg:p-8">
      <MotionSection className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bookings</h1>
          <p className="text-muted-foreground">
            Pending reviews, followed requests, and old venue reservation
            records.
          </p>
        </div>
        <Button onClick={refresh} variant="outline" disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </MotionSection>

      <MotionSection>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending
          </CardTitle>
          <CardDescription>
            {pendingRequests.length} request
            {pendingRequests.length === 1 ? "" : "s"} waiting or in progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RequestList
            requests={pendingRequests}
            hrefFor={(request) =>
              workspace.me.role === "OFFICER"
                ? `/user/bookings/${request.id}`
                : `/user/approvals/${request.id}`
            }
            empty="No pending requests."
            summaryProps={{
              showBadges: workspace.me.role === "OFFICER",
              showConflict: workspace.me.role === "OFFICER",
              showPdf: false,
            }}
          />
        </CardContent>
      </Card>
      </MotionSection>

      {workspace.me.role !== "OFFICER" && (
        <MotionSection>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Following
            </CardTitle>
            <CardDescription>
              {followingRequests.length} request
              {followingRequests.length === 1 ? "" : "s"} you can monitor after
              your step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RequestList
              requests={followingRequests}
              hrefFor={(request) => `/user/approvals/${request.id}`}
              empty="No requests to follow."
              summaryProps={{ showConflict: false, showPdf: false }}
            />
          </CardContent>
        </Card>
        </MotionSection>
      )}

      <MotionSection>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Old
          </CardTitle>
          <CardDescription>
            {historyRequests.length} completed request
            {historyRequests.length === 1 ? "" : "s"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RequestList
            requests={historyRequests}
            hrefFor={(request) => `/user/bookings/${request.id}`}
            empty="No old requests yet."
            summaryProps={{ showPdf: false }}
          />
        </CardContent>
      </Card>
      </MotionSection>
    </MotionPage>
  );
}
