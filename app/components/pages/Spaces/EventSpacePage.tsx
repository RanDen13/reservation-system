"use client";

import VenueMonthCalendar, {
  VenueCalendarItem,
} from "@/app/components/pages/Calendar/VenueMonthCalendar";
import ErrorPopup from "@/app/components/Popup/ErrorPopup";
import { usePopup } from "@/app/components/Popup/PopupProvider";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { Textarea } from "@/app/components/ui/textarea";
import { format } from "date-fns";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle,
  Info,
  MapPin,
  Save,
  Send,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getApproverOptions,
  getSapfRequestById,
  saveSapfRequest,
} from "../SAPF/SapfActions";
import { getEventSpaceById } from "./EventSpaceActions";
import EventSpaceSkeleton from "./EventSpaceSkeleton";
import { EventSpaceData } from "./schema";

type AppRole = "OFFICER" | "APPROVER" | "ADMIN" | "SUPER_ADMIN";
const MIN_BOOKING_ADVANCE_DAYS = 30;

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

function SapfForm({
  eventSpace,
  approvers,
  onSaved,
  initialRequest,
}: {
  eventSpace: EventSpaceData;
  approvers: Record<string, any[]>;
  onSaved: () => void;
  initialRequest?: any;
}) {
  const popup = usePopup();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const isEditing = Boolean(initialRequest);
  const lockApprovalChain = initialRequest?.status === "RETURNED_FOR_REVISION";
  const formKey = initialRequest?.id || "new";
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
  const earliestBookingDate = useMemo(
    () => addCalendarDays(new Date(), MIN_BOOKING_ADVANCE_DAYS),
    [],
  );
  const minimumBookingDate = toDateInputValue(earliestBookingDate);
  const earliestBookingDateLabel = format(earliestBookingDate, "MMM d, yyyy");

  useEffect(() => {
    if (!initialRequest) return;
    const startAt = new Date(initialRequest.startAt);
    const endAt = new Date(initialRequest.endAt);

    if (!Number.isNaN(startAt.getTime())) {
      setSelectedDate(format(startAt, "yyyy-MM-dd"));
      setStartTime(format(startAt, "HH:mm"));
    }
    if (!Number.isNaN(endAt.getTime())) {
      setEndTime(format(endAt, "HH:mm"));
    }
  }, [initialRequest]);

  const handleSave = async (formData: FormData) => {
    const activityDate = String(formData.get("activityDate") ?? "");
    const selectedStartTime = String(formData.get("startTime") ?? "");
    const selectedEndTime = String(formData.get("endTime") ?? "");
    const intent = String(formData.get("intent") ?? "draft");

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

    formData.set("venue", eventSpace.name);
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
    onSaved();
  };

  return (
    <form key={formKey} action={handleSave} className="space-y-6">
      <input type="hidden" name="eventSpaceId" value={eventSpace.id} />
      {initialRequest?.id && (
        <input type="hidden" name="requestId" value={initialRequest.id} />
      )}

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
              type="number"
              min="1"
              max={eventSpace.capacity}
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
              {[
                "Courage",
                "Compassion",
                "Community-Oriented",
                "Humility",
                "Interiority",
                "Missionary Spirit",
              ].map((value) => (
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
              {[
                "EGA 1: Critical and Creative Thinker",
                "EGA 2: Competent Catholic Augustinian-Marian Professional",
                "EGA 3: Socially Responsive Steward",
                "EGA 4: Transformative Lifelong Learner",
              ].map((value) => (
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
          {[
            "Budget",
            "Vehicle",
            "Food/Snacks",
            "Room/Venue",
            "Sound System",
            "Microphone",
            "LCD Projector",
            "Chairs and Tables",
          ].map((value) => (
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

const EventSpacePage = ({
  id,
  userRole,
}: {
  id: string;
  userRole?: string;
}) => {
  const [loading, setLoading] = useState(true);
  const [eventSpace, setEventSpace] = useState<EventSpaceData | null>(null);
  const [approvers, setApprovers] = useState<Record<string, any[]>>({});
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const statusPopup = usePopup();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId") || "";
  const normalizedRole = userRole as AppRole | undefined;
  const canCreateReservation = normalizedRole === "OFFICER";

  const refresh = async () => {
    setLoading(true);
    const [spaceResult, approverResult, requestResult] = await Promise.all([
      getEventSpaceById(id),
      canCreateReservation ? getApproverOptions() : Promise.resolve(null),
      requestId && canCreateReservation
        ? getSapfRequestById(requestId)
        : Promise.resolve(null),
    ]);
    if (!spaceResult.success) {
      statusPopup.showError(spaceResult.message || "Failed to fetch venue.");
      setLoading(false);
      return;
    }
    setEventSpace(spaceResult.data || null);
    if (approverResult?.success) setApprovers(approverResult.data || {});

    if (!requestId || !canCreateReservation) {
      setEditingRequest(null);
    } else if (requestResult?.success) {
      const request = requestResult.data?.request;
      if (!request) {
        statusPopup.showError("Request not found.");
        setEditingRequest(null);
      } else if (request.eventSpaceId !== id) {
        statusPopup.showError("Request does not match this venue.");
        setEditingRequest(null);
      } else if (!["RETURNED_FOR_REVISION", "DRAFT"].includes(request.status)) {
        statusPopup.showError("This request can no longer be edited.");
        setEditingRequest(null);
      } else {
        setEditingRequest(request);
      }
    } else if (requestResult && !requestResult.success) {
      statusPopup.showError(requestResult.message || "Failed to load request.");
      setEditingRequest(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, requestId]);

  const calendarItems = useMemo<VenueCalendarItem[]>(() => {
    if (!eventSpace) return [];
    return [
      ...(eventSpace.sapfRequests || []).map((request) => ({
        id: request.id,
        title: `${request.requestNumber} - ${request.title}`,
        subtitle: request.organization,
        startAt: request.startAt,
        endAt: request.endAt,
        status:
          request.status === "APPROVED"
            ? ("BOOKED" as const)
            : ("PENDING" as const),
        scope: "VENUE" as const,
      })),
      ...(eventSpace.venueBlocks || []).map((block) => ({
        id: block.id,
        title: block.title,
        subtitle: block.reason || "Venue block",
        startAt: block.startAt,
        endAt: block.endAt,
        status: "BLOCKED" as const,
        scope: "VENUE" as const,
      })),
      ...(eventSpace.globalBlocks || []).map((block) => ({
        id: block.id,
        title: block.title,
        subtitle: block.reason || "University-wide block",
        startAt: block.startAt,
        endAt: block.endAt,
        status: "BLOCKED" as const,
        scope: "UNIVERSITY" as const,
      })),
    ].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  }, [eventSpace]);

  if (loading) return <EventSpaceSkeleton />;
  if (!eventSpace)
    return (
      <ErrorPopup message="Venue not found." onClose={() => router.back()} />
    );

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="relative h-64 overflow-hidden rounded-lg bg-muted">
        {eventSpace.image ? (
          <Image
            src={`data:image/jpeg;base64,${Buffer.from(eventSpace.image).toString("base64")}`}
            alt={eventSpace.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="h-20 w-20 text-muted-foreground" />
          </div>
        )}
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {eventSpace.name}
        </h1>
        <p className="mt-2 text-muted-foreground">{eventSpace.description}</p>
      </div>

      <Tabs defaultValue={editingRequest ? "sapf" : "details"}>
        <TabsList
          className={`grid w-full ${
            canCreateReservation
              ? "grid-cols-3 md:w-130"
              : "grid-cols-2 md:w-90"
          }`}
        >
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          {canCreateReservation && (
            <TabsTrigger value="sapf">Reservation Form</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <MapPin className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold">{eventSpace.location}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <Users className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Capacity</p>
                  <p className="font-semibold">{eventSpace.capacity} people</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold">
                    {eventSpace.status.replaceAll("_", " ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <VenueMonthCalendar
            items={calendarItems}
            title={`${eventSpace.name} calendar`}
            description="Pending requests are soft holds; booked reservations and blocks reserve dates."
          />
        </TabsContent>

        {canCreateReservation && (
          <TabsContent value="sapf" className="mt-4">
            {editingRequest && (
              <div className="mb-4 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-900 dark:text-orange-100">
                Editing returned request #{editingRequest.requestNumber}. Update
                the details and resubmit to continue the approval flow.
              </div>
            )}
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
              Pending conflicts will warn you but still allow submission.
              Approved reservations and venue blocks cannot be submitted over.
            </div>
            <SapfForm
              eventSpace={eventSpace}
              approvers={approvers}
              onSaved={refresh}
              initialRequest={editingRequest}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default EventSpacePage;
