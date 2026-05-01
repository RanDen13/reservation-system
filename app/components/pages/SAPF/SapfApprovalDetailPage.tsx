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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { ArrowLeft, FileDown, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSapfRequestById } from "./SapfActions";
import { ConcernThreads, RequestDetail } from "./SapfRequestDetail";

export default function SapfApprovalDetailPage({
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
        <p className="text-gray-600">Loading approval...</p>
      </div>
    );
  }

  if (!payload) return null;

  const { request, me } = payload;

  const hasThreads = request.approvalSteps?.some(
    (step: any) => step.concernThread,
  );

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
            <h1 className="text-3xl font-bold text-gray-950">
              Approval Details
            </h1>
            <p className="text-gray-600">Review and action this request.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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
          {request.status === "APPROVED" && (
            <Button asChild variant="outline">
              <a href={`/api/sapf/${request.id}/pdf`} target="_blank">
                <FileDown className="mr-2 h-4 w-4" />
                View Reservation PDF
              </a>
            </Button>
          )}
          <Button onClick={refresh} variant="outline" disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-[320px]">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <RequestDetail
            request={request}
            me={me}
            onRefresh={refresh}
            showConcernThreads={false}
          />
        </TabsContent>

        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle>Concern Threads</CardTitle>
              <CardDescription>
                Private discussion between officer and reviewer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasThreads ? (
                <ConcernThreads request={request} onRefresh={refresh} />
              ) : (
                <p className="text-sm text-gray-500">No concern threads yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
