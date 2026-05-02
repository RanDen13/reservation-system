"use client";

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
import { Textarea } from "@/app/components/ui/textarea";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  FileDown,
  MessageSquare,
  Paperclip,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import ModalBase from "../../Popup/ModalBase";
import ApprovalProgressTimeline from "./ApprovalProgressTimeline";
import {
  addConcernMessage,
  reviewSapfRequest,
  updateSdsClearance,
  updateSdsEvaluation,
} from "./SapfActions";
import SapfReadonlyDetails from "./SapfReadonlyDetails";

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (!bytes) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function statusClass(status: string) {
  if (status === "APPROVED")
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (status === "REJECTED")
    return "bg-red-500/15 text-red-700 dark:text-red-400";
  if (status === "CANCELLED" || status === "SKIPPED")
    return "bg-muted text-muted-foreground";
  if (status === "RETURNED_FOR_REVISION" || status === "RETURNED")
    return "bg-orange-500/15 text-orange-700 dark:text-orange-400";
  if (status === "ACTIVE" || status === "IN_REVIEW")
    return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
  if (status === "DRAFT") return "bg-muted text-muted-foreground";
  return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
}

function formatDateRange(request: any) {
  return `${format(new Date(request.startAt), "MMM d, yyyy")} - ${format(
    new Date(request.startAt),
    "h:mm a",
  )} to ${format(new Date(request.endAt), "h:mm a")}`;
}

function venueLabel(request: any) {
  const names = (request.venues || [])
    .map((item: any) => item?.eventSpace?.name || item?.name)
    .filter(Boolean);

  return names.length ? names.join(", ") : request.venue || "No venue";
}

export function RequestSummary({
  request,
  showBadges = true,
  showConflict = true,
  showPdf = true,
  showProgress = true,
}: {
  request: any;
  showBadges?: boolean;
  showConflict?: boolean;
  showPdf?: boolean;
  showProgress?: boolean;
}) {
  const waitingSince = request.approvalSteps?.find(
    (step: any) => step.status === "ACTIVE",
  )?.updatedAt;

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-sm font-semibold text-muted-foreground">
            #{request.requestNumber}
          </p>
          <h3 className="text-lg font-bold text-foreground">{request.title}</h3>
          <p className="text-sm text-muted-foreground">
            {request.organization}
          </p>
          <p className="mt-2 text-sm text-foreground">
            {venueLabel(request)} - {formatDateRange(request)}
          </p>
          <p className="text-sm text-muted-foreground">
            Submitted: {format(new Date(request.createdAt), "MMM d, yyyy")}
          </p>
          {waitingSince && (
            <p className="text-sm text-muted-foreground">
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
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
              Pending conflict
            </Badge>
          )}
          {showPdf && request.status === "APPROVED" && (
            <a href={`/api/sapf/${request.id}/pdf`} target="_blank">
              <Button size="sm" variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Reservation PDF
              </Button>
            </a>
          )}
        </div>
      </div>
      {showProgress && <ApprovalProgressTimeline request={request} compact />}
    </div>
  );
}

function Timeline({ request }: { request: any }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">Approval chain</p>
      <div className="grid gap-2 md:grid-cols-2">
        {request.approvalSteps?.map((step: any) => (
          <div
            key={step.id}
            className="flex items-start justify-between gap-3 rounded-lg border bg-muted p-3"
          >
            <div>
              <p className="text-sm font-semibold">
                {step.stepOrder}. {step.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {step.reviewer?.name}
              </p>
              {step.comment && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {step.comment}
                </p>
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
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageSquare className="h-4 w-4" />
        Private concern threads
      </p>
      {visibleSteps.map((step: any) => {
        const threadStatusLabel =
          step.status === "ACTIVE" || step.status === "RETURNED"
            ? step.concernThread.status === "RESOLVED"
              ? "Closed"
              : "Active"
            : "Closed";

        return (
          <div key={step.id} className="rounded-lg border p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="text-xs text-muted-foreground">
                  Private between officer and {step.reviewer?.name}
                </p>
              </div>
              <Badge variant="outline">{threadStatusLabel}</Badge>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md bg-muted p-3">
              {step.concernThread.messages.map((message: any) => (
                <div
                  key={message.id}
                  className="rounded-md bg-card p-2 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">
                      {message.author?.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(message.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{message.body}</p>
                </div>
              ))}
            </div>
            {step.status === "ACTIVE" || step.status === "RETURNED" ? (
              <form action={handleMessage} className="mt-3 flex gap-2">
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="stepId" value={step.id} />
                <Input name="body" placeholder="Reply to this concern" />
                <Button type="submit">Send</Button>
              </form>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                This concern thread is closed.
              </p>
            )}
          </div>
        );
      })}
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
  const [selectedAction, setSelectedAction] = useState<
    "approve" | "return" | "reject" | null
  >(null);
  const [hasAttachments, setHasAttachments] = useState("");
  const [attachmentTotal, setAttachmentTotal] = useState(0);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  if (me?.role === "SUPER_ADMIN") return null;
  const step = request.approvalSteps?.find(
    (item: any) => item.status === "ACTIVE" && item.reviewerId === me.id,
  );

  if (!step) return null;

  const handleReview = async (formData: FormData) => {
    setSubmitting(true);
    const result = await reviewSapfRequest(formData);
    setSubmitting(false);
    if (!result.success) {
      popup.showError(result.message);
      return;
    }
    setSelectedAction(null);
    setHasAttachments("");
    setAttachmentTotal(0);
    setAttachmentNames([]);
    setAttachmentInputKey((key) => key + 1);
    popup.showSuccess(result.message || "Review saved.");
    await onRefresh();
  };

  const approveFormId = `approve-form-${step.id}`;
  const selectedActionLabel =
    selectedAction === "approve"
      ? "Approve request"
      : selectedAction === "return"
        ? "Return for revision"
        : "Reject request";
  const selectedActionDescription =
    selectedAction === "approve"
      ? "Add an optional approval comment before moving this request forward."
      : selectedAction === "return"
        ? "Tell the officer what needs to be revised before this can continue."
        : "Provide the rejection reason that will be recorded on this request.";
  const selectedActionCommentLabel =
    selectedAction === "approve"
      ? "Approval comment"
      : selectedAction === "return"
        ? "Revision comment"
        : "Rejection reason";
  const selectedActionPlaceholder =
    selectedAction === "approve"
      ? "Optional approval comment"
      : selectedAction === "return"
        ? "What should the officer revise?"
        : "Why is this request rejected?";
  const attachmentLimitExceeded = attachmentTotal > MAX_ATTACHMENT_BYTES;

  const yesNoField = (name: string, label: string) => (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input
            form={approveFormId}
            type="radio"
            name={name}
            value="true"
            required
            className="h-4 w-4 accent-primary"
          />
          Yes
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input
            form={approveFormId}
            type="radio"
            name={name}
            value="false"
            required
            className="h-4 w-4 accent-primary"
          />
          No
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 rounded-lg border bg-muted p-4">
      <div>
        <p className="font-semibold text-foreground">Your active review</p>
        <p className="text-sm text-muted-foreground">{step.label}</p>
      </div>

      {step.position === "SDS" && (
        <div className="grid gap-3">
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border bg-card p-3 shadow-xs">
                {yesNoField("parentsConsent", "Parent's Consent Form")}
              </div>
              <div className="rounded-md border bg-card p-3 shadow-xs">
                <div className="space-y-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Paperclip className="h-4 w-4" />
                    Attachments
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-2 text-sm text-foreground">
                      <input
                        form={approveFormId}
                        type="radio"
                        name="hasAttachments"
                        value="true"
                        required
                        checked={hasAttachments === "true"}
                        onChange={(event) =>
                          setHasAttachments(event.target.value)
                        }
                        className="h-4 w-4 accent-primary"
                      />
                      Yes
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-foreground">
                      <input
                        form={approveFormId}
                        type="radio"
                        name="hasAttachments"
                        value="false"
                        required
                        checked={hasAttachments === "false"}
                        onChange={(event) => {
                          setHasAttachments(event.target.value);
                          setAttachmentTotal(0);
                          setAttachmentNames([]);
                          setAttachmentInputKey((key) => key + 1);
                        }}
                        className="h-4 w-4 accent-primary"
                      />
                      No
                    </label>
                  </div>
                  <Input
                    key={attachmentInputKey}
                    form={approveFormId}
                    type="file"
                    name="attachmentFiles"
                    multiple
                    disabled={hasAttachments !== "true"}
                    onChange={(event) => {
                      const files = Array.from(event.target.files || []);
                      setAttachmentTotal(
                        files.reduce((sum, file) => sum + file.size, 0),
                      );
                      setAttachmentNames(
                        files.map(
                          (file) =>
                            `${file.name} (${formatFileSize(file.size)})`,
                        ),
                      );
                    }}
                    className="bg-background"
                  />
                  <div
                    className={`text-xs ${
                      attachmentLimitExceeded
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatFileSize(attachmentTotal)} / 25 MB
                  </div>
                  {attachmentNames.length > 0 && (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {attachmentNames.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border bg-card p-3 shadow-xs">
                <div className="space-y-3">
                  {yesNoField(
                    "academicInterruption",
                    "Academic Class Interruption",
                  )}
                  <div>
                    <Label>Academic Interruption Remarks</Label>
                    <Input
                      form={approveFormId}
                      name="academicInterruptionRemarks"
                      placeholder="Remarks"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-md border bg-card p-3 shadow-xs">
                {yesNoField("medicalExam", "Medical Exam Request")}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <div className="rounded-md border bg-card p-3 shadow-xs">
                {yesNoField("reportOfCompliance", "Report of Compliance")}
              </div>
              <div className="rounded-md border bg-card p-3 shadow-xs">
                <Label>Student-Personnel Ratio</Label>
                <Input
                  form={approveFormId}
                  name="studentPersonnelRatio"
                  placeholder="e.g. 1:30"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <Button
          type="button"
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setSelectedAction("approve")}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Approve
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setSelectedAction("return")}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Return
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          onClick={() => setSelectedAction("reject")}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
      </div>

      {selectedAction && (
        <ModalBase onClose={() => setSelectedAction(null)}>
          <Card className="w-[min(92vw,520px)]">
            <CardHeader>
              <CardTitle>{selectedActionLabel}</CardTitle>
              <CardDescription>{selectedActionDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id={selectedAction === "approve" ? approveFormId : undefined}
                action={handleReview}
                className="space-y-4"
              >
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="stepId" value={step.id} />
                <input type="hidden" name="action" value={selectedAction} />
                <div>
                  <Label>{selectedActionCommentLabel}</Label>
                  <Textarea
                    name="comment"
                    placeholder={selectedActionPlaceholder}
                    required={selectedAction !== "approve"}
                    rows={4}
                  />
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedAction(null)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      submitting ||
                      (selectedAction === "approve" && attachmentLimitExceeded)
                    }
                    variant={
                      selectedAction === "reject" ? "destructive" : "default"
                    }
                    className={
                      selectedAction === "approve"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : ""
                    }
                  >
                    {submitting ? "Saving..." : selectedActionLabel}
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

function SdsClearanceEditControls({
  request,
  me,
  onRefresh,
}: {
  request: any;
  me: any;
  onRefresh: () => Promise<void>;
}) {
  const popup = usePopup();
  const part4 = request.sapfPart4 || {};
  const initialHasAttachments =
    typeof part4.hasAttachments === "boolean" ? String(part4.hasAttachments) : "";
  const [hasAttachments, setHasAttachments] = useState(initialHasAttachments);
  const [attachmentTotal, setAttachmentTotal] = useState(0);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [attachmentInputKey, setAttachmentInputKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const attachmentLimitExceeded = attachmentTotal > MAX_ATTACHMENT_BYTES;
  const formId = `sds-clearance-form-${request.id}`;

  const sdsStep = request.approvalSteps?.find(
    (item: any) =>
      item.position === "SDS" &&
      item.reviewerId === me?.id &&
      item.status === "APPROVED",
  );
  const isLocked = ["APPROVED", "REJECTED", "CANCELLED"].includes(
    request.status,
  );

  if (!sdsStep || isLocked) return null;

  const yesNoField = (name: string, label: string, value: any) => (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input
            form={formId}
            type="radio"
            name={name}
            value="true"
            required
            defaultChecked={value === true}
            className="h-4 w-4 accent-primary"
          />
          Yes
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input
            form={formId}
            type="radio"
            name={name}
            value="false"
            required
            defaultChecked={value === false}
            className="h-4 w-4 accent-primary"
          />
          No
        </label>
      </div>
    </div>
  );

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true);
    const result = await updateSdsClearance(formData);
    setSubmitting(false);
    if (!result.success) {
      popup.showError(result.message);
      return;
    }
    setAttachmentTotal(0);
    setAttachmentNames([]);
    setAttachmentInputKey((key) => key + 1);
    popup.showSuccess(result.message || "SDS clearance updated.");
    await onRefresh();
  };

  return (
    <div className="space-y-4 rounded-lg border bg-muted p-4">
      <div>
        <p className="font-semibold text-foreground">
          Update SDS Office Clearance
        </p>
        <p className="text-sm text-muted-foreground">
          You can revise Part 4 until the request is fully completed.
        </p>
      </div>

      <form id={formId} action={handleSubmit} className="grid gap-3">
        <input type="hidden" name="requestId" value={request.id} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border bg-card p-3 shadow-xs">
            {yesNoField(
              "parentsConsent",
              "Parent's Consent Form",
              part4.parentsConsent,
            )}
          </div>
          <div className="rounded-md border bg-card p-3 shadow-xs">
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Paperclip className="h-4 w-4" />
                Attachments
              </p>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="hasAttachments"
                    value="true"
                    required
                    checked={hasAttachments === "true"}
                    onChange={(event) => setHasAttachments(event.target.value)}
                    className="h-4 w-4 accent-primary"
                  />
                  Yes
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="hasAttachments"
                    value="false"
                    required
                    checked={hasAttachments === "false"}
                    onChange={(event) => {
                      setHasAttachments(event.target.value);
                      setAttachmentTotal(0);
                      setAttachmentNames([]);
                      setAttachmentInputKey((key) => key + 1);
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  No
                </label>
              </div>
              <Input
                key={attachmentInputKey}
                type="file"
                name="attachmentFiles"
                multiple
                disabled={hasAttachments !== "true"}
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  setAttachmentTotal(
                    files.reduce((sum, file) => sum + file.size, 0),
                  );
                  setAttachmentNames(
                    files.map(
                      (file) => `${file.name} (${formatFileSize(file.size)})`,
                    ),
                  );
                }}
                className="bg-background"
              />
              <div
                className={`text-xs ${
                  attachmentLimitExceeded
                    ? "text-red-600"
                    : "text-muted-foreground"
                }`}
              >
                {formatFileSize(attachmentTotal)} / 25 MB
              </div>
              {attachmentNames.length > 0 && (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {attachmentNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border bg-card p-3 shadow-xs">
            <div className="space-y-3">
              {yesNoField(
                "academicInterruption",
                "Academic Class Interruption",
                part4.academicInterruption,
              )}
              <div>
                <Label>Academic Interruption Remarks</Label>
                <Input
                  name="academicInterruptionRemarks"
                  placeholder="Remarks"
                  defaultValue={part4.academicInterruptionRemarks || ""}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <div className="rounded-md border bg-card p-3 shadow-xs">
            {yesNoField("medicalExam", "Medical Exam Request", part4.medicalExam)}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="rounded-md border bg-card p-3 shadow-xs">
            {yesNoField(
              "reportOfCompliance",
              "Report of Compliance",
              part4.reportOfCompliance,
            )}
          </div>
          <div className="rounded-md border bg-card p-3 shadow-xs">
            <Label>Student-Personnel Ratio</Label>
            <Input
              name="studentPersonnelRatio"
              placeholder="e.g. 1:30"
              defaultValue={part4.studentPersonnelRatio || ""}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={submitting || attachmentLimitExceeded}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? "Saving..." : "Update SDS Clearance"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SdsEvaluationControls({
  request,
  me,
  onRefresh,
}: {
  request: any;
  me: any;
  onRefresh: () => Promise<void>;
}) {
  const popup = usePopup();
  const part6 = request.sapfPart6 || {};
  const [submitting, setSubmitting] = useState(false);
  const canEdit =
    request.status === "APPROVED" &&
    request.approvalSteps?.some(
      (item: any) => item.position === "SDS" && item.reviewerId === me?.id,
    );

  if (!canEdit) return null;

  const handleSubmit = async (formData: FormData) => {
    setSubmitting(true);
    const result = await updateSdsEvaluation(formData);
    setSubmitting(false);
    if (!result.success) {
      popup.showError(result.message);
      return;
    }
    popup.showSuccess(result.message || "Part 6 evaluation updated.");
    await onRefresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-orange-600">Part 6: Evaluation</CardTitle>
        <CardDescription>
          SDS can update this evaluation after the request is completed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="requestId" value={request.id} />
          <div className="grid overflow-hidden rounded-md border md:grid-cols-2">
            <div className="border-b md:border-r md:border-b-0">
              <div className="border-b bg-amber-100 px-3 py-2 text-center text-sm font-bold text-foreground">
                CONDUCTED
              </div>
              <div className="p-3">
                <Label htmlFor="conductedRemarks">
                  Remarks: {"{conductedRemarks}"}
                </Label>
                <Textarea
                  id="conductedRemarks"
                  name="conductedRemarks"
                  defaultValue={part6.conductedRemarks || ""}
                  className="mt-2 min-h-28 resize-y border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
            <div>
              <div className="border-b bg-amber-100 px-3 py-2 text-center text-sm font-bold text-foreground">
                CANCELED
              </div>
              <div className="p-3">
                <Label htmlFor="cancelledRemarks">
                  Remarks: {"{cancelledRemarks}"}
                </Label>
                <Textarea
                  id="cancelledRemarks"
                  name="cancelledRemarks"
                  defaultValue={part6.cancelledRemarks || ""}
                  className="mt-2 min-h-28 resize-y border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Part 6"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function RequestDetail({
  request,
  me,
  onRefresh,
  showReviewControls = true,
  showConcernThreads = true,
}: {
  request: any;
  me: any;
  onRefresh: () => Promise<void>;
  showReviewControls?: boolean;
  showConcernThreads?: boolean;
}) {
  const activeReviewStep = request.approvalSteps?.find(
    (item: any) => item.status === "ACTIVE" && item.reviewerId === me?.id,
  );
  const canEditApprovedSdsPart4 =
    me?.role !== "SUPER_ADMIN" &&
    !["APPROVED", "REJECTED", "CANCELLED"].includes(request.status) &&
    request.approvalSteps?.some(
      (item: any) =>
        item.position === "SDS" &&
        item.reviewerId === me?.id &&
        item.status === "APPROVED",
    );
  const hideReadOnlyPart4 =
    showReviewControls &&
    me?.role !== "SUPER_ADMIN" &&
    (activeReviewStep?.position === "SDS" || canEditApprovedSdsPart4);

  return (
    <div className="space-y-5">
      <RequestSummary request={request} />
      <SapfReadonlyDetails request={request} hidePart4={hideReadOnlyPart4} />
      {showReviewControls && (
        <ReviewControls request={request} me={me} onRefresh={onRefresh} />
      )}
      {showReviewControls && (
        <SdsClearanceEditControls
          request={request}
          me={me}
          onRefresh={onRefresh}
        />
      )}
      {showReviewControls && (
        <SdsEvaluationControls
          request={request}
          me={me}
          onRefresh={onRefresh}
        />
      )}
      <Card>
        <CardContent className="p-5">
          <Timeline request={request} />
        </CardContent>
      </Card>
      {showConcernThreads && (
        <ConcernThreads request={request} onRefresh={onRefresh} />
      )}
    </div>
  );
}
