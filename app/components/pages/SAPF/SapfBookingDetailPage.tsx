"use client";

import ModalBase from "@/app/components/Popup/ModalBase";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { ArrowLeft, FileDown, RefreshCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cancelSapfRequest, getSapfRequestById } from "./SapfActions";
import SapfPageLoading from "./SapfPageLoading";
import SapfReadonlyDetails from "./SapfReadonlyDetails";
import { ConcernThreads, RequestSummary } from "./SapfRequestDetail";

export default function SapfBookingDetailPage({
  requestId,
}: {
  requestId: string;
}) {
  const popup = usePopup();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const result = await getSapfRequestById(requestId);
    if (!result.success) {
      popup.showError(result.message);
      setLoading(false);
      return;
    }
    setPayload(result.data);
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  if (loading && !payload) {
    return <SapfPageLoading variant="detail" />;
  }

  if (!payload) {
    return (
      <div className="p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Booking details unavailable</CardTitle>
            <CardDescription>
              We could not load this booking right now.
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

  const { request, me } = payload;
  const canCancel =
    me?.role === "OFFICER" &&
    !["CANCELLED", "REJECTED"].includes(request.status);
  const hasThreads = request.approvalSteps?.some(
    (step: any) => step.concernThread,
  );
  const showChat = hasThreads && me?.role === "OFFICER";
  const adviserApproved = request.approvalSteps?.some(
    (step: any) => step.position === "ADVISER" && step.status === "APPROVED",
  );
  const canEdit =
    me?.role === "OFFICER" &&
    (["DRAFT", "RETURNED_FOR_REVISION"].includes(request.status) ||
      (["SUBMITTED", "IN_REVIEW"].includes(request.status) &&
        !adviserApproved));

  const handleCancel = async () => {
    const reason = cancelReason.trim();
    if (!reason) {
      popup.showError("Enter a reason before cancelling this reservation.");
      return;
    }

    setCancelling(true);
    const formData = new FormData();
    formData.set("requestId", request.id);
    formData.set("comment", reason);
    const result = await cancelSapfRequest(formData);
    setCancelling(false);

    if (!result.success) {
      popup.showError(result.message || "Failed to cancel reservation.");
      return;
    }

    popup.showSuccess(result.message || "Reservation cancelled.");
    setShowCancel(false);
    setCancelReason("");
    await refresh();
  };

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/user/bookings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Booking Details
            </h1>
            <p className="text-muted-foreground">
              Read-only Zerve record.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/user/bookings/create?requestId=${request.id}`}>
                {request.status === "RETURNED_FOR_REVISION"
                  ? "Edit and Resubmit"
                  : "Edit Reservation"}
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <a href={`/api/sapf/${request.id}/preview`} target="_blank">
              <FileDown className="mr-2 h-4 w-4" />
              Preview Reservation
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/sapf/${request.id}/docx`}>
              <FileDown className="mr-2 h-4 w-4" />
              Download DOCX
            </a>
          </Button>
          {canCancel && (
            <Button
              onClick={() => setShowCancel(true)}
              variant="destructive"
              disabled={loading || cancelling}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Reservation
            </Button>
          )}
          <Button onClick={refresh} variant="outline" disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList
          className={`grid w-full ${
            showChat ? "grid-cols-2 md:w-[320px]" : "grid-cols-1 md:w-45"
          }`}
        >
          <TabsTrigger value="details">Details</TabsTrigger>
          {showChat && <TabsTrigger value="chat">Chat</TabsTrigger>}
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <RequestSummary request={request} showPdf={false} />
          <SapfReadonlyDetails request={request} />
        </TabsContent>

        {showChat && (
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle>Concern Threads</CardTitle>
                <CardDescription>
                  Private discussion between officer and reviewer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConcernThreads request={request} onRefresh={refresh} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {showCancel && (
        <ModalBase onClose={() => setShowCancel(false)}>
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Cancel Reservation</CardTitle>
              <CardDescription>
                This will stop the approval flow and release the slot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cancel-reason">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Explain why this reservation needs to be cancelled."
                  className="min-h-28"
                  disabled={cancelling}
                  required
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCancel(false)}
                  disabled={cancelling}
                >
                  Keep Reservation
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={cancelling || !cancelReason.trim()}
                >
                  {cancelling ? "Cancelling..." : "Cancel Reservation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </ModalBase>
      )}
    </div>
  );
}
