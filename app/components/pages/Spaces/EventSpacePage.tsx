"use client";

import VenueMonthCalendar, {
  VenueCalendarItem,
} from "@/app/components/pages/Calendar/VenueMonthCalendar";
import DraggableVenueImage from "@/app/components/DraggableVenueImage";
import ErrorPopup from "@/app/components/Popup/ErrorPopup";
import { usePopup } from "@/app/components/Popup/PopupProvider";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  ArrowLeft,
  CheckCircle,
  MapPin,
  Send,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getEventSpaceById } from "./EventSpaceActions";
import EventSpaceSkeleton from "./EventSpaceSkeleton";
import { EventSpaceData } from "./schema";

type AppRole = "OFFICER" | "APPROVER" | "ADMIN" | "SUPER_ADMIN";

const EventSpacePage = ({
  id,
  userRole,
}: {
  id: string;
  userRole?: string;
}) => {
  const [loading, setLoading] = useState(true);
  const [eventSpace, setEventSpace] = useState<EventSpaceData | null>(null);
  const statusPopup = usePopup();
  const router = useRouter();
  const normalizedRole = userRole as AppRole | undefined;
  const canCreateReservation = normalizedRole === "OFFICER";

  const refresh = async () => {
    setLoading(true);
    const spaceResult = await getEventSpaceById(id);
    if (!spaceResult.success) {
      statusPopup.showError(spaceResult.message || "Failed to fetch venue.");
      setLoading(false);
      return;
    }
    setEventSpace(spaceResult.data || null);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
  if (!eventSpace) {
    return (
      <ErrorPopup message="Venue not found." onClose={() => router.back()} />
    );
  }

  const imageSrc = eventSpace.image
    ? `data:image/jpeg;base64,${Buffer.from(eventSpace.image).toString("base64")}`
    : null;

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {canCreateReservation && eventSpace.status === "ACTIVE" && (
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href={`/user/bookings/create?venueId=${eventSpace.id}`}>
              <Send className="mr-2 h-4 w-4" />
              Create Booking
            </Link>
          </Button>
        )}
      </div>

      <DraggableVenueImage src={imageSrc} alt={eventSpace.name} />

      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {eventSpace.name}
        </h1>
        <p className="mt-2 text-muted-foreground">{eventSpace.description}</p>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="grid w-full grid-cols-2 md:w-90">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
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
      </Tabs>
    </div>
  );
};

export default EventSpacePage;
