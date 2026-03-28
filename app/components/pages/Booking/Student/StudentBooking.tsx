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
import { BookingStatus } from "@/generated/prisma/enums";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Calendar,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Filter,
  Image as ImageIcon,
  MapPin,
  Paperclip,
  Plus,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cancelBooking, getUserBookings } from "../BookingActions";
import FileViewerModal from "../FileViewerModal";
import { BookingData } from "../schema";

const StudentBooking = () => {
  const router = useRouter();
  const statusPopup = usePopup();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState("all");
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fileViewer, setFileViewer] = useState<{
    fileData: Buffer;
    fileType: "PDF" | "DOCX" | "IMAGE";
    bookingId: string;
  } | null>(null);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const result = await getUserBookings();
      if (result.success && result.data) {
        setBookings(result.data);
      } else {
        statusPopup.showError(result.message || "Failed to fetch bookings");
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
      statusPopup.showError("An error occurred while fetching bookings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string, spaceName: string) => {
    const confirmed = await statusPopup.showYesNo(
      `Are you sure you want to cancel your booking for ${spaceName}? This action cannot be undone.`,
    );
    if (!confirmed) return;

    statusPopup.showLoading("Cancelling booking...");
    const result = await cancelBooking(bookingId);
    if (result.success) {
      statusPopup.showSuccess(
        result.message || "Booking cancelled successfully",
      );
      await fetchBookings();
      router.refresh();
    } else {
      statusPopup.showError(result.message || "Failed to cancel booking");
    }
  };

  const handleViewOrDownloadFile = (
    fileData: Buffer,
    fileType: "PDF" | "DOCX" | "IMAGE",
    bookingId: string,
  ) => {
    // For PDF and IMAGE, open modal viewer
    if (fileType === "PDF" || fileType === "IMAGE") {
      setFileViewer({ fileData, fileType, bookingId });
    } else if (fileType === "DOCX") {
      // For DOCX, download directly
      try {
        const byteArray = new Uint8Array(Object.values(fileData));
        const blob = new Blob([byteArray], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `my-booking-${bookingId}-requirements.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        statusPopup.showError("Failed to download file");
        console.error("Download error:", error);
      }
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = (booking.eventSpace?.name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || booking.status === statusFilter;
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "upcoming" &&
        (booking.status === "APPROVED" || booking.status === "PENDING") &&
        new Date(booking.date) >= new Date()) ||
      (activeTab === "past" &&
        (booking.status === "COMPLETED" ||
          booking.status === "REJECTED" ||
          booking.status === "CANCELLED" ||
          new Date(booking.date) < new Date()));
    return matchesSearch && matchesStatus && matchesTab;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    approved: bookings.filter((b) => b.status === "APPROVED").length,
    upcoming: bookings.filter(
      (b) =>
        (b.status === "APPROVED" || b.status === "PENDING") &&
        new Date(b.date) >= new Date(),
    ).length,
  };

  const getStatusBadge = (status: BookingStatus) => {
    const variants = {
      PENDING: { color: "bg-amber-100 text-amber-700", icon: Clock },
      APPROVED: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
      REJECTED: { color: "bg-red-100 text-red-700", icon: XCircle },
      COMPLETED: { color: "bg-blue-100 text-blue-700", icon: CalendarCheck },
      CANCELLED: { color: "bg-gray-100 text-gray-700", icon: XCircle },
    };

    const { color, icon: Icon } = variants[status];

    return (
      <Badge className={`${color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

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
            My Bookings
          </h1>
          <p className="text-gray-600 mt-2">
            View and manage your event space reservations
          </p>
        </div>
        <Button
          onClick={() => router.push("/user/spaces")}
          className="bg-linear-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats.total}</h3>
                <p className="text-sm text-gray-600">Total Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats.upcoming}</h3>
                <p className="text-sm text-gray-600">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats.pending}</h3>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-linear-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{stats.approved}</h3>
                <p className="text-sm text-gray-600">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Search & Filter
            </CardTitle>
            <CardDescription>Find your bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Space name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status" className="h-12">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-3">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              All Bookings
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              <CalendarPlus className="w-4 h-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4" />
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 space-y-4">
            {/* Results Count */}
            {!isLoading && (
              <div className="flex items-center justify-between">
                <p className="text-gray-600">
                  Showing{" "}
                  <span className="font-semibold">
                    {filteredBookings.length}
                  </span>{" "}
                  of {bookings.length} bookings
                </p>
              </div>
            )}

            {/* Loading State */}
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600 mb-4"></div>
                <p className="text-gray-600">Loading bookings...</p>
              </motion.div>
            ) : (
              <>
                {/* Bookings List */}
                {filteredBookings.map((booking, index) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 * index }}
                  >
                    <Card className="border-2 hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          {/* Left Section */}
                          <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-xl font-bold text-gray-800">
                                    {booking.eventSpace?.name ||
                                      "Unknown Space"}
                                  </h3>
                                  {booking.requirementsData &&
                                    booking.requirementsDataType && (
                                      <Paperclip className="w-4 h-4 text-blue-600" />
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                  <MapPin className="w-4 h-4" />
                                  {booking.eventSpace?.location ||
                                    "Unknown Location"}
                                </div>
                              </div>
                              {getStatusBadge(booking.status)}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>
                                  {format(new Date(booking.date), "PPP")}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span>
                                  {booking.startTime} - {booking.endTime}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span>{booking.attendees} attendees</span>
                              </div>

                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold">
                                  ₱{booking.totalPrice.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm text-gray-600">
                                <span className="font-semibold">Purpose:</span>{" "}
                                {booking.purpose}
                              </p>
                            </div>

                            {booking.requirementsData &&
                              booking.requirementsDataType && (
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {booking.requirementsDataType ===
                                      "IMAGE" ? (
                                        <ImageIcon className="w-5 h-5 text-blue-600" />
                                      ) : (
                                        <FileText className="w-5 h-5 text-blue-600" />
                                      )}
                                      <div>
                                        <p className="text-sm font-semibold text-blue-900">
                                          Your Requirements Document
                                        </p>
                                        <p className="text-xs text-blue-700">
                                          {booking.requirementsDataType} file
                                          attached
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleViewOrDownloadFile(
                                          Buffer.from(
                                            booking.requirementsData!,
                                          ),
                                          booking.requirementsDataType!,
                                          booking.id,
                                        )
                                      }
                                      className="shrink-0 border-blue-300 hover:bg-blue-100"
                                    >
                                      {booking.requirementsDataType ===
                                      "DOCX" ? (
                                        <>
                                          <Download className="w-4 h-4 mr-2" />
                                          Download
                                        </>
                                      ) : (
                                        <>
                                          <Download className="w-4 h-4 mr-2" />
                                          View
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}

                            {booking.rejectionReason && (
                              <div className="bg-red-50 rounded-lg p-3">
                                <p className="text-sm text-red-600">
                                  <span className="font-semibold">
                                    Rejection Reason:
                                  </span>{" "}
                                  {booking.rejectionReason}
                                </p>
                              </div>
                            )}

                            <p className="text-xs text-gray-500">
                              Booked on:{" "}
                              {format(new Date(booking.createdAt), "PPP")}
                            </p>
                          </div>

                          {/* Right Section - Actions */}
                          {booking.status === "PENDING" && (
                            <Button
                              onClick={() =>
                                handleCancelBooking(
                                  booking.id,
                                  booking.eventSpace?.name || "this space",
                                )
                              }
                              variant="destructive"
                              className="lg:w-32"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}

                {/* No Results */}
                {filteredBookings.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <CalendarX className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      No bookings found
                    </h3>
                    <p className="text-gray-500">
                      {activeTab === "all"
                        ? "You haven't made any bookings yet"
                        : activeTab === "upcoming"
                          ? "You have no upcoming bookings"
                          : "You have no past bookings"}
                    </p>
                    {activeTab === "all" && (
                      <Button
                        onClick={() => router.push("/user/spaces")}
                        className="mt-4 bg-linear-to-r from-sky-500 to-emerald-500 hover:from-sky-600 hover:to-emerald-600"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Booking
                      </Button>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* File Viewer Modal */}
      {fileViewer && (
        <FileViewerModal
          fileData={fileViewer.fileData}
          fileType={fileViewer.fileType}
          bookingId={fileViewer.bookingId}
          onClose={() => setFileViewer(null)}
        />
      )}
    </div>
  );
};

export default StudentBooking;
