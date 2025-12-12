"use client";

import CreateEventSpacePopup from "@/app/components/EventSpace/CreateEventSpacePopup";
import { getAllBookings } from "@/app/components/pages/Booking/BookingActions";
import { BookingData } from "@/app/components/pages/Booking/schema";
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

const AdminDashboard = () => {
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [totalSpaces, setTotalSpaces] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [bookingsResult, spacesResult] = await Promise.all([
        getAllBookings(),
        getAllEventSpaces(),
      ]);

      if (bookingsResult.success && bookingsResult.data) {
        setBookings(bookingsResult.data);
      }
      if (spacesResult.success && spacesResult.data) {
        setTotalSpaces(spacesResult.data.length);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = [
    {
      title: "Total Bookings",
      value: bookings.length.toString(),
      change:
        "+" +
        bookings.filter((b) => {
          const bookingDate = new Date(b.createdAt);
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          return bookingDate > lastMonth;
        }).length,
      icon: <Calendar className="w-6 h-6" />,
      color: "from-blue-500 to-cyan-500",
    },
    {
      title: "Pending Requests",
      value: bookings.filter((b) => b.status === "PENDING").length.toString(),
      change: "Awaiting",
      icon: <Clock className="w-6 h-6" />,
      color: "from-amber-500 to-orange-500",
    },
    {
      title: "Approved",
      value: bookings.filter((b) => b.status === "APPROVED").length.toString(),
      change: "Active",
      icon: <CheckCircle className="w-6 h-6" />,
      color: "from-emerald-500 to-green-500",
    },
    {
      title: "Event Spaces",
      value: totalSpaces.toString(),
      change: "Total",
      icon: <Building2 className="w-6 h-6" />,
      color: "from-purple-500 to-pink-500",
    },
  ];

  const recentBookings = bookings
    .filter((b) => b.status === "PENDING" || b.status === "APPROVED")
    .slice(0, 5);

  return (
    <div className="p-4 lg:p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold bg-linear-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's what's happening with your event spaces today.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="border-2">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                      <div className="w-16 h-4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="w-16 h-8 bg-gray-200 rounded"></div>
                    <div className="w-24 h-4 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          : stats.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
              >
                <Card className="border-2 hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-12 h-12 bg-linear-to-r ${stat.color} rounded-xl flex items-center justify-center text-white shadow-lg`}
                      >
                        {stat.icon}
                      </div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-gray-600">
                        {stat.change}
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used management tools</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="w-full h-20 text-base cursor-pointer hover:bg-linear-to-r hover:from-sky-50 hover:to-emerald-50"
              onClick={() => setShowCreatePopup(true)}
            >
              <div className="flex flex-col items-center gap-2">
                <Building2 className="w-6 h-6" />
                <span>Add New Space</span>
              </div>
            </Button>
            <Link href="/user/bookings">
              <Button
                variant="outline"
                className="w-full h-20 text-base cursor-pointer hover:bg-linear-to-r hover:from-sky-50 hover:to-emerald-50"
              >
                <div className="flex flex-col items-center gap-2">
                  <Calendar className="w-6 h-6" />
                  <span>View All Bookings</span>
                </div>
              </Button>
            </Link>
            <Link href="/user/users">
              <Button
                variant="outline"
                className="w-full h-20 text-base cursor-pointer hover:bg-linear-to-r hover:from-sky-50 hover:to-emerald-50"
              >
                <div className="flex flex-col items-center gap-2">
                  <Users className="w-6 h-6" />
                  <span>Manage Users</span>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Bookings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Booking Requests</CardTitle>
                <CardDescription>
                  Review and manage pending bookings
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
                {Array.from({ length: 3 }).map((_, index) => (
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
            ) : recentBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent booking requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking, index) => (
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
                          {booking.user?.name || "Unknown User"}
                        </h4>
                        <Badge
                          className={`${
                            booking.status === "PENDING"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {booking.status === "PENDING" ? (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pending
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Approved
                            </div>
                          )}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">
                          {booking.eventSpace?.name || "Unknown Space"}
                        </span>{" "}
                        • {format(new Date(booking.date), "MMM dd, yyyy")} •{" "}
                        {booking.startTime} - {booking.endTime}
                      </p>
                      {booking.eventSpace?.location && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {booking.eventSpace.location}
                        </p>
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
      {showCreatePopup && (
        <CreateEventSpacePopup onClose={() => setShowCreatePopup(false)} />
      )}
    </div>
  );
};

export default AdminDashboard;
