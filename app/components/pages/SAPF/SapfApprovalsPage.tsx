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
import { CheckCircle, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSapfWorkspace } from "./SapfActions";
import SapfPageLoading from "./SapfPageLoading";
import { RequestSummary } from "./SapfRequestDetail";

const visibleFollowStatuses = new Set([
  "SUBMITTED",
  "IN_REVIEW",
  "RETURNED_FOR_REVISION",
  "APPROVED",
  "REJECTED",
]);

export default function SapfApprovalsPage() {
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

  const reviewerCurrent = useMemo(() => {
    if (!workspace) return [];
    return workspace.requests.filter((request: any) =>
      request.approvalSteps.some(
        (step: any) =>
          step.status === "ACTIVE" &&
          (step.reviewerId === workspace.me.id ||
            workspace.me.role === "SUPER_ADMIN"),
      ),
    );
  }, [workspace]);
  const followableRequests = useMemo(() => {
    if (!workspace) return [];

    const activeIds = new Set(
      reviewerCurrent.map((request: any) => request.id),
    );
    return workspace.requests.filter((request: any) => {
      const isInApprovalChain =
        workspace.me.role === "SUPER_ADMIN" ||
        request.approvalSteps.some(
          (step: any) => step.reviewerId === workspace.me.id,
        );

      return (
        isInApprovalChain &&
        !activeIds.has(request.id) &&
        visibleFollowStatuses.has(request.status)
      );
    });
  }, [reviewerCurrent, workspace]);

  if (loading && !workspace) {
    return <SapfPageLoading variant="approvals" />;
  }

  if (!workspace) {
    return (
      <div className="p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Approvals unavailable</CardTitle>
            <CardDescription>
              We could not load your approval queue.
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
    <div className="space-y-8 p-4 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Approvals</h1>
          <p className="text-muted-foreground">
            Requests waiting for your approval.
          </p>
        </div>
        <Button onClick={refresh} variant="outline" disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {workspace.me.role === "OFFICER" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Approvals unavailable
            </CardTitle>
            <CardDescription>
              Approvals are visible to approvers and admins only.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Pending approvals
              </CardTitle>
              <CardDescription>
                {reviewerCurrent.length} request
                {reviewerCurrent.length === 1 ? "" : "s"} waiting for your
                review.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviewerCurrent.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active assigned reviews.
                </p>
              ) : (
                reviewerCurrent.map((request: any) => (
                  <div key={request.id} className="space-y-3">
                    <RequestSummary
                      request={request}
                      showBadges={false}
                      showConflict={false}
                      showPdf={false}
                    />
                    <div className="flex justify-end">
                      <Button asChild variant="outline">
                        <Link href={`/user/approvals/${request.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Following
              </CardTitle>
              <CardDescription>
                Requests where you are part of the approval chain, including
                ones you already approved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {followableRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No other assigned requests to follow.
                </p>
              ) : (
                followableRequests.map((request: any) => (
                  <div key={request.id} className="space-y-3">
                    <RequestSummary
                      request={request}
                      showConflict={false}
                      showPdf={false}
                    />
                    <div className="flex justify-end">
                      <Button asChild variant="outline">
                        <Link href={`/user/approvals/${request.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
