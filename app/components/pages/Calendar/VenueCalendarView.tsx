"use client";

import AllEventsCalendar from "@/app/components/pages/Calendar/AllEventsCalendar";
import EventSpaceCard from "@/app/components/EventSpace/EventSpaceCard";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { Building2, Search, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function VenueCalendarView({
  venues,
  globalBlocks,
  title = "Public Venue Calendar",
  description = "Browse campus venues and open a venue to check its calendar.",
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCapacity, setFilterCapacity] = useState("");

  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      const matchesSearch =
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCapacity = filterCapacity
        ? venue.capacity >= Number(filterCapacity)
        : true;
      return matchesSearch && matchesCapacity;
    });
  }, [filterCapacity, searchQuery, venues]);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
        {actionHref && actionLabel && (
          <Button asChild variant="outline">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:w-[320px]">
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <AllEventsCalendar
            venues={venues}
            globalBlocks={globalBlocks}
            title="All Venue Events"
            description="Reservations and blocks across every venue."
          />
        </TabsContent>

        <TabsContent value="venues" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
              <CardDescription>
                Find venues that match your activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="calendar-search">
                    Search by venue or location
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="calendar-search"
                      placeholder="e.g., Auditorium"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      className="h-12 pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calendar-capacity">Minimum capacity</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="calendar-capacity"
                      type="number"
                      placeholder="e.g., 50"
                      value={filterCapacity}
                      onChange={(event) => setFilterCapacity(event.target.value)}
                      className="h-12 pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-muted-foreground">
            Showing <span className="font-semibold">{filteredVenues.length}</span>{" "}
            of {venues.length} venues
          </p>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredVenues.map((venue) => (
              <EventSpaceCard
                key={venue.id}
                eventSpace={venue}
                detailsHref={`/calendar/${venue.id}`}
              />
            ))}
          </div>

          {filteredVenues.length === 0 && (
            <div className="py-12 text-center">
              <Building2 className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold text-foreground">
                No venues found
              </h3>
              <p className="text-muted-foreground">Try adjusting your filters.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
