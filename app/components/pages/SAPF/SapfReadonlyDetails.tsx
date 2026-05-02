"use client";

import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { format } from "date-fns";
import { CalendarDays, Check, Clock } from "lucide-react";
import {
  CORE_VALUE_OPTIONS,
  getSapfParts,
  GRADUATE_ATTRIBUTE_OPTIONS,
  SUPPORT_REQUEST_OPTIONS,
} from "./sapfData";

function valueOrDash(value: any) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatAttachmentSize(size: number) {
  if (!size) return "0 MB";
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function ReadOnlyField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: any;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 min-h-10 rounded-md border bg-muted px-3 py-2 text-sm text-foreground">
        {valueOrDash(value)}
      </div>
    </div>
  );
}

function ReadOnlyLongField({
  label,
  value,
  rows = "min-h-24",
}: {
  label: string;
  value: any;
  rows?: string;
}) {
  return (
    <div className="md:col-span-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div
        className={`mt-1 whitespace-pre-wrap rounded-md border bg-muted px-3 py-2 text-sm text-foreground ${rows}`}
      >
        {valueOrDash(value)}
      </div>
    </div>
  );
}

function ReadOnlyAttachments({
  requestId,
  attachments,
}: {
  requestId: string;
  attachments?: any[];
}) {
  if (!attachments?.length) {
    return <ReadOnlyField label="Attachments" value="-" />;
  }

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">Attachments</p>
      <div className="mt-1 min-h-10 space-y-1 rounded-md border bg-muted px-3 py-2 text-sm text-foreground">
        {attachments.map((attachment) => (
          <a
            key={attachment.id}
            href={`/api/sapf/${requestId}/attachments/${attachment.id}`}
            className="block text-primary hover:underline"
          >
            {attachment.fileName} ({formatAttachmentSize(attachment.size)})
          </a>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyChecklist({
  label,
  options,
  selected,
  columns = "sm:grid-cols-2",
}: {
  label: string;
  options: string[];
  selected: string[];
  columns?: string;
}) {
  const selectedSet = new Set(selected);

  return (
    <div className="md:col-span-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className={`mt-2 grid gap-2 ${columns}`}>
        {options.map((option) => {
          const checked = selectedSet.has(option);
          return (
            <div
              key={option}
              className="flex min-h-9 items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm text-foreground"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  checked
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-border bg-background"
                }`}
              >
                {checked && <Check className="h-3 w-3" />}
              </span>
              <span>{option}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SapfReadonlyDetails({
  request,
  hidePart4 = false,
}: {
  request: any;
  hidePart4?: boolean;
}) {
  const sapf = request.sapf || getSapfParts(request);
  const part1 = sapf.part1;
  const part2 = sapf.part2;
  const part4 = sapf.part4 || {};
  const startAt = new Date(request.startAt);
  const endAt = new Date(request.endAt);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Schedule
          </CardTitle>
          <CardDescription>Reserved venue date and time.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <ReadOnlyField
            label="Activity Date"
            value={format(startAt, "yyyy-MM-dd")}
          />
          <ReadOnlyField label="Start Time" value={format(startAt, "h:mm a")} />
          <ReadOnlyField label="End Time" value={format(endAt, "h:mm a")} />
          <div className="md:col-span-3">
            <Badge variant="outline" className="gap-2">
              <Clock className="h-3.5 w-3.5" />
              {format(startAt, "MMM d, yyyy h:mm a")} to{" "}
              {format(endAt, "h:mm a")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Part 1: Activity Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ReadOnlyField label="Activity Title" value={part1.activityTitle} />
          <ReadOnlyField label="Organization" value={part1.organization} />
          <ReadOnlyField label="Department" value={part1.department} />
          <ReadOnlyField label="Program/Course" value={part1.programCourse} />
          <ReadOnlyField label="Venue" value={part1.venue} />
          <ReadOnlyField label="Modality" value={part1.modality} />
          <ReadOnlyField label="Setting" value={part1.setting} />
          <ReadOnlyField
            label="Personnel-In-Charge"
            value={part1.personnelInCharge}
          />
          <ReadOnlyField label="Activity Type" value={part1.activityType} />
          <ReadOnlyField label="Attire" value={part1.attire} />
          <ReadOnlyField label="Scope" value={part1.scope} />
          <ReadOnlyField
            label="No. of Participants"
            value={part1.noOfParticipants}
          />
          <ReadOnlyField label="Program" value={part1.program} />
          <ReadOnlyLongField label="Rationale" value={part1.rationale} />
          <ReadOnlyLongField label="Objective/s" value={part1.objectives} />
          <ReadOnlyChecklist
            label="Applicable Augustinian Core Values"
            options={CORE_VALUE_OPTIONS}
            selected={part1.coreValues}
            columns="sm:grid-cols-3"
          />
          <ReadOnlyChecklist
            label="Expected Graduate Attributes"
            options={GRADUATE_ATTRIBUTE_OPTIONS}
            selected={part1.graduateAttributes}
          />
          <ReadOnlyLongField
            label="Program Flow"
            value={part1.programFlow}
            rows="min-h-20"
          />
          <ReadOnlyField label="Budget" value={part1.budget} />
          <ReadOnlyField
            label="Source of Budget"
            value={part1.sourceOfBudget}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Part 2: School Support</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ReadOnlyChecklist
            label="Requested Support"
            options={SUPPORT_REQUEST_OPTIONS}
            selected={part2.supportRequests}
          />
          <ReadOnlyField label="Budget Details" value={part2.budgetDetails} />
          <ReadOnlyField
            label="Vehicle Passengers"
            value={part2.vehiclePassengers}
          />
          <ReadOnlyField label="Food/Snacks Pax" value={part2.foodPax} />
          <ReadOnlyField
            label="Room/Venue Details"
            value={part2.roomVenueDetails}
          />
          <ReadOnlyField
            label="Microphone Quantity"
            value={part2.microphoneQty}
          />
          <ReadOnlyField
            label="Other Support Requests"
            value={part2.otherSupport}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Part 3: Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadOnlyLongField
            label="Other Details"
            value={sapf.part3}
            rows="min-h-32"
          />
        </CardContent>
      </Card>

      {!hidePart4 && (
        <Card>
          <CardHeader>
            <CardTitle>Part 4: SDS Office Clearance</CardTitle>
            <CardDescription>
              This section is filled by the SDS Office.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField
              label="Parent's Consent Form"
              value={part4.parentsConsent}
            />
            <ReadOnlyAttachments
              requestId={request.id}
              attachments={part4.attachments}
            />
            <ReadOnlyField
              label="Academic Class Interruption"
              value={part4.academicInterruption}
            />
            <ReadOnlyField
              label="Academic Interruption Remarks"
              value={part4.academicInterruptionRemarks}
            />
            <ReadOnlyField
              label="Medical Exam Request"
              value={part4.medicalExam}
            />
            <ReadOnlyField
              label="Report of Compliance"
              value={part4.reportOfCompliance}
            />
            <ReadOnlyField
              label="Student-Personnel Ratio"
              value={part4.studentPersonnelRatio}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
