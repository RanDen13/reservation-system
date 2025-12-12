"use client";

import { getUserBookings } from "@/app/components/pages/Booking/BookingActions";
import { getAllEventSpaces } from "@/app/components/pages/Spaces/EventSpaceActions";
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
import { motion } from "framer-motion";
import {
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type BookingStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED";

interface Booking {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  eventSpace?: {
    name: string;
    location: string;
    capacity: number;
  };
}

interface EventSpace {
  id: string;
  name: string;
  location: string;
  capacity: number;
  pricePerHour: number;
  imageUrl?: string;
  status: string;
}

const StudentDashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [eventSpaces, setEventSpaces] = useState<EventSpace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [bookingsResult, spacesResult] = await Promise.all([
        getUserBookings(),
        getAllEventSpaces(),
      ]);

      if (bookingsResult.success && bookingsResult.data) {
        setBookings(bookingsResult.data);
      }
      if (spacesResult.success && spacesResult.data) {
        setEventSpaces(spacesResult.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const upcomingBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return (
      (booking.status === "APPROVED" || booking.status === "PENDING") &&
      bookingDate >= today
    );
  });

  const activeBookings = bookings.filter(
    (b) => b.status === "APPROVED" || b.status === "PENDING"
  );
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");
  const availableSpaces = eventSpaces.filter((s) => s.status === "ACTIVE");

  const featuredSpaces = availableSpaces.slice(0, 3);

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold bg-linear-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
          My Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your bookings and discover available event spaces
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border-2">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  </div>
                  <div className="w-16 h-8 bg-gray-200 rounded"></div>
                  <div className="w-24 h-4 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-linear-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">
                    {activeBookings.length}
                  </h3>
                  <p className="text-sm text-gray-600">Active Bookings</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <Calendar className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">
                    {completedBookings.length}
                  </h3>
                  <p className="text-sm text-gray-600">Completed</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card className="border-2 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-linear-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <Building2 className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">
                    {availableSpaces.length}
                  </h3>
                  <p className="text-sm text-gray-600">Available Spaces</p>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Upcoming Bookings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Bookings</CardTitle>
                <CardDescription>
                  Your scheduled event space reservations
                </CardDescription>
              </div>
              <Link href="/user/bookings">
                <Button variant="outline" className="cursor-pointer">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="p-4 rounded-lg border">
                    <div className="animate-pulse space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-4 bg-gray-200 rounded"></div>
                        <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="w-full h-4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="mb-4">No upcoming bookings</p>
                <Link href="/user/spaces">
                  <Button className="cursor-pointer">
                    Browse Event Spaces
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking, index) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 * index }}
                    className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">
                          {booking.eventSpace?.name || "Unknown Space"}
                        </h4>
                        <Badge
                          className={`${
                            booking.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {booking.status === "APPROVED" ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Confirmed
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pending
                            </div>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {format(new Date(booking.date), "MMM dd, yyyy")} •{" "}
                        {booking.startTime} - {booking.endTime}
                      </p>
                      {booking.eventSpace && (
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {booking.eventSpace.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {booking.eventSpace.location}
                            </span>
                          )}
                          {booking.eventSpace.capacity && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Up to {booking.eventSpace.capacity} people
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Link href="/user/bookings">
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer ml-4"
                      >
                        View
                      </Button>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Featured Spaces */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Available Event Spaces</CardTitle>
                <CardDescription>
                  Discover and book your perfect venue
                </CardDescription>
              </div>
              <Link href="/user/spaces">
                <Button variant="outline" className="cursor-pointer">
                  View All Spaces
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-lg border overflow-hidden"
                  >
                    <div className="animate-pulse">
                      <div className="w-full h-48 bg-gray-200"></div>
                      <div className="p-4 space-y-3">
                        <div className="w-3/4 h-5 bg-gray-200 rounded"></div>
                        <div className="w-full h-4 bg-gray-200 rounded"></div>
                        <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : featuredSpaces.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No event spaces available at the moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredSpaces.map((space, index) => (
                  <motion.div
                    key={space.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 * index }}
                  >
                    <Card className="border hover:shadow-lg transition-shadow h-full">
                      <div className="relative">
                        <div className="w-full h-48 bg-linear-to-br from-sky-100 to-emerald-100 flex items-center justify-center">
                          {space.imageUrl ? (
                            <img
                              src={space.imageUrl}
                              alt={space.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-16 h-16 text-gray-400" />
                          )}
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-emerald-500 text-white">
                            Available
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {space.name}
                        </h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          {space.location && (
                            <p className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {space.location}
                            </p>
                          )}
                          <p className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Up to {space.capacity} people
                          </p>
                          <p className="text-emerald-600 font-semibold">
                            ₱{space.pricePerHour}/hour
                          </p>
                        </div>
                        <Link href="/user/spaces">
                          <Button
                            className="w-full mt-4 cursor-pointer"
                            variant="outline"
                          >
                            Book Now
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default StudentDashboard;
