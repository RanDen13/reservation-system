"use client";

import EventSpaceCard from "@/app/components/EventSpace/EventSpaceCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Building2, Search, Users } from "lucide-react";
import { useState } from "react";
import { EventSpaceData } from "../schema";

export default function OfficerSpaces({
  eventSpaces,
}: {
  eventSpaces: EventSpaceData[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCapacity, setFilterCapacity] = useState("");

  const filteredSpaces = eventSpaces.filter((space) => {
    const matchesSearch = space.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCapacity = filterCapacity
      ? space.capacity >= parseInt(filterCapacity)
      : true;
    return matchesSearch && matchesCapacity;
  });

  return (
    <div className="space-y-8 p-4 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-950">Browse Venues</h1>
        <p className="mt-2 text-gray-600">
          Open a venue to review details, check the calendar, and start a
          reservation.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find venues that match your activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="search">Search by name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="e.g., Auditorium"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-12 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Minimum capacity</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="capacity"
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

      <p className="text-gray-600">
        Showing <span className="font-semibold">{filteredSpaces.length}</span>{" "}
        of {eventSpaces.length} venues
      </p>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredSpaces.map((space) => (
          <EventSpaceCard key={space.id} eventSpace={space} />
        ))}
      </div>

      {filteredSpaces.length === 0 && (
        <div className="py-12 text-center">
          <Building2 className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h3 className="mb-2 text-xl font-semibold text-gray-700">
            No venues found
          </h3>
          <p className="text-gray-500">Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
}
