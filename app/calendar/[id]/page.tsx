import VenueImageCarousel from "@/app/components/EventSpace/VenueImageCarousel";
import VenueMonthCalendar, {
  VenueCalendarItem,
} from "@/app/components/pages/Calendar/VenueMonthCalendar";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { getVenueCalendarData } from "@/lib/venue-calendar-data";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

function calendarItems(venue: any, globalBlocks: any[]): VenueCalendarItem[] {
  return [
    ...(venue.sapfRequests || []).map((request: any) => ({
      id: request.id,
      title:
        request.status === "APPROVED"
          ? "Booked reservation"
          : "Pending reservation",
      subtitle: null,
      startAt: request.startAt,
      endAt: request.endAt,
      status:
        request.status === "APPROVED"
          ? ("BOOKED" as const)
          : ("PENDING" as const),
      scope: "VENUE" as const,
    })),
    ...(venue.venueBlocks || []).map((block: any) => ({
      id: block.id,
      title: block.title,
      subtitle: block.reason || "Venue block",
      startAt: block.startAt,
      endAt: block.endAt,
      status: "BLOCKED" as const,
      scope: "VENUE" as const,
    })),
    ...(globalBlocks || []).map((block: any) => ({
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
}

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { venues, globalBlocks } = await getVenueCalendarData();
  const venue = venues.find((item) => item.id === id);

  if (!venue) {
    notFound();
  }

  const imagesFromImagesData = venue.imagesData || [];
  const fallbackImage = venue.image
    ? `data:image/jpeg;base64,${Buffer.from(venue.image).toString("base64")}`
    : null;
  const images = imagesFromImagesData.length
    ? imagesFromImagesData
    : fallbackImage
      ? [fallbackImage]
      : [];

  return (
    <main className="min-h-screen bg-background p-4 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Button asChild variant="outline">
          <Link href="/calendar">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to venues
          </Link>
        </Button>

        <VenueImageCarousel
          images={images}
          alt={venue.name}
          className="h-80 sm:h-96 lg:h-[32rem]"
        />

        <div>
          <h1 className="text-3xl font-bold text-foreground">{venue.name}</h1>
          <p className="mt-2 text-muted-foreground">{venue.description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <MapPin className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-semibold">{venue.location}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Users className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="font-semibold">{venue.capacity} people</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <VenueMonthCalendar
          items={calendarItems(venue, globalBlocks)}
          title={`${venue.name} calendar`}
          description="Pending requests are soft holds; booked reservations and blocks reserve dates."
        />
      </div>
    </main>
  );
};

export default page;
