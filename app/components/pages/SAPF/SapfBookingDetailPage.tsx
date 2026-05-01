"use client";

import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, FileDown, RefreshCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cancelSapfRequest, getSapfRequestById } from "./SapfActions";
import SapfReadonlyDetails from "./SapfReadonlyDetails";
import { RequestSummary } from "./SapfRequestDetail";

export default function SapfBookingDetailPage({
  requestId,
}: {
  requestId: string;
}) {
  const popup = usePopup();
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  if (loading && !payload) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Loading booking...</p>
      </div>
    );
  }

  if (!payload) return null;

  const { request, me } = payload;
  const canCancel =
    me?.role === "OFFICER" &&
    !["CANCELLED", "REJECTED"].includes(request.status);

  const handleCancel = async () => {
    const confirmed = await popup.showYesNo(
      "Cancel this reservation? This will stop the approval flow and release the slot.",
    );
    if (!confirmed) return;

    const formData = new FormData();
    formData.set("requestId", request.id);
    const result = await cancelSapfRequest(formData);
    if (!result.success) {
      popup.showError(result.message || "Failed to cancel reservation.");
      return;
    }
    popup.showSuccess(result.message || "Reservation cancelled.");
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
              Read-only LCUP Venue Reservation record.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {me?.role === "OFFICER" &&
            ["DRAFT", "RETURNED_FOR_REVISION"].includes(request.status) &&
            request.eventSpace?.id && (
              <Button asChild variant="outline">
                <Link
                  href={`/user/spaces/${request.eventSpace.id}?requestId=${request.id}`}
                >
                  Edit and Resubmit
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
              onClick={handleCancel}
              variant="destructive"
              disabled={loading}
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

      <RequestSummary request={request} showPdf={false} />
      <SapfReadonlyDetails request={request} />
    </div>
  );
}
