"use client";

import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  FileDown,
  MessageSquare,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { addConcernMessage, reviewSapfRequest } from "./SapfActions";

function statusClass(status: string) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  if (status === "RETURNED_FOR_REVISION" || status === "RETURNED")
    return "bg-orange-100 text-orange-700";
  if (status === "ACTIVE" || status === "IN_REVIEW")
    return "bg-blue-100 text-blue-700";
  if (status === "DRAFT") return "bg-gray-100 text-gray-700";
  return "bg-amber-100 text-amber-700";
}

function formatDateRange(request: any) {
  return `${format(new Date(request.startAt), "MMM d, yyyy")} - ${format(
    new Date(request.startAt),
    "h:mm a",
  )} to ${format(new Date(request.endAt), "h:mm a")}`;
}

function formatList(value?: string) {
  return value?.split("|").filter(Boolean) ?? [];
}

function formatValue(value: string | undefined | null, fallback = "N/A") {
  return value?.trim() || fallback;
}

export function RequestSummary({
  request,
  showBadges = true,
  showConflict = true,
  showPdf = true,
}: {
  request: any;
  showBadges?: boolean;
  showConflict?: boolean;
  showPdf?: boolean;
}) {
  const waitingSince = request.approvalSteps?.find(
    (step: any) => step.status === "ACTIVE",
  )?.updatedAt;

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-sm font-semibold text-gray-500">
            #{request.requestNumber}
          </p>
          <h3 className="text-lg font-bold text-gray-900">{request.title}</h3>
          <p className="text-sm text-gray-600">{request.organization}</p>
          <p className="mt-2 text-sm text-gray-700">
            {request.eventSpace?.name} - {formatDateRange(request)}
          </p>
          <p className="text-sm text-gray-500">
            Submitted: {format(new Date(request.createdAt), "MMM d, yyyy")}
          </p>
          {waitingSince && (
            <p className="text-sm text-gray-500">
              Waiting since:{" "}
              {formatDistanceToNow(new Date(waitingSince), {
                addSuffix: false,
              })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {showBadges && (
            <Badge className={statusClass(request.status)}>
              {request.status.replaceAll("_", " ")}
            </Badge>
          )}
          {showConflict && request.conflictWarning && (
            <Badge className="bg-amber-100 text-amber-700">
              Pending conflict
            </Badge>
          )}
          {showPdf && request.status === "APPROVED" && (
            <a href={`/api/sapf/${request.id}/pdf`} target="_blank">
              <Button size="sm" variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                SAPF PDF
              </Button>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Timeline({ request }: { request: any }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700">Approval chain</p>
      <div className="grid gap-2 md:grid-cols-2">
        {request.approvalSteps?.map((step: any) => (
          <div
            key={step.id}
            className="flex items-start justify-between gap-3 rounded-lg border bg-gray-50 p-3"
          >
            <div>
              <p className="text-sm font-semibold">
                {step.stepOrder}. {step.label}
              </p>
              <p className="text-xs text-gray-600">{step.reviewer?.name}</p>
              {step.comment && (
                <p className="mt-1 text-xs text-gray-700">{step.comment}</p>
              )}
            </div>
            <Badge className={statusClass(step.status)}>
              {step.status.replaceAll("_", " ")}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConcernThreads({
  request,
  onRefresh,
}: {
  request: any;
  onRefresh: () => Promise<void>;
}) {
  const popup = usePopup();
  const visibleSteps = request.approvalSteps?.filter(
    (step: any) => step.concernThread,
  );

  const handleMessage = async (formData: FormData) => {
    const result = await addConcernMessage(formData);
    if (!result.success) {
      popup.showError(result.message);
      return;
    }
    popup.showSuccess(result.message || "Message sent.");
    await onRefresh();
  };

  if (!visibleSteps?.length) return null;

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <MessageSquare className="h-4 w-4" />
        Private concern threads
      </p>
      {visibleSteps.map((step: any) => (
        <div key={step.id} className="rounded-lg border p-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{step.label}</p>
              <p className="text-xs text-gray-500">
                Private between officer and {step.reviewer?.name}
              </p>
            </div>
            <Badge variant="outline">{step.concernThread.status}</Badge>
          </div>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-md bg-gray-50 p-3">
            {step.concernThread.messages.map((message: any) => (
              <div
                key={message.id}
                className="rounded-md bg-white p-2 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-700">
                    {message.author?.name}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {format(new Date(message.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
                <p className="mt-1 text-sm text-gray-700">{message.body}</p>
              </div>
            ))}
          </div>
          <form action={handleMessage} className="mt-3 flex gap-2">
            <input type="hidden" name="requestId" value={request.id} />
            <input type="hidden" name="stepId" value={step.id} />
            <Input name="body" placeholder="Reply to this concern" />
            <Button type="submit">Send</Button>
          </form>
        </div>
      ))}
    </div>
  );
}

function ReviewControls({
  request,
  me,
  onRefresh,
}: {
  request: any;
  me: any;
  onRefresh: () => Promise<void>;
}) {
  const popup = usePopup();
  if (me?.role === "SUPER_ADMIN") return null;
  const step = request.approvalSteps?.find(
    (item: any) => item.status === "ACTIVE" && item.reviewerId === me.id,
  );

  if (!step) return null;

  const handleReview = async (formData: FormData) => {
    const result = await reviewSapfRequest(formData);
    if (!result.success) {
      popup.showError(result.message);
      return;
    }
    popup.showSuccess(result.message || "Review saved.");
    await onRefresh();
  };

  return (
    <div className="space-y-4 rounded-lg border bg-blue-50 p-4">
      <div>
        <p className="font-semibold text-blue-950">Your active review</p>
        <p className="text-sm text-blue-800">{step.label}</p>
      </div>

      {step.position === "SDS" && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Parent&apos;s Consent Form</Label>
            <Input
              form="approve-form"
              name="parentsConsent"
              placeholder="Yes / Not Applicable"
            />
          </div>
          <div>
            <Label>Attachments</Label>
            <Input
              form="approve-form"
              name="attachments"
              placeholder="List attachments"
            />
          </div>
          <div>
            <Label>Academic Class Interruption</Label>
            <Input
              form="approve-form"
              name="academicInterruption"
              placeholder="Yes / None"
            />
          </div>
          <div>
            <Label>Academic Remarks</Label>
            <Input
              form="approve-form"
              name="academicRemarks"
              placeholder="Remarks"
            />
          </div>
          <div>
            <Label>Medical Exam Request</Label>
            <Input
              form="approve-form"
              name="medicalExam"
              placeholder="Yes / Not Applicable"
            />
          </div>
          <div>
            <Label>Report of Compliance</Label>
            <Input
              form="approve-form"
              name="reportOfCompliance"
              placeholder="Yes / Not Applicable"
            />
          </div>
          <div>
            <Label>Participant-Personnel Ratio</Label>
            <Input
              form="approve-form"
              name="participantPersonnelRatio"
              placeholder="e.g. 1:30"
            />
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <form id="approve-form" action={handleReview} className="space-y-2">
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="stepId" value={step.id} />
          <input type="hidden" name="action" value="approve" />
          <Textarea name="comment" placeholder="Optional approval comment" />
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </form>

        <form action={handleReview} className="space-y-2">
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="stepId" value={step.id} />
          <input type="hidden" name="action" value="return" />
          <Textarea name="comment" placeholder="Revision comment" required />
          <Button variant="outline" className="w-full">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Return
          </Button>
        </form>

        <form action={handleReview} className="space-y-2">
          <input type="hidden" name="requestId" value={request.id} />
          <input type="hidden" name="stepId" value={step.id} />
          <input type="hidden" name="action" value="reject" />
          <Textarea name="comment" placeholder="Rejection reason" required />
          <Button variant="destructive" className="w-full">
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </form>
      </div>
    </div>
  );
}

export function RequestDetail({
  request,
  me,
  onRefresh,
  showReviewControls = true,
  showTimeline = true,
  showConcernThreads = true,
}: {
  request: any;
  me: any;
  onRefresh: () => Promise<void>;
  showReviewControls?: boolean;
  showTimeline?: boolean;
  showConcernThreads?: boolean;
}) {
  const supportRequests = formatList(request.supportRequests);
  const coreValues = formatList(request.coreValues);
  const graduateAttributes = formatList(request.graduateAttributes);
  const hasSdsClearance =
    request.parentsConsent ||
    request.attachments ||
    request.academicInterruption ||
    request.academicRemarks ||
    request.medicalExam ||
    request.reportOfCompliance ||
    request.participantPersonnelRatio;

  return (
    <Card className="border">
      <CardContent className="space-y-5 p-5">
        <RequestSummary request={request} />

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">
              Department
            </p>
            <p className="text-sm text-gray-800">
              {formatValue(request.department)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">
              Attendees
            </p>
            <p className="text-sm text-gray-800">
              {request.attendeeCount || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500">
              Officer
            </p>
            <p className="text-sm text-gray-800">
              {formatValue(request.officer?.name)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Modality
            </p>
            <p className="mt-1 text-sm text-gray-800">
              {formatValue(request.modality)}
            </p>
          </div>
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Setting
            </p>
            <p className="mt-1 text-sm text-gray-800">
              {formatValue(request.setting)}
            </p>
          </div>
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Activity Type
            </p>
            <p className="mt-1 text-sm text-gray-800">
              {formatValue(request.activityType)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Program / Course
            </p>
            <p className="mt-1 text-sm text-gray-800">
              {formatValue(request.programCourse)}
            </p>
          </div>
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Scope
            </p>
            <p className="mt-1 text-sm text-gray-800">
              {formatValue(request.scope)}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-700">
            Activity details
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Program</p>
              <p className="text-sm text-gray-800">
                {formatValue(request.program)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Attire</p>
              <p className="text-sm text-gray-800">
                {formatValue(request.attire)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Personnel In Charge</p>
              <p className="text-sm text-gray-800">
                {formatValue(request.personnelInCharge)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Budget</p>
              <p className="text-sm text-gray-800">
                {formatValue(request.budget)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Source of Budget</p>
              <p className="text-sm text-gray-800">
                {formatValue(request.sourceOfBudget)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold">Rationale</p>
              <p className="mt-1 text-sm text-gray-700">
                {formatValue(request.rationale, "No rationale provided.")}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold">Objectives</p>
              <p className="mt-1 text-sm text-gray-700">
                {formatValue(request.objectives, "No objectives provided.")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Core Values
            </p>
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              {coreValues.length > 0 ? (
                coreValues.map((item: string) => <p key={item}>{item}</p>)
              ) : (
                <p>N/A</p>
              )}
            </div>
          </div>
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Graduate Attributes
            </p>
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              {graduateAttributes.length > 0 ? (
                graduateAttributes.map((item: string) => (
                  <p key={item}>{item}</p>
                ))
              ) : (
                <p>N/A</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-700">School support</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Support requests</p>
              <div className="mt-2 space-y-1 text-sm text-gray-700">
                {supportRequests.length > 0 ? (
                  supportRequests.map((item: string) => (
                    <p key={item}>{item}</p>
                  ))
                ) : (
                  <p>N/A</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500">Budget details</p>
              <p className="mt-1 text-sm text-gray-700">
                {formatValue(request.budgetDetails)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Vehicle passengers</p>
              <p className="mt-1 text-sm text-gray-700">
                {formatValue(request.vehiclePassengers)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Food pax</p>
              <p className="mt-1 text-sm text-gray-700">
                {formatValue(request.foodPax)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Room/venue details</p>
              <p className="mt-1 text-sm text-gray-700">
                {formatValue(request.roomVenueDetails)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Microphone qty</p>
              <p className="mt-1 text-sm text-gray-700">
                {formatValue(request.microphoneQty)}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500">Other support</p>
              <p className="mt-1 text-sm text-gray-700">
                {formatValue(request.otherSupport)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-700">
            Additional information
          </p>
          <p className="mt-2 text-sm text-gray-700">
            {formatValue(
              request.otherDetails,
              "No additional details provided.",
            )}
          </p>
        </div>

        {hasSdsClearance && (
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">
              SDS Office Clearance
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">Parent's Consent</p>
                <p className="mt-1 text-sm text-gray-800">
                  {formatValue(request.parentsConsent)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Attachments</p>
                <p className="mt-1 text-sm text-gray-800">
                  {formatValue(request.attachments)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Academic Interruption</p>
                <p className="mt-1 text-sm text-gray-800">
                  {formatValue(request.academicInterruption)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Academic Remarks</p>
                <p className="mt-1 text-sm text-gray-800">
                  {formatValue(request.academicRemarks)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Medical Exam</p>
                <p className="mt-1 text-sm text-gray-800">
                  {formatValue(request.medicalExam)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Report of Compliance</p>
                <p className="mt-1 text-sm text-gray-800">
                  {formatValue(request.reportOfCompliance)}
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500">
                  Participant-Personnel Ratio
                </p>
                <p className="mt-1 text-sm text-gray-800">
                  {formatValue(request.participantPersonnelRatio)}
                </p>
              </div>
            </div>
          </div>
        )}

        {showReviewControls && (
          <ReviewControls request={request} me={me} onRefresh={onRefresh} />
        )}

        {showTimeline && <Timeline request={request} />}

        {showConcernThreads && (
          <ConcernThreads request={request} onRefresh={onRefresh} />
        )}
      </CardContent>
    </Card>
  );
}
