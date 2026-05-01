"use client";

import CreateEventSpacePopup from "@/app/components/EventSpace/CreateEventSpacePopup";
import EventSpaceCard from "@/app/components/EventSpace/EventSpaceCard";
import { createVenueBlock } from "@/app/components/pages/SAPF/SapfActions";
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
import { motion } from "framer-motion";
import {
  Building2,
  Calendar,
  CalendarX,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EventSpaceData } from "../schema";
import UniversityWideBlocks from "../UniversityWideBlocks";

export default function AdminSpaces({
  eventSpaces,
  globalBlocks = [],
}: {
  eventSpaces: EventSpaceData[];
  globalBlocks?: any[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCapacity, setFilterCapacity] = useState("");
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const popup = usePopup();
  const router = useRouter();

  const handleCreateGlobalBlock = async (formData: FormData) => {
    formData.set("eventSpaceId", "ALL");
    const result = await createVenueBlock(formData);
    if (!result.success) {
      popup.showError(result.message || "Failed to create block.");
      return;
    }
    popup.showSuccess(result.message || "University-wide block created.");
    router.refresh();
  };

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
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-linear-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
            Manage Event Spaces
          </h1>
          <p className="text-muted-foreground mt-2">
            Add, edit, or remove event spaces from the system
          </p>
        </div>
        <Button
          className="bg-linear-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600 cursor-pointer"
          onClick={() => setShowCreatePopup(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Space
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{eventSpaces.length}</h3>
                <p className="text-sm text-muted-foreground">Total Spaces</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">
                  {eventSpaces.filter((s) => s.status === "ACTIVE").length}
                </h3>
                <p className="text-sm text-muted-foreground">Active Spaces</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">
                  {
                    eventSpaces.filter((s) => s.status === "UNDER_MAINTENANCE")
                      .length
                  }
                </h3>
                <p className="text-sm text-muted-foreground">
                  Under Maintenance
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <UniversityWideBlocks blocks={globalBlocks} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarX className="h-5 w-5 text-violet-700" />
              Add University Block
            </CardTitle>
            <CardDescription>
              Block a date or time range for every venue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleCreateGlobalBlock} className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input name="title" required />
              </div>
              <div>
                <Label>Date</Label>
                <Input name="date" type="date" required />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start</Label>
                  <Input name="startTime" type="time" required />
                </div>
                <div>
                  <Label>End</Label>
                  <Input name="endTime" type="time" required />
                </div>
              </div>
              <div>
                <Label>Reason</Label>
                <Input name="reason" />
              </div>
              <Button className="w-full bg-violet-600 hover:bg-violet-700">
                Create Block
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
            <CardDescription>Find spaces to manage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search by name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="e.g., Conference Room"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Minimum capacity</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="capacity"
                    type="number"
                    placeholder="e.g., 20"
                    value={filterCapacity}
                    onChange={(e) => setFilterCapacity(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Showing <span className="font-semibold">{filteredSpaces.length}</span>{" "}
          of {eventSpaces.length} spaces
        </p>
      </div>

      {/* Spaces Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredSpaces.map((space, index) => (
          <motion.div
            key={space.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
          >
            <EventSpaceCard eventSpace={space} showAdminActions />
          </motion.div>
        ))}
      </motion.div>

      {/* No Results */}
      {filteredSpaces.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No spaces found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search filters to find more results
          </p>
        </motion.div>
      )}

      {/* Create Event Space Popup */}
      {showCreatePopup && (
        <CreateEventSpacePopup onClose={() => setShowCreatePopup(false)} />
      )}
    </div>
  );
}
