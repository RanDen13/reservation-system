import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { format } from "date-fns";
import { Building2, CalendarDays, Clock, MapPin, Users } from "lucide-react";
import Link from "next/link";

function badgeClass(status: string) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700";
  if (status === "BLOCKED") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

export default function VenueCalendarView({
  venues,
  globalBlocks,
  title = "Public Venue Calendar",
  description = "Read-only availability for kiosk and public viewing.",
  actionHref,
  actionLabel,
}: {
  venues: any[];
  globalBlocks: any[];
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">{title}</h1>
          <p className="mt-2 text-gray-600">{description}</p>
        </div>
        {actionHref && actionLabel && (
          <Button asChild variant="outline">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </div>

      {globalBlocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>University-Wide Blocks</CardTitle>
            <CardDescription>These dates apply to every venue.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {globalBlocks.map((block) => (
              <div key={block.id} className="rounded-lg border bg-white p-4">
                <p className="font-semibold">{block.title}</p>
                <p className="text-sm text-gray-600">{block.reason}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                  <Clock className="h-4 w-4" />
                  {format(block.startAt, "MMM d, yyyy h:mm a")} to{" "}
                  {format(block.endAt, "h:mm a")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {venues.map((venue) => {
          const items = [
            ...venue.sapfRequests.map((request: any) => ({
              id: request.id,
              title: request.title,
              subtitle: request.organization,
              startAt: request.startAt,
              endAt: request.endAt,
              status: request.status,
            })),
            ...venue.venueBlocks.map((block: any) => ({
              id: block.id,
              title: block.title,
              subtitle: block.reason || "Venue block",
              startAt: block.startAt,
              endAt: block.endAt,
              status: "BLOCKED",
            })),
          ].sort(
            (a, b) =>
              new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
          );

          return (
            <Card key={venue.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {venue.name}
                </CardTitle>
                <CardDescription className="space-y-1">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {venue.location}
                  </span>
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Capacity {venue.capacity}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                    <CalendarDays className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                    No pending or confirmed reservations.
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-sm text-gray-600">
                          {item.subtitle}
                        </p>
                        <p className="mt-1 text-sm text-gray-700">
                          {format(item.startAt, "MMM d, yyyy h:mm a")} to{" "}
                          {format(item.endAt, "h:mm a")}
                        </p>
                      </div>
                      <Badge className={badgeClass(item.status)}>
                        {item.status === "APPROVED"
                          ? "BOOKED"
                          : item.status === "BLOCKED"
                            ? "BLOCKED"
                            : "PENDING"}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
