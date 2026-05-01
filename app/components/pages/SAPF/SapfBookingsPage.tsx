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
import { History, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSapfWorkspace } from "./SapfActions";
import { RequestDetail } from "./SapfRequestDetail";

const historyStatuses = new Set(["APPROVED", "REJECTED", "CANCELLED"]);

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

  if (loading && !workspace) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Loading booking history...</p>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="space-y-8 p-4 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">Booking History</h1>
          <p className="text-gray-600">
            Approved, rejected, and cancelled SAPF requests.
          </p>
        </div>
        <Button onClick={refresh} variant="outline" disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            All history
          </CardTitle>
          <CardDescription>
            {historyRequests.length} request
            {historyRequests.length === 1 ? "" : "s"} in history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {historyRequests.length === 0 ? (
            <p className="text-sm text-gray-500">No historical requests yet.</p>
          ) : (
            historyRequests.map((request: any) => (
              <RequestDetail
                key={request.id}
                request={request}
                me={workspace.me}
                onRefresh={refresh}
                showReviewControls={false}
                showConcernThreads={false}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
