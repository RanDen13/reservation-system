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
import { Checkbox } from "@/app/components/ui/checkbox";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { format } from "date-fns";
import {
  CalendarDays,
  ChevronsUpDown,
  Info,
  Paperclip,
  Save,
  Search,
  Send,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EventSpaceData } from "../Spaces/schema";
import { saveSapfRequest } from "./SapfActions";
import {
  CORE_VALUE_OPTIONS,
  GRADUATE_ATTRIBUTE_OPTIONS,
  SUPPORT_REQUEST_OPTIONS,
} from "./sapfData";

const MIN_BOOKING_ADVANCE_DAYS = 30;
const MAX_PROGRAM_FLOW_ATTACHMENT_BYTES = 25 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (!bytes) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addCalendarDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getRequestSchedule(initialRequest?: any) {
  if (!initialRequest) {
    return { date: "", startTime: "", endTime: "" };
  }

  const startAt = new Date(initialRequest.startAt);
  const endAt = new Date(initialRequest.endAt);

  return {
    date: Number.isNaN(startAt.getTime())
      ? ""
      : format(startAt, "yyyy-MM-dd"),
    startTime: Number.isNaN(startAt.getTime()) ? "" : format(startAt, "HH:mm"),
    endTime: Number.isNaN(endAt.getTime()) ? "" : format(endAt, "HH:mm"),
  };
}

function selectedVenueIdsFromRequest(initialRequest?: any) {
  const joined = (initialRequest?.venues || [])
    .map((item: any) => item.eventSpaceId || item.eventSpace?.id)
    .filter(Boolean);

  return joined;
}

export default function SapfBookingForm({
  venues,
  approvers,
  initialRequest,
  preselectedVenueIds = [],
}: {
  venues: EventSpaceData[];
  approvers: Record<string, any[]>;
  initialRequest?: any;
  preselectedVenueIds?: string[];
}) {
  const popup = usePopup();
  const router = useRouter();
  const initialSchedule = getRequestSchedule(initialRequest);
  const initialVenueIds = initialRequest
    ? selectedVenueIdsFromRequest(initialRequest)
    : preselectedVenueIds;
  const [selectedDate, setSelectedDate] = useState(initialSchedule.date);
  const [startTime, setStartTime] = useState(initialSchedule.startTime);
  const [endTime, setEndTime] = useState(initialSchedule.endTime);
  const [selectedVenueIds, setSelectedVenueIds] =
    useState<string[]>(initialVenueIds);
  const [programFlowAttachmentTotal, setProgramFlowAttachmentTotal] =
    useState(0);
  const [programFlowAttachmentNames, setProgramFlowAttachmentNames] = useState<
    string[]
  >([]);
  const [venuePopoverOpen, setVenuePopoverOpen] = useState(false);
  const [venueSearch, setVenueSearch] = useState("");
  const isEditing = Boolean(initialRequest);
  const lockApprovalChain = initialRequest?.status === "RETURNED_FOR_REVISION";
  const formKey = initialRequest?.id || preselectedVenueIds.join("-") || "new";
  const part1 = initialRequest?.sapfPart1 || {};
  const part2 = initialRequest?.sapfPart2 || {};
  const part3 = initialRequest?.sapfPart3 || "";
  const selectedCoreValues = new Set<string>(
    Array.isArray(part1.coreValues) ? part1.coreValues : [],
  );
  const selectedGraduateAttributes = new Set<string>(
    Array.isArray(part1.graduateAttributes) ? part1.graduateAttributes : [],
  );
  const selectedSupportRequests = new Set<string>(
    Array.isArray(part2.supportRequests) ? part2.supportRequests : [],
  );
  const selectedAdviserId =
    initialRequest?.approvalSteps?.find(
      (step: any) => step.position === "ADVISER",
    )?.reviewerId || "";
  const selectedAdditionalSignatories = new Set<string>(
    (initialRequest?.approvalSteps || [])
      .filter((step: any) => step.position === "ADDITIONAL_SIGNATORY")
      .map((step: any) => step.reviewerId),
  );
  const activeVenues = venues.filter((venue) => venue.status === "ACTIVE");
  const selectedVenues = activeVenues.filter((venue) =>
    selectedVenueIds.includes(venue.id),
  );
  const venueSearchValue = venueSearch.trim().toLowerCase();
  const filteredVenues = activeVenues.filter((venue) => {
    if (!venueSearchValue) return true;
    return [venue.name, venue.location]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(venueSearchValue));
  });
  const selectedVenueSummary =
    selectedVenues.length === 0
      ? "Select venues"
      : selectedVenues.length === 1
        ? selectedVenues[0].name
        : `${selectedVenues.length} venues selected`;
  const programFlowAttachmentLimitExceeded =
    programFlowAttachmentTotal > MAX_PROGRAM_FLOW_ATTACHMENT_BYTES;
  const earliestBookingDate = useMemo(
    () => addCalendarDays(new Date(), MIN_BOOKING_ADVANCE_DAYS),
    [],
  );
  const minimumBookingDate = toDateInputValue(earliestBookingDate);
  const earliestBookingDateLabel = format(earliestBookingDate, "MMM d, yyyy");

  const toggleVenue = (venueId: string, checked: boolean) => {
    setSelectedVenueIds((current) =>
      checked
        ? [...new Set([...current, venueId])]
        : current.filter((id) => id !== venueId),
    );
  };

  const removeVenue = (venueId: string) => {
    setSelectedVenueIds((current) => current.filter((id) => id !== venueId));
  };

  const handleSave = async (formData: FormData) => {
    const activityDate = String(formData.get("activityDate") ?? "");
    const selectedStartTime = String(formData.get("startTime") ?? "");
    const selectedEndTime = String(formData.get("endTime") ?? "");
    const intent = String(formData.get("intent") ?? "draft");

    if (selectedVenueIds.length === 0) {
      popup.showError("Select at least one venue.");
      return;
    }

    if (activityDate && activityDate < minimumBookingDate) {
      popup.showError(
        `Reservations must be booked at least ${MIN_BOOKING_ADVANCE_DAYS} days in advance.`,
      );
      return;
    }

    if (
      selectedStartTime &&
      selectedEndTime &&
      selectedEndTime <= selectedStartTime
    ) {
      popup.showError("End time must be later than start time.");
      return;
    }

    if (programFlowAttachmentLimitExceeded) {
      popup.showError("Program flow attachments must total 25 MB or less.");
      return;
    }

    const selectedVenueNames = selectedVenues.map((venue) => venue.name);
    formData.set("venue", selectedVenueNames.join(", "));
    const result = await saveSapfRequest(formData);
    if (!result.success) {
      popup.showError(result.message);
      return;
    }
    popup.showSuccess(result.message || "Reservation saved.");
    if (isEditing && intent === "submit" && initialRequest?.id) {
      router.push(`/user/bookings/${initialRequest.id}`);
      return;
    }
    if (result.data?.id) {
      router.push(`/user/bookings/${result.data.id}`);
      return;
    }
    router.push("/user/bookings");
  };

  return (
    <form key={formKey} action={handleSave} className="space-y-6">
      {initialRequest?.id && (
        <input type="hidden" name="requestId" value={initialRequest.id} />
      )}
      {selectedVenueIds.map((venueId) => (
        <input key={venueId} type="hidden" name="venueIds" value={venueId} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Venues</CardTitle>
          <CardDescription>
            Select one or more venues for this SAPF request.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Popover open={venuePopoverOpen} onOpenChange={setVenuePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 w-full justify-between px-3 py-2 text-left font-normal"
              >
                <span className="truncate">{selectedVenueSummary}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(92vw,680px)] p-0">
              <div className="border-b p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={venueSearch}
                    onChange={(event) => setVenueSearch(event.target.value)}
                    placeholder="Search venues..."
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto p-2">
                {filteredVenues.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No venues found.
                  </p>
                ) : (
                  filteredVenues.map((venue) => {
                    const checked = selectedVenueIds.includes(venue.id);
                    return (
                      <div
                        key={venue.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleVenue(venue.id, !checked)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleVenue(venue.id, !checked);
                          }
                        }}
                        className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <Checkbox checked={checked} className="mt-0.5" />
                        <span className="min-w-0">
                          <span className="block font-semibold text-foreground">
                            {venue.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {venue.location} - {venue.capacity} people
                          </span>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>

          {selectedVenues.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedVenues.map((venue) => (
                <Badge
                  key={venue.id}
                  variant="secondary"
                  className="gap-1 rounded-md py-1"
                >
                  {venue.name}
                  <button
                    type="button"
                    onClick={() => removeVenue(venue.id)}
                    className="rounded-sm opacity-70 hover:opacity-100"
                    aria-label={`Remove ${venue.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Schedule
          </CardTitle>
          <CardDescription>
            Select a venue schedule at least 30 days in advance.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-900 dark:text-blue-100 md:col-span-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Reservations can only be booked at least 30 days in advance.
              Earliest available date: {earliestBookingDateLabel}.
            </p>
          </div>
          <div>
            <Label>Activity Date</Label>
            <Input
              name="activityDate"
              type="date"
              value={selectedDate}
              min={minimumBookingDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              required
            />
          </div>
          <div>
            <Label>Start Time</Label>
            <Input
              name="startTime"
              type="time"
              value={startTime}
              onChange={(event) => {
                const nextStartTime = event.target.value;
                setStartTime(nextStartTime);
                if (endTime && nextStartTime && endTime <= nextStartTime) {
                  setEndTime("");
                }
              }}
              required
            />
          </div>
          <div>
            <Label>End Time</Label>
            <Input
              name="endTime"
              type="time"
              value={endTime}
              min={startTime || undefined}
              onChange={(event) => setEndTime(event.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Part 1: Activity Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Activity Title</Label>
            <Input
              name="activityTitle"
              required
              defaultValue={part1.activityTitle || ""}
            />
          </div>
          <div>
            <Label>Organization</Label>
            <Input
              name="organization"
              required
              defaultValue={part1.organization || ""}
            />
          </div>
          <div>
            <Label>Department</Label>
            <Input
              name="department"
              required
              defaultValue={part1.department || ""}
            />
          </div>
          <div>
            <Label>Program/Course</Label>
            <Input
              name="programCourse"
              defaultValue={part1.programCourse || ""}
            />
          </div>
          <div>
            <Label>Modality</Label>
            <Select
              name="modality"
              defaultValue={part1.modality || "Face-to-face"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Face-to-face">Face-to-face</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Setting</Label>
            <Select name="setting" defaultValue={part1.setting || "In-Campus"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In-Campus">In-Campus</SelectItem>
                <SelectItem value="Off-Campus">Off-Campus</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Personnel-In-Charge</Label>
            <Input
              name="personnelInCharge"
              defaultValue={part1.personnelInCharge || ""}
            />
          </div>
          <div>
            <Label>Activity Type</Label>
            <Select
              name="activityType"
              defaultValue={part1.activityType || "Co-Curricular"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Co-Curricular">Co-Curricular</SelectItem>
                <SelectItem value="Extra-Curricular">
                  Extra-Curricular
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Attire</Label>
            <Input name="attire" defaultValue={part1.attire || ""} />
          </div>
          <div>
            <Label>Scope</Label>
            <Select name="scope" defaultValue={part1.scope || "Organizational"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Organizational">Organizational</SelectItem>
                <SelectItem value="Institutional">Institutional</SelectItem>
                <SelectItem value="Regional">Regional</SelectItem>
                <SelectItem value="National">National</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>No. of Participants</Label>
            <Input
              name="noOfParticipants"
              type="text"
              placeholder="e.g., 50 or 50-500"
              required
              defaultValue={part1.noOfParticipants || ""}
            />
          </div>
          <div>
            <Label>Program</Label>
            <Input
              name="program"
              placeholder="Seminar, General Assembly, Competition..."
              defaultValue={part1.program || ""}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Rationale</Label>
            <Textarea
              name="rationale"
              rows={4}
              required
              defaultValue={part1.rationale || ""}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Objective/s</Label>
            <Textarea
              name="objectives"
              rows={4}
              required
              defaultValue={part1.objectives || ""}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Applicable Augustinian Core Values</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {CORE_VALUE_OPTIONS.map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="coreValues"
                    value={value}
                    defaultChecked={selectedCoreValues.has(value)}
                  />
                  {value}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Expected Graduate Attributes</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {GRADUATE_ATTRIBUTE_OPTIONS.map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="graduateAttributes"
                    value={value}
                    defaultChecked={selectedGraduateAttributes.has(value)}
                  />
                  {value}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Program Flow</Label>
            <Textarea
              name="programFlow"
              rows={3}
              defaultValue={part1.programFlow || ""}
            />
            <div className="mt-3 rounded-md border bg-muted p-3">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Program Flow Attachments
              </Label>
              <Input
                type="file"
                name="programFlowAttachments"
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files || []);
                  setProgramFlowAttachmentTotal(
                    files.reduce((sum, file) => sum + file.size, 0),
                  );
                  setProgramFlowAttachmentNames(
                    files.map(
                      (file) => `${file.name} (${formatFileSize(file.size)})`,
                    ),
                  );
                }}
                className="mt-2 bg-background"
              />
              <div
                className={`mt-1 text-xs ${
                  programFlowAttachmentLimitExceeded
                    ? "text-red-600"
                    : "text-muted-foreground"
                }`}
              >
                {formatFileSize(programFlowAttachmentTotal)} / 25 MB
              </div>
              {programFlowAttachmentNames.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {programFlowAttachmentNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              ) : part1.programFlowAttachments?.length ? (
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {part1.programFlowAttachments.map((attachment: any) => (
                    <li key={attachment.id}>{attachment.fileName}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
          <div>
            <Label>Budget</Label>
            <Input name="budget" defaultValue={part1.budget || ""} />
          </div>
          <div>
            <Label>Source of Budget</Label>
            <Input
              name="sourceOfBudget"
              defaultValue={part1.sourceOfBudget || ""}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Part 2: School Support</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {SUPPORT_REQUEST_OPTIONS.map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="supportRequests"
                value={value}
                defaultChecked={selectedSupportRequests.has(value)}
              />
              {value}
            </label>
          ))}
          <Input
            name="budgetDetails"
            placeholder="Budget details"
            defaultValue={part2.budgetDetails || ""}
          />
          <Input
            name="vehiclePassengers"
            placeholder="Vehicle passengers"
            defaultValue={part2.vehiclePassengers || ""}
          />
          <Input
            name="foodPax"
            placeholder="Food/snacks pax"
            defaultValue={part2.foodPax || ""}
          />
          <Input
            name="roomVenueDetails"
            placeholder="Room/venue details"
            defaultValue={part2.roomVenueDetails || ""}
          />
          <Input
            name="microphoneQty"
            placeholder="Microphone quantity"
            defaultValue={part2.microphoneQty || ""}
          />
          <Input
            name="otherSupport"
            placeholder="Other support requests"
            defaultValue={part2.otherSupport || ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Part 3: Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            name="otherDetails"
            rows={5}
            placeholder="Other details to be filled by the proposing organization"
            defaultValue={part3 || ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval Chain</CardTitle>
          <CardDescription>
            Select the adviser and any optional additional signatories.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Adviser</Label>
            <Select
              name="adviserId"
              required
              disabled={lockApprovalChain}
              defaultValue={selectedAdviserId}
            >
              <SelectTrigger disabled={lockApprovalChain}>
                <SelectValue placeholder="Select adviser" />
              </SelectTrigger>
              <SelectContent>
                {(approvers.ADVISER || []).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(approvers.ADDITIONAL_SIGNATORY || []).length > 0 && (
            <div>
              <Label>Additional Signatories</Label>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {approvers.ADDITIONAL_SIGNATORY.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="additionalSignatoryIds"
                      value={user.id}
                      disabled={lockApprovalChain}
                      defaultChecked={selectedAdditionalSignatories.has(
                        user.id,
                      )}
                    />
                    {user.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" name="intent" value="draft" variant="outline">
          <Save className="mr-2 h-4 w-4" />
          Save Draft
        </Button>
        <Button
          type="submit"
          name="intent"
          value="submit"
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Send className="mr-2 h-4 w-4" />
          Submit Reservation
        </Button>
      </div>
    </form>
  );
}
